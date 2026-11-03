import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { tagsResource } from "../data/catalog";

/**
 * What the user has on the shelf and how they want results filtered.
 *
 * This lives in a store rather than inside the Home page because the recipe
 * modal needs the same inventory to decide which ingredients are owned. It used
 * to read this key straight out of localStorage, which meant two copies of the
 * storage-key string and no reactivity.
 */
/**
 * Strength as three bands rather than a 0–5 floor. People reach for "something
 * light tonight" far more than "at least a 3", and the slider could only say
 * the latter. The bounds split the book roughly 23 / 58 / 61.
 */
export const STRENGTH_BANDS = {
  any: [0, 0],
  light: [1, 2],
  medium: [3, 3],
  strong: [4, 5],
} as const;

export type StrengthBand = keyof typeof STRENGTH_BANDS;

const isBand = (value: unknown): value is StrengthBand =>
  typeof value === "string" && value in STRENGTH_BANDS;

export interface InventoryState {
  ownedIngredients: string[];
  /** Palate and style filters: any within a type, all across types. */
  selectedTags: string[];
  /**
   * Equipment the user does not have. Stored as the exception rather than the
   * rule, so a shelf that never opens the equipment section is assumed to own
   * every tool and nothing is hidden.
   */
  missingTools: string[];
  strength: StrengthBand;
  sortDirection: "asc" | "desc";
  showFavorites: boolean;
  allowSubstitutes: boolean;
}

const STORAGE_KEY = "dionysus_studio_state_v2";

const EMPTY: InventoryState = {
  ownedIngredients: [],
  selectedTags: [],
  missingTools: [],
  strength: "any",
  sortDirection: "desc",
  showFavorites: false,
  allowSubstitutes: false,
};

function load(): InventoryState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...EMPTY };
    const parsed = JSON.parse(stored);
    return {
      ownedIngredients: parsed.ownedIngredients ?? [],
      selectedTags: parsed.selectedTags ?? [],
      missingTools: parsed.missingTools ?? [],
      // A stored floor of 4 or 5 already meant "strong"; any lower floor let
      // most of the book through, which "any" now says plainly.
      strength: isBand(parsed.strength)
        ? parsed.strength
        : (parsed.minStrength ?? 0) >= 4
          ? "strong"
          : "any",
      sortDirection: parsed.sortDirection === "asc" ? "asc" : "desc",
      showFavorites: Boolean(parsed.showFavorites),
      allowSubstitutes: Boolean(parsed.allowSubstitutes),
    };
  } catch {
    return { ...EMPTY };
  }
}

const [state, setState] = createStore<InventoryState>(load());

createRoot(() => {
  createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  });

  // Equipment used to be stored alongside the palate filters and sent as "only
  // drinks that use this", so a shelf saved then may still hold a ticked
  // "Shaker" that hides every stirred drink. Once the catalogue says which ids
  // are filters, anything else — tools, and tags since removed — is dropped.
  createEffect(() => {
    const tags = tagsResource();
    if (!tags) return;
    const filters = new Set(tags.filter((t) => t.type !== "Equipment").map((t) => t.id));
    if (state.selectedTags.some((id) => !filters.has(id))) {
      setState("selectedTags", (prev) => prev.filter((id) => filters.has(id)));
    }
  });
});

function toggle(key: "ownedIngredients" | "selectedTags" | "missingTools", id: string) {
  setState(key, (prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

export const inventoryStore = {
  get ownedIngredients() {
    return state.ownedIngredients;
  },
  get selectedTags() {
    return state.selectedTags;
  },
  get missingTools() {
    return state.missingTools;
  },
  get strength() {
    return state.strength;
  },
  get sortDirection() {
    return state.sortDirection;
  },
  get showFavorites() {
    return state.showFavorites;
  },
  get allowSubstitutes() {
    return state.allowSubstitutes;
  },

  owns(id: string) {
    return state.ownedIngredients.includes(id);
  },
  hasTag(id: string) {
    return state.selectedTags.includes(id);
  },
  hasTool(id: string) {
    return !state.missingTools.includes(id);
  },

  toggleIngredient(id: string) {
    toggle("ownedIngredients", id);
  },
  toggleTag(id: string) {
    toggle("selectedTags", id);
  },
  toggleTool(id: string) {
    toggle("missingTools", id);
  },

  /** Swap the whole shelf for another — a shared link the user chose to use. */
  replaceIngredients(ids: string[]) {
    setState("ownedIngredients", [...ids]);
  },

  addIngredients(ids: string[]) {
    setState("ownedIngredients", (prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
  },

  clear() {
    setState({ ownedIngredients: [], selectedTags: [], missingTools: [] });
  },

  setStrength(band: StrengthBand) {
    setState("strength", band);
  },
  setAllowSubstitutes(value: boolean) {
    setState("allowSubstitutes", value);
  },
  toggleSortDirection() {
    setState("sortDirection", (d) => (d === "desc" ? "asc" : "desc"));
  },
  toggleShowFavorites() {
    setState("showFavorites", (v) => !v);
  },
};
