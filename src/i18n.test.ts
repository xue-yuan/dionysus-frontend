import { describe, expect, it } from "vite-plus/test";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";
import { resolveSearchKeys, slug } from "./i18n";
import { formatMeasure } from "./data/measure";

// The type assertions in i18n.tsx catch a missing key at build time, but only
// when someone runs tsc. This says the same thing where a test failure names
// the key directly.
describe("locale files", () => {
  it("hold the same keys in both directions", () => {
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zhTW).sort();
    expect(enKeys.filter((k) => !(k in zhTW))).toEqual([]);
    expect(zhKeys.filter((k) => !(k in en))).toEqual([]);
  });

  it("leave no value blank", () => {
    for (const [key, value] of Object.entries({ ...en, ...zhTW })) {
      expect(value, `${key} is empty`).not.toBe("");
    }
  });

  it("translate every method and glassware value the seed file uses", () => {
    // Mirrors the slug in i18n.tsx. These come from the database as English
    // enum-like values, so the key is derived rather than stored.
    const slug = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    const methods = ["Shake", "Stir", "Build", "Dry Shake & Shake", "Shake (Flash Blend)"];
    const glassware = ["Coupe", "Rocks", "Irish Coffee Glass", "Champagne Flute"];

    for (const value of methods) expect(en).toHaveProperty(`method.${slug(value)}`);
    for (const value of glassware) expect(en).toHaveProperty(`glassware.${slug(value)}`);
  });
});

describe("measures", () => {
  // Every amount/unit pair the seed file uses, as the sheet would receive it.
  // The units are English values in the database, so as with glassware the key
  // is derived and nothing fails if a locale entry is missing — except this.
  const seedMeasures: [string, string][] = [
    ["15", "ml"],
    ["0.25", "bar spoon"],
    ["2", "bar spoons"],
    ["4", "chunks"],
    ["1", "cube"],
    ["1", "dash"],
    ["2", "dashes"],
    ["2", "drops"],
    ["15", "float"],
    ["10", "leaves"],
    ["Half", "lime"],
    ["1", "pinch"],
    ["1", "rim"],
    ["1", "rinse"],
    ["1", "slice"],
    ["2", "slices"],
    ["Top", "splash"],
    ["1", "spoon"],
    ["1", "sprig"],
    ["1", "stalk"],
    ["1", "strip"],
    ["1", "tsp"],
    ["Top", "up"],
    ["1", "whole"],
  ];

  it("translate every measure the sheet can show, scaled or converted", () => {
    for (const table of [en, zhTW] as Record<string, string>[]) {
      for (const [amount, unit] of seedMeasures) {
        for (const servings of [1, 3]) {
          for (const units of ["ml", "oz"] as const) {
            const m = formatMeasure(amount, unit, servings, units);
            const phrase = `measure.${slug(m.amount)}_${slug(m.unit)}`;
            const unitKey = `unit.${slug(m.unit)}`;
            expect(
              phrase in table || unitKey in table,
              `${amount} ${unit} ×${servings} in ${units} -> "${m.amount} ${m.unit}"`,
            ).toBe(true);
          }
        }
      }
    }
  });
});

describe("resolveSearchKeys", () => {
  it("finds a recipe by its Chinese name", () => {
    // Whichever recipe it is, searching its zh-TW name must return its key.
    const [key, name] = Object.entries(zhTW).find(([k]) => k.startsWith("recipe."))!;
    expect(resolveSearchKeys(name)).toContain(key);
  });

  it("finds a recipe by its English name", () => {
    const [key, name] = Object.entries(en).find(([k]) => k.startsWith("recipe."))!;
    expect(resolveSearchKeys(name)).toContain(key);
  });

  it("is case-insensitive and ignores surrounding space", () => {
    const [key, name] = Object.entries(en).find(([k]) => k.startsWith("recipe."))!;
    expect(resolveSearchKeys(`  ${name.toUpperCase()}  `)).toContain(key);
  });

  it("returns nothing for an empty query", () => {
    expect(resolveSearchKeys("")).toEqual([]);
    expect(resolveSearchKeys("   ")).toEqual([]);
  });

  it("returns only recipe keys, never interface strings", () => {
    // "the" appears across plenty of interface copy; none of it may leak into
    // the keys sent to the server, which only matches recipes.translation_key.
    for (const key of resolveSearchKeys("the")) {
      expect(key.startsWith("recipe.")).toBe(true);
    }
  });

  it("matches nothing for a query no recipe carries", () => {
    expect(resolveSearchKeys("zzzzqqqq")).toEqual([]);
  });
});
