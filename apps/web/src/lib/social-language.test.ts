import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeSocialContentLanguage } from "./social-language";

describe("social content language", () => {
  for (const code of ["en", "en_VI", "en-US", " EN_vi "]) {
    it(`recognizes English code ${code}`, () => {
      assert.equal(describeSocialContentLanguage(code), "inglés");
    });
  }

  for (const code of ["es", "es_ES", "fr_FR", ""]) {
    it(`keeps non-English code ${code} in the default language`, () => {
      assert.equal(describeSocialContentLanguage(code), "español");
    });
  }
});
