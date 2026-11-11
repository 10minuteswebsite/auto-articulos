import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { chooseLogoPlacement, cleanLogoForOverlay, overlayLogo } from "./logoClean";

const solid = (w: number, h: number, c: string) =>
  sharp({ create: { width: w, height: h, channels: 4, background: c } }).png().toBuffer();

// Caso Ignacio Cubas: trazo blanco sobre caja negra opaca.
async function whiteOnBlack() {
  return sharp(await solid(300, 120, "#000000"))
    .composite([
      { input: await solid(160, 6, "#ffffff"), left: 70, top: 40 },
      { input: await solid(60, 6, "#ffffff"), left: 70, top: 70 },
    ])
    .png()
    .toBuffer();
}

test("quita la caja negra: queda solo el trazo, transparente alrededor", async () => {
  const clean = await cleanLogoForOverlay(await whiteOnBlack());
  assert.ok(clean);
  assert.equal(clean!.width, 160);
  assert.equal(clean!.height, 36);
  assert.ok(clean!.luma > 200);
  const { data } = await sharp(clean!.png).raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 255);
});

test("no pone caja sobre el pasto: los píxeles de alrededor no cambian", async () => {
  const base = await solid(400, 500, "#3a6b2a");
  const clean = await cleanLogoForOverlay(await whiteOnBlack());
  const placement = await chooseLogoPlacement(await sharp(base).removeAlpha().png().toBuffer(), 400, 500, [clean!]);
  assert.ok(placement);
  const out = await overlayLogo(await sharp(base).removeAlpha().png().toBuffer(), placement!);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => { const o = (y * info.width + x) * info.channels; return [data[o], data[o + 1], data[o + 2]]; };
  assert.deepEqual(px(placement!.left - 1, placement!.top - 1), [0x3a, 0x6b, 0x2a]);
  assert.deepEqual(px(placement!.left + 2, placement!.top + Math.round(placement!.height / 2)), [0x3a, 0x6b, 0x2a]);
});

test("logo con foto de fondo no se usa", async () => {
  const noisy = Buffer.alloc(100 * 100 * 4);
  for (let i = 0; i < noisy.length; i++) noisy[i] = i % 4 === 3 ? 255 : (i * 37) % 256;
  const png = await sharp(noisy, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
  assert.equal(await cleanLogoForOverlay(png), null);
});

test("sin contraste suficiente no se pone logo", async () => {
  const clean = await cleanLogoForOverlay(await whiteOnBlack());
  const bright = await sharp(await solid(400, 500, "#f5f5f5")).removeAlpha().png().toBuffer();
  assert.equal(await chooseLogoPlacement(bright, 400, 500, [clean!]), null);
});
