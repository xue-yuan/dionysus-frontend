import type { Component } from "solid-js";
import { For, Show, createSignal, createMemo, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { recipeService } from "../services/recipeService";
import { RecipeCard } from "../components/RecipeCard";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { Layout, Page, SiteFooter } from "../components/Layout";
import { Masthead, SearchField, Notice, CardGrid } from "../components/Editorial";
import { userStore } from "../stores/userStore";
import { shelfMatch } from "../data/shelfMatches";
import { useI18n } from "../i18n";

const SavedRecipes: Component = () => {
  const { t, tCount, tName } = useI18n();
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

  // `latest` keeps the cards on screen while a refetch runs. Reading `saved()`
  // instead suspends the app-wide boundary, so un-saving a drink from the sheet
  // blanked the page and threw away the scroll position.
  const recipes = () => saved.latest?.items ?? [];

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
      <RecipeDetailModal rows={recipes()} />

      <Page>
        <Masthead
          eyebrow={t("saved.eyebrow")}
          title={t("saved.title")}
          meta={<p class="meta">{tCount("saved.count", filteredRecipes().length)}</p>}
        />

        <Show when={recipes().length > 0}>
          <div class="sticky top-0 z-30 bg-paper border-y border-rule py-3">
            <SearchField value={searchQuery()} onInput={setSearchQuery} label={t("saved.search")} />
          </div>
        </Show>

        <div class="h-px" classList={{ "progress-rule": saved.loading }} role="status" />

        <div class="pt-12">
          <Show when={saved.error}>
            <Notice title={t("saved.loadFailed")} tone="error" />
          </Show>

          <Show when={!saved.loading && !saved.error && recipes().length === 0}>
            <Notice title={t("saved.empty.title")}>
              <A href="/recipes" class="btn btn-outline">
                {t("saved.empty.action")}
              </A>
            </Notice>
          </Show>

          <Show when={recipes().length > 0 && filteredRecipes().length === 0}>
            <Notice title={t("archive.empty.title")} />
          </Show>

          <CardGrid>
            <For each={filteredRecipes()}>
              {(recipe) => <RecipeCard recipe={recipe} match={shelfMatch(recipe.id)} />}
            </For>
          </CardGrid>

          <SiteFooter />
        </div>
      </Page>
    </Layout>
  );
};

export default SavedRecipes;
