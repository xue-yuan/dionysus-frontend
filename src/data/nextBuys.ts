import type { RecipeMatchResult } from "../types";

export interface NextBuy {
  ingredientId: string;
  /** The near misses this one ingredient would complete. */
  recipes: RecipeMatchResult[];
}

/**
 * What to buy next, ranked by how many near misses each ingredient completes.
 *
 * A near miss lacks exactly one requirement, and buying that exact bottle always
 * finishes it. With substitutes allowed another bottle of the same family might
 * finish it too, but only when the requirement is not strict, and the match
 * result does not say which — so a count here is a floor, never a promise the
 * shelf cannot keep.
 *
 * Ties keep the order the recipes arrived in, which is the server's (by title),
 * so the list does not reshuffle when the page's sort direction flips.
 */
export function nextBuys(matches: RecipeMatchResult[], limit = 5): NextBuy[] {
  const byIngredient = new Map<string, RecipeMatchResult[]>();
  for (const match of matches) {
    if (match.missing_count !== 1) continue;
    const id = match.missing_ingredients?.[0];
    if (!id) continue;
    const recipes = byIngredient.get(id);
    if (recipes) recipes.push(match);
    else byIngredient.set(id, [match]);
  }

  return [...byIngredient]
    .map(([ingredientId, recipes]) => ({ ingredientId, recipes }))
    .sort((a, b) => b.recipes.length - a.recipes.length)
    .slice(0, limit);
}
