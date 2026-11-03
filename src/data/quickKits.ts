/**
 * One-click starter shelves.
 *
 * These reference ingredients by name, so they are checked against the catalogue
 * at runtime and any entry that no longer exists is reported in the console
 * rather than silently disappearing from the kit.
 */
export interface QuickKit {
  label: string;
  /** Each kit is named after a drink, so it reuses that recipe's locale key. */
  translationKey: string;
  ingredients: string[];
}

export const QUICK_KITS: QuickKit[] = [
  {
    label: "Negroni",
    translationKey: "recipe.negroni",
    ingredients: ["London Dry Gin", "Campari", "Sweet Vermouth", "Orange Twist"],
  },
  {
    label: "Whiskey Sour",
    translationKey: "recipe.whiskey_sour",
    ingredients: ["Bourbon", "Simple Syrup", "Fresh Lemon Juice", "Egg White", "Angostura Bitters"],
  },
  {
    label: "Margarita",
    translationKey: "recipe.margarita",
    ingredients: ["Blanco Tequila", "Cointreau", "Fresh Lime Juice", "Salt"],
  },
];
