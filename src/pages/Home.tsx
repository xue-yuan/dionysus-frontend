import type { Component } from 'solid-js';
import { createResource, For, Show, createEffect, createSignal, createMemo } from 'solid-js';
import { createStore } from 'solid-js/store';
import { A } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import type { RecipeMatchResult } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { userStore } from '../stores/userStore';
import { useI18n } from '../i18n';

const Home: Component = () => {
  const { t, tDynamic, locale, setLocale } = useI18n();
  const [ingredients] = createResource(recipeService.getIngredients);
  const [tags] = createResource(recipeService.getTags);

  const PERSISTENCE_KEY = 'dionysus_studio_state_v2';
  const getInitialState = () => {
    const stored = localStorage.getItem(PERSISTENCE_KEY);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const saved = getInitialState();
  const [state, setState] = createStore({
    ownedIngredients: (saved?.ownedIngredients || []) as string[],
    selectedTags: (saved?.selectedTags || []) as string[],
    minStrength: saved?.minStrength || 0,
    matches: [] as RecipeMatchResult[],
    loading: false,
    sortDirection: (saved?.sortDirection || 'desc') as 'asc' | 'desc',
    showFavorites: saved?.showFavorites || false,
    allowSubstitutes: saved?.allowSubstitutes || false
  });

  const [selectedRecipe, setSelectedRecipe] = createSignal<RecipeMatchResult | null>(null);
  let matchAbortController: AbortController | null = null;

  const themesList = [
    { key: 'violet', label: 'Violet Theme', color: 'bg-[#A000FF]' },
    { key: 'cyan', label: 'Cyan Glacier Theme', color: 'bg-[#00F2FF]' },
    { key: 'cyberpunk', label: 'Cyberpunk Theme', color: 'bg-[#FF007F]' },
    { key: 'emerald', label: 'Emerald Theme', color: 'bg-[#10B981]' }
  ];


  createEffect(() => {
    const persist = {
      ownedIngredients: state.ownedIngredients,
      selectedTags: state.selectedTags,
      minStrength: state.minStrength,
      sortDirection: state.sortDirection,
      showFavorites: state.showFavorites,
      allowSubstitutes: state.allowSubstitutes
    };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persist));
  });

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

  const handleLucky = () => {
    const exacts = exactMatches();
    const pool = exacts.length > 0 ? exacts : nearMisses();
    if (pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setSelectedRecipe(random);
    }
  };

  const handleClear = () => {
    setState('ownedIngredients', []);
    setState('selectedTags', []);
  };

  const addKit = (names: string[]) => {
    const ings = ingredients() || [];
    const idsToToggle = names
      .map(name => ings.find(i => i.name === name)?.id)
      .filter((id): id is string => !!id);

    setState('ownedIngredients', prev => {
      const next = [...prev];
      idsToToggle.forEach(id => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  };

  createEffect((prevTimeout) => {
    const owned = state.ownedIngredients;
    const strength = state.minStrength;
    const tagIds = state.selectedTags;
    const allowSubs = state.allowSubstitutes;

    if (prevTimeout) clearTimeout(prevTimeout as number);

    if (owned.length === 0) {
      if (matchAbortController) {
        matchAbortController.abort();
        matchAbortController = null;
      }
      setState('matches', []);
      setState('loading', false);
      return;
    }

    setState('loading', true);

    const timeout = setTimeout(async () => {
      if (matchAbortController) {
        matchAbortController.abort();
      }
      const controller = new AbortController();
      matchAbortController = controller;

      try {
        const results = await recipeService.matchCocktails(owned, strength, tagIds, allowSubs, controller.signal);
        setState('matches', results || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e);
          setState('matches', []);
        }
      } finally {
        if (matchAbortController === controller) {
          setState('loading', false);
          matchAbortController = null;
        }
      }
    }, 300);

    return timeout;
  });

  const [isCabinetOpen, setIsCabinetOpen] = createSignal(false);
  const [cabinetCategory, setCabinetCategory] = createSignal('Spirit');
  const [cabinetSearch, setCabinetSearch] = createSignal('');

  const cabinetCategories = [
    { key: 'Spirit', label: 'Spirits / 烈酒' },
    { key: 'Liqueur', label: 'Liqueurs / 香甜酒' },
    { key: 'Syrup', label: 'Syrups / 糖漿' },
    { key: 'Mixer', label: 'Mixers / 副材料' },
    { key: 'Bitters', label: 'Bitters / 苦精' },
    { key: 'Garnish', label: 'Garnishes / 裝飾物' },
    { key: 'Palate', label: 'Palate Specs / 風味' },
    { key: 'Equipment', label: 'Equipment / 器具' }
  ];

  const filteredCabinetItems = createMemo(() => {
    const cat = cabinetCategory();
    const query = cabinetSearch().toLowerCase().trim();

    if (cat === 'Equipment' || cat === 'Palate') {
      const list = tags()?.filter(t => t.type === cat) || [];
      return list.filter(t => !query || t.name.toLowerCase().includes(query));
    } else {
      const list = ingredients()?.filter(i => i.category === cat) || [];
      return list.filter(i => !query || i.name.toLowerCase().includes(query));
    }
  });

  const isItemSelected = (id: string) => {
    const cat = cabinetCategory();
    if (cat === 'Equipment' || cat === 'Palate') {
      return state.selectedTags.includes(id);
    } else {
      return state.ownedIngredients.includes(id);
    }
  };

  const toggleCabinetItem = (id: string) => {
    const cat = cabinetCategory();
    if (cat === 'Equipment' || cat === 'Palate') {
      toggleTag(id);
    } else {
      toggleIngredient(id);
    }
  };

  return (
    <div class="min-h-screen bg-black text-white font-sans">
      <RecipeDetailModal
        recipe={selectedRecipe()}
        onClose={() => setSelectedRecipe(null)}
      />

      <nav class="fixed top-0 left-0 right-0 z-[100] px-8 lg:px-20 h-24 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <A href="/" class="group flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black italic shadow-[0_0_20px_rgba(160,0,255,0.3)]">D.</div>
            <span class="text-2xl font-black tracking-tightest">DIONYSUS</span>
          </A>
          <div class="breathing-light ml-2"></div>
        </div>

        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 p-1.5 glass-ether rounded-2xl border border-white/5 mr-4">
            <A href="/" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white/5 text-primary">
              {t('nav.scanner')}
            </A>
            <A href="/recipes" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
              {t('nav.archive')}
            </A>
            <A href="/saved" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
              {t('nav.library')}
            </A>
          </div>

          <div class="flex items-center gap-2 p-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md mr-2">
            <For each={themesList}>
              {(themeItem) => (
                <button
                  onClick={() => userStore.setTheme(themeItem.key)}
                  class={`w-4 h-4 rounded-full ${themeItem.color} cursor-pointer transition-all hover:scale-125 relative flex items-center justify-center`}
                  title={themeItem.label}
                >
                  <Show when={userStore.theme === themeItem.key}>
                    <div class="w-1 h-1 rounded-full bg-white shadow-md"></div>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <button
            class="px-4 py-2 rounded-xl text-[11px] font-black tracking-widest text-white/30 hover:text-primary hover:bg-white/5 transition-all"
            onClick={() => setLocale(locale() === 'en' ? 'zh-TW' : 'en')}
          >
            {locale() === 'en' ? 'TW' : 'EN'}
          </button>
        </div>
      </nav>

      <div class="studio-layout pt-32">
        <div class={`cabinet-overlay ${isCabinetOpen() ? 'open' : ''}`} onClick={() => setIsCabinetOpen(false)}>
          <div class="cabinet-card p-10 gap-8" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between border-b border-white/5 pb-6">
              <div>
                <h2 class="text-3xl font-black text-white tracking-wide uppercase">{t('home.cabinet.title')}</h2>
                <p class="text-xs uppercase tracking-widest text-white/30 mt-1">{t('home.cabinet.subtitle')}</p>
              </div>
              <button
                onClick={() => setIsCabinetOpen(false)}
                class="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div class="flex-grow flex gap-10 overflow-hidden min-h-0">
              <div class="w-72 flex flex-col gap-2 overflow-y-auto pr-4 border-r border-white/5">
                <For each={cabinetCategories}>
                  {(cat) => (
                    <button
                      onClick={() => {
                        setCabinetCategory(cat.key);
                        setCabinetSearch('');
                      }}
                      class={`w-full text-left px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${cabinetCategory() === cat.key
                        ? 'bg-primary text-black border-primary font-black shadow-[0_10px_20px_rgba(160,0,255,0.15)]'
                        : 'bg-white/[0.01] border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {cat.label}
                    </button>
                  )}
                </For>
              </div>

              <div class="flex-1 flex flex-col gap-6 overflow-hidden">
                <div class="relative">
                  <input
                    type="text"
                    placeholder={t('home.cabinet.searchPlaceholder')}
                    class="input-studio w-full pr-10"
                    value={cabinetSearch()}
                    onInput={(e) => setCabinetSearch(e.currentTarget.value)}
                  />
                  <Show when={cabinetSearch()}>
                    <button
                      onClick={() => setCabinetSearch('')}
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                    >
                      ✕
                    </button>
                  </Show>
                </div>

                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <For each={filteredCabinetItems()}>
                      {(item) => {
                        const selected = () => isItemSelected(item.id);
                        return (
                          <button
                            onClick={() => toggleCabinetItem(item.id)}
                            class={`px-6 py-5 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest text-left relative overflow-hidden flex flex-col justify-between h-28 group ${selected()
                              ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(160,0,255,0.15)]'
                              : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20 hover:bg-white/5'
                              }`}
                          >
                            <span class="text-[11px] opacity-40">
                              {'category' in item
                                ? tDynamic('ingredient.category.' + item.category.toLowerCase(), item.category)
                                : tDynamic('tag.type.' + item.type.toLowerCase(), item.type)}
                            </span>
                            <span class="text-sm font-bold text-white group-hover:text-primary transition-colors pr-4 leading-snug">
                              {'translation_key' in item
                                ? tDynamic(item.translation_key || '', item.name)
                                : tDynamic('tag.' + item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), item.name)}
                            </span>
                            <Show when={selected()}>
                              <div class="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(160,0,255,0.8)]"></div>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-white/5 pt-6 bg-transparent">
              <div class="flex items-center gap-4 flex-wrap max-w-[70%]">
                <span class="text-xs font-black uppercase tracking-widest text-white/30">Currently Stocked:</span>
                <div class="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto pr-2 custom-scrollbar">
                  <For each={state.ownedIngredients}>
                    {(id) => {
                      const ing = ingredients()?.find(i => i.id === id);
                      return ing ? (
                        <button
                          onClick={() => toggleIngredient(id)}
                          class="px-3 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 text-xs font-bold text-white/70 uppercase tracking-widest transition-all"
                        >
                          {tDynamic(ing.translation_key || '', ing.name || '')} ✕
                        </button>
                      ) : null;
                    }}
                  </For>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <Show when={state.ownedIngredients.length > 0 || state.selectedTags.length > 0}>
                  <button
                    onClick={handleClear}
                    class="px-6 py-3 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 transition-all"
                  >
                    [ {t('home.inventory.clear', { count: state.ownedIngredients.length + state.selectedTags.length }) as string} ]
                  </button>
                </Show>
                <button
                  onClick={() => setIsCabinetOpen(false)}
                  class="px-8 py-3.5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {t('home.cabinet.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <main class="studio-workbench flex-grow bg-gradient-to-br from-black via-zinc-950 to-indigo-950/20 overflow-y-auto custom-scrollbar">
          <div class="px-8 lg:px-16 pt-0 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col">

            <div class="glass-ether border-white/5 rounded-3xl p-8 mb-8 space-y-6">
              <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                <div class="flex items-center gap-6">
                  <div class="bg-white/[0.01] rounded-2xl p-5 border border-white/5 flex flex-col justify-center min-w-[200px]">
                    <span class="text-xs font-black uppercase tracking-widest text-white/30 mb-1">{t('home.cabinet.storage')}</span>
                    <span class="text-3xl font-black text-primary">{state.ownedIngredients.length} {t('home.cabinet.active')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCabinetOpen(true)}
                    class="px-8 py-5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(160,0,255,0.2)]"
                  >
                    ⚡ {t('home.cabinet.open')}
                  </button>
                </div>

                <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div class="bg-white/[0.01] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-xs font-black uppercase tracking-widest text-white/30">{t('home.palate.potency')}</span>
                      <span class="text-sm font-black text-primary">{state.minStrength} / 5</span>
                    </div>
                    <input
                      type="range" min="0" max="5" step="1"
                      value={state.minStrength}
                      class="range range-xs range-primary bg-white/5"
                      onInput={(e) => setState('minStrength', parseInt(e.currentTarget.value))}
                    />
                  </div>

                  <div class="bg-white/[0.01] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                    <div class="flex flex-col">
                      <span class="text-xs font-black uppercase tracking-widest text-white/30">{t('home.cabinet.substitutes')}</span>
                      <span class="text-xs font-bold text-white/60 mt-1">{t('home.cabinet.allowSubstitutes')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.allowSubstitutes}
                      onChange={() => setState('allowSubstitutes', v => !v)}
                      class="checkbox checkbox-primary"
                    />
                  </div>

                  <div class="flex items-center justify-end">
                    <div class="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl transition-all hover:border-white/20 hover:bg-white/[0.08] shadow-2xl w-full">
                      <button
                        onClick={handleLucky}
                        class="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                      >
                        🎲 {t('home.results.randomize')}
                      </button>

                      <div class="w-px h-6 bg-white/10 mx-1"></div>

                      <button
                        class={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${state.showFavorites ? 'bg-secondary text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        onClick={() => setState('showFavorites', v => !v)}
                      >
                        ❤️ {t('home.results.saved')}
                      </button>

                      <div class="w-px h-6 bg-white/10 mx-1"></div>

                      <button
                        class="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
                        onClick={() => setState('sortDirection', d => d === 'desc' ? 'asc' : 'desc')}
                      >
                        {state.sortDirection === 'desc' ? '↓' : '↑'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-6 pt-5 border-t border-white/5 text-xs text-white/40">
                <div class="flex items-center gap-2">
                  <span class="font-black uppercase tracking-widest text-xs">{t('home.inventory.quickKits')}:</span>
                  <div class="flex gap-4">
                    <button onClick={() => addKit(['London Dry Gin', 'Campari', 'Sweet Vermouth', 'Orange Twist'])} class="hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">Negroni</button>
                    <button onClick={() => addKit(['Bourbon', 'Simple Syrup', 'Fresh Lemon Juice', 'Egg White', 'Angostura Bitters'])} class="hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">Whiskey Sour</button>
                    <button onClick={() => addKit(['Blanco Tequila', 'Cointreau', 'Fresh Lime Juice', 'Salt'])} class="hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">Margarita</button>
                  </div>
                </div>

                <div class="h-4 w-px bg-white/10 hidden md:block"></div>

                <div class="flex items-center gap-2">
                  <span class="font-black uppercase tracking-widest text-xs">Filters:</span>
                  <Show when={state.selectedTags.length > 0} fallback={<span class="italic text-sm">No active palate filter tags</span>}>
                    <div class="flex flex-wrap gap-1.5">
                      <For each={state.selectedTags}>
                        {(id) => {
                          const tag = tags()?.find(t => t.id === id);
                          return (
                            <button onClick={() => toggleTag(id)} class="px-2.5 py-1 rounded bg-secondary/10 border border-secondary/20 text-xs font-bold text-secondary uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all">
                              {tag?.name} ✕
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            <div class="h-1 w-full mb-8 relative overflow-hidden bg-white/5 rounded-full">
              <div
                class={`absolute inset-0 bg-primary shadow-[0_0_15px_rgba(160,0,255,0.5)] transition-all duration-500 ${state.loading ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                  animation: state.loading ? 'loading-scan 2s infinite linear' : 'none'
                }}
              ></div>
            </div>

            <div class="flex-1 relative">
              <Show when={state.ownedIngredients.length === 0}>
                <div class="absolute inset-x-0 top-32 flex flex-col items-center text-center animate-in fade-in duration-1000">
                  <span class="text-8xl mb-12 opacity-20 grayscale">🍸</span>
                  <h3 class="text-[14px] font-black tracking-[1.2em] text-white/30 uppercase">{t('home.results.cabinetIdle')}</h3>
                </div>
              </Show>

              <Show when={!state.loading && state.ownedIngredients.length > 0 && exactMatches().length === 0 && nearMisses().length === 0}>
                <div class="absolute inset-x-0 top-32 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                  <Show when={state.showFavorites} fallback={<span class="text-6xl mb-12 opacity-20">🕵️‍♂️</span>}>
                    <span class="text-6xl mb-12 opacity-20">💔</span>
                  </Show>
                  <h3 class="text-[14px] font-black tracking-[0.8em] text-white/30 uppercase">
                    {state.showFavorites ? t('home.results.noSavedProtocols') : t('home.results.noProtocolsMatched')}
                  </h3>
                  <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.4em] mt-6">
                    {state.showFavorites ? t('home.results.noSavedProtocolsSubtitle') : t('home.results.noProtocolsMatchedSubtitle')}
                  </p>
                  <button
                    onClick={() => state.showFavorites ? setState('showFavorites', false) : handleClear()}
                    class="mt-12 px-8 py-3 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/20 transition-all font-black"
                  >
                    [ {state.showFavorites ? t('home.results.deactivateFilter') : t('home.results.clearFilters')} ]
                  </button>
                </div>
              </Show>

              <div class={`transition-opacity duration-300 mt-12 ${state.loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <Show when={exactMatches().length > 0}>
                  <div class="mb-32 space-y-6">
                    <div class="flex items-center gap-4 border-b border-white/5 pb-2">
                      <h2 class="text-[13px] font-black uppercase tracking-[0.4em] text-primary whitespace-nowrap">{t('home.results.readyToMix')}</h2>
                      <div class="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
                      <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(160,0,255,0.5)]"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                      <For each={exactMatches()}>
                        {(recipe, i) => (
                          <div class="card-entrance" style={{ "animation-delay": `${(i() % 12) * 80}ms` }}>
                            <RecipeCard
                              recipe={recipe}
                              onViewDetails={() => setSelectedRecipe(recipe)}
                            />
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <Show when={nearMisses().length > 0}>
                  <div class="space-y-6">
                    <div class="flex items-center gap-4 border-b border-white/5 pb-2">
                      <h2 class="text-[13px] font-black uppercase tracking-[0.4em] text-white/40 whitespace-nowrap">{t('home.results.missingOne')}</h2>
                      <div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                      <div class="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                      <For each={nearMisses()}>
                        {(recipe, i) => (
                          <div class="card-entrance" style={{ "animation-delay": `${(i() % 12) * 80}ms` }}>
                            <RecipeCard
                              recipe={recipe}
                              onViewDetails={() => setSelectedRecipe(recipe)}
                              missingIngredientName={
                                recipe.missing_ingredients?.[0] ?
                                  (() => {
                                    const ing = ingredients()?.find(i => i.id === recipe.missing_ingredients![0]);
                                    return ing ? tDynamic(ing.translation_key || '', ing.name) : undefined;
                                  })() :
                                  undefined
                              }
                            />
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <footer class="mt-auto pt-24 pb-12 border-t border-white/5 w-full text-center">
                  <span class="text-[11px] text-white/30 font-black uppercase tracking-[0.4em]">DIONYSUS © 2026</span>
                </footer>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
