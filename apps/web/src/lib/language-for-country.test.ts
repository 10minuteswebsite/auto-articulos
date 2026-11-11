import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestedLanguageForCountry } from "./language-for-country";

test("países de habla inglesa proponen inglés", () => {
  assert.equal(suggestedLanguageForCountry("US"), "en");
  assert.equal(suggestedLanguageForCountry("gb"), "en");
});
test("el resto y lo vacío proponen español", () => {
  assert.equal(suggestedLanguageForCountry("MX"), "es");
  assert.equal(suggestedLanguageForCountry(""), "es");
  assert.equal(suggestedLanguageForCountry(null), "es");
});
