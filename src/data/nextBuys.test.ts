import { describe, expect, it } from "vite-plus/test";
import type { RecipeMatchResult } from "../types";
import { nextBuys } from "./nextBuys";

const match = (title: string, missing: string[] = []): RecipeMatchResult => ({
  id: title,
  title,
  description: "",
  image_url: "",
  total_ingredients: 3,
  owned_count: 3 - missing.length,
  missing_count: missing.length,
  missing_ingredients: missing,
  sweetness: 1,
  sourness: 1,
  strength: 1,
  glassware: "Coupe",
  method: "Shake",
});

describe("nextBuys", () => {
  it("ranks ingredients by how many near misses they complete", () => {
    const buys = nextBuys([
      match("Daiquiri", ["rum"]),
      match("Mint Julep", ["mint"]),
      match("Mojito", ["rum"]),
      match("Southside", ["mint"]),
      match("Planter's Punch", ["rum"]),
    ]);

    expect(buys.map((b) => b.ingredientId)).toEqual(["rum", "mint"]);
    expect(buys[0].recipes.map((r) => r.title)).toEqual(["Daiquiri", "Mojito", "Planter's Punch"]);
  });

  it("ignores drinks that are already makeable", () => {
    expect(nextBuys([match("Negroni"), match("Gimlet")])).toEqual([]);
  });

  // The order should not depend on the page's strength sort, so ties fall back
  // to the order the server sent, which is by title.
  it("keeps arrival order for ties", () => {
    const buys = nextBuys([
      match("Americano", ["soda"]),
      match("Bee's Knees", ["honey"]),
      match("Cardinale", ["dry-vermouth"]),
    ]);
    expect(buys.map((b) => b.ingredientId)).toEqual(["soda", "honey", "dry-vermouth"]);
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => match(`Drink ${i}`, [`ingredient-${i}`]));
    expect(nextBuys(many, 5)).toHaveLength(5);
  });
});
