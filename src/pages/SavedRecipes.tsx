import type { Component } from "solid-js";
import { For, Show, createSignal, createMemo, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { recipeService } from "../services/recipeService";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { Layout, SiteFooter } from "../components/Layout";
import { userStore } from "../stores/userStore";
import type { Recipe } from "../types";
import { useI18n } from "../i18n";

const SavedRecipes: Component = () => {
  const { t, tName } = useI18n();
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");

  /**
   * Keyed on the favourites list, so removing a favourite from the modal
   * immediately refetches and the card disappears. The previous version awaited
   * inside a createEffect, which silently dropped the dependency on
   * userStore.favorites and left the list stale until a manual reload.
   */
  const [saved] = createResource(
    () => userStore.favorites.join(","),
    (ids: string) => recipeService.getRecipesByIds(ids ? ids.split(",") : []),
  );

  const recipes = () => saved()?.items ?? [];

  const filteredRecipes = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return recipes();
    return recipes().filter(
      (r) =>
        tName(r).toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        (r.description ?? "").toLowerCase().includes(query),
    );
  });

  return (
    <Layout scroll="scroll-container">
      <RecipeDetailModal recipe={selectedRecipe()} onClose={() => setSelectedRecipe(null)} />

      <div class="px-8 lg:px-16 pt-0 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col gap-8">
        <div class="sticky top-0 z-30 pt-4 pb-6 px-4 bg-transparent backdrop-blur-sm -mx-4">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div class="relative flex-grow max-w-md">
              <input
                type="search"
                aria-label={t("savedRecipes.searchPlaceholder") ?? undefined}
                placeholder={t("savedRecipes.searchPlaceholder")}
                class="input-studio w-full pr-10"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
              />
              <Show when={searchQuery()}>
                <button
                  type="button"
                  aria-label={t("home.inventory.clearSearch") ?? "Clear"}
                  onClick={() => setSearchQuery("")}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                >
                  ✕
                </button>
              </Show>
            </div>

            <div class="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl transition-all hover:border-white/20 hover:bg-white/[0.1] shadow-2xl self-end sm:self-auto h-12">
              <div class="px-8 flex items-center gap-4 whitespace-nowrap">
                <span class="text-[13px] font-black uppercase tracking-[0.4em] text-white/60">
                  {t("savedRecipes.secured", { count: filteredRecipes().length })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 relative">
          <Show when={saved.error}>
            <div class="mb-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
              <p class="text-sm font-black uppercase tracking-widest text-red-400">
                {t("savedRecipes.loadFailed")}
              </p>
            </div>
          </Show>

          <Show when={saved.loading}>
            <div class="py-40 flex flex-col items-center gap-6 opacity-40" role="status">
              <div class="relative w-16 h-16">
                <div class="absolute inset-0 border-4 border-secondary/10 rounded-full" />
                <div class="absolute inset-0 border-4 border-t-secondary rounded-full animate-spin" />
              </div>
              <span class="text-[11px] font-black uppercase tracking-[0.4em] text-secondary animate-pulse">
                {t("savedRecipes.decryptingArchives")}
              </span>
            </div>
          </Show>

          <Show when={!saved.loading && !saved.error && recipes().length === 0}>
            <div class="py-32 flex flex-col items-center text-center">
              <span class="text-8xl mb-12 opacity-20 grayscale" aria-hidden="true">
                💔
              </span>
              <h3 class="text-3xl font-black text-white/20 mb-4 tracking-widest uppercase">
                {t("savedRecipes.vaultEmpty")}
              </h3>
              <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.6em] mt-6">
                {t("savedRecipes.vaultEmptySubtitle")}
              </p>
              <A
                href="/"
                class="mt-16 px-10 py-4 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/20 hover:bg-white/[0.02] transition-all"
              >
                [ {t("savedRecipes.returnToScanner")} ]
              </A>
            </div>
          </Show>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            <For each={filteredRecipes()}>
              {(recipe, i) => (
                <div class="card-entrance" style={{ "animation-delay": `${(i() % 12) * 80}ms` }}>
                  <RecipeCard recipe={recipe} onViewDetails={() => setSelectedRecipe(recipe)} />
                </div>
              )}
            </For>
          </div>

          <SiteFooter />
        </div>
      </div>
    </Layout>
  );
};

export default SavedRecipes;
