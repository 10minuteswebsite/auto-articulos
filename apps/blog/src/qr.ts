// QR real (no decorativo) para el módulo de WhatsApp de escritorio (blueprint §8.8).
// Usa el núcleo de `qrcode` (JS puro) y dibuja un SVG accesible, con zona de silencio de 4 módulos.
import { create } from "qrcode/lib/core/qrcode";
import { esc } from "./util";

export function qrSvg(text: string, label: string, px = 160): string {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const quiet = 4;
  const total = n + quiet * 2;
  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
