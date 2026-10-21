import assert from "node:assert/strict";
import test from "node:test";
import { analyzeLogoStyle, assertRenderedSlideIsSafe, createCarouselPlan, validateRenderedSlide } from "./carouselDesign";

test("crea un carrusel de cinco láminas numeradas sin obligar a mostrar el logo", () => {
  const plan = createCarouselPlan(
    { primaryColors: ["#102A43"], secondaryColors: ["#D9825B"], tone: "editorial", includeLogo: false },
    Array.from({ length: 5 }, (_, index) => ({
      mode: index === 0 ? "text" as const : index === 1 ? "images" as const : "mixed" as const,
      headline: `Idea ${index + 1}`,
      imageRequired: index !== 0,
    })),
  );
  assert.equal(plan.width, 1080);
  assert.equal(plan.height, 1350);
  assert.deepEqual(plan.slides.map((slide) => slide.label), ["01/05", "02/05", "03/05", "04/05", "05/05"]);
  assert.equal(plan.brand.includeLogo, false);
});

test("rechaza texto cortado, fuera del área segura o ilegible", () => {
  const errors = validateRenderedSlide({
    width: 1080,
    height: 1350,
    textBlocks: [
      { text: "Texto cortado", x: 70, y: 100, width: 950, height: 80, fontSize: 42 },
      { text: "Texto pequeño", x: 80, y: 200, width: 200, height: 40, fontSize: 20 },
    ],
  });
  assert.equal(errors.some((error) => error.includes("desborda")), true);
  assert.equal(errors.some((error) => error.includes("pequeño")), true);
  assert.throws(() => assertRenderedSlideIsSafe({
    width: 1080,
    height: 1350,
    textBlocks: [{ text: "Fuera", x: 0, y: 0, width: 100, height: 30, fontSize: 32 }],
  }));
});

test("deriva colores y tono del logo sin consumir una llamada de IA", async () => {
  const logo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#112233"/></svg>`);
  const brand = await analyzeLogoStyle(logo);
  assert.equal(brand.includeLogo, false);
  assert.equal(brand.primaryColors.length, 1);
  assert.match(brand.primaryColors[0], /^#[0-9a-f]{6}$/);
  assert.equal(brand.secondaryColors.length, 3);
  assert.equal(typeof brand.tone, "string");
});
