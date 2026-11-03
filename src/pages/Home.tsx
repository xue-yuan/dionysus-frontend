import type { Component } from "solid-js";
import { For, Show, createEffect, createSignal, createMemo, onCleanup } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { recipeService } from "../services/recipeService";
import type { RecipeMatchResult } from "../types";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal, useRecipeSheet } from "../components/RecipeDetailModal";
import { ShelfEditor } from "../components/ShelfEditor";
import { Layout, Page, SiteFooter } from "../components/Layout";
import { Masthead, SectionHead, Notice, CardGrid } from "../components/Editorial";
import { Icon } from "../components/Icon";
import { userStore } from "../stores/userStore";
import { inventoryStore, STRENGTH_BANDS, type StrengthBand } from "../stores/inventoryStore";
import { findIngredient, findTag, ingredientList } from "../data/catalog";
import { QUICK_KITS } from "../data/quickKits";
import { nextBuys } from "../data/nextBuys";
import { SHELF_PARAM, decodeShelf, encodeShelf } from "../data/shelfLink";
import { useI18n } from "../i18n";

const BANDS = Object.keys(STRENGTH_BANDS) as StrengthBand[];

const Home: Component = () => {
  const { t, tCount, tName, tCategory, tDynamic } = useI18n();
  const sheet = useRecipeSheet();
  const [params, setParams] = useSearchParams();

  const [matches, setMatches] = createSignal<RecipeMatchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isShelfOpen, setIsShelfOpen] = createSignal(false);

  // A new request supersedes the one in flight, so the last keystroke wins.
  let inFlight: AbortController | null = null;
  // Bumped by the retry button; read inside the effect so it re-runs the match
  // without the shelf having to change.
  const [retryToken, setRetryToken] = createSignal(0);

  createEffect(() => {
    const owned = inventoryStore.ownedIngredients;
    const [minStrength, maxStrength] = STRENGTH_BANDS[inventoryStore.strength];
    const tagIds = inventoryStore.selectedTags;
    const excludeTagIds = inventoryStore.missingTools;
    const allowSubstitutes = inventoryStore.allowSubstitutes;
    retryToken();

    if (owned.length === 0) {
      inFlight?.abort();
      inFlight = null;
      setMatches([]);
      setError(null);
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
          {
            ownedIngredientIds: owned,
            minStrength,
            maxStrength,
            tagIds,
            excludeTagIds,
            allowSubstitutes,
          },
          controller.signal,
        );
        setMatches(results ?? []);
        setError(null);
      } catch (err) {
        // Without this the failure renders as "nothing matched", which reads as
        // a fact about the shelf rather than a broken request.
        if ((err as Error).name !== "AbortError") {
          console.error("match failed", err);
          setMatches([]);
          setError((err as Error).message);
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

  // Ranked from the unsorted list, so flipping the strength sort does not
  // reshuffle it.
  const buys = createMemo(() => nextBuys(visibleMatches()));

  const shelfIsEmpty = () => inventoryStore.ownedIngredients.length === 0;
  const nothingMatched = () =>
    !shelfIsEmpty() &&
    !loading() &&
    !error() &&
    exactMatches().length === 0 &&
    nearMisses().length === 0;

  const headline = () => {
    if (shelfIsEmpty()) return t("home.title.empty");
    const count = exactMatches().length;
    if (count === 0) return t("home.title.none");
    if (count === 1) return t("home.title.one");
    return t("home.title.results", { count });
  };

  const filterCount = () => inventoryStore.selectedTags.length + inventoryStore.missingTools.length;

  const summary = () => {
    const parts: (string | undefined)[] = [
      tCount("home.summary.bottles", inventoryStore.ownedIngredients.length),
    ];
    if (filterCount() > 0) {
      parts.push(tCount("home.summary.filters", filterCount()));
    }
    parts.push(
      inventoryStore.allowSubstitutes
        ? t("home.summary.substitutesOn")
        : t("home.summary.substitutesOff"),
    );
    return parts.filter(Boolean).join(" · ");
  };

  const handleLucky = () => {
    const pool = exactMatches().length > 0 ? exactMatches() : nearMisses();
    if (pool.length > 0) {
      sheet.open(pool[Math.floor(Math.random() * pool.length)]);
    }
  };

  const kitIngredients = (names: string[]) => {
    const catalogue = ingredientList();
    return names.flatMap((name) => {
      const match = catalogue.find((i) => i.name === name);
      // Only once the catalogue is in; before that every name is "unknown".
      if (!match && catalogue.length > 0) {
        console.warn(`quick kit references unknown ingredient: ${name}`);
      }
      return match ? [match] : [];
    });
  };

  const addKit = (names: string[]) =>
    inventoryStore.addIngredients(kitIngredients(names).map((i) => i.id));

  /**
   * A shelf someone shared. Nothing is applied until the reader chooses to —
   * opening a link should never silently replace what they have built up.
   */
  const sharedShelf = createMemo(() => {
    const value = params[SHELF_PARAM];
    if (typeof value !== "string" || !value) return undefined;
    const ids = decodeShelf(value, ingredientList());
    return ids.length > 0 ? ids : undefined;
  });

  const settleShared = (apply?: (ids: string[]) => void) => {
    const ids = sharedShelf();
    if (ids && apply) apply(ids);
    setParams({ [SHELF_PARAM]: undefined }, { replace: true, scroll: false });
  };

  const [shareState, setShareState] = createSignal<"idle" | "copied" | "failed">("idle");
  const shareLink = () =>
    `${location.origin}/?${SHELF_PARAM}=${encodeShelf(inventoryStore.ownedIngredients, ingredientList())}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink());
      setShareState("copied");
    } catch {
      // No clipboard (an insecure origin, a refused permission): show the link
      // so it can be copied by hand.
      setShareState("failed");
    }
    setTimeout(() => setShareState((s) => (s === "copied" ? "idle" : s)), 2000);
  };

  return (
    <Layout>
      <RecipeDetailModal rows={matches()} />
      <ShelfEditor open={isShelfOpen()} onClose={() => setIsShelfOpen(false)} />

      <Page>
        <Show when={sharedShelf()}>
          {(ids) => (
            <section
              class="mt-8 border border-rule-strong bg-paper-raised px-5 py-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4"
              aria-label={t("home.shared.title") ?? undefined}
            >
              <div class="min-w-0 flex-1">
                <p>
                  <span class="display text-[1.25rem]">{t("home.shared.title")}</span>
                  <span class="meta ml-2.5">{tCount("home.summary.bottles", ids().length)}</span>
                </p>
                <p class="mt-1 text-[14px] text-ink-muted line-clamp-2">
                  {ids()
                    .map((id) => tName(findIngredient(id)))
                    .join(" · ")}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-solid"
                  onClick={() => settleShared((ids) => inventoryStore.replaceIngredients(ids))}
                >
                  {t("home.shared.use")}
                </button>
                <Show when={!shelfIsEmpty()}>
                  <button
                    type="button"
                    class="btn btn-outline"
                    onClick={() => settleShared((ids) => inventoryStore.addIngredients(ids))}
                  >
                    {t("home.shared.merge")}
                  </button>
                </Show>
                <button type="button" class="btn btn-quiet" onClick={() => settleShared()}>
                  {t("home.shared.dismiss")}
                </button>
              </div>
            </section>
          )}
        </Show>

        <Masthead
          eyebrow={t("home.eyebrow")}
          title={headline()}
          meta={
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <p class="meta">{summary()}</p>
              <Show when={!shelfIsEmpty()}>
                <span class="text-rule-strong" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  class="meta text-ink underline underline-offset-4 decoration-1 hover:text-accent"
                  onClick={copyShareLink}
                >
                  {shareState() === "copied" ? t("home.share.copied") : t("home.share.action")}
                </button>
              </Show>
              <Show when={shareState() === "failed"}>
                <input
                  readonly
                  class="field font-mono text-[12px] basis-full"
                  aria-label={t("home.share.manual") ?? undefined}
                  value={shareLink()}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </Show>
            </div>
          }
        />

        <div class="border-y border-rule py-4 flex flex-wrap items-center gap-x-8 gap-y-4">
          <button type="button" class="btn btn-solid" onClick={() => setIsShelfOpen(true)}>
            <Icon name="plus" size={14} />
            {t("home.controls.editShelf")}
          </button>

          <div class="flex items-center gap-3">
            <span id="strength-label" class="text-[14px] text-ink-muted whitespace-nowrap">
              {t("home.controls.strength")}
            </span>
            <div class="segmented" role="group" aria-labelledby="strength-label">
              <For each={BANDS}>
                {(band) => (
                  <button
                    type="button"
                    aria-pressed={inventoryStore.strength === band}
                    onClick={() => inventoryStore.setStrength(band)}
                  >
                    {t(`home.strength.${band}`)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <label class="flex items-center gap-2.5 text-[14px] text-ink-muted cursor-pointer hover:text-ink transition-colors">
            <input
              type="checkbox"
              class="check"
              checked={inventoryStore.allowSubstitutes}
              onChange={(e) => inventoryStore.setAllowSubstitutes(e.currentTarget.checked)}
            />
            {t("home.controls.substitutes")}
          </label>

          <label class="flex items-center gap-2.5 text-[14px] text-ink-muted cursor-pointer hover:text-ink transition-colors">
            <input
              type="checkbox"
              class="check"
              checked={inventoryStore.showFavorites}
              onChange={() => inventoryStore.toggleShowFavorites()}
            />
            {t("home.controls.savedOnly")}
          </label>

          <div class="flex items-center gap-1 ml-auto">
            <button
              type="button"
              class="btn btn-quiet"
              aria-label={t("home.controls.sortToggle") ?? undefined}
              onClick={() => inventoryStore.toggleSortDirection()}
            >
              {inventoryStore.sortDirection === "desc"
                ? t("home.controls.sortStrong")
                : t("home.controls.sortLight")}
              <Icon
                name={inventoryStore.sortDirection === "desc" ? "arrow-down" : "arrow-up"}
                size={13}
              />
            </button>
            <button
              type="button"
              class="btn btn-quiet disabled:opacity-40 disabled:cursor-default"
              disabled={exactMatches().length === 0 && nearMisses().length === 0}
              onClick={handleLucky}
            >
              <Icon name="shuffle" size={14} />
              {t("home.controls.surprise")}
            </button>
          </div>
        </div>

        <div class="border-b border-rule py-3.5 flex flex-wrap items-center gap-x-10 gap-y-3">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="eyebrow">{t("home.controls.filters")}</span>
            <Show
              when={filterCount() > 0}
              fallback={
                <span class="text-[13px] text-ink-faint">{t("home.controls.noFilters")}</span>
              }
            >
              <div class="flex flex-wrap gap-1.5">
                {/* A missing tool hides drinks too, so it is listed with the
                    filters — otherwise a short list would have no visible cause. */}
                <For each={inventoryStore.missingTools}>
                  {(id) => (
                    <Show when={findTag(id)}>
                      {(tool) => (
                        <button
                          type="button"
                          class="chip"
                          aria-label={
                            t("home.controls.restoreTool", { name: tName(tool()) }) ?? undefined
                          }
                          onClick={() => inventoryStore.toggleTool(id)}
                        >
                          {t("home.controls.withoutTool", { name: tName(tool()) })}
                          <Icon name="close" size={11} />
                        </button>
                      )}
                    </Show>
                  )}
                </For>
                <For each={inventoryStore.selectedTags}>
                  {(id) => (
                    <Show when={findTag(id)}>
                      {(tag) => (
                        <button
                          type="button"
                          class="chip"
                          aria-pressed="true"
                          aria-label={
                            t("home.controls.remove", { name: tName(tag()) }) ?? undefined
                          }
                          onClick={() => inventoryStore.toggleTag(id)}
                        >
                          {tName(tag())}
                          <Icon name="close" size={11} />
                        </button>
                      )}
                    </Show>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Always occupies a hairline so results do not jump when a match runs. */}
        <div
          class="h-px"
          classList={{ "progress-rule": loading() }}
          role="status"
          aria-label={loading() ? (t("common.loading") ?? "Loading") : undefined}
        />

        <div class="pt-12" classList={{ "opacity-50": loading() }}>
          <Show when={shelfIsEmpty()}>
            {/* The masthead already says the shelf is empty and what to do;
                a notice here repeating it made three statements of one fact. */}
            <div class="py-12 border-y border-rule flex justify-center">
              <button type="button" class="btn btn-outline" onClick={() => setIsShelfOpen(true)}>
                {t("home.empty.shelf.action")}
              </button>
            </div>

            {/* Starter shelves used to sit in the control bar as chips named
                after drinks, beside the filters and styled like them. They read
                as "show me drinks like a Negroni", but each one quietly added
                four bottles to the shelf — and stayed there once the shelf was
                full, one misclick from bottles the user does not own. Here they
                only offer themselves to an empty shelf, and say what they add. */}
            <section class="mt-14 max-w-4xl mx-auto" aria-labelledby="starters-title">
              <h3 id="starters-title" class="eyebrow text-center">
                {t("home.starters.title")}
              </h3>
              <ul class="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-3">
                <For each={QUICK_KITS}>
                  {(kit) => {
                    const name = () => tDynamic(kit.translationKey, kit.label);
                    return (
                      <li class="border-t border-rule pt-4 flex flex-col">
                        <span class="display text-[1.375rem]">{name()}</span>
                        <p class="mt-2 flex-1 text-[14px] leading-[1.6] text-ink-muted">
                          {kitIngredients(kit.ingredients)
                            .map((ingredient) => tName(ingredient))
                            .join(" · ")}
                        </p>
                        <button
                          type="button"
                          class="btn btn-outline mt-4 self-start"
                          aria-label={t("home.starters.addLabel", { name: name() }) ?? undefined}
                          onClick={() => addKit(kit.ingredients)}
                        >
                          <Icon name="plus" size={13} />
                          {t("home.starters.add")}
                        </button>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </section>
          </Show>

          <Show when={!shelfIsEmpty() && error()}>
            {(message) => (
              <Notice title={t("home.error.title")} body={message()} tone="error">
                <button
                  type="button"
                  class="btn btn-outline"
                  onClick={() => setRetryToken((n) => n + 1)}
                >
                  {t("common.retry")}
                </button>
              </Notice>
            )}
          </Show>

          <Show when={nothingMatched() && inventoryStore.showFavorites}>
            <Notice title={t("home.empty.saved.title")}>
              <button
                type="button"
                class="btn btn-outline"
                onClick={() => inventoryStore.toggleShowFavorites()}
              >
                {t("home.empty.saved.action")}
              </button>
            </Notice>
          </Show>

          <Show when={nothingMatched() && !inventoryStore.showFavorites}>
            <Notice title={t("home.empty.none.title")}>
              <button type="button" class="btn btn-outline" onClick={() => inventoryStore.clear()}>
                {t("home.empty.none.action")}
              </button>
            </Notice>
          </Show>

          <Show when={exactMatches().length > 0}>
            <section class="mb-20 fade-in">
              <SectionHead title={t("home.section.ready")} count={exactMatches().length} />
              <CardGrid>
                <For each={exactMatches()}>
                  {(recipe) => <RecipeCard recipe={recipe} match={recipe} hideReady />}
                </For>
              </CardGrid>
            </section>
          </Show>

          <Show when={buys().length > 0}>
            <section class="mb-20 fade-in">
              <SectionHead title={t("home.section.buyNext")} />
              <ol class="border-t border-rule">
                <For each={buys()}>
                  {(buy, i) => (
                    <Show when={findIngredient(buy.ingredientId)}>
                      {(ingredient) => (
                        <li class="flex items-baseline gap-4 py-4 border-b border-rule">
                          <span class="meta tabular w-6 shrink-0">
                            {String(i() + 1).padStart(2, "0")}
                          </span>
                          <div class="flex-1 min-w-0 sm:flex sm:items-baseline sm:gap-8">
                            <p class="sm:w-72 shrink-0">
                              <span class="display text-[1.25rem]">{tName(ingredient())}</span>
                              <span class="meta ml-2.5">{tCategory(ingredient().category)}</span>
                            </p>
                            <p class="mt-1 sm:mt-0 text-[14px] text-ink-muted">
                              <span class="font-mono text-accent tabular mr-2.5">
                                +{buy.recipes.length}
                              </span>
                              <For each={buy.recipes}>
                                {(recipe, j) => (
                                  <>
                                    <Show when={j() > 0}>
                                      <span class="text-rule-strong"> · </span>
                                    </Show>
                                    <a
                                      href={sheet.href(recipe)}
                                      onClick={sheet.follow(recipe)}
                                      class="underline-offset-4 decoration-1 hover:text-ink hover:underline"
                                    >
                                      {tName(recipe)}
                                    </a>
                                  </>
                                )}
                              </For>
                            </p>
                          </div>
                          <button
                            type="button"
                            class="btn btn-quiet shrink-0 self-center"
                            aria-label={
                              t("home.buyNext.addLabel", { name: tName(ingredient()) }) ?? undefined
                            }
                            onClick={() => inventoryStore.addIngredients([buy.ingredientId])}
                          >
                            <Icon name="plus" size={13} />
                            {/* The label costs the names their line on a phone; the
                                button keeps its aria-label either way. */}
                            <span class="hidden sm:inline">{t("home.buyNext.add")}</span>
                          </button>
                        </li>
                      )}
                    </Show>
                  )}
                </For>
              </ol>
            </section>
          </Show>

          <Show when={nearMisses().length > 0}>
            <section class="fade-in">
              <SectionHead title={t("home.section.oneAway")} count={nearMisses().length} />
              <CardGrid>
                <For each={nearMisses()}>
                  {(recipe) => <RecipeCard recipe={recipe} match={recipe} />}
                </For>
              </CardGrid>
            </section>
          </Show>

          <SiteFooter />
        </div>
      </Page>
    </Layout>
  );
};

export default Home;
