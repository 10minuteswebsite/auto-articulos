import sharp from "sharp";
import type { CarouselDesignPlan, CarouselSlidePlan } from "./carouselDesign";
import { INSTAGRAM_CAROUSEL } from "./carouselDesign";

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

function wrapText(value: string, maxChars: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock(text: string, x: number, y: number, fontSize: number, color: string, maxChars: number): string {
  const lines = wrapText(text, maxChars);
  return lines.map((line, index) => `<text x="${x}" y="${y + index * Math.round(fontSize * 1.22)}" font-family="Arial, sans-serif" font-size="${fontSize}px" font-weight="700" fill="${color}">${escapeXml(line)}</text>`).join("");
}

function slideSvg(plan: CarouselDesignPlan, slide: CarouselSlidePlan): string {
  const [primary = "#102A43"] = plan.brand.primaryColors;
  const [accent = "#D9825B"] = plan.brand.secondaryColors;
  const cream = "#F7F0E5";
  const isText = slide.mode === "text";
  const isImage = slide.mode === "images";
  const headlineColor = isText ? cream : primary;
  const background = isText ? primary : cream;
  const accentText = isText ? cream : accent;
  const imagePanel = isImage || slide.mode === "mixed"
    ? `<rect x="72" y="330" width="936" height="570" rx="28" fill="${accent}" opacity="0.18"/><circle cx="540" cy="615" r="150" fill="${accent}" opacity="0.28"/><path d="M180 820 C320 680 420 770 540 610 C660 450 790 580 900 430 L900 900 L180 900 Z" fill="${primary}" opacity="0.22"/>`
    : "";
  const body = slide.body ? textBlock(slide.body, 96, 1000, 34, isText ? cream : primary, 40) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${INSTAGRAM_CAROUSEL.width}" height="${INSTAGRAM_CAROUSEL.height}" viewBox="0 0 ${INSTAGRAM_CAROUSEL.width} ${INSTAGRAM_CAROUSEL.height}">
    <rect width="100%" height="100%" fill="${background}"/>
    <circle cx="1030" cy="40" r="170" fill="${accent}" opacity="0.92"/>
    <text x="72" y="98" font-family="Arial, sans-serif" font-size="30px" font-weight="700" fill="${accentText}">${slide.label}</text>
    <line x1="190" y1="88" x2="390" y2="88" stroke="${accentText}" stroke-width="4" opacity="0.8"/>
    ${imagePanel}
    ${textBlock(slide.headline, 96, isImage ? 970 : 420, isText ? 78 : 64, headlineColor, isText ? 18 : 24)}
    ${body}
  </svg>`;
}

export async function renderCarouselSlide(plan: CarouselDesignPlan, slideIndex: number): Promise<Buffer> {
  const slide = plan.slides[slideIndex];
  if (!slide) throw new Error(`No existe la lámina ${slideIndex + 1}.`);
  return sharp(Buffer.from(slideSvg(plan, slide))).png().toBuffer();
}

export async function renderCarousel(plan: CarouselDesignPlan): Promise<Buffer[]> {
  return Promise.all(plan.slides.map((_, index) => renderCarouselSlide(plan, index)));
}
