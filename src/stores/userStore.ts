import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";

export const THEMES = [
  { key: "violet", label: "Violet Theme", swatch: "bg-[#A000FF]" },
  { key: "cyan", label: "Cyan Glacier Theme", swatch: "bg-[#00F2FF]" },
  { key: "cyberpunk", label: "Cyberpunk Theme", swatch: "bg-[#FF007F]" },
  { key: "emerald", label: "Emerald Theme", swatch: "bg-[#10B981]" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

const DEFAULT_THEME: ThemeKey = "violet";
const STORAGE_KEY = "dionysus_user_store_v1";

interface UserState {
  favorites: string[];
  theme: ThemeKey;
}

function isTheme(value: unknown): value is ThemeKey {
  return THEMES.some((t) => t.key === value);
}

function load(): UserState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { favorites: [], theme: DEFAULT_THEME };
    const parsed = JSON.parse(stored);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_THEME,
    };
  } catch {
    return { favorites: [], theme: DEFAULT_THEME };
  }
}

const [state, setState] = createStore<UserState>(load());

createRoot(() => {
  createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  });
  createEffect(() => {
    document.documentElement.setAttribute("data-app-theme", state.theme);
  });
});

export const userStore = {
  get favorites() {
    return state.favorites;
  },
  get theme() {
    return state.theme;
  },

  setTheme(theme: ThemeKey) {
    setState("theme", theme);
  },

  toggleFavorite(recipeId: string) {
    setState("favorites", (favorites) =>
      favorites.includes(recipeId)
        ? favorites.filter((id) => id !== recipeId)
        : [...favorites, recipeId],
    );
  },

  isFavorite(recipeId: string) {
    return state.favorites.includes(recipeId);
  },
};
