import { createEffect, createRoot, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { Units } from "../data/measure";

/**
 * Day or night. The page follows the system setting until the reader picks one
 * with the header toggle; that choice is stored and written to
 * `<html data-scheme>`, which index.css reads.
 *
 * This replaced four accent themes over one paper ground. Switching between
 * them recoloured a logo dot and a few rules — nobody could tell — whereas a
 * night page is something people reading at a dim bar actually want.
 */
export type Scheme = "light" | "dark";

const STORAGE_KEY = "dionysus_user_store_v1";

/** The paper colour of each scheme, for the browser's own chrome. */
const THEME_COLOR: Record<Scheme, string> = { light: "#f7f3ec", dark: "#171412" };

interface UserState {
  favorites: string[];
  /** The reader's explicit choice; absent means follow the system. */
  scheme?: Scheme;
  /** How the recipe sheet shows liquid measures. */
  units: Units;
}

const isScheme = (value: unknown): value is Scheme => value === "light" || value === "dark";

// A stored `theme` from the accent switcher is simply ignored.
function load(): UserState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { favorites: [], units: "ml" };
    const parsed = JSON.parse(stored);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      scheme: isScheme(parsed.scheme) ? parsed.scheme : undefined,
      units: parsed.units === "oz" ? "oz" : "ml",
    };
  } catch {
    return { favorites: [], units: "ml" };
  }
}

const [state, setState] = createStore<UserState>(load());

const media = window.matchMedia("(prefers-color-scheme: dark)");
const [systemDark, setSystemDark] = createSignal(media.matches);
media.addEventListener("change", (e) => setSystemDark(e.matches));

const effectiveScheme = (): Scheme => state.scheme ?? (systemDark() ? "dark" : "light");

createRoot(() => {
  createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  });
  createEffect(() => {
    const html = document.documentElement;
    if (state.scheme) html.setAttribute("data-scheme", state.scheme);
    else html.removeAttribute("data-scheme");
    // index.html carries one theme-color per system scheme; an explicit choice
    // has to win over both.
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = THEME_COLOR[effectiveScheme()];
    }
  });
});

export const userStore = {
  get favorites() {
    return state.favorites;
  },
  /** The scheme on screen, whether chosen or inherited from the system. */
  get scheme(): Scheme {
    return effectiveScheme();
  },
  get units() {
    return state.units;
  },

  toggleScheme() {
    setState("scheme", effectiveScheme() === "dark" ? "light" : "dark");
  },

  setUnits(units: Units) {
    setState("units", units);
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
