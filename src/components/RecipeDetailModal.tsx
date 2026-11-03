import type { Component } from "solid-js";
import { createMemo, createEffect, createSignal, onCleanup, Show, For } from "solid-js";
import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
import { recipeService, recipeSlug } from "../services/recipeService";
import type { Recipe, RecipeMatchResult } from "../types";
import { useI18n } from "../i18n";
import { userStore } from "../stores/userStore";
import { inventoryStore } from "../stores/inventoryStore";
import { findIngredient, tagSlug } from "../data/catalog";
import { formatMeasure, type Units } from "../data/measure";
import { Icon, TickMeter } from "./Icon";
import { Glass } from "./Glass";

/** The query parameter that names the open recipe. */
const PARAM = "recipe";

/** The sheet is labelled by its headline, which exists once the recipe does. */
const TITLE_ID = "recipe-sheet-title";

const UNITS: Units[] = ["ml", "oz"];

/**
 * A measure with its vulgar fractions set in the text face. IBM Plex Mono
 * squeezes "½" into a single monospace cell, which made "1½ oz" read as "1 oz"
 * with a smudge; the sans gives the fraction its natural width.
 */
const Measure: Component<{ text: string }> = (props) => (
  <For each={props.text.split(/([¼½¾⅓⅔⅛⅜⅝⅞])/)}>
    {(part) =>
      /^[¼½¾⅓⅔⅛⅜⅝⅞]$/.test(part) ? (
        <span class="font-sans text-[15px] leading-none">{part}</span>
      ) : (
        part
      )
    }
  </For>
);

/** Enough for a party pitcher; past this people batch by volume, not by drink. */
const MAX_SERVINGS = 12;

/** Marks a history entry the sheet pushed itself, so closing can pop it. */
interface SheetState {
  sheet?: boolean;
}

/**
 * The open recipe lives in the URL rather than in page state. The back button
 * then closes the sheet instead of leaving the page — on a phone that is how
 * people dismiss things — and any recipe can be linked to or opened in a tab.
 */
export function useRecipeSheet() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const slug = () => {
    const value = params[PARAM];
    return typeof value === "string" && value ? value : undefined;
  };

  const href = (recipe: { id: string; translation_key?: string }) => {
    const query = new URLSearchParams(location.search);
    query.set(PARAM, recipeSlug(recipe));
    return `${location.pathname}?${query}`;
  };

  const open = (recipe: { id: string; translation_key?: string }) =>
    navigate(href(recipe), { scroll: false, state: { sheet: true } satisfies SheetState });

  /**
   * Click handler for a link to `recipe`, which keeps it a real link: a plain
   * click opens the sheet over the page, a modified one is left to the browser
   * to open a tab or a window.
   */
  const follow = (recipe: { id: string; translation_key?: string }) => (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(recipe);
  };

  // A sheet opened in the app pushed its own history entry, so closing pops it
  // and Back afterwards leaves the page as expected. One reached from a link has
  // nothing of ours to pop, so the parameter is replaced away instead.
  const close = () => {
    if ((location.state as SheetState | undefined)?.sheet) navigate(-1);
    else setParams({ [PARAM]: undefined }, { replace: true, scroll: false });
  };

  return { slug, href, open, follow, close };
}

interface PanelProps {
  /**
   * Rows already on the page. A recipe opened from one of them renders its
   * headline at once and keeps its match context; one reached from a link waits
   * for the request.
   */
  rows?: (Recipe | RecipeMatchResult)[];
}

/** A recipe laid out as a book spread: ingredients on the left, method on the right. */
export const RecipeDetailModal: Component<PanelProps> = (props) => {
  const { t, tCount, tName, tCategory, tMethod, tGlassware, tMeasure } = useI18n();
  const sheet = useRecipeSheet();

  const row = createMemo(() => {
    const slug = sheet.slug();
    return slug ? props.rows?.find((r) => recipeSlug(r) === slug) : undefined;
  });

  /*
   * Fetched in an effect, not through createResource. A resource read here
   * either suspended the app-wide boundary — the page unmounted and came back
   * scrolled to the top — or, inside the router's navigation transition, held
   * the URL change until the request finished, so on a slow connection a click
   * did nothing for seconds. This way the sheet opens at once on the row's
   * headline and the body fills in.
   */
  const [details, setDetails] = createSignal<Recipe>();
  const [loading, setLoading] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  // Per drink, not remembered: making four of one thing says nothing about the next.
  const [servings, setServings] = createSignal(1);
  const [aboutOpen, setAboutOpen] = createSignal(false);

  createEffect(() => {
    const slug = sheet.slug();
    setDetails(undefined);
    setFailed(false);
    setServings(1);
    setAboutOpen(false);
    setLoading(Boolean(slug));
    if (!slug) return;

    const controller = new AbortController();
    recipeService
      .getRecipe(slug, controller.signal)
      .then((recipe) => setDetails(recipe))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    onCleanup(() => controller.abort());
  });

  /** The headline facts: the page's own row when there is one, else the fetch. */
  const recipe = (): Recipe | RecipeMatchResult | undefined => row() ?? details();

  /**
   * Which bottle stands in for which requirement.
   *
   * The server works this out during matching and reports it, so the browser no
   * longer keeps its own copy of the substitution rules. Recipes opened from the
   * archive carry no match context, so no substitutions are shown there.
   */
  const substituteFor = createMemo(() => {
    const subs = (row() as RecipeMatchResult | undefined)?.substitutions ?? [];
    return new Map(subs.map((s) => [s.required_id, s.substitute_id]));
  });

  const close = () => sheet.close();

  // Escape should dismiss the modal, and the page behind it must not scroll.
  createEffect(() => {
    if (!sheet.slug()) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    });
  });

  const isFavorite = () => userStore.isFavorite(recipe()?.id ?? "");

  const steps = () =>
    details()
      ?.steps.split("\n")
      .filter((line) => line.trim()) ?? [];

  const profile = () => [
    { label: t("card.sweet"), value: recipe()?.sweetness ?? 0 },
    { label: t("card.sour"), value: recipe()?.sourness ?? 0 },
    { label: t("card.strength"), value: recipe()?.strength ?? 0 },
  ];

  return (
    <div class={`overlay ${sheet.slug() ? "open" : ""}`} onClick={close}>
      <div
        class="sheet max-w-[1040px] max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(e) => e.stopPropagation()}
      >
        <Show when={sheet.slug()}>
          <div class="shrink-0 flex items-center justify-between gap-4 px-6 lg:px-10 h-14 border-b border-rule">
            <span class="eyebrow">{t("detail.eyebrow")}</span>
            <div class="flex items-center gap-1">
              <Show when={recipe()}>
                {(current) => (
                  <button
                    type="button"
                    aria-label={t("detail.save") ?? "Save"}
                    aria-pressed={isFavorite()}
                    class="btn btn-quiet px-2.5"
                    classList={{ "text-accent hover:text-accent": isFavorite() }}
                    onClick={(e) => {
                      e.stopPropagation();
                      userStore.toggleFavorite(current().id);
                    }}
                  >
                    <Icon name="heart" filled={isFavorite()} />
                  </button>
                )}
              </Show>
              <button
                type="button"
                aria-label={t("common.close") ?? "Close"}
                class="btn btn-quiet px-2.5"
                onClick={close}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>

          <Show when={loading()}>
            <div
              class="progress-rule shrink-0"
              role="status"
              aria-label={t("common.loading") ?? ""}
            />
          </Show>

          <div class="flex-1 overflow-y-auto px-6 lg:px-10 py-8 min-h-0">
            {/* With no row to draw from — a recipe reached by link — there is
                nothing to show until the request answers. */}
            <Show
              when={recipe()}
              fallback={
                <Show when={failed()}>
                  <p class="py-10 text-flag-missing">{t("detail.loadFailed")}</p>
                </Show>
              }
            >
              <div class="grid gap-8 sm:grid-cols-[1fr_auto] items-start pb-8 border-b border-rule">
                <div class="max-w-[46ch]">
                  <h2 id={TITLE_ID} class="display text-[clamp(2.125rem,4vw,3.25rem)]">
                    {tName(recipe())}
                  </h2>
                  <p class="meta mt-3">
                    {tMethod(recipe()?.method)}
                    <span class="text-rule-strong"> · </span>
                    {tGlassware(recipe()?.glassware)}
                  </p>
                  {/* Clamped on a phone, where the full paragraph pushed the
                      ingredients — what you need at the bar — off the first screen. */}
                  <Show when={details()?.description}>
                    {(description) => (
                      <>
                        <p
                          class="mt-5 text-[17px] leading-[1.65] text-ink-muted"
                          classList={{ "max-sm:line-clamp-3": !aboutOpen() }}
                        >
                          {description()}
                        </p>
                        <Show when={description().length > 140}>
                          <button
                            type="button"
                            class="sm:hidden mt-1.5 text-[14px] text-ink underline underline-offset-4 decoration-1"
                            aria-expanded={aboutOpen()}
                            onClick={() => setAboutOpen((open) => !open)}
                          >
                            {aboutOpen() ? t("detail.less") : t("detail.more")}
                          </button>
                        </Show>
                      </>
                    )}
                  </Show>
                </div>

                {/* The plate when there is one, and the tasting scale either way —
                  it is the first thing you want to know about a drink, and with
                  no photograph the column would otherwise sit empty. */}
                <div class="w-full sm:w-[200px] space-y-6">
                  <Show
                    when={recipe()?.image_url}
                    fallback={
                      <Glass
                        glassware={recipe()?.glassware}
                        class="hidden sm:block h-20 w-auto text-ink-faint"
                      />
                    }
                  >
                    <img
                      src={recipe()?.image_url}
                      alt=""
                      class="w-full aspect-[4/5] object-cover border border-rule rounded-card"
                    />
                  </Show>

                  <div>
                    <h3 class="eyebrow">{t("detail.profile")}</h3>
                    {/* Three across on a phone, one per line beside the text on
                        wider screens. */}
                    <dl class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-1 sm:gap-2">
                      <For each={profile()}>
                        {(row) => (
                          <div class="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <dt class="text-[14px] text-ink-muted">{row.label}</dt>
                            <dd class="flex items-center gap-2.5">
                              <TickMeter value={row.value} label={`${row.label} ${row.value}/5`} />
                              <span class="meta w-2">{row.value}</span>
                            </dd>
                          </div>
                        )}
                      </For>
                    </dl>
                  </div>
                </div>
              </div>

              <Show
                when={!failed()}
                fallback={<p class="py-10 text-flag-missing">{t("detail.loadFailed")}</p>}
              >
                <div class="grid gap-10 lg:gap-14 md:grid-cols-2 pt-8">
                  <section>
                    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                      <h3 class="eyebrow">{t("detail.ingredients")}</h3>
                      <div class="flex items-center gap-3">
                        <div
                          class="flex items-center"
                          role="group"
                          aria-label={t("detail.servings") ?? undefined}
                        >
                          <button
                            type="button"
                            class="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-default"
                            aria-label={t("detail.servingsFewer") ?? undefined}
                            disabled={servings() === 1}
                            onClick={() => setServings((n) => Math.max(1, n - 1))}
                          >
                            <Icon name="minus" size={12} />
                          </button>
                          <span class="meta tabular min-w-[4.5rem] text-center" aria-live="polite">
                            {tCount("detail.servingsCount", servings())}
                          </span>
                          <button
                            type="button"
                            class="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-default"
                            aria-label={t("detail.servingsMore") ?? undefined}
                            disabled={servings() === MAX_SERVINGS}
                            onClick={() => setServings((n) => Math.min(MAX_SERVINGS, n + 1))}
                          >
                            <Icon name="plus" size={12} />
                          </button>
                        </div>
                        <div
                          class="segmented font-mono"
                          role="group"
                          aria-label={t("detail.units") ?? undefined}
                        >
                          <For each={UNITS}>
                            {(units) => (
                              <button
                                type="button"
                                aria-pressed={userStore.units === units}
                                onClick={() => userStore.setUnits(units)}
                              >
                                {units}
                              </button>
                            )}
                          </For>
                        </div>
                      </div>
                    </div>
                    <ul class="mt-4">
                      <For each={details()?.ingredients ?? []}>
                        {(ing) => {
                          const owned = () => inventoryStore.owns(ing.ingredient_id);
                          const substitute = () =>
                            findIngredient(substituteFor().get(ing.ingredient_id));
                          const measure = () =>
                            formatMeasure(ing.amount, ing.unit, servings(), userStore.units);

                          return (
                            <li class="grid grid-cols-[5.25rem_1fr] gap-x-3 gap-y-1 py-3 border-b border-rule last:border-b-0">
                              <span class="font-mono text-[13px] tabular text-ink pt-px">
                                <Measure text={tMeasure(measure().amount, measure().unit)} />
                              </span>
                              <div>
                                <span class="text-[15px]">{tName(ing)}</span>
                                <Show when={ing.strict}>
                                  <span
                                    class="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint border-b border-dotted border-ink-faint"
                                    title={t("detail.status.strictHint") ?? undefined}
                                  >
                                    {t("detail.status.strict")}
                                  </span>
                                </Show>
                                <div class="mt-0.5 font-mono text-[11px]">
                                  <Show
                                    when={owned()}
                                    fallback={
                                      <Show
                                        when={substitute()}
                                        fallback={
                                          <span class="text-flag-missing font-medium">
                                            {t("detail.status.missing")}
                                          </span>
                                        }
                                      >
                                        {(sub) => (
                                          <span class="text-flag-sub">
                                            {t("detail.status.sub", { name: tName(sub()) })}
                                          </span>
                                        )}
                                      </Show>
                                    }
                                  >
                                    {/* Quiet on purpose. It used to be the accent, which
                                        in the default oxblood is the same hue as
                                        "missing", so the list could not be scanned. */}
                                    <span class="text-ink-muted inline-flex items-center gap-1">
                                      <Icon name="check" size={11} />
                                      {t("detail.status.owned")}
                                    </span>
                                  </Show>
                                  <span class="text-rule-strong"> · </span>
                                  <span class="text-ink-faint">{tCategory(ing.category)}</span>
                                </div>
                              </div>
                            </li>
                          );
                        }}
                      </For>
                    </ul>
                  </section>

                  <section>
                    <h3 class="eyebrow">{t("detail.method")}</h3>
                    <ol class="mt-4 space-y-5">
                      <For each={steps()}>
                        {(step, i) => (
                          <li class="grid grid-cols-[1.75rem_1fr] gap-3">
                            <span class="display text-[19px] text-ink-faint tabular leading-[1.5]">
                              {i() + 1}
                            </span>
                            <p class="text-[15px] leading-[1.65] text-ink-muted">
                              {step.replace(/^\d+[\s.]*/, "")}
                            </p>
                          </li>
                        )}
                      </For>
                    </ol>
                  </section>
                </div>

                <Show when={(details()?.tags ?? []).length > 0}>
                  <section class="pt-8 mt-8 border-t border-rule">
                    <h3 class="eyebrow">{t("detail.tags")}</h3>
                    {/* Each tag opens the archive filtered by it — "more like this". */}
                    <ul class="mt-4 flex flex-wrap gap-1.5">
                      <For each={details()?.tags ?? []}>
                        {(tag) => (
                          <li>
                            <a
                              href={`/recipes?tags=${tagSlug(tag)}`}
                              class="block px-2 py-1 border border-rule rounded-card text-[13px] text-ink-muted transition-colors hover:border-ink hover:text-ink"
                            >
                              {tName(tag)}
                            </a>
                          </li>
                        )}
                      </For>
                    </ul>
                  </section>
                </Show>
              </Show>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};
