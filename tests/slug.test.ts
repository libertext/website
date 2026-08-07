import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "@/lib/utils/slug";

describe("slugify (Turkish)", () => {
  it("normalizes Turkish characters", () => {
    expect(slugify("Çocuğun Cinsel İstismarı Suçu")).toBe("cocugun-cinsel-istismari-sucu");
  });
  it("collapses spaces and strips punctuation", () => {
    expect(slugify("Yapay  Zeka: İçerik!")).toBe("yapay-zeka-icerik");
  });
  it("trims dashes", () => {
    expect(slugify("--merhaba--")).toBe("merhaba");
  });
});

describe("uniqueSlug", () => {
  it("appends a suffix when taken", () => {
    const taken = new Set(["merhaba", "merhaba-2"]);
    expect(uniqueSlug("Merhaba", taken)).toBe("merhaba-3");
  });
});
