import type { Component } from "solid-js";
import { Show } from "solid-js";
import type { Recipe, RecipeMatchResult } from "../types";
import { useI18n } from "../i18n";

interface RecipeCardProps {
  recipe: Recipe | RecipeMatchResult;
  onViewDetails: () => void;
  missingIngredientName?: string;
  substituteCount?: number;
}

export const RecipeCard: Component<RecipeCardProps> = (props) => {
  const { t, tName } = useI18n();
  const title = () => tName(props.recipe);

  return (
    <button
      type="button"
      aria-label={title()}
      class="group relative w-full text-left aspect-[1.4] glass-ether rounded-3xl border-white/5 overflow-hidden cursor-pointer transition-all duration-700 hover:border-primary/50 hover:shadow-primary-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      onClick={props.onViewDetails}
    >
      <Show
        when={props.recipe.image_url}
        fallback={
          <div class="absolute inset-0 flex items-center justify-center text-8xl opacity-5 grayscale font-black italic">
            D.
          </div>
        }
      >
        <img
          src={props.recipe.image_url}
          alt=""
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-110 group-hover:opacity-80 transition-all duration-1000 ease-out"
        />
      </Show>

      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 transition-opacity duration-700 group-hover:via-black/40" />

      <div class="absolute inset-0 p-6 pointer-events-none">
        <div class="absolute inset-x-6 top-6 flex justify-between items-start transition-all duration-500 group-hover:opacity-0 group-hover:-translate-y-2">
          <span class="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest text-cyan">
            {props.recipe.method}
          </span>
          <Show when={props.missingIngredientName}>
            <div
              class="w-6 h-6 flex items-center justify-center bg-red-500/80 rounded-full text-white font-black text-xs animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              aria-hidden="true"
            >
              !
            </div>
          </Show>
        </div>

        <div class="absolute bottom-6 left-6 right-6">
          <div class="space-y-3">
            <div class="space-y-1">
              <h3 class="text-2xl font-black text-white tracking-tightest leading-none uppercase group-hover:text-primary transition-colors duration-500">
                {title()}
              </h3>
              <div class="flex items-center gap-2.5">
                <span class="text-xs font-black text-white/40 uppercase tracking-[0.3em]">
                  {props.recipe.glassware}
                </span>
                <div class="h-px w-6 bg-white/10" />
                <span class="text-xs font-black text-white/30 uppercase tracking-[0.3em]">
                  {t("recipeCard.itemCount", { count: props.recipe.total_ingredients || 0 })}
                </span>
              </div>
            </div>

            <div class="max-h-0 group-hover:max-h-40 overflow-hidden transition-all duration-700 ease-out">
              <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                <div class="space-y-0.5">
                  <p class="text-[11px] font-black uppercase tracking-widest text-white/20">
                    {t("recipeCard.sweet")}
                  </p>
                  <p class="text-lg font-black text-white">{props.recipe.sweetness}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-[11px] font-black uppercase tracking-widest text-white/20">
                    {t("recipeCard.sour")}
                  </p>
                  <p class="text-lg font-black text-white">{props.recipe.sourness}</p>
                </div>
                <div class="space-y-0.5">
                  <p class="text-[11px] font-black uppercase tracking-widest text-white/20">
                    {t("recipeCard.booze")}
                  </p>
                  <p class="text-lg font-black text-white">{props.recipe.strength}</p>
                </div>
              </div>

              <Show when={props.missingIngredientName}>
                <div class="text-xs font-black uppercase tracking-widest text-red-400 mt-4">
                  {t("recipeCard.missingPrefix")}
                  {props.missingIngredientName}
                </div>
              </Show>

              <Show when={props.substituteCount}>
                {(count) => (
                  <div class="text-xs font-black uppercase tracking-widest text-orange-400 mt-2">
                    {t("recipeCard.usingSubstitutes", { count: count() })}
                  </div>
                )}
              </Show>
            </div>
          </div>
        </div>
      </div>

      <div class="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-primary/20 rounded-3xl transition-all duration-700" />
    </button>
  );
};
