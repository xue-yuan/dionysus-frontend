import type { Component } from 'solid-js';
import { Show, For } from 'solid-js';
import type { Recipe, RecipeMatchResult } from '../types';

interface RecipeCardProps {
    recipe: Recipe | RecipeMatchResult;
    onViewDetails: () => void;
    missingIngredientName?: string;
}


export const RecipeCard: Component<RecipeCardProps> = (props) => {
    const totalIngredients = () => {
        if ('total_ingredients' in props.recipe) {
            return (props.recipe as RecipeMatchResult).total_ingredients;
        }
        return (props.recipe as Recipe).ingredients?.length || 0;
    };

    const getTagColor = (type: string) => {
        return type === 'Equipment' ? 'badge-accent' : 'badge-primary';
    };

    return (
        <div
            class="card card-compact bg-base-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 group border border-base-200 overflow-hidden"
        >
            <figure
                class="h-56 bg-base-200 relative overflow-hidden cursor-pointer"
                onClick={props.onViewDetails}
            >
                <Show when={props.recipe.image_url} fallback={<div class="flex items-center justify-center h-full text-6xl opacity-20 w-full bg-gradient-to-br from-base-200 to-base-300">🍸</div>}>
                    <img src={props.recipe.image_url} alt={props.recipe.title} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                </Show>
                <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-base-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </figure>

            <div class="card-body p-6">
                <div class="mb-3">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="card-title text-2xl font-serif font-black tracking-tight leading-none group-hover:text-primary transition-colors">{props.recipe.title}</h3>
                    </div>
                    <div class="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest opacity-40">
                        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-base-content/20"></span>{props.recipe.glassware}</span>
                        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-base-content/20"></span>{props.recipe.method}</span>
                    </div>

                    <Show when={props.missingIngredientName}>
                        <div class="mt-3 bg-warning/10 border border-warning/20 rounded-lg p-2 flex items-start gap-2">
                            <div class="text-warning mt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <div class="text-[9px] font-black uppercase tracking-widest text-warning opacity-80 mb-0.5">Missing Item</div>
                                <div class="text-xs font-bold text-warning-content">{props.missingIngredientName}</div>
                            </div>
                        </div>
                    </Show>
                </div>

                <div class="grid grid-cols-3 gap-2 mb-4">
                    <div class="bg-base-200/40 px-2 py-1.5 rounded-md text-center">
                        <div class="text-[9px] uppercase font-black opacity-30 mb-0.5">Sweet</div>
                        <div class="text-xs font-bold">{props.recipe.sweetness}</div>
                    </div>
                    <div class="bg-base-200/40 px-2 py-1.5 rounded-md text-center">
                        <div class="text-[9px] uppercase font-black opacity-30 mb-0.5">Sour</div>
                        <div class="text-xs font-bold">{props.recipe.sourness}</div>
                    </div>
                    <div class="bg-base-200/40 px-2 py-1.5 rounded-md text-center">
                        <div class="text-[9px] uppercase font-black opacity-30 mb-0.5">Booze</div>
                        <div class="text-xs font-bold">{props.recipe.strength}</div>
                    </div>
                </div>

                <Show when={props.recipe.tags && props.recipe.tags.length > 0}>
                    <div class="flex flex-wrap gap-1.5 mb-5 min-h-[1.5rem]">
                        <For each={(props.recipe.tags || []).slice(0, 4)}>{(tag) => (
                            <span class={`badge badge-xs ${getTagColor(tag.type || 'Palate')} badge-outline border-opacity-20 text-[9px] uppercase font-black py-2 px-2`}>
                                {tag.name}
                            </span>
                        )}</For>
                        <Show when={(props.recipe.tags?.length || 0) > 4}>
                            <span class="text-[9px] opacity-20 font-black self-center ml-1">+{(props.recipe.tags?.length || 0) - 4} MORE</span>
                        </Show>
                    </div>
                </Show>

                <div class="card-actions justify-between items-center mt-auto border-t border-base-200 pt-4">
                    <span class="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{totalIngredients()} Units</span>
                    <button
                        onClick={props.onViewDetails}
                        class="btn btn-sm btn-ghost hover:bg-transparent hover:text-primary transition-all p-0 group-hover:translate-x-1"
                    >
                        <span class="text-[11px] font-black uppercase tracking-widest">Discover</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>

    );
};
