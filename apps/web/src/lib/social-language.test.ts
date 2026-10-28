import { describe, expect, it } from "vitest";
import { describeSocialContentLanguage } from "./social-language";

describe("social content language", () => {
  it.each(["en", "en_VI", "en-US", " EN_vi "])("recognizes English code %s", (code) => {
    expect(describeSocialContentLanguage(code)).toBe("inglés");
  });

  it.each(["es", "es_ES", "fr_FR", ""])("keeps non-English code %s in the default language", (code) => {
    expect(describeSocialContentLanguage(code)).toBe("español");
  });
});
