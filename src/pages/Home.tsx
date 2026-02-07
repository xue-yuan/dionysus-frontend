import type { Component } from 'solid-js';
import { createResource, For, Show, createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { A } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import type { Ingredient, RecipeMatchResult } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { userStore } from '../stores/userStore';

const Home: Component = () => {
    const [ingredients] = createResource(recipeService.getIngredients);
    const [tags] = createResource(recipeService.getTags);

    const [state, setState] = createStore({
        ownedIngredients: [] as string[],
        selectedTags: [] as string[],
        minStrength: 0,
        matches: [] as RecipeMatchResult[],
        loading: false,
        sortDirection: 'desc' as 'asc' | 'desc',
        showFavorites: false
    });

    const [selectedRecipe, setSelectedRecipe] = createSignal<RecipeMatchResult | null>(null);

    const groupedIngredients = () => {
        const groups: Record<string, Ingredient[]> = {};
        ingredients()?.forEach(ing => {
            if (!groups[ing.category]) groups[ing.category] = [];
            groups[ing.category].push(ing);
        });
        return groups;
    };

    const toggleIngredient = (id: string) => {
        if (state.ownedIngredients.includes(id)) {
            setState('ownedIngredients', (prev) => prev.filter(i => i !== id));
        } else {
            setState('ownedIngredients', (prev) => [...prev, id]);
        }
    };

    const toggleTag = (id: string) => {
        if (state.selectedTags.includes(id)) {
            setState('selectedTags', (prev) => prev.filter(t => t !== id));
        } else {
            setState('selectedTags', (prev) => [...prev, id]);
        }
    };

    const toggleSort = () => {
        setState('sortDirection', current => current === 'desc' ? 'asc' : 'desc');
    };

    const toggleShowFavorites = () => {
        setState('showFavorites', current => !current);
    };

    const feelingLucky = () => {
        const matches = exactMatches();
        if (matches.length > 0) {
            const random = matches[Math.floor(Math.random() * matches.length)];
            setSelectedRecipe(random);
        } else {
            const near = nearMisses();
            if (near.length > 0) {
                const random = near[Math.floor(Math.random() * near.length)];
                setSelectedRecipe(random);
            } else {
                alert("Add more ingredients to your shaker to get lucky!");
            }
        }
    };

    let timeout: number;
    createEffect(() => {
        const owned = state.ownedIngredients;
        const strength = state.minStrength;
        const tagIds = state.selectedTags;

        if (owned.length === 0) {
            setState('matches', []);
            return;
        }

        setState('loading', true);
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            try {
                const results = await recipeService.matchCocktails(owned, strength, tagIds);
                setState('matches', results || []);
            } catch (e) {
                console.error(e);
                setState('matches', []);
            } finally {
                setState('loading', false);
            }
        }, 300);
    });

    const exactMatches = () => {
        let list = state.matches || [];
        if (state.showFavorites) {
            list = list.filter(m => userStore.isFavorite(m.id));
        }
        return list
            .filter(m => m.missing_count === 0)
            .sort((a, b) => state.sortDirection === 'desc' ? b.strength - a.strength : a.strength - b.strength);
    };

    const nearMisses = () => {
        let list = state.matches || [];
        if (state.showFavorites) {
            list = list.filter(m => userStore.isFavorite(m.id));
        }
        return list
            .filter(m => m.missing_count === 1)
            .sort((a, b) => state.sortDirection === 'desc' ? b.strength - a.strength : a.strength - b.strength);
    };

    const getMissingName = (missingIds?: string[]) => {
        if (!missingIds || missingIds.length === 0) return "Unknown";
        const id = missingIds[0];
        return ingredients()?.find(i => i.id === id)?.name || "Ingredient";
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'Spirit': '🥃',
            'Liqueur': '🧪',
            'Mixer': '🍋',
            'Syrup': '🍯',
            'Bitters': '💧',
            'Garnish': '🌿',
            'Other': '🔹'
        };
        return icons[category] || icons['Other'];
    };

    return (
        <div class="min-h-screen bg-base-100 text-base-content relative selection:bg-primary selection:text-primary-content">

            <RecipeDetailModal
                recipe={selectedRecipe()}
                onClose={() => setSelectedRecipe(null)}
            />

            <nav class="navbar bg-base-100 sticky top-0 z-50 border-b border-base-200/50 backdrop-blur-xl bg-opacity-80 px-6 lg:px-12">
                <div class="flex-1">
                    <A href="/" class="group flex items-center gap-2">
                        <span class="text-2xl font-serif font-black tracking-tighter hover:text-primary transition-colors">Dionysus 🍷</span>
                    </A>
                </div>
                <div class="flex-none gap-6">
                    <A href="/recipes" class="text-sm uppercase font-black tracking-widest opacity-40 hover:opacity-100 transition-opacity">Full Menu</A>
                </div>
            </nav>

            <header class="relative overflow-hidden pt-20 pb-12 border-b border-base-200">
                <div class="container mx-auto px-6 max-w-6xl relative z-10">
                    <div class="max-w-3xl mb-12">
                        <h1 class="text-8xl font-serif font-black leading-[0.9] tracking-tighter mb-8">
                            Craft Your <br /><span class="text-primary italic">Perfect Serve.</span>
                        </h1>
                    </div>
                </div>
                <div class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            </header>

            <div class="container mx-auto px-6 max-w-6xl pb-40">

                <section class="py-20">
                    <div class="flex items-start gap-6 mb-12">
                        <span class="text-6xl font-serif italic text-primary/20 select-none">01</span>
                        <div>
                            <h2 class="text-4xl font-serif font-black tracking-tight mb-2">Inventory Setup</h2>
                            <p class="text-base opacity-40 uppercase tracking-widest font-bold">Declare your available spirits and mixers</p>
                        </div>
                    </div>

                    <div class="space-y-12">
                        <For each={Object.entries(groupedIngredients())}>
                            {([category, items]) => (
                                <div class="group">
                                    <div class="flex items-center gap-3 mb-6">
                                        <span class="text-2xl">{getCategoryIcon(category)}</span>
                                        <h3 class="text-xs font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-100 transition-opacity">{category}</h3>
                                        <div class="h-px flex-grow bg-base-200 ml-4"></div>
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        <For each={items}>
                                            {(item) => (
                                                <button
                                                    class={`btn btn-md rounded-xl normal-case font-bold transition-all duration-300 border px-6 ${state.ownedIngredients.includes(item.id)
                                                        ? 'btn-primary shadow-xl shadow-primary/10 border-primary'
                                                        : 'btn-ghost bg-base-200/30 border-transparent hover:border-base-300 opacity-60 hover:opacity-100'
                                                        }`}
                                                    onClick={() => toggleIngredient(item.id)}
                                                >
                                                    {item.name}
                                                    <Show when={state.ownedIngredients.includes(item.id)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                                                    </Show>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </section>

                <div class="h-px w-full bg-gradient-to-r from-transparent via-base-200 to-transparent"></div>

                <section class="py-20">
                    <div class="flex items-start gap-6 mb-12">
                        <span class="text-6xl font-serif italic text-secondary/20 select-none">02</span>
                        <div>
                            <div class="flex items-center gap-4 mb-2">
                                <h2 class="text-4xl font-serif font-black tracking-tight">Palate Direction</h2>
                                <span class="bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-secondary/20">Optional</span>
                            </div>
                            <p class="text-base opacity-40 uppercase tracking-widest font-bold">Calibrate your tasting preferences</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        <div class="lg:col-span-8 space-y-10">
                            <div>
                                <h4 class="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-6 flex items-center gap-3">
                                    <span class="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(var(--s),0.5)]"></span>
                                    Taste Architecture
                                </h4>
                                <div class="flex flex-wrap gap-2">
                                    <For each={tags()?.filter(t => t.type === 'Palate')}>{(tag) => (
                                        <button
                                            class={`btn btn-sm rounded-full px-5 transition-all duration-300 ${state.selectedTags.includes(tag.id)
                                                ? 'btn-secondary shadow-lg shadow-secondary/10'
                                                : 'btn-outline border-base-200 opacity-40 hover:opacity-100 border-dashed'
                                                }`}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            {tag.name}
                                        </button>
                                    )}</For>
                                </div>
                            </div>

                            <div>
                                <h4 class="text-xs font-black uppercase tracking-[0.4em] opacity-30 mb-6 flex items-center gap-3">
                                    <span class="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(var(--a),0.5)]"></span>
                                    Available Hardware
                                </h4>
                                <div class="flex flex-wrap gap-2">
                                    <For each={tags()?.filter(t => t.type === 'Equipment')}>{(tag) => (
                                        <button
                                            class={`btn btn-sm rounded-full px-5 transition-all duration-300 ${state.selectedTags.includes(tag.id)
                                                ? 'btn-accent text-accent-content shadow-lg shadow-accent/10'
                                                : 'btn-outline border-base-200 opacity-40 hover:opacity-100 border-dashed'
                                                }`}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            {tag.name}
                                        </button>
                                    )}</For>
                                </div>
                            </div>
                        </div>

                        <div class="lg:col-span-4 bg-base-200/30 p-8 rounded-3xl border border-base-200 backdrop-blur-sm">
                            <div class="flex justify-between items-end mb-8">
                                <div>
                                    <h4 class="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">Potency</h4>
                                    <p class="text-2xl font-serif font-black italic">Intensity {state.minStrength}</p>
                                </div>
                                <span class="text-xs font-mono opacity-20 uppercase tracking-widest">Level</span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="1"
                                value={state.minStrength}
                                class="range range-xs range-secondary"
                                onInput={(e) => setState('minStrength', parseInt(e.currentTarget.value))}
                            />
                            <div class="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-20 mt-4">
                                <span>Soft</span>
                                <span>High Proof</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div class="h-px w-full bg-gradient-to-r from-transparent via-base-200 to-transparent"></div>

                <section class="py-20">
                    <div class="flex items-center justify-between mb-16">
                        <div class="flex items-start gap-6">
                            <span class="text-6xl font-serif italic text-primary/20 select-none">03</span>
                            <div>
                                <h2 class="text-4xl font-serif font-black tracking-tight mb-2">Curation Result</h2>
                                <div class="flex items-center gap-4">
                                    <p class="text-base opacity-40 uppercase tracking-widest font-bold">{exactMatches().length} Matches Detected</p>
                                    <button
                                        class="btn btn-circle btn-ghost btn-xs text-primary hover:bg-primary/20 hover:scale-125 transition-all text-sm tooltip"
                                        data-tip="I'm Feeling Lucky"
                                        onClick={feelingLucky}
                                    >
                                        🎲
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-4 bg-base-200/50 p-2 rounded-full border border-base-200">
                            <button
                                class={`btn btn-sm btn-ghost rounded-full px-4 ${state.showFavorites ? 'bg-error text-white' : 'opacity-40'}`}
                                onClick={toggleShowFavorites}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill={state.showFavorites ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span class="text-[10px] font-black uppercase tracking-widest">{state.showFavorites ? 'Saved' : 'All'}</span>
                            </button>
                            <button
                                class="btn btn-sm btn-ghost rounded-full px-4"
                                onClick={toggleSort}
                            >
                                <span class="text-[10px] font-black uppercase tracking-widest opacity-40 mr-2">Sort:</span>
                                <span class="text-[10px] font-black uppercase tracking-widest">{state.sortDirection === 'desc' ? 'Strong' : 'Light'}</span>
                                <span class="ml-1 text-[10px]">{state.sortDirection === 'desc' ? '↓' : '↑'}</span>
                            </button>
                        </div>
                    </div>

                    <div class="min-h-[400px] relative">
                        <Show when={state.loading}>
                            <div class="absolute inset-x-0 top-0 h-40 flex items-center justify-center z-20">
                                <span class="loading loading-dots loading-lg text-primary opacity-30"></span>
                            </div>
                        </Show>

                        <Show when={state.ownedIngredients.length === 0}>
                            <div class="py-24 flex flex-col items-center text-center border-2 border-dashed border-base-200 rounded-3xl group hover:border-primary/20 transition-colors">
                                <div class="text-6xl mb-6 grayscale opacity-20 filter group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-700">🧊</div>
                                <h3 class="text-2xl font-serif font-black tracking-tight mb-2 opacity-20">Cabinet Idle</h3>
                                <p class="text-sm opacity-20 uppercase tracking-[0.3em] font-bold">Declare ingredients in Step 1 to begin</p>
                            </div>
                        </Show>

                        <Show when={state.ownedIngredients.length > 0 && !state.loading && exactMatches().length === 0 && nearMisses().length === 0}>
                            <div class="py-24 flex flex-col items-center text-center border-2 border-dashed border-base-200 rounded-3xl">
                                <div class="text-6xl mb-6 grayscale opacity-20 filter">🔍</div>
                                <h3 class="text-2xl font-serif font-black tracking-tight mb-2 opacity-20">No Direct Matches</h3>
                                <p class="text-sm opacity-20 uppercase tracking-[0.3em] font-bold">Try adjusting filters or adding more items</p>
                            </div>
                        </Show>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            <For each={exactMatches()}>
                                {(recipe, i) => (
                                    <div class="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-backwards" style={{ "animation-delay": `${i() * 100}ms` }}>
                                        <RecipeCard
                                            recipe={recipe}
                                            onViewDetails={() => setSelectedRecipe(recipe)}
                                        />
                                    </div>
                                )}
                            </For>
                        </div>

                        <Show when={nearMisses().length > 0}>
                            <div class="mt-24 space-y-12">
                                <div class="flex items-center gap-6">
                                    <h3 class="text-[11px] font-black uppercase tracking-[0.5em] text-warning opacity-60">Missing One Item</h3>
                                    <div class="h-px flex-grow bg-warning/10"></div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    <For each={nearMisses()}>
                                        {(recipe) => (
                                            <div
                                                class="group relative bg-base-100 border border-base-200 rounded-2xl overflow-hidden hover:border-warning/50 transition-all duration-500 cursor-pointer flex flex-col h-full"
                                                onClick={() => setSelectedRecipe(recipe)}
                                            >
                                                <div class="p-8 pb-4 flex-grow">
                                                    <div class="flex justify-between items-start mb-4">
                                                        <h3 class="text-2xl font-serif font-black tracking-tight leading-none group-hover:text-warning transition-colors">{recipe.title}</h3>
                                                    </div>
                                                    <div class="bg-warning/5 border border-warning/10 rounded-xl p-4 mb-6">
                                                        <div class="text-[9px] font-black uppercase tracking-widest text-warning opacity-60 mb-1">Essential Missing:</div>
                                                        <p class="text-xs font-bold text-warning-content">{getMissingName(recipe.missing_ingredients)}</p>
                                                    </div>
                                                </div>
                                                <div class="px-8 pb-8 flex justify-between items-center border-t border-base-200/50 pt-4">
                                                    <div class="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest opacity-30">
                                                        <span>{recipe.glassware}</span>
                                                        <span class="w-1 h-1 rounded-full bg-base-content/20"></span>
                                                        <span>{recipe.method}</span>
                                                    </div>
                                                    <span class="text-[10px] font-black uppercase tracking-widest text-warning opacity-0 group-hover:opacity-100 transition-opacity">View Recipe →</span>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </Show>
                    </div>
                </section>
            </div>

            <footer class="bg-base-200/30 border-t border-base-200 py-12">
                <div class="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl font-serif font-black italic text-primary">D.</span>
                        <div class="h-8 w-px bg-base-300"></div>
                        <span class="text-[10px] font-mono opacity-20 uppercase tracking-[0.4em]">Codebar's Guide 2026</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
