import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { createCarouselPlan } from "./carouselDesign";
import { renderCarousel } from "./carouselRenderer";

test("renderiza cinco PNG del tamaño estándar sin insertar el logo", async () => {
  const plan = createCarouselPlan(
    { primaryColors: ["#102A43"], secondaryColors: ["#D9825B"], fontFamilyHint: "editorial", includeLogo: false },
    Array.from({ length: 5 }, (_, index) => ({
      mode: index === 0 ? "text" as const : index === 1 ? "images" as const : "mixed" as const,
      headline: `Señal ${index + 1}`,
      body: "Una explicación breve, clara y legible.",
      imageRequired: index !== 0,
    })),
  );
  const images = await renderCarousel(plan);
  assert.equal(images.length, 5);
  for (const image of images) {
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width, 1080);
    assert.equal(metadata.height, 1350);
    assert.equal(metadata.format, "png");
  }
});
