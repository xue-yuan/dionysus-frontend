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

export const recipeService = {
  getIngredients(signal?: AbortSignal): Promise<Ingredient[]> {
    return get<Ingredient[]>("/ingredients", signal);
  },

  getTags(signal?: AbortSignal): Promise<Tag[]> {
    return get<Tag[]>("/tags", signal);
  },

  getRecipes(
    params: { page?: number; limit?: number; sort?: "asc" | "desc"; search?: string } = {},
    signal?: AbortSignal,
  ): Promise<RecipePage> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 12),
      sort: params.sort ?? "desc",
    });
    if (params.search) query.append("search", params.search);
    return get<RecipePage>(`/recipes?${query}`, signal);
  },

  // Used by the saved page so it fetches only the favourited recipes rather
  // than downloading the whole archive and filtering in the browser.
  getRecipesByIds(ids: string[], signal?: AbortSignal): Promise<RecipePage> {
    if (ids.length === 0) return Promise.resolve({ items: [], total: 0 });
    const query = new URLSearchParams({ ids: ids.join(",") });
    return get<RecipePage>(`/recipes/by-ids?${query}`, signal);
  },

  getRecipe(id: string, signal?: AbortSignal): Promise<Recipe> {
    return get<Recipe>(`/recipes/${id}`, signal);
  },

  matchCocktails(
    params: {
      ownedIngredientIds: string[];
      minStrength?: number;
      tagIds?: string[];
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
        tag_ids: params.tagIds ?? [],
        allow_substitutes: params.allowSubstitutes ?? false,
      }),
      signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res));
      return res.json();
    });
  },
};
