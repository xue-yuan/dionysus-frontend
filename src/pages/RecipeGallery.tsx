import type { Component } from "solid-js";
import { For, Show, createSignal, createEffect, onCleanup, untrack } from "solid-js";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { Layout, SiteFooter } from "../components/Layout";
import { recipeService } from "../services/recipeService";
import type { Recipe } from "../types";
import { useI18n } from "../i18n";

const PAGE_SIZE = 12;

const RecipeGallery: Component = () => {
  const { t } = useI18n();

  const [recipes, setRecipes] = createSignal<Recipe[]>([]);
  const [page, setPage] = createSignal(1);
  const [hasMore, setHasMore] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("desc");
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [totalRecipes, setTotalRecipes] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [debouncedSearch, setDebouncedSearch] = createSignal("");

  let inFlight: AbortController | null = null;

  const fetchRecipes = async (reset = false) => {
    if (!reset && (untrack(loading) || !untrack(hasMore))) return;

    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    setLoading(true);
    setError(null);

    try {
      const response = await recipeService.getRecipes(
        {
          page: reset ? 1 : untrack(page),
          limit: PAGE_SIZE,
          sort: untrack(sortDirection),
          search: untrack(debouncedSearch),
        },
        controller.signal,
      );

      const items = response.items ?? [];
      setTotalRecipes(response.total ?? 0);

      if (reset) {
        setRecipes(items);
        setPage(2);
      } else {
        setRecipes((prev) => [...prev, ...items]);
        setPage((p) => p + 1);
      }

      setHasMore(items.length === PAGE_SIZE && untrack(recipes).length < (response.total ?? 0));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("failed to fetch recipes", err);
        setError((err as Error).message);
        setHasMore(false);
      }
    } finally {
      if (inFlight === controller) {
        setLoading(false);
        inFlight = null;
      }
    }
  };

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200;
    if (nearBottom && !loading() && hasMore()) void fetchRecipes(false);
  };

  createEffect(() => {
    const query = searchQuery();
    const timer = setTimeout(() => setDebouncedSearch(query), 300);
    onCleanup(() => clearTimeout(timer));
  });

  createEffect(() => {
    sortDirection();
    debouncedSearch();
    untrack(() => {
      setHasMore(true);
      void fetchRecipes(true);
    });
  });

  onCleanup(() => inFlight?.abort());

  return (
    <Layout scroll="scroll-container" onScroll={handleScroll}>
      <RecipeDetailModal recipe={selectedRecipe()} onClose={() => setSelectedRecipe(null)} />

      <div class="px-8 lg:px-16 pt-0 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col gap-8">
        <div class="sticky top-0 z-30 pt-4 pb-6 px-4 bg-transparent backdrop-blur-sm -mx-4">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div class="relative flex-grow max-w-md">
              <input
                type="search"
                aria-label={t("recipeGallery.searchPlaceholder") ?? undefined}
                placeholder={t("recipeGallery.searchPlaceholder")}
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
                  {t("recipeGallery.verified", { count: totalRecipes() })}
                </span>
              </div>

              <div class="w-px h-6 bg-white/10 mx-2" />

              <button
                type="button"
                class="px-8 h-full rounded-xl text-[13px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
              >
                {sortDirection() === "desc" ? t("home.results.strong") : t("home.results.light")}
                <span class="text-primary text-lg" aria-hidden="true">
                  {sortDirection() === "desc" ? "↓" : "↑"}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          class={`transition-opacity duration-300 ${loading() ? "opacity-40 pointer-events-none" : "opacity-100"}`}
        >
          <Show when={error()}>
            {(message) => (
              <div class="col-span-full mb-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
                <p class="text-sm font-black uppercase tracking-widest text-red-400">
                  {t("recipeGallery.loadFailed")}
                </p>
                <p class="text-xs text-white/30 mt-2">{message()}</p>
                <button
                  type="button"
                  onClick={() => {
                    setHasMore(true);
                    void fetchRecipes(true);
                  }}
                  class="mt-6 px-6 py-2 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                >
                  {t("recipeGallery.retry")}
                </button>
              </div>
            )}
          </Show>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 min-h-[400px]">
            <Show when={recipes().length === 0 && !loading() && !error()}>
              <div class="col-span-full py-48 flex flex-col items-center text-center glass-ether rounded-[4rem] border-dashed border-white/5">
                <div class="text-8xl mb-12 opacity-10 grayscale" aria-hidden="true">
                  📜
                </div>
                <h3 class="text-3xl font-black text-white/20 mb-4 tracking-widest uppercase">
                  {t("recipeGallery.archiveVacant")}
                </h3>
                <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.6em]">
                  {t("recipeGallery.initialSync")}
                </p>
              </div>
            </Show>

            <For each={recipes()}>
              {(recipe, i) => (
                <div class="card-entrance" style={{ "animation-delay": `${(i() % 12) * 80}ms` }}>
                  <RecipeCard recipe={recipe} onViewDetails={() => setSelectedRecipe(recipe)} />
                </div>
              )}
            </For>
          </div>

          <div class="py-40 flex justify-center">
            <Show when={loading()}>
              <div
                class="relative w-16 h-16"
                role="status"
                aria-label={t("recipeGallery.loading") ?? "Loading"}
              >
                <div class="absolute inset-0 border-4 border-primary/10 rounded-full" />
                <div class="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
              </div>
            </Show>
            <Show when={!hasMore() && recipes().length > 0 && !loading()}>
              <div class="flex items-center gap-12 w-full max-w-4xl mx-auto">
                <div class="h-px flex-grow bg-gradient-to-r from-transparent to-white/10" />
                <span class="text-[10px] font-black uppercase tracking-[0.8em] text-white/10 shrink-0">
                  {t("recipeGallery.terminalReached")}
                </span>
                <div class="h-px flex-grow bg-gradient-to-l from-transparent to-white/10" />
              </div>
            </Show>
          </div>

          <SiteFooter />
        </div>
      </div>
    </Layout>
  );
};

export default RecipeGallery;
