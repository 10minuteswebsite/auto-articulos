import sharp from "sharp";

/**
 * Regla estricta de Milton (11/11/2026, caso Ignacio Cubas): el logo NUNCA va
 * en una caja (negra, blanca ni de ningún color). Solo aparece el dibujo del
 * logo, sobre fondo transparente, bien colocado y legible. Si no se logra, NO
 * se pone logo; la imagen sale sin él.
 */

export type CleanLogo = { png: Buffer; width: number; height: number; luma: number };

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Devuelve el logo con fondo transparente y recortado al dibujo, o null si no
 * se puede garantizar que quede sin caja.
 */
export async function cleanLogoForOverlay(input: Buffer): Promise<CleanLogo | null> {
  let { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const total = width * height;
  if (total < 100) return null;

  // 1) ¿Ya trae transparencia real?
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 200) transparent++;
  const hasAlpha = transparent / total > 0.02;

  if (!hasAlpha) {
    // 2) Opaco: solo se acepta si el borde es de UN color uniforme (caja de fondo).
    const border: number[][] = [];
    const take = (x: number, y: number) => {
      const o = (y * width + x) * 4;
      border.push([data[o], data[o + 1], data[o + 2]]);
    };
    for (let x = 0; x < width; x++) { take(x, 0); take(x, height - 1); }
    for (let y = 1; y < height - 1; y++) { take(0, y); take(width - 1, y); }
    const med = [0, 1, 2].map((c) => {
      const v = border.map((p) => p[c]).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)];
    });
    const dist = (r: number, g: number, b: number) => Math.hypot(r - med[0], g - med[1], b - med[2]);
    const uniform = border.filter((p) => dist(p[0], p[1], p[2]) < 24).length / border.length;
    if (uniform < 0.97) return null; // fondo con foto/degradado: no se puede quitar de forma segura

    // 3) Quitar el color de fondo (llave de color con borde suave).
    const T1 = 28;
    const T2 = 90;
    const out = Buffer.from(data);
    for (let i = 0; i < data.length; i += 4) {
      const d = dist(data[i], data[i + 1], data[i + 2]);
      const a = d <= T1 ? 0 : d >= T2 ? 1 : (d - T1) / (T2 - T1);
      out[i + 3] = Math.round(a * 255);
      if (a > 0 && a < 1) {
        // quitar el aporte del fondo al color del borde suavizado
        for (let c = 0; c < 3; c++) {
          const v = (data[i + c] - (1 - a) * med[c]) / a;
          out[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
      }
    }
    data = out;
  }

  // 4) Recortar al dibujo y validar que haya dibujo.
  const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!trimmed) return null;
  const tw = trimmed.info.width;
  const th = trimmed.info.height;

  let ink = 0;
  let lumaSum = 0;
  let weight = 0;
  for (let i = 0; i < trimmed.data.length; i += 4) {
    const a = trimmed.data[i + 3] / 255;
    if (a > 0.5) ink++;
    weight += a;
    lumaSum += a * luma(trimmed.data[i], trimmed.data[i + 1], trimmed.data[i + 2]);
  }
  const inkRatio = ink / (tw * th);
  if (ink < 30 || inkRatio < 0.01) return null; // casi no hay dibujo
  // Un logo cuyo dibujo ocupa casi todo el recorte con fondo opaco es una caja de color.
  if (!hasAlpha && inkRatio > 0.9) return null;

  const png = await sharp(trimmed.data, { raw: { width: tw, height: th, channels: 4 } }).png().toBuffer();
  return { png, width: tw, height: th, luma: weight > 0 ? lumaSum / weight : 128 };
}

export type LogoPlacement = { logo: Buffer; left: number; top: number; width: number; height: number };

/**
 * Elige logo y esquina inferior con contraste suficiente. Si ninguna
 * combinación se lee con claridad, devuelve null (no se pone logo).
 */
export async function chooseLogoPlacement(
  base: Buffer,
  width: number,
  height: number,
  logos: CleanLogo[],
  minContrast = 70,
): Promise<LogoPlacement | null> {
  if (logos.length === 0) return null;
  const padding = Math.round(width * 0.06);
  const maxW = Math.round(width * 0.34);
  const maxH = Math.round(height * 0.1);

  let best: (LogoPlacement & { score: number }) | null = null;
  for (const logo of logos) {
    const resized = await sharp(logo.png).resize({ width: maxW, height: maxH, fit: "inside" }).png().toBuffer();
    const meta = await sharp(resized).metadata();
    const w = meta.width ?? maxW;
    const h = meta.height ?? maxH;
    const top = Math.max(0, height - h - padding);
    for (const left of [Math.max(0, width - w - padding), padding]) {
      const zone = sharp(base).extract({
        left: Math.min(left, Math.max(0, width - w)),
        top,
        width: Math.min(w, width),
        height: Math.min(h, height - top),
      });
      const stats = await zone.stats();
      const bg = luma(stats.channels[0].mean, stats.channels[1].mean, stats.channels[2].mean);
      const spread = Math.max(...stats.channels.slice(0, 3).map((c) => c.stdev));
      // zona muy cargada de detalle = el logo se pierde
      const score = Math.abs(logo.luma - bg) - spread * 0.8;
      if (score >= minContrast && (!best || score > best.score)) {
        best = { logo: resized, left, top, width: w, height: h, score };
      }
    }
  }
  return best;
}

export async function overlayLogo(base: Buffer, placement: LogoPlacement): Promise<Buffer> {
  return sharp(base).composite([{ input: placement.logo, left: placement.left, top: placement.top }]).toBuffer();
}
