import { createEffect, createRoot, createSignal, onCleanup } from "solid-js";
import { recipeService } from "../services/recipeService";
import { inventoryStore } from "../stores/inventoryStore";
import type { RecipeMatchResult } from "../types";

/**
 * What the shelf makes, with none of Home's filters applied, so the archive and
 * saved pages can mark each card "ready" or "missing X". Browsing the book used
 * to give no hint of which drinks were already within reach.
 *
 * One request per shelf change, shared by every page that imports this. Recipes
 * two or more ingredients away are simply absent.
 */
const matches = createRoot(() => {
  const [byId, setById] = createSignal(new Map<string, RecipeMatchResult>());

  createEffect(() => {
    const owned = [...inventoryStore.ownedIngredients];
    const allowSubstitutes = inventoryStore.allowSubstitutes;
    if (owned.length === 0) {
      setById(new Map());
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      recipeService
        .matchCocktails({ ownedIngredientIds: owned, allowSubstitutes }, controller.signal)
        .then((rows) => setById(new Map((rows ?? []).map((row) => [row.id, row]))))
        .catch((err: Error) => {
          // The marks are a hint; the page is still usable without them.
          if (err.name !== "AbortError") console.error("shelf match failed", err);
        });
    }, 300);

    onCleanup(() => {
      clearTimeout(timer);
      controller.abort();
    });
  });

  return byId;
});

export function shelfMatch(recipeId: string): RecipeMatchResult | undefined {
  return matches().get(recipeId);
}
