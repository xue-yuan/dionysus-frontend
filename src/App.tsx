import { Router, Route } from "@solidjs/router";
import { lazy, createSignal, Show, For, createEffect } from "solid-js";
import "./index.css";
import { userStore } from "./stores/userStore";
import { recipeService } from "./services/recipeService";
import type { Ingredient } from "./types";

const Home = lazy(() => import("./pages/Home.tsx"));
const AddRecipe = lazy(() => import("./pages/AddRecipe.tsx"));
const RecipeGallery = lazy(() => import("./pages/RecipeGallery.tsx"));
const RecipeDetails = lazy(() => import("./pages/RecipeDetails.tsx"));

function App() {
  const [showShoppingList, setShowShoppingList] = createSignal(false);
  const [ingredients, setIngredients] = createSignal<Ingredient[]>([]);

  createEffect(async () => {
    if (showShoppingList() && ingredients().length === 0) {
      try {
        const data = await recipeService.getIngredients();
        setIngredients(data);
      } catch (e) {
        console.error(e);
      }
    }
  });

  const getIngredientName = (id: string) => ingredients().find(i => i.id === id)?.name || "Unknown Ingredient";

  return (
    <div class="min-h-screen bg-base-100 text-base-content font-sans relative">
      <Router>
        <Route path="/" component={Home} />
        <Route path="/add" component={AddRecipe} />
        <Route path="/recipes" component={RecipeGallery} />
        <Route path="/recipes/:id" component={RecipeDetails} />
      </Router>

      <div class="fixed bottom-6 right-6 z-50" style={{ display: 'none' }}>
        <div class="indicator">
          <Show when={userStore.shoppingList.length > 0}>
            <span class="indicator-item badge badge-primary">{userStore.shoppingList.length}</span>
          </Show>
          <button
            class="btn btn-circle btn-lg btn-primary shadow-xl hover:scale-110 transition-transform"
            onClick={() => setShowShoppingList(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </button>
        </div>
      </div>

      <dialog class="modal modal-bottom sm:modal-middle" open={showShoppingList()}>
        <div class="modal-box relative">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowShoppingList(false)}>✕</button>
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-2xl">🛒</span> Shopping List
          </h3>

          <Show when={userStore.shoppingList.length === 0}>
            <div class="text-center py-10 opacity-50">
              <p>Your list is empty.</p>
              <p class="text-xs mt-2">Add missing ingredients from recipes!</p>
            </div>
          </Show>

          <ul class="menu bg-base-100 w-full p-0">
            <For each={userStore.shoppingList}>{(id) => (
              <li class="border-b border-base-200 last:border-none">
                <div class="flex justify-between items-center py-3">
                  <span class="font-medium">{getIngredientName(id)}</span>
                  <button class="btn btn-ghost btn-xs text-error" onClick={() => userStore.removeFromShoppingList(id)}>Remove</button>
                </div>
              </li>
            )}</For>
          </ul>

          <div class="modal-action">
            <Show when={userStore.shoppingList.length > 0}>
              <button class="btn btn-outline btn-error btn-sm" onClick={() => userStore.clearShoppingList()}>Clear All</button>
            </Show>
            <button class="btn btn-primary btn-sm" onClick={() => {
              const text = userStore.shoppingList.map(id => getIngredientName(id)).join("\n");
              navigator.clipboard.writeText(text);
              alert("List copied to clipboard!");
            }}>Copy to Clipboard</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button onClick={() => setShowShoppingList(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default App;
