import type { Component } from "solid-js";
import { For, Show, createSignal, createEffect, createMemo, onCleanup, untrack } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { Layout, Page, SiteFooter } from "../components/Layout";
import { Masthead, SearchField, Notice, CardGrid } from "../components/Editorial";
import { Icon } from "../components/Icon";
import { recipeService } from "../services/recipeService";
import type { Recipe, Tag } from "../types";
import { useI18n } from "../i18n";
import { findTagBySlug, tagList, tagSlug } from "../data/catalog";
import { shelfMatch } from "../data/shelfMatches";

const PAGE_SIZE = 12;

/**
 * The base spirits offered as a filter, matched against each ingredient's
 * `base` column — not its family. Family decides what may substitute, base
 * what kind of drink it is: Pisco Sour belongs under brandy even though Pisco
 * may not stand in for Cognac.
 */
const BASES = [
  { base: "Whiskey", key: "base.whiskey" },
  { base: "Gin", key: "base.gin" },
  { base: "Rum", key: "base.rum" },
  { base: "Agave", key: "base.agave" },
  { base: "Brandy", key: "base.brandy" },
  { base: "Vodka", key: "base.vodka" },
] as const;

const TAG_GROUPS = ["Style", "Palate", "Equipment"] as const;

const RecipeGallery: Component = () => {
  const { t, tCount, tName, tTagType, searchKeys } = useI18n();

  /*
   * Filters live in the URL — `?base=gin&tags=tiki,fruity` — so a filtered view
   * can be linked, and a tag in the recipe sheet can open the archive already
   * narrowed to it. Changes replace the entry rather than push one, so Back
   * leaves the page instead of stepping through every chip clicked.
   */
  const [params, setParams] = useSearchParams();
  const [moreOpen, setMoreOpen] = createSignal(false);

  const base = () => BASES.find((b) => b.base.toLowerCase() === params.base);

  const activeTags = createMemo(() => {
    const raw = typeof params.tags === "string" ? params.tags : "";
    return raw
      .split(",")
      .map((slug) => findTagBySlug(slug))
      .filter((tag): tag is Tag => Boolean(tag));
  });

  const isActive = (tag: Tag) => activeTags().some((active) => active.id === tag.id);

  const setFilters = (next: { base?: string | null; tags?: Tag[] }) =>
    setParams(
      {
        ...("base" in next ? { base: next.base?.toLowerCase() ?? undefined } : {}),
        ...("tags" in next ? { tags: next.tags?.map(tagSlug).join(",") || undefined } : {}),
      },
      { replace: true, scroll: false },
    );

  const toggleTag = (tag: Tag) =>
    setFilters({
      tags: isActive(tag)
        ? activeTags().filter((active) => active.id !== tag.id)
        : [...activeTags(), tag],
    });

  const hasFilters = () => Boolean(base()) || activeTags().length > 0;

  const [recipes, setRecipes] = createSignal<Recipe[]>([]);
  const [page, setPage] = createSignal(1);
  const [hasMore, setHasMore] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("desc");
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
      const search = untrack(debouncedSearch);
      const response = await recipeService.getRecipes(
        {
          page: reset ? 1 : untrack(page),
          limit: PAGE_SIZE,
          sort: untrack(sortDirection),
          search,
          // Resolved here rather than on the server, which holds no Chinese.
          keys: searchKeys(search),
          tagIds: untrack(activeTags).map((tag) => tag.id),
          base: untrack(base)?.base,
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
    base();
    // A tag filter in the URL means nothing until the catalogue can resolve
    // its slug; fetching before that would show the whole book for a moment.
    if (params.tags && tagList().length === 0) return;
    activeTags()
      .map((tag) => tag.id)
      .join(",");
    untrack(() => {
      setHasMore(true);
      void fetchRecipes(true);
    });
  });

  onCleanup(() => inFlight?.abort());

  return (
    <Layout scroll="scroll-container" onScroll={handleScroll}>
      <RecipeDetailModal rows={recipes()} />

      <Page>
        <Masthead
          eyebrow={t("archive.eyebrow")}
          title={t("archive.title") ?? ""}
          meta={<p class="meta">{tCount("archive.count", totalRecipes())}</p>}
        />

        <div class="sticky top-0 z-30 bg-paper border-y border-rule py-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <SearchField value={searchQuery()} onInput={setSearchQuery} label={t("archive.search")} />
          <button
            type="button"
            class="btn btn-quiet -mr-3"
            onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
          >
            {sortDirection() === "desc"
              ? t("home.controls.sortStrong")
              : t("home.controls.sortLight")}
            <Icon name={sortDirection() === "desc" ? "arrow-down" : "arrow-up"} size={13} />
          </button>
        </div>

        <div class="border-b border-rule py-3.5 flex flex-wrap items-center gap-x-10 gap-y-3">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="eyebrow">{t("archive.filter.base")}</span>
            <div class="flex flex-wrap gap-1.5">
              <For each={BASES}>
                {(entry) => (
                  <button
                    type="button"
                    class="chip"
                    aria-pressed={base()?.base === entry.base}
                    onClick={() =>
                      setFilters({ base: base()?.base === entry.base ? null : entry.base })
                    }
                  >
                    {t(entry.key)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              class="eyebrow inline-flex items-center gap-1.5 hover:text-ink transition-colors"
              aria-expanded={moreOpen()}
              aria-controls="archive-tag-filters"
              onClick={() => setMoreOpen((open) => !open)}
            >
              {t("archive.filter.more")}
              <Icon
                name="chevron-right"
                size={11}
                class={`transition-transform ${moreOpen() ? "rotate-90" : ""}`}
              />
            </button>
            {/* With the panel shut, what is applied still has to be visible. */}
            <Show when={!moreOpen()}>
              <div class="flex flex-wrap gap-1.5">
                <For each={activeTags()}>
                  {(tag) => (
                    <button
                      type="button"
                      class="chip"
                      aria-pressed="true"
                      aria-label={t("home.controls.remove", { name: tName(tag) }) ?? undefined}
                      onClick={() => toggleTag(tag)}
                    >
                      {tName(tag)}
                      <Icon name="close" size={11} />
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <Show when={hasFilters()}>
            <button
              type="button"
              class="ml-auto text-[13px] text-ink-muted underline underline-offset-4 decoration-1 hover:text-ink"
              onClick={() => setFilters({ base: null, tags: [] })}
            >
              {t("archive.filter.clear")}
            </button>
          </Show>
        </div>

        <Show when={moreOpen()}>
          <div id="archive-tag-filters" class="border-b border-rule py-4 space-y-3">
            <For each={TAG_GROUPS}>
              {(type) => (
                <div class="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                  <span class="eyebrow sm:w-20 shrink-0">{tTagType(type)}</span>
                  <div class="flex flex-wrap gap-1.5">
                    <For each={tagList().filter((tag) => tag.type === type)}>
                      {(tag) => (
                        <button
                          type="button"
                          class="chip"
                          aria-pressed={isActive(tag)}
                          onClick={() => toggleTag(tag)}
                        >
                          {tName(tag)}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <div class="h-px" classList={{ "progress-rule": loading() }} role="status" />

        <div class="pt-12">
          <Show when={error()}>
            {(message) => (
              <Notice title={t("archive.loadFailed")} body={message()} tone="error">
                <button
                  type="button"
                  class="btn btn-outline"
                  onClick={() => {
                    setHasMore(true);
                    void fetchRecipes(true);
                  }}
                >
                  {t("common.retry")}
                </button>
              </Notice>
            )}
          </Show>

          <Show when={recipes().length === 0 && !loading() && !error()}>
            <Notice title={t("archive.empty.title")} />
          </Show>

          <CardGrid>
            <For each={recipes()}>
              {(recipe) => <RecipeCard recipe={recipe} match={shelfMatch(recipe.id)} />}
            </For>
          </CardGrid>

          <Show when={!hasMore() && recipes().length > 0 && !loading()}>
            <div class="pt-16 flex items-center gap-6">
              <span class="h-px flex-1 bg-rule" aria-hidden="true" />
              <span class="eyebrow">{t("archive.end")}</span>
              <span class="h-px flex-1 bg-rule" aria-hidden="true" />
            </div>
          </Show>

          <SiteFooter />
        </div>
      </Page>
    </Layout>
  );
};

export default RecipeGallery;
