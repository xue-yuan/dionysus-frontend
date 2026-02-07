import type { CreateRecipeRequest, Ingredient, Recipe, RecipeMatchResult, Tag } from "../types";

const API_BASE = "http://localhost:8080/api";

export const recipeService = {
    async getIngredients(): Promise<Ingredient[]> {
        const res = await fetch(`${API_BASE}/ingredients`);
        if (!res.ok) throw new Error("Failed to fetch ingredients");
        return res.json();
    },

    async getRecipes(params: { page?: number; limit?: number; sort?: 'asc' | 'desc' } = {}): Promise<{ items: Recipe[], total: number }> {
        const query = new URLSearchParams({
            page: (params.page || 1).toString(),
            limit: (params.limit || 12).toString(),
            sort: params.sort || 'desc'
        });
        const res = await fetch(`${API_BASE}/recipes?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch recipes");
        return res.json();
    },

    async getRecipe(id: string): Promise<Recipe> {
        const res = await fetch(`${API_BASE}/recipes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch recipe");
        return res.json();
    },

    async createRecipe(req: CreateRecipeRequest): Promise<Recipe> {
        const res = await fetch(`${API_BASE}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to create recipe");
        }
        return res.json();
    },

    async getTags(): Promise<Tag[]> {
        const res = await fetch(`${API_BASE}/tags`);
        if (!res.ok) throw new Error("Failed to fetch tags");
        return res.json();
    },

    async matchCocktails(ownedIngredientIds: string[], minStrength: number = 0, tagIds: string[] = []): Promise<RecipeMatchResult[]> {
        const res = await fetch(`${API_BASE}/match-cocktails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                owned_ingredient_ids: ownedIngredientIds,
                min_strength: minStrength,
                tag_ids: tagIds
            }),
        });
        if (!res.ok) throw new Error("Failed to match cocktails");
        return res.json();
    }
};
