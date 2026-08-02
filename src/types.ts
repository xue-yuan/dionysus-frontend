export interface Ingredient {
  id: string;
  name: string;
  category: string;
  translation_key?: string;
  /** Interchangeable bottles share a family. Empty means never substitutable. */
  family?: string;
}

export interface RecipeIngredient {
  ingredient_id: string;
  name?: string;
  category?: string;
  translation_key?: string;
  family?: string;
  amount: string;
  unit: string;
  /** True when only this exact bottle will do. */
  strict?: boolean;
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
  translation_key?: string;
}

/** A bottle the user owns standing in for one the recipe asks for. */
export interface Substitution {
  required_id: string;
  substitute_id: string;
  family: string;
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
  substitutions?: Substitution[];
  sweetness: number;
  sourness: number;
  strength: number;
  translation_key?: string;
  tags?: Tag[];
  glassware: string;
  method: string;
}
