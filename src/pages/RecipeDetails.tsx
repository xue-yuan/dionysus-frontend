import type { Component } from 'solid-js';
import { createResource, Show, For } from 'solid-js';
import { useParams, A } from "@solidjs/router";
import { recipeService } from '../services/recipeService';

const RecipeDetails: Component = () => {
    const params = useParams();
    const [recipe] = createResource(() => params.id, recipeService.getRecipe);

    return (
        <div class="container mx-auto p-4 max-w-4xl">
            <div class="mb-4">
                <A href="/recipes" class="btn btn-ghost btn-sm gap-2">
                    ← Back to Gallery
                </A>
            </div>

            <Show when={recipe()} fallback={<div class="flex justify-center p-10"><span class="loading loading-spinner loading-lg"></span></div>}>
                <div class="card lg:card-side bg-base-200 shadow-xl">
                    <figure class="lg:w-1/3 bg-neutral min-h-[300px] flex items-center justify-center">
                        <Show when={recipe()?.image_url} fallback={<span class="text-9xl">🥃</span>}>
                            <img src={recipe()?.image_url} alt={recipe()?.title} class="object-cover w-full h-full" />
                        </Show>
                    </figure>

                    <div class="card-body lg:w-2/3">
                        <h1 class="card-title text-4xl font-serif text-primary mb-2">{recipe()?.title}</h1>
                        <p class="opacity-80 mb-4 italic">{recipe()?.description}</p>

                        <div class="flex gap-4 mb-6">
                            <div class="stat place-items-center bg-base-300 rounded-box p-2 flex-1">
                                <div class="stat-title text-xs uppercase tracking-widest">Glassware</div>
                                <div class="stat-value text-lg text-secondary">{recipe()?.glassware}</div>
                            </div>
                            <div class="stat place-items-center bg-base-300 rounded-box p-2 flex-1">
                                <div class="stat-title text-xs uppercase tracking-widest">Method</div>
                                <div class="stat-value text-lg text-accent">{recipe()?.method}</div>
                            </div>
                        </div>

                        <div class="divider">Ingredients</div>

                        <ul class="space-y-2 mb-6">
                            <For each={recipe()?.ingredients}>{(ing) => (
                                <li class="flex justify-between items-center p-2 bg-base-100 rounded hover:bg-base-300 transition-colors">
                                    <span class="font-bold">{ing.amount} {ing.unit}</span>
                                    <span class="text-lg">{ing.name} <span class="text-xs opacity-50 ml-1 uppercase border border-base-content/20 px-1 rounded">{ing.category}</span></span>
                                </li>
                            )}</For>
                        </ul>

                        <div class="divider">Preparation</div>

                        <div class="whitespace-pre-line leading-relaxed text-lg font-light bg-base-100 p-6 rounded-box">
                            {recipe()?.steps}
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
};

export default RecipeDetails;
