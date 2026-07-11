import type { Component } from 'solid-js';
import { createSignal, createResource, For } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import type { CreateRecipeRequest } from '../types';
import { useI18n } from '../i18n';

interface IngredientRow {
    ingredientId: string;
    amount: string;
    unit: string;
}

const AddRecipe: Component = () => {
    const navigate = useNavigate();
    const { t, tDynamic } = useI18n();
    const [ingredients] = createResource(recipeService.getIngredients);
    const [tags] = createResource(recipeService.getTags);

    const [title, setTitle] = createSignal('');
    const [description, setDescription] = createSignal('');
    const [glassware, setGlassware] = createSignal('');
    const [method, setMethod] = createSignal('');
    const [steps, setSteps] = createSignal('');
    const [imageUrl, setImageUrl] = createSignal('');

    const [sweetness, setSweetness] = createSignal(3);
    const [sourness, setSourness] = createSignal(3);
    const [strength, setStrength] = createSignal(3);
    const [selectedTags, setSelectedTags] = createSignal<string[]>([]);

    const toggleTag = (id: string) => {
        if (selectedTags().includes(id)) {
            setSelectedTags(prev => prev.filter(t => t !== id));
        } else {
            setSelectedTags(prev => [...prev, id]);
        }
    };

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
            alert(t('addRecipe.alertMissingIngredients'));
            return;
        }

        const req: CreateRecipeRequest = {
            title: title(),
            description: description(),
            glassware: glassware(),
            method: method(),
            steps: steps(),
            image_url: imageUrl(),
            sweetness: sweetness(),
            sourness: sourness(),
            strength: strength(),
            tags: selectedTags().map(id => ({ id } as any)),
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
            alert(t('addRecipe.alertFailed') + err.message);
        }
    };

    return (
        <div class="min-h-screen bg-black text-white font-sans pb-40">
            <nav class="fixed top-0 left-0 right-0 z-[100] px-8 lg:px-20 h-24 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <A href="/" class="group flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black italic shadow-[0_0_20px_rgba(160,0,255,0.3)]">D.</div>
                        <span class="text-2xl font-black tracking-tightest text-white uppercase">DIONYSUS</span>
                    </A>
                </div>
                <div class="flex items-center gap-4">
                    <A href="/recipes" class="text-xs uppercase font-black tracking-[0.4em] text-white/40 hover:text-white transition-all">{t('addRecipe.cancelProtocol')}</A>
                </div>
            </nav>

            <div class="container mx-auto px-6 max-w-4xl pt-40">
                <div class="mb-24 space-y-6">
                    <div class="flex items-center gap-4 text-secondary font-black tracking-[0.5em] text-xs uppercase opacity-40">
                        <span>{t('addRecipe.addRecipeSubtitle')}</span>
                        <div class="h-px w-10 bg-current"></div>
                    </div>
                    <h1 class="text-7xl font-black tracking-tightest text-white leading-none">{t('addRecipe.addRecipeTitle')}</h1>
                    <p class="text-xs font-black uppercase tracking-[0.6em] text-white/20 italic">{t('addRecipe.addRecipeSubtitle')}</p>
                </div>

                <div class="glass-ether border-white/10 p-12 lg:p-20 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} class="space-y-16">
                        <div class="space-y-10">
                            <h3 class="text-xs font-black uppercase tracking-[0.5em] text-white/20">// {t('addRecipe.specs')}</h3>
                            
                            <div class="form-control group">
                                <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40 group-focus-within:text-primary transition-colors">{t('addRecipe.titleLabel')}</span></label>
                                <input type="text" placeholder={t('addRecipe.titlePlaceholder')} class="input input-lg bg-white/5 border-white/5 rounded-2xl focus:border-primary/40 focus:bg-white/10 transition-all font-bold text-white placeholder:text-white/10" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} required />
                            </div>

                            <div class="form-control group">
                                <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.descriptionLabel')}</span></label>
                                <textarea placeholder={t('addRecipe.descriptionPlaceholder')} class="textarea textarea-lg bg-white/5 border-white/5 rounded-2xl h-32 focus:border-primary/40 focus:bg-white/10 transition-all font-medium text-white/80 placeholder:text-white/10" value={description()} onInput={(e) => setDescription(e.currentTarget.value)}></textarea>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div class="form-control group">
                                    <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.glasswareLabel')}</span></label>
                                    <input type="text" placeholder={t('addRecipe.glasswarePlaceholder')} class="input input-lg bg-white/5 border-white/5 rounded-2xl focus:border-primary/40 focus:bg-white/10 transition-all font-bold text-white placeholder:text-white/10" value={glassware()} onInput={(e) => setGlassware(e.currentTarget.value)} />
                                </div>
                                <div class="form-control group">
                                    <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.methodLabel')}</span></label>
                                    <input type="text" placeholder={t('addRecipe.methodPlaceholder')} class="input input-lg bg-white/5 border-white/5 rounded-2xl focus:border-primary/40 focus:bg-white/10 transition-all font-bold text-white placeholder:text-white/10" value={method()} onInput={(e) => setMethod(e.currentTarget.value)} required />
                                </div>
                            </div>
                        </div>

                        <div class="h-px bg-white/5"></div>

                        <div class="space-y-10">
                            <div class="flex justify-between items-center">
                                <h3 class="text-xs font-black uppercase tracking-[0.5em] text-white/20">// {t('addRecipe.composition')}</h3>
                                <button type="button" class="px-6 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all" onClick={addIngredientRow}>+ {t('addRecipe.addAsset')}</button>
                            </div>
                            
                            <div class="space-y-4">
                                <For each={recipeIngredients()}>{(row, index) => (
                                    <div class="flex flex-col md:flex-row gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div class="flex-grow flex flex-col gap-2">
                                            <span class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('addRecipe.ingredientLabel')}</span>
                                            <select
                                                class="select select-bordered bg-transparent border-white/10 rounded-xl font-bold text-white/80"
                                                value={row.ingredientId}
                                                onChange={(e) => updateIngredientRow(index(), 'ingredientId', e.currentTarget.value)}
                                                required
                                            >
                                                <option value="" disabled class="bg-slate-900">{t('addRecipe.selectPlaceholder')}</option>
                                                <For each={ingredients()}>{(ing) => (
                                                    <option value={ing.id} class="bg-slate-900">{tDynamic(ing.translation_key || '', ing.name)} ({tDynamic('ingredient.category.' + ing.category.toLowerCase(), ing.category)})</option>
                                                )}</For>
                                            </select>
                                        </div>
                                        <div class="w-full md:w-32 flex flex-col gap-2">
                                            <span class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('addRecipe.quantityLabel')}</span>
                                            <input
                                                type="text"
                                                class="input border-white/10 bg-transparent rounded-xl font-bold text-center"
                                                placeholder="60"
                                                value={row.amount}
                                                onInput={(e) => updateIngredientRow(index(), 'amount', e.currentTarget.value)}
                                                required
                                            />
                                        </div>
                                        <div class="w-full md:w-32 flex flex-col gap-2">
                                            <span class="text-[11px] font-black uppercase tracking-widest text-white/20">{t('addRecipe.unitLabel')}</span>
                                            <input
                                                type="text"
                                                class="input border-white/10 bg-transparent rounded-xl font-bold text-center"
                                                placeholder="ml / dash"
                                                value={row.unit}
                                                onInput={(e) => updateIngredientRow(index(), 'unit', e.currentTarget.value)}
                                                required
                                            />
                                        </div>
                                        <div class="flex items-end">
                                            <button
                                                type="button"
                                                class="h-12 w-12 rounded-xl text-error hover:bg-error/10 transition-colors flex items-center justify-center border border-white/5"
                                                onClick={() => removeIngredientRow(index())}
                                                disabled={recipeIngredients().length === 1}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}</For>
                            </div>
                        </div>

                        <div class="h-px bg-white/5"></div>

                        <div class="space-y-10">
                            <h3 class="text-xs font-black uppercase tracking-[0.5em] text-white/20">// {t('addRecipe.sweetnessLabel')} & {t('addRecipe.sournessLabel')} & {t('addRecipe.strengthLabel')}</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div class="form-control">
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.sweetnessLabel')}</label>
                                        <span class="text-sm font-bold text-primary">{sweetness()} / 5</span>
                                    </div>
                                    <input type="range" min="1" max="5" step="1" value={sweetness()} class="range range-xs range-primary bg-white/5" onInput={(e) => setSweetness(parseInt(e.currentTarget.value))} />
                                </div>
                                <div class="form-control">
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.sournessLabel')}</label>
                                        <span class="text-sm font-bold text-secondary">{sourness()} / 5</span>
                                    </div>
                                    <input type="range" min="1" max="5" step="1" value={sourness()} class="range range-xs range-secondary bg-white/5" onInput={(e) => setSourness(parseInt(e.currentTarget.value))} />
                                </div>
                                <div class="form-control">
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.strengthLabel')}</label>
                                        <span class="text-sm font-bold text-accent">{strength()} / 5</span>
                                    </div>
                                    <input type="range" min="1" max="5" step="1" value={strength()} class="range range-xs range-accent bg-white/5" onInput={(e) => setStrength(parseInt(e.currentTarget.value))} />
                                </div>
                            </div>

                            <div class="space-y-4">
                                <label class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.tagsLabel')}</label>
                                <div class="flex flex-wrap gap-2">
                                    <For each={tags()}>
                                        {(tag) => (
                                            <button
                                                type="button"
                                                class={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                    selectedTags().includes(tag.id)
                                                        ? 'bg-primary text-black border-primary'
                                                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                                                }`}
                                                onClick={() => toggleTag(tag.id)}
                                            >
                                                {tag.name}
                                            </button>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-10">
                            <h3 class="text-xs font-black uppercase tracking-[0.5em] text-white/20">// {t('addRecipe.executionProtocols')}</h3>
                            <div class="form-control group">
                                <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.stepsLabel')}</span></label>
                                <textarea class="textarea bg-white/5 border-white/5 rounded-3xl h-64 focus:border-primary/40 focus:bg-white/10 transition-all font-medium text-white/80 placeholder:text-white/10 p-8 leading-relaxed" value={steps()} onInput={(e) => setSteps(e.currentTarget.value)} required placeholder={t('addRecipe.stepsPlaceholder')}></textarea>
                            </div>
                        </div>

                        <div class="form-control group">
                            <label class="label"><span class="label-text text-xs font-black uppercase tracking-widest text-white/40">{t('addRecipe.visualAsset')}</span></label>
                            <input type="text" placeholder="https://source.unsplash.com/..." class="input bg-white/5 border-white/5 rounded-2xl focus:border-primary/40 focus:bg-white/10 transition-all font-medium text-white/60 placeholder:text-white/10" value={imageUrl()} onInput={(e) => setImageUrl(e.currentTarget.value)} />
                        </div>

                        <div class="pt-10">
                            <button type="submit" class="w-full py-6 rounded-[2rem] bg-primary text-primary-content text-sm font-black uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(250,204,21,0.2)]">{t('addRecipe.submitButton')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddRecipe;
