import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

interface UserState {
    favorites: string[];
    shoppingList: string[];
}

const STORAGE_KEY = "dionysus_user_store_v1";

function getInitialState(): UserState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse user store", e);
        }
    }
    return { favorites: [], shoppingList: [] };
}

const [state, setState] = createStore<UserState>(getInitialState());

createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
});

export const userStore = {
    get favorites() { return state.favorites; },
    get shoppingList() { return state.shoppingList; },

    toggleFavorite(recipeId: string) {
        if (state.favorites.includes(recipeId)) {
            setState("favorites", f => f.filter(id => id !== recipeId));
        } else {
            setState("favorites", f => [...f, recipeId]);
        }
    },

    addToShoppingList(ingredientId: string) {
        if (!state.shoppingList.includes(ingredientId)) {
            setState("shoppingList", list => [...list, ingredientId]);
        }
    },

    removeFromShoppingList(ingredientId: string) {
        setState("shoppingList", list => list.filter(id => id !== ingredientId));
    },

    clearShoppingList() {
        setState("shoppingList", []);
    },

    isFavorite(recipeId: string) {
        return state.favorites.includes(recipeId);
    },

    isInShoppingList(ingredientId: string) {
        return state.shoppingList.includes(ingredientId);
    }
};
