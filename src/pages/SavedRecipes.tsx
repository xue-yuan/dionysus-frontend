import type { Component } from 'solid-js';
import { For, Show, createSignal, createEffect, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { recipeService } from '../services/recipeService';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { userStore } from '../stores/userStore';
import type { Recipe } from '../types';
import { useI18n } from '../i18n';

const SavedRecipes: Component = () => {
  const { locale, setLocale, t } = useI18n();
  const themesList = [
    { key: 'violet', label: 'Violet Theme', color: 'bg-[#A000FF]' },
    { key: 'cyan', label: 'Cyan Glacier Theme', color: 'bg-[#00F2FF]' },
    { key: 'cyberpunk', label: 'Cyberpunk Theme', color: 'bg-[#FF007F]' },
    { key: 'emerald', label: 'Emerald Theme', color: 'bg-[#10B981]' }
  ];
  const [recipes, setRecipes] = createSignal<Recipe[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedRecipe, setSelectedRecipe] = createSignal<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');

  const filteredRecipes = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return recipes();
    return recipes().filter(r =>
      r.title.toLowerCase().includes(query) ||
      (r.description && r.description.toLowerCase().includes(query))
    );
  });

  createEffect(async () => {
    try {
      setLoading(true);
      const response = await recipeService.getRecipes({ limit: 1000 });
      const allRecipes = response.items || [];
      const favorited = allRecipes.filter(r => userStore.favorites.includes(r.id));
      setRecipes(favorited);
    } catch (err) {
      console.error("Failed to fetch saved recipes", err);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="h-screen overflow-hidden flex flex-col bg-black text-white font-sans selection:bg-secondary/30">
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
            <A href="/recipes" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
              {t('nav.archive')}
            </A>
            <A href="/saved" class="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white/5 text-primary">
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

      <main class="flex-1 bg-gradient-to-br from-black via-zinc-950 to-indigo-950/20 overflow-y-auto custom-scrollbar">
        <div class="px-8 lg:px-16 pt-0 max-w-[1700px] mx-auto relative min-h-[80vh] flex flex-col gap-8">
          <div class="sticky top-0 z-30 pt-4 pb-6 px-4 bg-transparent backdrop-blur-sm -mx-4">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div class="relative flex-grow max-w-md">
                <input
                  type="text"
                  placeholder={t('savedRecipes.searchPlaceholder')}
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
                  <span class="text-[13px] font-black uppercase tracking-[0.4em] text-white/60">{t('savedRecipes.secured', { count: filteredRecipes().length })}</span>
                </div>
              </div>
            </div>
          </div>



          <div class="flex-1 relative">
            <Show when={recipes().length === 0 && !loading()}>
              <div class="absolute inset-x-0 top-32 flex flex-col items-center text-center animate-in fade-in duration-1000">
                <span class="text-8xl mb-12 opacity-20 filter grayscale">💔</span>
                <h3 class="text-3xl font-black text-white/20 mb-4 tracking-widest uppercase">{t('savedRecipes.vaultEmpty')}</h3>
                <p class="text-[11px] text-white/10 font-black uppercase tracking-[0.6em] mt-6">{t('savedRecipes.vaultEmptySubtitle')}</p>
                <A
                  href="/"
                  class="mt-16 px-10 py-4 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/20 hover:bg-white/[0.02] transition-all font-black"
                >
                  [ {t('savedRecipes.returnToScanner')} ]
                </A>
              </div>
            </Show>

            <Show when={loading()}>
              <div class="py-40 flex flex-col items-center gap-6 opacity-40">
                <div class="relative w-16 h-16">
                  <div class="absolute inset-0 border-4 border-secondary/10 rounded-full"></div>
                  <div class="absolute inset-0 border-4 border-t-secondary rounded-full animate-spin shadow-[0_0_15px_rgba(139,92,246,0.4)]"></div>
                </div>
                <span class="text-[11px] font-black uppercase tracking-[0.4em] text-secondary animate-pulse">{t('savedRecipes.decryptingArchives')}</span>
              </div>
            </Show>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
              <For each={filteredRecipes()}>
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

            <footer class="mt-auto pt-24 pb-12 border-t border-white/5 w-full text-center">
              <span class="text-[11px] text-white/30 font-black uppercase tracking-[0.4em]">DIONYSUS © 2026</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};


export default SavedRecipes;
