import { describe, expect, it } from "vite-plus/test";
import type { Ingredient } from "../types";
import { decodeShelf, encodeShelf } from "./shelfLink";

const catalogue: Ingredient[] = [
  {
    id: "a",
    name: "London Dry Gin",
    category: "Spirit",
    translation_key: "ingredient.london_dry_gin",
  },
  { id: "b", name: "Campari", category: "Liqueur", translation_key: "ingredient.campari" },
  {
    id: "c",
    name: "Sweet Vermouth",
    category: "Liqueur",
    translation_key: "ingredient.sweet_vermouth",
  },
];

describe("shelf links", () => {
  it("round-trip through the URL form", () => {
    const encoded = encodeShelf(["a", "b", "c"], catalogue);
    expect(encoded).toBe("london_dry_gin-campari-sweet_vermouth");
    expect(decodeShelf(encoded, catalogue)).toEqual(["a", "b", "c"]);
  });

  it("skips ids the catalogue does not know", () => {
    expect(encodeShelf(["a", "gone"], catalogue)).toBe("london_dry_gin");
  });

  // A link made against an older catalogue may name a bottle since removed.
  it("ignores keys it cannot resolve and repeats", () => {
    expect(decodeShelf("campari-no_such_bottle-campari-", catalogue)).toEqual(["b"]);
  });

  it("decodes an empty parameter to an empty shelf", () => {
    expect(decodeShelf("", catalogue)).toEqual([]);
  });
});
