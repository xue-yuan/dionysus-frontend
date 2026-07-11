import type { Component } from 'solid-js';
import { createResource, Show, For, createSignal, createEffect } from 'solid-js';
import { recipeService } from '../services/recipeService';
import type { Recipe, RecipeMatchResult } from '../types';
import { useI18n } from '../i18n';
import { userStore } from '../stores/userStore';

interface PanelProps {
  recipe: Recipe | RecipeMatchResult | null;
  onClose: () => void;
}

export const RecipeDetailModal: Component<PanelProps> = (props) => {
  const { t, tDynamic } = useI18n();
  const [details] = createResource(
    () => props.recipe?.id,
    recipeService.getRecipe
  );

  const [ownedIngredients, setOwnedIngredients] = createSignal<string[]>([]);
  const [allowSubstitutes, setAllowSubstitutes] = createSignal(false);
  const [allIngredients] = createResource(recipeService.getIngredients);

  createEffect(() => {
    if (props.recipe) {
      const stored = localStorage.getItem('dionysus_studio_state_v2');
      try {
        const parsed = stored ? JSON.parse(stored) : null;
        setOwnedIngredients(parsed?.ownedIngredients || []);
        setAllowSubstitutes(parsed?.allowSubstitutes || false);
      } catch {
        setOwnedIngredients([]);
        setAllowSubstitutes(false);
      }
    }
  });

  const ownedNames = () => {
    const ids = ownedIngredients();
    const ings = allIngredients() || [];
    return ids.map(id => ings.find(i => i.id === id)?.name).filter((name): name is string => !!name);
  };

  const getEquivalentGroup = (name: string) => {
    const equivalentGroups = [
      ["Bourbon", "Rye Whiskey", "Irish Whiskey", "Blended Scotch Whisky", "Islay Scotch Whisky", "Japanese Whisky"],
      ["London Dry Gin", "Navy Strength Gin", "Old Tom Gin", "Plymouth Gin"],
      ["Light Rum", "Dark Rum", "Aged Rum", "Overproof Rum", "Spiced Rum"],
      ["Blanco Tequila", "Reposado Tequila", "Añejo Tequila", "Mezcal"],
      ["Cognac", "Brandy", "Apple Brandy", "Pisco"],
      ["Cointreau", "Triple Sec", "Dry Curaçao", "Orange Curaçao", "Grand Marnier", "Blue Curaçao"],
      ["Simple Syrup", "Demerara Syrup", "Sugar Cube", "Agave Syrup", "Honey Syrup", "Maple Syrup"],
      ["Sweet Vermouth", "Lillet Blanc"]
    ];
    return equivalentGroups.find(group => group.includes(name));
  };

  return (
    <div class={`cinema-modal ${props.recipe ? 'open' : ''}`} onClick={props.onClose}>
      <div class="cinema-modal-card" onClick={(e) => e.stopPropagation()}>
        <Show when={props.recipe}>
          <div class="relative h-[250px] w-full flex items-end shrink-0">
            <Show when={props.recipe?.image_url} fallback={<div class="absolute inset-0 flex items-center justify-center text-8xl bg-white/5 font-black opacity-5">D.</div>}>
              <img src={props.recipe?.image_url} class="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
            </Show>
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

            <div class="relative w-full p-10 flex justify-between items-end gap-6 z-10">
              <div class="space-y-3">
                <div class="flex items-center gap-4 opacity-40">
                  <span class="text-xs font-black uppercase tracking-[0.5em] text-cyan">{t('recipePanel.analysisProtocol')}</span>
                </div>
                <h2 class="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none uppercase">{tDynamic(props.recipe?.translation_key || '', props.recipe?.title || '')}</h2>
                <div class="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest text-white/50">
                  <span class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-cyan"></div> {props.recipe?.glassware}</span>
                  <span class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-secondary"></div> {props.recipe?.method}</span>
                </div>
              </div>
            </div>

            <div class="absolute top-6 right-6 flex items-center gap-3 z-20">
              <button
                class={`w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 ${userStore.favorites.includes(props.recipe?.id || '') ? 'text-secondary bg-secondary/10 border-secondary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.recipe?.id) userStore.toggleFavorite(props.recipe.id);
                }}
              >
                {userStore.favorites.includes(props.recipe?.id || '') ? '❤️' : '🤍'}
              </button>
              <button
                class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                onClick={props.onClose}
              >
                ✕
              </button>
            </div>
          </div>

          <div class="flex-grow overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 custom-scrollbar min-h-0 bg-zinc-950/40">

            <div class="space-y-10">
              <Show when={details.loading}>
                <div class="py-20 flex flex-col items-center gap-4 opacity-20">
                  <div class="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
                  <span class="text-[11px] font-black uppercase tracking-widest text-cyan">{t('recipePanel.decryptingData')}</span>
                </div>
              </Show>

              <Show when={!details.loading}>
                <div class="space-y-4">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t('recipePanel.abstract')}</span>
                  <p class="text-xl font-medium leading-relaxed text-white/70 italic">"{details()?.description}"</p>
                </div>

                <div class="h-px bg-white/5"></div>

                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t('recipePanel.profile')}</span>
                  <div class="space-y-6">
                    <div class="space-y-2">
                      <div class="flex justify-between text-xs uppercase font-black tracking-widest text-white/50">
                        <span>{t('recipeCard.sweet')}</span>
                        <span class="text-cyan">{details()?.sweetness}</span>
                      </div>
                      <div class="h-1 w-full bg-white/5 rounded-full"><div class="h-full bg-cyan shadow-[0_0_15px_rgba(0,242,255,0.6)] rounded-full" style={{ width: `${(details()?.sweetness || 0) * 20}%` }}></div></div>
                    </div>
                    <div class="space-y-2">
                      <div class="flex justify-between text-xs uppercase font-black tracking-widest text-white/50">
                        <span>{t('recipeCard.sour')}</span>
                        <span class="text-secondary">{details()?.sourness}</span>
                      </div>
                      <div class="h-1 w-full bg-white/5 rounded-full"><div class="h-full bg-secondary shadow-[0_0_15px_rgba(139,92,246,0.6)] rounded-full" style={{ width: `${(details()?.sourness || 0) * 20}%` }}></div></div>
                    </div>
                    <div class="space-y-2">
                      <div class="flex justify-between text-xs uppercase font-black tracking-widest text-white/50">
                        <span>{t('recipeCard.booze')}</span>
                        <span class="text-accent">{details()?.strength}</span>
                      </div>
                      <div class="h-1 w-full bg-white/5 rounded-full"><div class="h-full bg-accent shadow-[0_0_15px_rgba(0,242,255,0.6)] rounded-full" style={{ width: `${(details()?.strength || 0) * 20}%` }}></div></div>
                    </div>
                  </div>
                </div>

                <div class="h-px bg-white/5"></div>

                <div class="space-y-4">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t('recipePanel.classifier')}</span>
                  <div class="flex flex-wrap gap-2">
                    <For each={details()?.tags || []}>{(tag) => (
                      <span class="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white/40">
                        {tag.name}
                      </span>
                    )}</For>
                  </div>
                </div>
              </Show>
            </div>

            <div class="space-y-10 lg:border-l lg:border-white/5 lg:pl-10">
              <Show when={!details.loading}>
                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t('recipePanel.composition')}</span>
                  <div class="grid grid-cols-1 gap-4">
                    <For each={details()?.ingredients}>{(ing) => {
                      const owned = () => ownedIngredients().includes(ing.ingredient_id);
                      const subName = () => {
                        if (owned() || !allowSubstitutes()) return "";
                        const group = ing.name ? getEquivalentGroup(ing.name) : undefined;
                        if (group) {
                          const ownedMember = group.find(member => ownedNames().includes(member));
                          return ownedMember || "";
                        }
                        return "";
                      };
                      const translatedSubName = () => {
                        const rawSub = subName();
                        if (!rawSub) return "";
                        const matchingIng = allIngredients()?.find(i => i.name === rawSub);
                        return matchingIng ? tDynamic(matchingIng.translation_key || '', rawSub) : rawSub;
                      };

                      return (
                        <div class="flex justify-between items-center group py-3 border-b border-white/[0.03]">
                          <div class="flex flex-col gap-1">
                            <div class="flex items-center flex-wrap gap-2">
                              <span class="text-md font-bold text-white group-hover:text-cyan transition-colors">{tDynamic(ing.translation_key || '', ing.name || '')}</span>
                              <Show when={owned()} fallback={
                                <Show when={subName()} fallback={
                                  <span class="text-[11px] font-black tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 uppercase">{t('recipePanel.status.missing')}</span>
                                }>
                                  <span class="text-[11px] font-black tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20 uppercase">{t('recipePanel.status.sub', { name: translatedSubName() })}</span>
                                </Show>
                              }>
                                <span class="text-[11px] font-black tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 uppercase">{t('recipePanel.status.owned')}</span>
                              </Show>
                            </div>
                            <span class="text-[11px] uppercase tracking-widest text-white/30">{tDynamic('ingredient.category.' + (ing.category || '').toLowerCase(), ing.category || '')}</span>
                          </div>
                          <div class="text-right">
                            <span class="text-md font-black text-white/80">
                              {ing.amount} <small class="text-xs uppercase font-black tracking-widest text-cyan/80">{ing.unit}</small>
                            </span>
                          </div>
                        </div>
                      );
                    }}</For>
                  </div>
                </div>

                <div class="h-px bg-white/5"></div>

                <div class="space-y-6">
                  <span class="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t('recipePanel.execution')}</span>
                  <div class="space-y-8">
                    <For each={details()?.steps.split('\n').filter(s => s.trim())}>{(step, i) => (
                      <div class="flex gap-6 group">
                        <span class="text-white/10 font-black text-3xl italic group-hover:text-cyan transition-all shrink-0">
                          {(i() + 1).toString().padStart(2, '0')}
                        </span>
                        <p class="text-base leading-relaxed text-white/50 font-medium group-hover:text-white transition-all pt-1">
                          {step.replace(/^\d+[\s.]*/, '')}
                        </p>
                      </div>
                    )}</For>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
