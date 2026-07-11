export interface Ingredient {
    id: string;
    name: string;
    category: string;
    translation_key?: string;
}

export interface RecipeIngredient {
    ingredient_id: string;
    name?: string;
    category?: string;
    translation_key?: string;
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
    translation_key?: string;
    ingredients?: RecipeIngredient[];
    tags?: Tag[];
    total_ingredients: number;
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
    sweetness?: number;
    sourness?: number;
    strength?: number;
    tags?: Tag[];
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
    translation_key?: string;
    tags?: Tag[];
    glassware: string;
    method: string;
}
