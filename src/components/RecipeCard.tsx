import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import type { Recipe, RecipeMatchResult } from '../types';
import { useI18n } from '../i18n';

interface RecipeCardProps {
    recipe: Recipe | RecipeMatchResult;
    onViewDetails: () => void;
    missingIngredientName?: string;
}

export const RecipeCard: Component<RecipeCardProps> = (props) => {
    const { t, tDynamic } = useI18n();


    return (
        <div
            class="group relative aspect-[1.4] glass-ether rounded-3xl border-white/5 overflow-hidden cursor-pointer transition-all duration-700 hover:border-primary/50 hover:shadow-[0_0_50px_rgba(160,0,255,0.15)]"
            onClick={props.onViewDetails}
        >
            <Show when={props.recipe.image_url} fallback={<div class="absolute inset-0 flex items-center justify-center text-8xl opacity-5 grayscale font-black italic">D.</div>}>
                <img src={props.recipe.image_url} alt={props.recipe.title} class="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-110 group-hover:opacity-80 transition-all duration-1000 ease-out" />
            </Show>

            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 transition-opacity duration-700 group-hover:via-black/40"></div>

            <div class="absolute inset-0 p-6 pointer-events-none">
                <div class="absolute inset-x-6 top-6 flex justify-between items-start pointer-events-auto transition-all duration-500 group-hover:opacity-0 group-hover:-translate-y-2">
                    <span class="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest text-cyan">{props.recipe.method}</span>
                    <Show when={props.missingIngredientName}>
                        <div class="w-6 h-6 flex items-center justify-center bg-red-500/80 rounded-full text-white font-black text-xs animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]">!</div>
                    </Show>
                </div>

                <div class="absolute bottom-6 left-6 right-6 pointer-events-auto">
                    <div class="space-y-3">
                        <div class="space-y-1">
                            <h3 class="text-2xl font-black text-white tracking-tightest leading-none uppercase group-hover:text-primary transition-colors duration-500">{tDynamic(props.recipe.translation_key || '', props.recipe.title)}</h3>
                            <div class="flex items-center gap-2.5">
                                <span class="text-xs font-black text-white/40 uppercase tracking-[0.3em]">{props.recipe.glassware}</span>
                                <div class="h-px w-6 bg-white/10"></div>
                                <span class="text-xs font-black text-white/30 uppercase tracking-[0.3em]">{props.recipe.total_ingredients || 0} ITEMS</span>
                            </div>
                        </div>

                        <div class="max-h-0 group-hover:max-h-40 overflow-hidden transition-all duration-700 ease-out">
                            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                <div class="space-y-0.5">
                                    <p class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('recipeCard.sweet') as string}</p>
                                    <p class="text-lg font-black text-white">{props.recipe.sweetness}</p>
                                </div>
                                <div class="space-y-0.5">
                                    <p class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('recipeCard.sour') as string}</p>
                                    <p class="text-lg font-black text-white">{props.recipe.sourness}</p>
                                </div>
                                <div class="space-y-0.5">
                                    <p class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('recipeCard.booze') as string}</p>
                                    <p class="text-lg font-black text-white">{props.recipe.strength}</p>
                                </div>
                            </div>

                            <Show when={props.missingIngredientName}>
                                <div class="text-xs font-black uppercase tracking-widest text-red-400 mt-4 animate-in fade-in slide-in-from-bottom-2">
                                    {t('recipeCard.missingPrefix')}{props.missingIngredientName}
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </div>

            <div class="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-primary/20 rounded-3xl transition-all duration-700"></div>
        </div>
    );
};
