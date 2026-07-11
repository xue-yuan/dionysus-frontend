import type { Component } from 'solid-js';
import { For, Show, createSignal, createEffect, untrack } from 'solid-js';
import { A } from '@solidjs/router';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { recipeService } from '../services/recipeService';
import type { Recipe } from '../types';
import { useI18n } from '../i18n';
import { userStore } from '../stores/userStore';

const RecipeGallery: Component = () => {
  const { locale, setLocale, t } = useI18n();
  const themesList = [
    { key: 'violet', label: 'Violet Theme', color: 'bg-[#A000FF]' },
    { key: 'cyan', label: 'Cyan Glacier Theme', color: 'bg-[#00F2FF]' },
    { key: 'cyberpunk', label: 'Cyberpunk Theme', color: 'bg-[#FF007F]' },
    { key: 'emerald', label: 'Emerald Theme', color: 'bg-[#10B981]' }
  ];
  const [recipes, setRecipes] = createSignal<Recipe[]>([]);
  const [page, setPage] = createSignal(1);
  const [hasMore, setHasMore] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [sortDirection, setSortDirection] = createSignal<'asc' | 'desc'>('desc');
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [totalRecipes, setTotalRecipes] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  let galleryAbortController: AbortController | null = null;

  const fetchRecipes = async (reset = false) => {
    const isLoading = untrack(loading);
    const hasMoreData = untrack(hasMore);

    if (!reset && isLoading) return;
    if (!reset && !hasMoreData) return;

    if (reset && galleryAbortController) {
      galleryAbortController.abort();
      galleryAbortController = null;
    }

    setLoading(true);
    const controller = new AbortController();
    galleryAbortController = controller;

    try {
      const currentPage = reset ? 1 : untrack(page);
      const currentSort = untrack(sortDirection);
      const limit = 12;

      const response = await recipeService.getRecipes({
        page: currentPage,
        limit: limit,
        sort: currentSort,
        search: untrack(debouncedSearch)
      }, controller.signal);

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

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to fetch recipes", err);
        setHasMore(false);
      }
    } finally {
      if (galleryAbortController === controller) {
        setLoading(false);
        galleryAbortController = null;
      }
    }
  };

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const threshold = 200;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;

    if (isNearBottom && !loading() && hasMore()) {
      fetchRecipes(false);
    }
  };

  createEffect((prevTimeout) => {
    const query = searchQuery();
    if (prevTimeout) clearTimeout(prevTimeout as number);

    const timeout = setTimeout(() => {
      setDebouncedSearch(query);
    }, 300);

    return timeout;
  });

  createEffect(() => {
    sortDirection();
    debouncedSearch();
    untrack(() => {
      setHasMore(true);
      fetchRecipes(true);
    });
  });

  return (
    <div class="h-screen overflow-hidden flex flex-col bg-black text-white font-sans selection:bg-primary/30">
      <RecipeDetailModal
        recipe={selectedRecipe()}
        onClose={() => setSelectedRecipe(null)}
      />

      <nav class="shrink-0 z-[100] px-8 lg:px-20 h-24 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <A href="/" class="group flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black italic shadow-primary-glow">D.</div>
            <span class="text-2xl font-black tracking-tightest">DIONYSUS</span>
          </A>
          <div class="breathing-light ml-2"></div>
        </div>

        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 p-1.5 glass-ether rounded-2xl border border-white/5 mr-4">
            <A href="/" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
              {t('nav.scanner')}
            </A>
            <A href="/recipes" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white/5 text-primary">
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

      <main onScroll={handleScroll} class="flex-1 bg-gradient-to-br from-black via-zinc-950 to-indigo-950/20 overflow-y-auto custom-scrollbar">
        <div class="px-8 lg:px-16 pt-0 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col gap-8">
          <div class="sticky top-0 z-30 pt-4 pb-6 px-4 bg-transparent backdrop-blur-sm -mx-4">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div class="relative flex-grow max-w-md">
                <input
                  type="text"
                  placeholder={t('recipeGallery.searchPlaceholder')}
                  class="input-studio w-full pr-10"
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Show when={searchQuery()}>
                  <button
                    onClick={() => setSearchQuery('')}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                  >
                    ✕
                  </button>
                </Show>
              </div>

              <div class="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-2xl transition-all hover:border-white/20 hover:bg-white/[0.1] shadow-2xl self-end sm:self-auto h-12">
                <div class="px-8 flex items-center gap-4 whitespace-nowrap">
                  <span class="text-[13px] font-black uppercase tracking-[0.4em] text-white/60">{t('recipeGallery.verified', { count: totalRecipes() })}</span>
                </div>

                <div class="w-px h-6 bg-white/10 mx-2"></div>

                <button
                  class="px-8 h-full rounded-xl text-[13px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                  onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  {sortDirection() === 'desc' ? t('home.results.strong') : t('home.results.light')}
                  <span class="text-primary text-lg">{sortDirection() === 'desc' ? '↓' : '↑'}</span>
                </button>
              </div>
            </div>
          </div>

          <div class={`transition-opacity duration-300 ${loading() ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 min-h-[400px]">
              <Show when={recipes().length === 0 && !loading()}>
                <div class="col-span-full py-48 flex flex-col items-center text-center glass-ether rounded-[4rem] border-dashed border-white/5">
                  <div class="text-8xl mb-12 opacity-10 filter grayscale">📜</div>
                  <h3 class="text-3xl font-black text-white/20 mb-4 tracking-widest uppercase">{t('recipeGallery.archiveVacant')}</h3>
                  <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.6em]">{t('recipeGallery.initialSync')}</p>
                </div>
              </Show>

              <For each={recipes()}>{(recipe, i) => (
                <div class="card-entrance" style={{ "animation-delay": `${(i() % 12) * 80}ms` }}>
                  <RecipeCard
                    recipe={recipe}
                    onViewDetails={() => setSelectedRecipe(recipe)}
                  />
                </div>
              )}</For>
            </div>

            <div class="py-40 flex justify-center">
              <Show when={loading()}>
                <div class="relative w-16 h-16">
                  <div class="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                  <div class="absolute inset-0 border-4 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,255,0.4)]"></div>
                </div>
              </Show>
              <Show when={!hasMore() && recipes().length > 0 && !loading()}>
                <div class="flex items-center gap-12 w-full max-w-4xl mx-auto">
                  <div class="h-px flex-grow bg-gradient-to-r from-transparent to-white/10"></div>
                  <span class="text-[10px] font-black uppercase tracking-[0.8em] text-white/10 shrink-0">{t('recipeGallery.terminalReached')}</span>
                  <div class="h-px flex-grow bg-gradient-to-l from-transparent to-white/10"></div>
                </div>
              </Show>
            </div>

            <footer class="mt-auto pt-24 pb-12 border-t border-white/5 w-full text-center">
              <span class="text-[11px] text-white/30 font-black uppercase tracking-[0.4em]">DIONYSUS © 2026</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};


export default RecipeGallery;
