export const INSTAGRAM_CAROUSEL = {
  width: 1080,
  height: 1350,
  slideCount: 5,
  safeMargin: 72,
} as const;

export const INSTAGRAM_STORY = {
  width: 1080,
  height: 1920,
  safeMargin: 120,
} as const;

export type CarouselVisualMode = "text" | "images" | "mixed";

export type BrandVisualReference = {
  primaryColors: string[];
  secondaryColors: string[];
  fontFamilyHint?: string;
  tone?: string;
  includeLogo: boolean;
};

/** Deriva una referencia de marca desde el archivo del logo sin llamar a IA. */
export async function analyzeLogoStyle(logo: Buffer): Promise<BrandVisualReference> {
  const stats = await sharp(logo).stats();
  const channels = stats.channels.slice(0, 3);
  const rgb = channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel.mean))));
  while (rgb.length < 3) rgb.push(rgb[rgb.length - 1] ?? 128);
  const primary = `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  const secondary = rgb.map((value, index) => {
    const adjusted = Math.max(0, Math.min(255, value + (index === 1 ? 18 : -18)));
    const variant = [...rgb];
    variant[index] = adjusted;
    return `#${variant.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  });
  const luminance = channels.reduce((sum, channel) => sum + channel.mean, 0) / Math.max(channels.length, 1);
  return {
    primaryColors: [primary],
    secondaryColors: secondary,
    tone: luminance < 110 ? "contraste alto y sobrio" : luminance > 190 ? "luminoso y limpio" : "equilibrado y profesional",
    includeLogo: false,
  };
}

export type CarouselSlidePlan = {
  index: number;
  label: `${number}/05`;
  mode: CarouselVisualMode;
  headline: string;
  body?: string;
  imageRequired: boolean;
};

export type CarouselDesignPlan = {
  width: number;
  height: number;
  slideCount: number;
  safeMargin: number;
  brand: BrandVisualReference;
  slides: CarouselSlidePlan[];
};

export type RenderedTextBlock = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

export type RenderedSlide = {
  width: number;
  height: number;
  textBlocks: RenderedTextBlock[];
};

export function createCarouselPlan(
  brand: BrandVisualReference,
  slides: Array<Omit<CarouselSlidePlan, "index" | "label">>,
): CarouselDesignPlan {
  if (slides.length !== INSTAGRAM_CAROUSEL.slideCount) {
    throw new Error(`El carrusel debe tener exactamente ${INSTAGRAM_CAROUSEL.slideCount} láminas.`);
  }
  return {
    ...INSTAGRAM_CAROUSEL,
    brand: { ...brand, includeLogo: Boolean(brand.includeLogo) },
    slides: slides.map((slide, index) => ({
      ...slide,
      index,
      label: `${String(index + 1).padStart(2, "0")}/05` as `${number}/05`,
    })),
  };
}

export function validateRenderedSlide(slide: RenderedSlide, safeMargin = INSTAGRAM_CAROUSEL.safeMargin): string[] {
  const errors: string[] = [];
  if (slide.width !== INSTAGRAM_CAROUSEL.width || slide.height !== INSTAGRAM_CAROUSEL.height) {
    errors.push("La lámina no tiene el tamaño estándar 1080×1350.");
  }
  for (const block of slide.textBlocks) {
    if (!block.text.trim()) errors.push("Existe un bloque de texto vacío.");
    if (block.fontSize < 26) errors.push(`El texto «${block.text.slice(0, 40)}» es demasiado pequeño.`);
    if (block.x < safeMargin || block.y < safeMargin) errors.push(`El texto «${block.text.slice(0, 40)}» invade el margen seguro.`);
    if (block.x + block.width > slide.width - safeMargin || block.y + block.height > slide.height - safeMargin) {
      errors.push(`El texto «${block.text.slice(0, 40)}» se desborda o puede quedar cortado.`);
    }
  }
  return errors;
}

export function assertRenderedSlideIsSafe(slide: RenderedSlide, safeMargin = INSTAGRAM_CAROUSEL.safeMargin): void {
  const errors = validateRenderedSlide(slide, safeMargin);
  if (errors.length > 0) throw new Error(errors.join(" "));
}
import sharp from "sharp";
