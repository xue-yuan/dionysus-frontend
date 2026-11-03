import type { Component } from "solid-js";
import { Show } from "solid-js";
import type { Recipe, RecipeMatchResult } from "../types";
import { useI18n } from "../i18n";
import { findIngredient } from "../data/catalog";
import { Icon, TickMeter } from "./Icon";
import { Glass } from "./Glass";
import { useRecipeSheet } from "./RecipeDetailModal";

interface RecipeCardProps {
  recipe: Recipe | RecipeMatchResult;
  /**
   * How the recipe stands against the shelf. Home passes its own match rows;
   * the archive and saved pages look each card up in `shelfMatches`. Absent
   * means two or more ingredients away, or an empty shelf.
   */
  match?: RecipeMatchResult;
  /** Home's section heading already says "ready", so the card need not. */
  hideReady?: boolean;
}

/**
 * A plate in a book: image, hairline, caption. Everything the old card revealed
 * on hover now lives in the caption or the detail sheet — a card that rearranges
 * itself under the cursor is hard to scan and impossible to use on touch.
 *
 * Recipes without a photograph drop the plate entirely and set the title larger
 * instead. The archive currently ships no images at all, and a grid of 110
 * identical placeholder monograms is worse than no picture: it fills two thirds
 * of every card with nothing.
 */
export const RecipeCard: Component<RecipeCardProps> = (props) => {
  const { t, tCount, tName, tMethod, tGlassware } = useI18n();
  const sheet = useRecipeSheet();
  const title = () => tName(props.recipe);
  const hasImage = () => Boolean(props.recipe.image_url);

  const ready = () => props.match?.missing_count === 0 && !props.hideReady;
  const missingName = () => {
    if (props.match?.missing_count !== 1) return undefined;
    const ingredient = findIngredient(props.match.missing_ingredients?.[0]);
    return ingredient ? tName(ingredient) : undefined;
  };
  const substituteCount = () => props.match?.substitutions?.length ?? 0;

  // A real link, so a recipe can be opened in a new tab or copied.
  return (
    <a
      href={sheet.href(props.recipe)}
      aria-label={title()}
      onClick={sheet.follow(props.recipe)}
      class="group w-full h-full text-left flex flex-col bg-paper-raised border border-rule rounded-card overflow-hidden cursor-pointer transition-colors hover:border-ink"
    >
      <Show when={hasImage()}>
        <div class="aspect-[4/5] overflow-hidden bg-paper-sunk border-b border-rule">
          <img
            src={props.recipe.image_url}
            alt=""
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </Show>

      <div class="flex-1 flex flex-col p-5" classList={{ "min-h-[11rem]": !hasImage() }}>
        <div class="flex items-start justify-between gap-3">
          <span class="eyebrow truncate">{tMethod(props.recipe.method)}</span>
          <Glass
            glassware={props.recipe.glassware}
            class="h-9 w-auto shrink-0 -mt-1 -mr-1 text-ink-faint transition-colors group-hover:text-ink-muted"
          />
        </div>

        <h3
          class="display mt-1 leading-[1.1] decoration-1 underline-offset-4 group-hover:underline"
          classList={{
            "text-[1.3125rem]": hasImage(),
            "text-[1.625rem]": !hasImage(),
          }}
        >
          {title()}
        </h3>

        <div class="mt-auto pt-4">
          <p class="meta truncate">
            {tGlassware(props.recipe.glassware)}
            <span class="text-rule-strong"> · </span>
            {tCount("card.ingredients", props.recipe.total_ingredients || 0)}
          </p>

          {/* Labelled, because an unlabelled row of ticks reads as decoration. */}
          <p class="meta mt-1.5 flex items-center gap-2">
            {t("card.strength")}
            <TickMeter
              value={props.recipe.strength}
              label={`${t("card.strength")} ${props.recipe.strength}/5`}
            />
          </p>

          <Show when={ready()}>
            <p class="mt-2 text-[13px] text-ink flex items-center gap-1.5">
              <Icon name="check" size={13} />
              {t("card.ready")}
            </p>
          </Show>

          <Show when={missingName()}>
            {(name) => (
              <p class="mt-2 text-[13px] text-flag-missing">
                {t("card.missing", { name: name() })}
              </p>
            )}
          </Show>

          <Show when={substituteCount() > 0}>
            <p class="mt-1.5 text-[13px] text-flag-sub">
              {t("card.substitutes", { count: substituteCount() })}
            </p>
          </Show>
        </div>
      </div>
    </a>
  );
};
