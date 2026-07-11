import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

interface UserState {
    favorites: string[];
    theme: string;
}

const STORAGE_KEY = "dionysus_user_store_v1";

function getInitialState(): UserState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return {
                favorites: parsed.favorites || [],
                theme: parsed.theme || "violet"
            };
        } catch (e) {
            console.error("Failed to parse user store", e);
        }
    }
    return { favorites: [], theme: "violet" };
}

const [state, setState] = createStore<UserState>(getInitialState());

createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.setAttribute('data-app-theme', state.theme || 'violet');
});

export const userStore = {
    get favorites() { return state.favorites; },
    get theme() { return state.theme || "violet"; },

    setTheme(newTheme: string) {
        setState("theme", newTheme);
    },

    toggleFavorite(recipeId: string) {
        if (state.favorites.includes(recipeId)) {
            setState("favorites", f => f.filter(id => id !== recipeId));
        } else {
            setState("favorites", f => [...f, recipeId]);
        }
    },

    isFavorite(recipeId: string) {
        return state.favorites.includes(recipeId);
    }
};
