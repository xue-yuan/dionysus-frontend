import type { Component } from 'solid-js';
import { For, Show, createSignal, createEffect, onCleanup, untrack } from 'solid-js';
import { A } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import type { Recipe } from '../types';

const RecipeGallery: Component = () => {
    const [recipes, setRecipes] = createSignal<Recipe[]>([]);
    const [page, setPage] = createSignal(1);
    const [hasMore, setHasMore] = createSignal(true);
    const [loading, setLoading] = createSignal(false);
    const [sortDirection, setSortDirection] = createSignal<'asc' | 'desc'>('desc');
    const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
    const [totalRecipes, setTotalRecipes] = createSignal(0);

    const fetchRecipes = async (reset = false) => {
        const isLoading = untrack(loading);
        const hasMoreData = untrack(hasMore);

        if (isLoading) return;
        if (!reset && !hasMoreData) return;

        setLoading(true);
        try {
            const currentPage = reset ? 1 : untrack(page);
            const currentSort = untrack(sortDirection);
            const limit = 12;

            const response = await recipeService.getRecipes({
                page: currentPage,
                limit: limit,
                sort: currentSort
            });

            const newRecipes = response.items || [];
            const total = response.total || 0;

            setTotalRecipes(total);

            if (reset) {
                setRecipes(newRecipes);
                setPage(2);
            } else {
                setRecipes(prev => [...prev, ...newRecipes]);
                setPage(p => p + 1);
            }

            const currentCount = reset ? newRecipes.length : untrack(recipes).length;

            if (newRecipes.length < limit || currentCount >= total) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (err) {
            console.error("Failed to fetch recipes", err);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    let observer: IntersectionObserver;
    let sentinel: HTMLDivElement | undefined;

    createEffect(() => {
        if (!sentinel) return;

        if (observer) observer.disconnect();

        observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && !loading() && hasMore()) {
                fetchRecipes(false);
            }
        }, {
            threshold: 0.1
        });

        observer.observe(sentinel);

        onCleanup(() => {
            if (observer) observer.disconnect();
        });
    });

    createEffect(() => {
        sortDirection();
        untrack(() => {
            setHasMore(true);
            fetchRecipes(true);
        });
    });

    return (
        <div class="min-h-screen bg-base-100 text-base-content relative pb-20">
            <RecipeDetailModal
                recipe={selectedRecipe()}
                onClose={() => setSelectedRecipe(null)}
            />

            <div class="navbar bg-base-100 sticky top-0 z-40 border-b border-base-200/50 backdrop-blur-md bg-opacity-80">
                <div class="flex-1">
                    <A href="/" class="btn btn-ghost text-2xl font-serif tracking-tighter">Dionysus</A>
                </div>
                <div class="flex-none">
                    <A href="/add" class="btn btn-primary btn-sm ml-2">Add New</A>
                </div>
            </div>

            <div class="container mx-auto px-6 max-w-6xl py-12">
                <div class="flex justify-between items-center mb-10">
                    <h1 class="text-4xl font-serif font-bold text-primary">Cocktail Menu</h1>
                    <div class="flex items-center gap-4">
                        <span class="text-xs opacity-50 uppercase tracking-widest font-mono">
                            {recipes().length} / {totalRecipes()} Recipes
                        </span>
                        <button
                            class="btn btn-ghost btn-sm gap-2"
                            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                        >
                            <span class="text-xs uppercase tracking-wider font-bold opacity-60">Sort:</span>
                            <span>{sortDirection() === 'desc' ? 'Strongest' : 'Lightest'}</span>
                            <span class="text-xs">{sortDirection() === 'desc' ? '↓' : '↑'}</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Show when={recipes().length === 0 && !loading()}>
                        <div class="col-span-full text-center py-20 opacity-60">
                            <div class="text-6xl mb-4">📜</div>
                            <p class="text-xl">No recipes yet. Be the first to add one!</p>
                        </div>
                    </Show>

                    <For each={recipes()}>{(recipe, i) => (
                        <div class="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ "animation-delay": `${(i() % 12) * 50}ms` }}>
                            <RecipeCard
                                recipe={recipe}
                                onViewDetails={() => setSelectedRecipe(recipe)}
                            />
                        </div>
                    )}</For>
                </div>

                <div ref={el => sentinel = el} class="py-12 text-center opacity-50 h-20 min-h-[5rem]">
                    <Show when={loading()}>
                        <span class="loading loading-dots loading-lg text-primary"></span>
                    </Show>
                    <Show when={!hasMore() && recipes().length > 0 && !loading()}>
                        <span class="text-xs uppercase font-bold opacity-30 tracking-widest">End of Menu</span>
                    </Show>
                </div>
            </div>
        </div>
    );
};

export default RecipeGallery;
