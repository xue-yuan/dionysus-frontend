import type { Component } from "solid-js";
import { For, Show, createEffect, createSignal, createMemo, onCleanup } from "solid-js";
import { recipeService } from "../services/recipeService";
import type { Ingredient, RecipeMatchResult, Tag } from "../types";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { Layout, SiteFooter } from "../components/Layout";
import { userStore } from "../stores/userStore";
import { inventoryStore } from "../stores/inventoryStore";
import { ingredientList, tagList, findIngredient, findTag } from "../data/catalog";
import { QUICK_KITS } from "../data/quickKits";
import { useI18n } from "../i18n";

const CABINET_CATEGORIES = [
  { key: "Spirit", labelKey: "ingredient.category.spirit" },
  { key: "Liqueur", labelKey: "ingredient.category.liqueur" },
  { key: "Syrup", labelKey: "ingredient.category.syrup" },
  { key: "Mixer", labelKey: "ingredient.category.mixer" },
  { key: "Bitters", labelKey: "ingredient.category.bitters" },
  { key: "Garnish", labelKey: "ingredient.category.garnish" },
  { key: "Palate", labelKey: "tag.type.palate" },
  { key: "Equipment", labelKey: "tag.type.equipment" },
] as const;

const isTagCategory = (key: string) => key === "Palate" || key === "Equipment";

const Home: Component = () => {
  const { t, tName, tCategory, tTagType } = useI18n();

  const [matches, setMatches] = createSignal<RecipeMatchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedRecipe, setSelectedRecipe] = createSignal<RecipeMatchResult | null>(null);

  const [isCabinetOpen, setIsCabinetOpen] = createSignal(false);
  const [cabinetCategory, setCabinetCategory] = createSignal<string>("Spirit");
  const [cabinetSearch, setCabinetSearch] = createSignal("");

  // A new request supersedes the one in flight, so the last keystroke wins.
  let inFlight: AbortController | null = null;

  createEffect(() => {
    const owned = inventoryStore.ownedIngredients;
    const minStrength = inventoryStore.minStrength;
    const tagIds = inventoryStore.selectedTags;
    const allowSubstitutes = inventoryStore.allowSubstitutes;

    if (owned.length === 0) {
      inFlight?.abort();
      inFlight = null;
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;

      try {
        const results = await recipeService.matchCocktails(
          { ownedIngredientIds: owned, minStrength, tagIds, allowSubstitutes },
          controller.signal,
        );
        setMatches(results ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("match failed", err);
          setMatches([]);
        }
      } finally {
        if (inFlight === controller) {
          setLoading(false);
          inFlight = null;
        }
      }
    }, 300);

    onCleanup(() => clearTimeout(timer));
  });

  onCleanup(() => inFlight?.abort());

  const visibleMatches = createMemo(() => {
    const list = matches();
    return inventoryStore.showFavorites ? list.filter((m) => userStore.isFavorite(m.id)) : list;
  });

  const bySection = (missing: number) =>
    createMemo(() =>
      visibleMatches()
        .filter((m) => m.missing_count === missing)
        .sort((a, b) =>
          inventoryStore.sortDirection === "desc"
            ? b.strength - a.strength
            : a.strength - b.strength,
        ),
    );

  const exactMatches = bySection(0);
  const nearMisses = bySection(1);

  const handleLucky = () => {
    const pool = exactMatches().length > 0 ? exactMatches() : nearMisses();
    if (pool.length > 0) {
      setSelectedRecipe(pool[Math.floor(Math.random() * pool.length)]);
    }
  };

  const addKit = (names: string[]) => {
    const catalogue = ingredientList();
    const ids: string[] = [];
    for (const name of names) {
      const match = catalogue.find((i) => i.name === name);
      if (match) ids.push(match.id);
      else console.warn(`quick kit references unknown ingredient: ${name}`);
    }
    inventoryStore.addIngredients(ids);
  };

  const cabinetItems = createMemo<(Ingredient | Tag)[]>(() => {
    const category = cabinetCategory();
    const query = cabinetSearch().toLowerCase().trim();
    const source: (Ingredient | Tag)[] = isTagCategory(category)
      ? tagList().filter((tag) => tag.type === category)
      : ingredientList().filter((ing) => ing.category === category);

    if (!query) return source;
    return source.filter((item) => item.name.toLowerCase().includes(query));
  });

  const isSelected = (id: string) =>
    isTagCategory(cabinetCategory()) ? inventoryStore.hasTag(id) : inventoryStore.owns(id);

  const toggleCabinetItem = (id: string) =>
    isTagCategory(cabinetCategory())
      ? inventoryStore.toggleTag(id)
      : inventoryStore.toggleIngredient(id);

  const missingNameFor = (recipe: RecipeMatchResult) => {
    const id = recipe.missing_ingredients?.[0];
    const ingredient = findIngredient(id);
    return ingredient ? tName(ingredient) : undefined;
  };

  createEffect(() => {
    if (!isCabinetOpen()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCabinetOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
  });

  return (
    <Layout>
      <RecipeDetailModal recipe={selectedRecipe()} onClose={() => setSelectedRecipe(null)} />

      <div
        class={`cabinet-overlay ${isCabinetOpen() ? "open" : ""}`}
        onClick={() => setIsCabinetOpen(false)}
      >
        <div
          class="cabinet-card p-10 gap-8"
          role="dialog"
          aria-modal="true"
          aria-label={t("home.cabinet.title") ?? undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between border-b border-white/5 pb-6">
            <div>
              <h2 class="text-3xl font-black text-white tracking-wide uppercase">
                {t("home.cabinet.title")}
              </h2>
              <p class="text-xs uppercase tracking-widest text-white/30 mt-1">
                {t("home.cabinet.subtitle")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("recipePanel.close") ?? "Close"}
              onClick={() => setIsCabinetOpen(false)}
              class="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div class="flex-grow flex gap-10 overflow-hidden min-h-0">
            <div class="w-72 flex flex-col gap-2 overflow-y-auto pr-4 border-r border-white/5">
              <For each={CABINET_CATEGORIES}>
                {(category) => (
                  <button
                    type="button"
                    onClick={() => {
                      setCabinetCategory(category.key);
                      setCabinetSearch("");
                    }}
                    aria-pressed={cabinetCategory() === category.key}
                    class={`w-full text-left px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${
                      cabinetCategory() === category.key
                        ? "bg-primary text-black border-primary shadow-primary-button"
                        : "bg-white/[0.01] border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isTagCategory(category.key) ? tTagType(category.key) : tCategory(category.key)}
                  </button>
                )}
              </For>
            </div>

            <div class="flex-1 flex flex-col gap-6 overflow-hidden">
              <div class="relative">
                <input
                  type="search"
                  aria-label={t("home.cabinet.searchPlaceholder") ?? undefined}
                  placeholder={t("home.cabinet.searchPlaceholder")}
                  class="input-studio w-full pr-10"
                  value={cabinetSearch()}
                  onInput={(e) => setCabinetSearch(e.currentTarget.value)}
                />
                <Show when={cabinetSearch()}>
                  <button
                    type="button"
                    aria-label={t("home.inventory.clearSearch") ?? "Clear"}
                    onClick={() => setCabinetSearch("")}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                  >
                    ✕
                  </button>
                </Show>
              </div>

              <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  <For each={cabinetItems()}>
                    {(item) => {
                      const selected = () => isSelected(item.id);
                      const isTag = "type" in item;
                      return (
                        <button
                          type="button"
                          onClick={() => toggleCabinetItem(item.id)}
                          aria-pressed={selected()}
                          class={`px-6 py-5 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest text-left relative overflow-hidden flex flex-col justify-between h-28 group ${
                            selected()
                              ? "bg-primary/10 border-primary text-primary shadow-primary-glow"
                              : "bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          <span class="text-[11px] opacity-40">
                            {isTag
                              ? tTagType((item as Tag).type)
                              : tCategory((item as Ingredient).category)}
                          </span>
                          <span class="text-sm font-bold text-white group-hover:text-primary transition-colors pr-4 leading-snug">
                            {tName(item)}
                          </span>
                          <Show when={selected()}>
                            <div class="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse shadow-primary-sm" />
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-white/5 pt-6 bg-transparent">
            <div class="flex items-center gap-4 flex-wrap max-w-[70%]">
              <span class="text-xs font-black uppercase tracking-widest text-white/30">
                {t("home.cabinet.currentlyStocked")}
              </span>
              <div class="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto pr-2 custom-scrollbar">
                <For each={inventoryStore.ownedIngredients}>
                  {(id) => {
                    const ingredient = () => findIngredient(id);
                    return (
                      <Show when={ingredient()}>
                        {(ing) => (
                          <button
                            type="button"
                            onClick={() => inventoryStore.toggleIngredient(id)}
                            class="px-3 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 text-xs font-bold text-white/70 uppercase tracking-widest transition-all"
                          >
                            {tName(ing())} ✕
                          </button>
                        )}
                      </Show>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <Show
                when={
                  inventoryStore.ownedIngredients.length > 0 ||
                  inventoryStore.selectedTags.length > 0
                }
              >
                <button
                  type="button"
                  onClick={() => inventoryStore.clear()}
                  class="px-6 py-3 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 transition-all"
                >
                  [{" "}
                  {t("home.inventory.clear", {
                    count:
                      inventoryStore.ownedIngredients.length + inventoryStore.selectedTags.length,
                  })}{" "}
                  ]
                </button>
              </Show>
              <button
                type="button"
                onClick={() => setIsCabinetOpen(false)}
                class="px-8 py-3.5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t("home.cabinet.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="px-8 lg:px-16 pt-8 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col">
        <div class="glass-ether border-white/5 rounded-3xl p-8 mb-8 space-y-6">
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div class="flex items-center gap-6">
              <div class="bg-white/[0.01] rounded-2xl p-5 border border-white/5 flex flex-col justify-center min-w-[200px]">
                <span class="text-xs font-black uppercase tracking-widest text-white/30 mb-1">
                  {t("home.cabinet.storage")}
                </span>
                <span class="text-3xl font-black text-primary">
                  {inventoryStore.ownedIngredients.length} {t("home.cabinet.active")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCabinetOpen(true)}
                class="px-8 py-5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-primary-button"
              >
                ⚡ {t("home.cabinet.open")}
              </button>
            </div>

            <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white/[0.01] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                <div class="flex justify-between items-center mb-2">
                  <label
                    for="min-strength"
                    class="text-xs font-black uppercase tracking-widest text-white/30"
                  >
                    {t("home.palate.potency")}
                  </label>
                  <span class="text-sm font-black text-primary">
                    {inventoryStore.minStrength} / 5
                  </span>
                </div>
                <input
                  id="min-strength"
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={inventoryStore.minStrength}
                  class="range range-xs range-primary bg-white/5"
                  onInput={(e) => inventoryStore.setMinStrength(parseInt(e.currentTarget.value))}
                />
              </div>

              <div class="bg-white/[0.01] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                <label for="allow-substitutes" class="flex flex-col cursor-pointer">
                  <span class="text-xs font-black uppercase tracking-widest text-white/30">
                    {t("home.cabinet.substitutes")}
                  </span>
                  <span class="text-xs font-bold text-white/60 mt-1">
                    {t("home.cabinet.allowSubstitutes")}
                  </span>
                </label>
                <input
                  id="allow-substitutes"
                  type="checkbox"
                  checked={inventoryStore.allowSubstitutes}
                  onChange={(e) => inventoryStore.setAllowSubstitutes(e.currentTarget.checked)}
                  class="checkbox checkbox-primary"
                />
              </div>

              <div class="flex items-center justify-end">
                <div class="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl transition-all hover:border-white/20 hover:bg-white/[0.08] shadow-2xl w-full">
                  <button
                    type="button"
                    onClick={handleLucky}
                    class="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    🎲 {t("home.results.randomize")}
                  </button>

                  <div class="w-px h-6 bg-white/10 mx-1" />

                  <button
                    type="button"
                    aria-pressed={inventoryStore.showFavorites}
                    class={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      inventoryStore.showFavorites
                        ? "bg-secondary text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => inventoryStore.toggleShowFavorites()}
                  >
                    ❤️ {t("home.results.saved")}
                  </button>

                  <div class="w-px h-6 bg-white/10 mx-1" />

                  <button
                    type="button"
                    aria-label={t("home.results.toggleSort") ?? "Toggle sort order"}
                    class="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
                    onClick={() => inventoryStore.toggleSortDirection()}
                  >
                    {inventoryStore.sortDirection === "desc" ? "↓" : "↑"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-6 pt-5 border-t border-white/5 text-xs text-white/40">
            <div class="flex items-center gap-2">
              <span class="font-black uppercase tracking-widest text-xs">
                {t("home.inventory.quickKits")}
              </span>
              <div class="flex gap-4">
                <For each={QUICK_KITS}>
                  {(kit) => (
                    <button
                      type="button"
                      onClick={() => addKit(kit.ingredients)}
                      class="hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs"
                    >
                      {kit.label}
                    </button>
                  )}
                </For>
              </div>
            </div>

            <div class="h-4 w-px bg-white/10 hidden md:block" />

            <div class="flex items-center gap-2">
              <span class="font-black uppercase tracking-widest text-xs">
                {t("home.palate.filters")}
              </span>
              <Show
                when={inventoryStore.selectedTags.length > 0}
                fallback={<span class="italic text-sm">{t("home.palate.noFilters")}</span>}
              >
                <div class="flex flex-wrap gap-1.5">
                  <For each={inventoryStore.selectedTags}>
                    {(id) => (
                      <Show when={findTag(id)}>
                        {(tag) => (
                          <button
                            type="button"
                            onClick={() => inventoryStore.toggleTag(id)}
                            class="px-2.5 py-1 rounded bg-secondary/10 border border-secondary/20 text-xs font-bold text-secondary uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all"
                          >
                            {tName(tag())} ✕
                          </button>
                        )}
                      </Show>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div
          class="h-1 w-full mb-8 relative overflow-hidden bg-white/5 rounded-full"
          role="progressbar"
          aria-hidden={!loading()}
        >
          <div
            class={`absolute inset-0 bg-primary shadow-primary-md transition-all duration-500 ${
              loading() ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ animation: loading() ? "loading-scan 2s infinite linear" : "none" }}
          />
        </div>

        <div class="flex-1 relative">
          <Show when={inventoryStore.ownedIngredients.length === 0}>
            <div class="py-32 flex flex-col items-center text-center">
              <span class="text-8xl mb-12 opacity-20 grayscale" aria-hidden="true">
                🍸
              </span>
              <h3 class="text-[14px] font-black tracking-[1.2em] text-white/30 uppercase">
                {t("home.results.cabinetIdle")}
              </h3>
            </div>
          </Show>

          <Show
            when={
              !loading() &&
              inventoryStore.ownedIngredients.length > 0 &&
              exactMatches().length === 0 &&
              nearMisses().length === 0
            }
          >
            <div class="py-32 flex flex-col items-center text-center">
              <span class="text-6xl mb-12 opacity-20" aria-hidden="true">
                {inventoryStore.showFavorites ? "💔" : "🕵️"}
              </span>
              <h3 class="text-[14px] font-black tracking-[0.8em] text-white/30 uppercase">
                {inventoryStore.showFavorites
                  ? t("home.results.noSavedProtocols")
                  : t("home.results.noProtocolsMatched")}
              </h3>
              <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.4em] mt-6">
                {inventoryStore.showFavorites
                  ? t("home.results.noSavedProtocolsSubtitle")
                  : t("home.results.noProtocolsMatchedSubtitle")}
              </p>
              <button
                type="button"
                onClick={() =>
                  inventoryStore.showFavorites
                    ? inventoryStore.toggleShowFavorites()
                    : inventoryStore.clear()
                }
                class="mt-12 px-8 py-3 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/20 transition-all"
              >
                [{" "}
                {inventoryStore.showFavorites
                  ? t("home.results.deactivateFilter")
                  : t("home.results.clearFilters")}{" "}
                ]
              </button>
            </div>
          </Show>

          <div
            class={`transition-opacity duration-300 mt-12 ${
              loading() ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}
          >
            <Show when={exactMatches().length > 0}>
              <section class="mb-32 space-y-6">
                <div class="flex items-center gap-4 border-b border-white/5 pb-2">
                  <h2 class="text-[13px] font-black uppercase tracking-[0.4em] text-primary whitespace-nowrap">
                    {t("home.results.readyToMix")}
                  </h2>
                  <div class="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                  <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-primary-md" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                  <For each={exactMatches()}>
                    {(recipe, i) => (
                      <div
                        class="card-entrance"
                        style={{ "animation-delay": `${(i() % 12) * 80}ms` }}
                      >
                        <RecipeCard
                          recipe={recipe}
                          onViewDetails={() => setSelectedRecipe(recipe)}
                          substituteCount={recipe.substitutions?.length}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            <Show when={nearMisses().length > 0}>
              <section class="space-y-6">
                <div class="flex items-center gap-4 border-b border-white/5 pb-2">
                  <h2 class="text-[13px] font-black uppercase tracking-[0.4em] text-white/40 whitespace-nowrap">
                    {t("home.results.missingOne")}
                  </h2>
                  <div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <div class="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                  <For each={nearMisses()}>
                    {(recipe, i) => (
                      <div
                        class="card-entrance"
                        style={{ "animation-delay": `${(i() % 12) * 80}ms` }}
                      >
                        <RecipeCard
                          recipe={recipe}
                          onViewDetails={() => setSelectedRecipe(recipe)}
                          missingIngredientName={missingNameFor(recipe)}
                          substituteCount={recipe.substitutions?.length}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            <SiteFooter />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
