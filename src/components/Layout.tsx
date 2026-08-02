import type { Component, JSX } from "solid-js";
import { For, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useI18n } from "../i18n";
import { userStore, THEMES } from "../stores/userStore";

interface LayoutProps {
  children: JSX.Element;
  /**
   * "page" lets the document scroll (the scanner). "scroll-container" pins the
   * nav and scrolls <main> instead, which is what infinite scrolling needs.
   */
  scroll?: "page" | "scroll-container";
  onScroll?: JSX.EventHandlerUnion<HTMLElement, Event>;
}

const NAV_LINKS = [
  { href: "/", key: "nav.scanner" },
  { href: "/recipes", key: "nav.archive" },
  { href: "/saved", key: "nav.library" },
] as const;

export const Layout: Component<LayoutProps> = (props) => {
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const scroll = () => props.scroll ?? "page";

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <div
      class={
        scroll() === "page"
          ? "min-h-screen bg-black text-white font-sans"
          : "h-screen overflow-hidden flex flex-col bg-black text-white font-sans"
      }
    >
      <nav
        class={`${scroll() === "page" ? "fixed top-0 left-0 right-0" : "shrink-0"} z-[100] px-8 lg:px-20 h-24 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between`}
      >
        <div class="flex items-center gap-4">
          <A href="/" class="group flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black italic shadow-primary-glow">
              D.
            </div>
            <span class="text-2xl font-black tracking-tightest">DIONYSUS</span>
          </A>
          <div class="breathing-light ml-2" />
        </div>

        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 p-1.5 glass-ether rounded-2xl border border-white/5 mr-4">
            <For each={NAV_LINKS}>
              {(link) => (
                <A
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  class={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                    isActive(link.href)
                      ? "bg-white/5 text-primary"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {t(link.key)}
                </A>
              )}
            </For>
          </div>

          <div
            class="flex items-center gap-2 p-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md mr-2"
            role="group"
            aria-label={t("nav.theme") ?? "Theme"}
          >
            <For each={THEMES}>
              {(theme) => (
                <button
                  type="button"
                  onClick={() => userStore.setTheme(theme.key)}
                  class={`w-4 h-4 rounded-full ${theme.swatch} cursor-pointer transition-all hover:scale-125 relative flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                  title={theme.label}
                  aria-label={theme.label}
                  aria-pressed={userStore.theme === theme.key}
                >
                  <Show when={userStore.theme === theme.key}>
                    <div class="w-1 h-1 rounded-full bg-white shadow-md" />
                  </Show>
                </button>
              )}
            </For>
          </div>

          <button
            type="button"
            class="px-4 py-2 rounded-xl text-[11px] font-black tracking-widest text-white/30 hover:text-primary hover:bg-white/5 transition-all"
            onClick={() => setLocale(locale() === "en" ? "zh-TW" : "en")}
            aria-label={locale() === "en" ? "切換為中文" : "Switch to English"}
          >
            {locale() === "en" ? "TW" : "EN"}
          </button>
        </div>
      </nav>

      <main
        onScroll={props.onScroll}
        class={
          scroll() === "page"
            ? "pt-24 bg-gradient-to-br from-black via-zinc-950 to-indigo-950/20"
            : "flex-1 bg-gradient-to-br from-black via-zinc-950 to-indigo-950/20 overflow-y-auto custom-scrollbar"
        }
      >
        {props.children}
      </main>
    </div>
  );
};

export const SiteFooter: Component = () => (
  <footer class="mt-auto pt-24 pb-12 border-t border-white/5 w-full text-center">
    <span class="text-[11px] text-white/30 font-black uppercase tracking-[0.4em]">
      DIONYSUS © 2026
    </span>
  </footer>
);
