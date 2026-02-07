export interface Ingredient {
    id: string;
    name: string;
    category: string;
}

export interface RecipeIngredient {
    ingredient_id: string;
    name?: string;
    category?: string;
    amount: string;
    unit: string;
}

export interface Recipe {
    id: string;
    title: string;
    description: string;
    glassware: string;
    method: string;
    steps: string;
    image_url: string;
    sweetness: number;
    sourness: number;
    strength: number;
    ingredients?: RecipeIngredient[];
    tags?: Tag[];
    created_at: string;
}

export interface Tag {
    id: string;
    name: string;
    type: string;
}

export interface CreateRecipeRequest {
    title: string;
    description: string;
    glassware: string;
    method: string;
    steps: string;
    image_url: string;
    ingredients: {
        ingredient_id: string;
        amount: string;
        unit: string;
    }[];
}

export interface RecipeMatchResult {
    id: string;
    title: string;
    description: string;
    image_url: string;
    total_ingredients: number;
    owned_count: number;
    missing_count: number;
    missing_ingredients?: string[];
    sweetness: number;
    sourness: number;
    strength: number;
    tags?: string[];
    glassware: string;
    method: string;
}
