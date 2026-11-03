import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { compositeLogo, selectLogoByContrast } from "./aiImageGenerator";

test("compone el logo real sin borrar el blanco ni deformar su proporción", async () => {
  const base = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#336699" },
  }).png().toBuffer();
  const logo = await sharp({
    create: { width: 200, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  }).composite([{ input: { create: { width: 80, height: 30, channels: 4, background: "#ffffff" } }, left: 20, top: 35 }]).png().toBuffer();

  const result = await compositeLogo(base, 400, 300, logo);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 400);
  assert.equal(metadata.height, 300);

  const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  let whitePixels = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) whitePixels++;
  }
  assert.ok(whitePixels > 0, "el blanco del logo debe sobrevivir a la composición");
});

test("elige la versión del logo con mayor contraste para la zona prevista", async () => {
  const base = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#eeeeee" } }).png().toBuffer();
  const dark = await sharp({ create: { width: 80, height: 30, channels: 4, background: "#102030" } }).png().toBuffer();
  const light = await sharp({ create: { width: 80, height: 30, channels: 4, background: "#ffffff" } }).png().toBuffer();
  assert.equal(await selectLogoByContrast(base, 400, 300, [light, dark]), dark);
});
