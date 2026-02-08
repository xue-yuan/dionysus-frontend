import type { Component } from 'solid-js';
import { createResource, Show, For } from 'solid-js';
import { recipeService } from '../services/recipeService';
import { getCategoryIcon } from '../utils/icons';
import type { Recipe, RecipeMatchResult } from '../types';

interface ModalProps {
    recipe: Recipe | RecipeMatchResult | null;
    onClose: () => void;
}

export const RecipeDetailModal: Component<ModalProps> = (props) => {
    const [details] = createResource(
        () => props.recipe?.id,
        recipeService.getRecipe
    );
    const groupedTags = () => {
        const tags = details()?.tags || [];
        return tags.reduce((acc, tag) => {
            const type = tag.type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(tag);
            return acc;
        }, {} as Record<string, typeof tags>);
    };

    const groupedIngredients = () => {
        const ingredients = details()?.ingredients || [];
        return ingredients.reduce((acc, ing) => {
            const cat = ing.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(ing);
            return acc;
        }, {} as Record<string, typeof ingredients>);
    };


    const getTagColor = (type: string) => {
        return type === 'Equipment' ? 'badge-accent' : 'badge-primary';
    };

    return (
        <dialog class={`modal modal-bottom sm:modal-middle backdrop-blur-md ${props.recipe ? 'modal-open' : ''}`}>
            <div class="modal-box w-11/12 max-w-4xl p-0 bg-base-100 overflow-y-auto shadow-2xl border border-base-200 scrollbar-hide max-h-[90vh]">
                <Show when={props.recipe}>
                    <div class="relative h-72 w-full bg-base-300">
                        <Show when={props.recipe?.image_url} fallback={<div class="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-base-300 to-base-100">🍸</div>}>
                            <img src={props.recipe?.image_url} class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/20 to-transparent"></div>
                        </Show>
                        <div class="absolute bottom-0 left-0 w-full p-8">
                            <h2 class="text-5xl font-serif font-black text-base-content tracking-tight">{props.recipe?.title}</h2>
                            <div class="flex gap-4 mt-3 text-xs font-mono uppercase tracking-[0.2em] opacity-60">
                                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-primary"></span>{props.recipe?.glassware}</span>
                                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-secondary"></span>{props.recipe?.method}</span>
                            </div>
                        </div>
                        <button class="btn btn-circle btn-sm btn-ghost absolute top-4 right-4 bg-base-100/10 hover:bg-base-100/30 backdrop-blur-md border-none text-base-content" onClick={props.onClose}>✕</button>
                    </div>

                    <div class="px-8 pt-8">
                        <p class="text-xl font-light leading-relaxed max-w-3xl italic opacity-80 border-l-4 border-primary/20 pl-6">{details()?.description}</p>
                    </div>

                    <div class="px-8 pt-8 space-y-4">
                        <For each={Object.entries(groupedTags())}>{([type, tags]) => (
                            <div class="flex items-center gap-4">
                                <span class="text-[10px] uppercase tracking-widest font-black opacity-30 w-24 shrink-0">{type}</span>
                                <div class="flex flex-wrap gap-2">
                                    <For each={tags}>{(tag) => (
                                        <span class={`badge badge-md ${getTagColor(type)} badge-outline border-opacity-30 px-3 py-3 text-[11px] font-bold uppercase tracking-wider`}>
                                            {tag.name}
                                        </span>
                                    )}</For>
                                </div>
                            </div>
                        )}</For>
                    </div>

                    <div class="px-8 pt-10">
                        <div class="grid grid-cols-3 gap-6 bg-base-200/30 p-8 rounded-3xl border border-base-200/50">
                            <div class="flex flex-col items-center gap-3">
                                <div class="radial-progress text-primary transition-all duration-1000" style={{ "--value": (details()?.sweetness || 0) * 20, "--size": "4.5rem", "--thickness": "6px" }}>
                                    <span class="text-lg font-serif font-bold text-base-content">{details()?.sweetness}</span>
                                </div>
                                <span class="text-xs uppercase font-black tracking-widest opacity-40">Sweetness</span>
                            </div>
                            <div class="flex flex-col items-center gap-3">
                                <div class="radial-progress text-secondary transition-all duration-1000" style={{ "--value": (details()?.sourness || 0) * 20, "--size": "4.5rem", "--thickness": "6px" }}>
                                    <span class="text-lg font-serif font-bold text-base-content">{details()?.sourness}</span>
                                </div>
                                <span class="text-xs uppercase font-black tracking-widest opacity-40">Sourness</span>
                            </div>
                            <div class="flex flex-col items-center gap-3">
                                <div class="radial-progress text-error transition-all duration-1000" style={{ "--value": (details()?.strength || 0) * 20, "--size": "4.5rem", "--thickness": "6px" }}>
                                    <span class="text-lg font-serif font-bold text-base-content">{details()?.strength}</span>
                                </div>
                                <span class="text-xs uppercase font-black tracking-widest opacity-40">Strength</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-8 grid grid-cols-1 md:grid-cols-5 gap-12 pt-10">
                        <div class="md:col-span-2 space-y-8">
                            <div>
                                <h3 class="font-serif text-2xl font-bold mb-6 text-base-content flex items-center gap-3">
                                    Ingredients
                                    <span class="text-[10px] font-mono font-normal opacity-40 uppercase tracking-tighter bg-base-300 px-2 py-0.5 rounded-full">
                                        {details()?.ingredients?.length || 0} Total
                                    </span>
                                </h3>

                                <Show when={details.loading}>
                                    <div class="space-y-4">
                                        <div class="skeleton h-6 w-full"></div>
                                        <div class="skeleton h-6 w-5/6"></div>
                                        <div class="skeleton h-6 w-4/6"></div>
                                    </div>
                                </Show>

                                <div class="space-y-8">
                                    <For each={Object.entries(groupedIngredients())}>{([cat, ings]) => (
                                        <div class="space-y-3">
                                            <h4 class="text-[10px] uppercase tracking-[0.3em] font-black opacity-30 flex items-center gap-2">
                                                <span>{getCategoryIcon(cat)}</span>
                                                {cat}
                                            </h4>
                                            <ul class="space-y-2.5">
                                                <For each={ings}>{(ing) => (
                                                    <li class="flex justify-between items-baseline group">
                                                        <span class="text-[15px] font-medium group-hover:text-primary transition-colors">{ing.name}</span>
                                                        <div class="flex-grow border-b border-dotted border-base-300 mx-3 mb-1 opcity-50"></div>
                                                        <span class="font-mono text-[13px] opacity-70 group-hover:opacity-100 transition-opacity">
                                                            {ing.amount} <small class="text-[10px] uppercase">{ing.unit}</small>
                                                        </span>
                                                    </li>
                                                )}</For>
                                            </ul>
                                        </div>
                                    )}</For>
                                </div>
                            </div>
                        </div>

                        <div class="md:col-span-3">
                            <h3 class="font-serif text-2xl font-bold mb-6 text-base-content">Instructions</h3>
                            <Show when={details.loading}>
                                <div class="space-y-4">
                                    <div class="skeleton h-4 w-full"></div>
                                    <div class="skeleton h-4 w-full"></div>
                                    <div class="skeleton h-4 w-3/4"></div>
                                    <div class="skeleton h-4 w-5/6"></div>
                                </div>
                            </Show>
                            <Show when={!details.loading}>
                                <div class="space-y-6">
                                    <For each={details()?.steps.split('\n').filter(s => s.trim())}>{(step) => (
                                        <div class="flex gap-5 group">
                                            <span class="text-primary/30 font-serif text-3xl font-black italic select-none group-hover:text-primary transition-colors">
                                                {step.match(/^\d+/)?.[0] || '•'}
                                            </span>
                                            <p class="text-[16px] leading-relaxed opacity-90 pt-1 group-hover:opacity-100 transition-opacity">
                                                {step.replace(/^\d+[\s.]*/, '')}
                                            </p>
                                        </div>
                                    )}</For>
                                </div>
                            </Show>
                        </div>
                    </div>

                    <div class="modal-action p-8 bg-base-100 border-t border-base-200">
                        <form method="dialog" class="w-full flex justify-between items-center">
                            <span class="text-[10px] font-mono opacity-20 uppercase tracking-widest">Dionysus Recipe Archive v1.0</span>
                            <button class="btn btn-md btn-outline px-8 rounded-full hover:bg-base-content hover:text-base-100 transition-all font-bold uppercase tracking-widest text-xs" onClick={props.onClose}>Close Archive</button>
                        </form>
                    </div>
                </Show>
            </div>
            <form method="dialog" class="modal-backdrop bg-base-content/40">
                <button onClick={props.onClose}>close</button>
            </form>
        </dialog>

    );
};
