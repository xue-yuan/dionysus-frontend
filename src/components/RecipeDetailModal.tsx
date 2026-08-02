import type { Component } from "solid-js";
import { createResource, createMemo, createEffect, onCleanup, Show, For } from "solid-js";
import { recipeService } from "../services/recipeService";
import type { Recipe, RecipeMatchResult } from "../types";
import { useI18n } from "../i18n";
import { userStore } from "../stores/userStore";
import { inventoryStore } from "../stores/inventoryStore";
import { findIngredient } from "../data/catalog";

interface PanelProps {
  recipe: Recipe | RecipeMatchResult | null;
  onClose: () => void;
}

export const RecipeDetailModal: Component<PanelProps> = (props) => {
  const { t, tName, tCategory } = useI18n();
  const [details] = createResource(
    () => props.recipe?.id,
    (id: string) => recipeService.getRecipe(id),
  );

  /**
   * Which bottle stands in for which requirement.
   *
   * The server works this out during matching and reports it, so the browser no
   * longer keeps its own copy of the substitution rules. Recipes opened from the
   * archive carry no match context, so no substitutions are shown there.
   */
  const substituteFor = createMemo(() => {
    const subs = (props.recipe as RecipeMatchResult | null)?.substitutions ?? [];
    return new Map(subs.map((s) => [s.required_id, s.substitute_id]));
  });

  const close = () => props.onClose();

  // Escape should dismiss the modal, and the page behind it must not scroll.
  createEffect(() => {
    if (!props.recipe) return;

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

  const isFavorite = () => userStore.isFavorite(props.recipe?.id ?? "");

  return (
    <div class={`cinema-modal ${props.recipe ? "open" : ""}`} onClick={close}>
      <div
        class="cinema-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={tName(props.recipe ?? undefined)}
        onClick={(e) => e.stopPropagation()}
      >
        <Show when={props.recipe}>
          <div class="relative h-[250px] w-full flex items-end shrink-0">
            <Show
              when={props.recipe?.image_url}
              fallback={
                <div class="absolute inset-0 flex items-center justify-center text-8xl bg-white/5 font-black opacity-5">
                  D.
                </div>
              }
            >
              <img
                src={props.recipe?.image_url}
                alt=""
                class="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
              />
            </Show>
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

            <div class="relative w-full p-10 flex justify-between items-end gap-6 z-10">
              <div class="space-y-3">
                <div class="flex items-center gap-4 opacity-40">
                  <span class="text-xs font-black uppercase tracking-[0.5em] text-cyan">
                    {t("recipePanel.analysisProtocol")}
                  </span>
                </div>
                <h2 class="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none uppercase">
                  {tName(props.recipe ?? undefined)}
                </h2>
                <div class="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest text-white/50">
                  <span class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-cyan" /> {props.recipe?.glassware}
                  </span>
                  <span class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-secondary" /> {props.recipe?.method}
                  </span>
                </div>
              </div>
            </div>

            <div class="absolute top-6 right-6 flex items-center gap-3 z-20">
              <button
                type="button"
                aria-label={t("recipePanel.toggleFavorite") ?? "Toggle favourite"}
                aria-pressed={isFavorite()}
                class={`w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 ${
                  isFavorite()
                    ? "text-secondary bg-secondary/10 border-secondary/20 shadow-secondary-sm"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.recipe?.id) userStore.toggleFavorite(props.recipe.id);
                }}
              >
                {isFavorite() ? "❤️" : "🤍"}
              </button>
              <button
                type="button"
                aria-label={t("recipePanel.close") ?? "Close"}
                class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                onClick={close}
              >
                ✕
              </button>
            </div>
          </div>

          <div class="flex-grow overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 custom-scrollbar min-h-0 bg-zinc-950/40">
            <div class="space-y-10">
              <Show when={details.loading}>
                <div class="py-20 flex flex-col items-center gap-4 opacity-20">
                  <div class="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                  <span class="text-[11px] font-black uppercase tracking-widest text-cyan">
                    {t("recipePanel.decryptingData")}
                  </span>
                </div>
              </Show>

              <Show when={details.error}>
                <p class="text-sm font-bold text-red-400">{t("recipePanel.loadFailed")}</p>
              </Show>

              <Show when={!details.loading && !details.error}>
                <div class="space-y-4">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">
                    {t("recipePanel.abstract")}
                  </span>
                  <p class="text-xl font-medium leading-relaxed text-white/70 italic">
                    "{details()?.description}"
                  </p>
                </div>

                <div class="h-px bg-white/5" />

                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">
                    {t("recipePanel.profile")}
                  </span>
                  <div class="space-y-6">
                    <For
                      each={[
                        {
                          label: t("recipeCard.sweet"),
                          value: details()?.sweetness,
                          tone: "bg-cyan text-cyan",
                        },
                        {
                          label: t("recipeCard.sour"),
                          value: details()?.sourness,
                          tone: "bg-secondary text-secondary",
                        },
                        {
                          label: t("recipeCard.booze"),
                          value: details()?.strength,
                          tone: "bg-accent text-accent",
                        },
                      ]}
                    >
                      {(row) => (
                        <div class="space-y-2">
                          <div class="flex justify-between text-xs uppercase font-black tracking-widest text-white/50">
                            <span>{row.label}</span>
                            <span class={row.tone.split(" ")[1]}>{row.value}</span>
                          </div>
                          <div class="h-1 w-full bg-white/5 rounded-full">
                            <div
                              class={`h-full ${row.tone.split(" ")[0]} rounded-full`}
                              style={{ width: `${(row.value || 0) * 20}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                <div class="h-px bg-white/5" />

                <div class="space-y-4">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">
                    {t("recipePanel.classifier")}
                  </span>
                  <div class="flex flex-wrap gap-2">
                    <For each={details()?.tags ?? []}>
                      {(tag) => (
                        <span class="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white/40">
                          {tName(tag)}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            <div class="space-y-10 lg:border-l lg:border-white/5 lg:pl-10">
              <Show when={!details.loading && !details.error}>
                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">
                    {t("recipePanel.composition")}
                  </span>
                  <div class="grid grid-cols-1 gap-4">
                    <For each={details()?.ingredients}>
                      {(ing) => {
                        const owned = () => inventoryStore.owns(ing.ingredient_id);
                        const substitute = () =>
                          findIngredient(substituteFor().get(ing.ingredient_id));

                        return (
                          <div class="flex justify-between items-center group py-3 border-b border-white/[0.03]">
                            <div class="flex flex-col gap-1">
                              <div class="flex items-center flex-wrap gap-2">
                                <span class="text-md font-bold text-white group-hover:text-cyan transition-colors">
                                  {tName(ing)}
                                </span>
                                <Show
                                  when={owned()}
                                  fallback={
                                    <Show
                                      when={substitute()}
                                      fallback={
                                        <span class="text-[11px] font-black tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 uppercase">
                                          {t("recipePanel.status.missing")}
                                        </span>
                                      }
                                    >
                                      {(sub) => (
                                        <span class="text-[11px] font-black tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20 uppercase">
                                          {t("recipePanel.status.sub", { name: tName(sub()) })}
                                        </span>
                                      )}
                                    </Show>
                                  }
                                >
                                  <span class="text-[11px] font-black tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 uppercase">
                                    {t("recipePanel.status.owned")}
                                  </span>
                                </Show>
                                <Show when={ing.strict}>
                                  <span
                                    class="text-[11px] font-black tracking-widest text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase"
                                    title={t("recipePanel.status.strictHint") ?? undefined}
                                  >
                                    {t("recipePanel.status.strict")}
                                  </span>
                                </Show>
                              </div>
                              <span class="text-[11px] uppercase tracking-widest text-white/30">
                                {tCategory(ing.category)}
                              </span>
                            </div>
                            <div class="text-right">
                              <span class="text-md font-black text-white/80">
                                {ing.amount}{" "}
                                <small class="text-xs uppercase font-black tracking-widest text-cyan/80">
                                  {ing.unit}
                                </small>
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>

                <div class="h-px bg-white/5" />

                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">
                    {t("recipePanel.execution")}
                  </span>
                  <ol class="space-y-8">
                    <For
                      each={details()
                        ?.steps.split("\n")
                        .filter((s) => s.trim())}
                    >
                      {(step, i) => (
                        <li class="flex gap-6 group">
                          <span class="text-white/10 font-black text-3xl italic group-hover:text-cyan transition-all shrink-0">
                            {(i() + 1).toString().padStart(2, "0")}
                          </span>
                          <p class="text-base leading-relaxed text-white/50 font-medium group-hover:text-white transition-all pt-1">
                            {step.replace(/^\d+[\s.]*/, "")}
                          </p>
                        </li>
                      )}
                    </For>
                  </ol>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
