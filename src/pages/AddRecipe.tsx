import type { Component } from 'solid-js';
import { createSignal, createResource, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import type { CreateRecipeRequest } from '../types';

interface IngredientRow {
    ingredientId: string;
    amount: string;
    unit: string;
}

const AddRecipe: Component = () => {
    const navigate = useNavigate();
    const [ingredients] = createResource(recipeService.getIngredients);

    const [title, setTitle] = createSignal('');
    const [description, setDescription] = createSignal('');
    const [glassware, setGlassware] = createSignal('');
    const [method, setMethod] = createSignal('');
    const [steps, setSteps] = createSignal('');
    const [imageUrl, setImageUrl] = createSignal('');

    const [recipeIngredients, setRecipeIngredients] = createSignal<IngredientRow[]>([
        { ingredientId: '', amount: '', unit: '' }
    ]);

    const addIngredientRow = () => {
        setRecipeIngredients([...recipeIngredients(), { ingredientId: '', amount: '', unit: '' }]);
    };

    const removeIngredientRow = (index: number) => {
        const current = recipeIngredients();
        if (current.length > 1) {
            setRecipeIngredients(current.filter((_, i) => i !== index));
        }
    };

    const updateIngredientRow = (index: number, field: keyof IngredientRow, value: string) => {
        const current = [...recipeIngredients()];
        current[index] = { ...current[index], [field]: value };
        setRecipeIngredients(current);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        const validIngredients = recipeIngredients().filter(ri => ri.ingredientId && ri.amount && ri.unit);

        if (validIngredients.length === 0) {
            alert("Please add at least one ingredient.");
            return;
        }

        const req: CreateRecipeRequest = {
            title: title(),
            description: description(),
            glassware: glassware(),
            method: method(),
            steps: steps(),
            image_url: imageUrl(),
            ingredients: validIngredients.map(ri => ({
                ingredient_id: ri.ingredientId,
                amount: ri.amount,
                unit: ri.unit
            }))
        };

        try {
            await recipeService.createRecipe(req);
            navigate('/recipes');
        } catch (err: any) {
            alert("Failed to create recipe: " + err.message);
        }
    };

    return (
        <div class="container mx-auto p-4 max-w-2xl">
            <h1 class="text-3xl font-bold mb-6 text-primary">Create New Cocktail</h1>

            <form onSubmit={handleSubmit} class="space-y-6">
                <div class="form-control">
                    <label class="label"><span class="label-text">Title</span></label>
                    <input type="text" class="input input-bordered w-full" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} required />
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Description</span></label>
                    <textarea class="textarea textarea-bordered h-24" value={description()} onInput={(e) => setDescription(e.currentTarget.value)}></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label"><span class="label-text">Glassware</span></label>
                        <input type="text" class="input input-bordered w-full" value={glassware()} onInput={(e) => setGlassware(e.currentTarget.value)} />
                    </div>
                    <div class="form-control">
                        <label class="label"><span class="label-text">Method (e.g. Shake, Stir)</span></label>
                        <input type="text" class="input input-bordered w-full" value={method()} onInput={(e) => setMethod(e.currentTarget.value)} required />
                    </div>
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Ingredients</span></label>
                    <div class="space-y-2">
                        <For each={recipeIngredients()}>{(row, index) => (
                            <div class="flex gap-2 items-end">
                                <select
                                    class="select select-bordered flex-1"
                                    value={row.ingredientId}
                                    onChange={(e) => updateIngredientRow(index(), 'ingredientId', e.currentTarget.value)}
                                    required
                                >
                                    <option value="" disabled>Select Ingredient</option>
                                    <For each={ingredients()}>{(ing) => (
                                        <option value={ing.id}>{ing.name} ({ing.category})</option>
                                    )}</For>
                                </select>
                                <input
                                    type="text"
                                    class="input input-bordered w-24"
                                    placeholder="Amt"
                                    value={row.amount}
                                    onInput={(e) => updateIngredientRow(index(), 'amount', e.currentTarget.value)}
                                    required
                                />
                                <input
                                    type="text"
                                    class="input input-bordered w-24"
                                    placeholder="Unit"
                                    value={row.unit}
                                    onInput={(e) => updateIngredientRow(index(), 'unit', e.currentTarget.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    class="btn btn-ghost btn-square text-error"
                                    onClick={() => removeIngredientRow(index())}
                                    disabled={recipeIngredients().length === 1}
                                >
                                    ✕
                                </button>
                            </div>
                        )}</For>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline mt-2 w-full" onClick={addIngredientRow}>+ Add Ingredient</button>
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Steps</span></label>
                    <textarea class="textarea textarea-bordered h-48 whitespace-pre-line" value={steps()} onInput={(e) => setSteps(e.currentTarget.value)} required placeholder="1. ...&#10;2. ..."></textarea>
                </div>

                <div class="form-control">
                    <label class="label"><span class="label-text">Image URL (Optional)</span></label>
                    <input type="text" class="input input-bordered w-full" value={imageUrl()} onInput={(e) => setImageUrl(e.currentTarget.value)} />
                </div>

                <div class="pt-4">
                    <button type="submit" class="btn btn-primary w-full">Save Recipe</button>
                </div>
            </form>
        </div>
    );
};

export default AddRecipe;
