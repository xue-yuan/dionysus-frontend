import { createResource, createRoot } from "solid-js";
import { recipeService } from "../services/recipeService";
import type { Ingredient, Tag } from "../types";

/**
 * The ingredient and tag catalogue, fetched once per session.
 *
 * Both are small, immutable reference data. Creating the resources at module
 * scope means the page and the recipe modal share one request instead of each
 * fetching its own copy.
 */
const catalog = createRoot(() => {
  const [ingredients] = createResource(() => recipeService.getIngredients());
  const [tags] = createResource(() => recipeService.getTags());
  return { ingredients, tags };
});

export const ingredientsResource = catalog.ingredients;
export const tagsResource = catalog.tags;

export function ingredientList(): Ingredient[] {
  return ingredientsResource() ?? [];
}

export function tagList(): Tag[] {
  return tagsResource() ?? [];
}

export function findIngredient(id: string | undefined): Ingredient | undefined {
  if (!id) return undefined;
  return ingredientList().find((i) => i.id === id);
}

export function findTag(id: string | undefined): Tag | undefined {
  if (!id) return undefined;
  return tagList().find((t) => t.id === id);
}

/**
 * A tag as the archive's URL names it: `tag.party_drink` becomes
 * `party-drink`, the same shape as a recipe slug.
 */
export function tagSlug(tag: Tag): string {
  return (tag.translation_key ?? "").replace(/^tag\./, "").replaceAll("_", "-");
}

export function findTagBySlug(slug: string): Tag | undefined {
  return tagList().find((t) => tagSlug(t) === slug);
}
