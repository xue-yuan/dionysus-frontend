import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";

/**
 * What the user has on the shelf and how they want results filtered.
 *
 * This lives in a store rather than inside the Home page because the recipe
 * modal needs the same inventory to decide which ingredients are owned. It used
 * to read this key straight out of localStorage, which meant two copies of the
 * storage-key string and no reactivity.
 */
export interface InventoryState {
  ownedIngredients: string[];
  selectedTags: string[];
  minStrength: number;
  sortDirection: "asc" | "desc";
  showFavorites: boolean;
  allowSubstitutes: boolean;
}

const STORAGE_KEY = "dionysus_studio_state_v2";

const EMPTY: InventoryState = {
  ownedIngredients: [],
  selectedTags: [],
  minStrength: 0,
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
      minStrength: parsed.minStrength ?? 0,
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
});

function toggle(key: "ownedIngredients" | "selectedTags", id: string) {
  setState(key, (prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

export const inventoryStore = {
  get ownedIngredients() {
    return state.ownedIngredients;
  },
  get selectedTags() {
    return state.selectedTags;
  },
  get minStrength() {
    return state.minStrength;
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

  toggleIngredient(id: string) {
    toggle("ownedIngredients", id);
  },
  toggleTag(id: string) {
    toggle("selectedTags", id);
  },

  addIngredients(ids: string[]) {
    setState("ownedIngredients", (prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
  },

  clear() {
    setState({ ownedIngredients: [], selectedTags: [] });
  },

  setMinStrength(value: number) {
    setState("minStrength", value);
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
