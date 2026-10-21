// El módulo núcleo de `qrcode` (JS puro, sin canvas ni fs; corre en Workers) no trae tipos.
declare module "qrcode/lib/core/qrcode" {
  interface BitMatrix { size: number; get(row: number, col: number): number }
  export function create(text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }): { modules: BitMatrix };
}
