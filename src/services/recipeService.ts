import type { Ingredient, Recipe, RecipeMatchResult, Tag } from "../types";

// Relative by default so the deployed app talks to its own origin. Set
// VITE_API_BASE when the API lives somewhere else; in development Vite's proxy
// forwards /api to the Go server.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
  } catch {
    // fall through to the status text
  }
  return `${res.status} ${res.statusText}`;
}

export interface RecipePage {
  items: Recipe[];
  total: number;
}

/**
 * The server caps `by-ids` at 100 so a single request cannot ask for the whole
 * archive. A long-standing collection passes that, so the client splits its own
 * request rather than letting the saved page fail with "too many ids requested".
 */
export const BY_IDS_BATCH_SIZE = 100;

/**
 * How a recipe is named in a URL: its translation key without the "recipe."
 * prefix, underscores written as hyphens — `recipe.whiskey_sour` becomes
 * `whiskey-sour`. Ids differ between databases seeded separately, so a link
 * built from one would not open on another; the key is the same everywhere.
 * The server reverses this in `recipeKeyFromSlug`.
 */
export function recipeSlug(recipe: { id: string; translation_key?: string }): string {
  const key = recipe.translation_key?.replace(/^recipe\./, "");
  return key ? key.replaceAll("_", "-") : recipe.id;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

export const recipeService = {
  getIngredients(signal?: AbortSignal): Promise<Ingredient[]> {
    return get<Ingredient[]>("/ingredients", signal);
  },

  getTags(signal?: AbortSignal): Promise<Tag[]> {
    return get<Tag[]>("/tags", signal);
  },

  getRecipes(
    params: {
      page?: number;
      limit?: number;
      sort?: "asc" | "desc";
      search?: string;
      /**
       * Translation keys whose localised text matched the search. The server
       * holds only English title and description, so without these a reader
       * searching in Chinese matches nothing.
       */
      keys?: string[];
      /** Palate and style tags, filtered as the server's tagFilter describes. */
      tagIds?: string[];
      /** A base spirit, e.g. "Brandy": recipes calling for any bottle with that base. */
      base?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<RecipePage> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 12),
      sort: params.sort ?? "desc",
    });
    if (params.search) {
      query.append("search", params.search);
      if (params.keys?.length) query.append("keys", params.keys.join(","));
    }
    if (params.tagIds?.length) query.append("tags", params.tagIds.join(","));
    if (params.base) query.append("base", params.base);
    return get<RecipePage>(`/recipes?${query}`, signal);
  },

  // Used by the saved page so it fetches only the favourited recipes rather
  // than downloading the whole archive and filtering in the browser.
  async getRecipesByIds(ids: string[], signal?: AbortSignal): Promise<RecipePage> {
    if (ids.length === 0) return { items: [], total: 0 };

    const pages = await Promise.all(
      chunk(ids, BY_IDS_BATCH_SIZE).map((batch) =>
        get<RecipePage>(`/recipes/by-ids?${new URLSearchParams({ ids: batch.join(",") })}`, signal),
      ),
    );

    const items = pages.flatMap((page) => page.items ?? []);
    return { items, total: items.length };
  },

  /** Accepts an id or a `recipeSlug`. */
  getRecipe(ref: string, signal?: AbortSignal): Promise<Recipe> {
    return get<Recipe>(`/recipes/${encodeURIComponent(ref)}`, signal);
  },

  matchCocktails(
    params: {
      ownedIngredientIds: string[];
      minStrength?: number;
      maxStrength?: number;
      /** Palate filters: keep recipes carrying any of these. */
      tagIds?: string[];
      /** Tools the user does not have: drop recipes carrying any of these. */
      excludeTagIds?: string[];
      allowSubstitutes?: boolean;
    },
    signal?: AbortSignal,
  ): Promise<RecipeMatchResult[]> {
    return fetch(`${API_BASE}/match-cocktails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owned_ingredient_ids: params.ownedIngredientIds,
        min_strength: params.minStrength ?? 0,
        max_strength: params.maxStrength ?? 0,
        tag_ids: params.tagIds ?? [],
        exclude_tag_ids: params.excludeTagIds ?? [],
        allow_substitutes: params.allowSubstitutes ?? false,
      }),
      signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res));
      return res.json();
    });
  },
};
