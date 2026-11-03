import type { Component, JSX } from "solid-js";
import { For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useI18n } from "../i18n";
import { userStore } from "../stores/userStore";
import { Icon } from "./Icon";

interface LayoutProps {
  children: JSX.Element;
  /**
   * "page" lets the document scroll (the shelf). "scroll-container" pins the
   * masthead and scrolls <main> instead, which is what infinite scrolling needs.
   */
  scroll?: "page" | "scroll-container";
  onScroll?: JSX.EventHandlerUnion<HTMLElement, Event>;
}

const NAV_LINKS = [
  { href: "/", key: "nav.shelf" },
  { href: "/recipes", key: "nav.archive" },
  { href: "/saved", key: "nav.saved" },
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
          ? "min-h-screen bg-paper"
          : "h-screen overflow-hidden flex flex-col bg-paper"
      }
    >
      <header
        class={`${scroll() === "page" ? "sticky top-0" : "shrink-0"} z-50 bg-paper border-b border-rule`}
      >
        <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-2 sm:gap-6">
          <A
            href="/"
            aria-label={t("nav.home") ?? "Dionysus"}
            class="display text-[19px] sm:text-[22px] leading-none shrink-0"
          >
            Dionysus<span class="text-accent">.</span>
          </A>

          <nav class="flex items-center">
            <For each={NAV_LINKS}>
              {(link) => (
                <A
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  class="relative px-2.5 sm:px-3 py-2 text-sm whitespace-nowrap transition-colors"
                  classList={{
                    "text-ink": isActive(link.href),
                    "text-ink-faint hover:text-ink": !isActive(link.href),
                  }}
                >
                  {t(link.key)}
                  <span
                    aria-hidden="true"
                    class="absolute inset-x-2.5 sm:inset-x-3 -bottom-px h-px bg-accent transition-opacity"
                    classList={{
                      "opacity-100": isActive(link.href),
                      "opacity-0": !isActive(link.href),
                    }}
                  />
                </A>
              )}
            </For>
          </nav>

          <div class="flex items-center gap-4 shrink-0">
            {/* Shows where a press takes you: the moon by day, the sun by night. */}
            <button
              type="button"
              class="p-1 -m-1 text-ink-muted hover:text-ink transition-colors"
              aria-label={
                (userStore.scheme === "dark" ? t("nav.toDay") : t("nav.toNight")) ?? undefined
              }
              title={(userStore.scheme === "dark" ? t("nav.toDay") : t("nav.toNight")) ?? undefined}
              onClick={() => userStore.toggleScheme()}
            >
              <Icon name={userStore.scheme === "dark" ? "sun" : "moon"} />
            </button>

            <button
              type="button"
              class="meta hover:text-ink transition-colors"
              onClick={() => setLocale(locale() === "en" ? "zh-TW" : "en")}
              aria-label={t("nav.language") ?? "Language"}
            >
              {locale() === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>
      </header>

      <main onScroll={props.onScroll} class={scroll() === "page" ? "" : "flex-1 overflow-y-auto"}>
        {props.children}
      </main>
    </div>
  );
};

/** The page gutter every route shares, so columns line up across routes. */
export const Page: Component<{ children: JSX.Element }> = (props) => (
  <div class="mx-auto max-w-[1440px] px-6 lg:px-12">{props.children}</div>
);

export const SiteFooter: Component = () => {
  const { t } = useI18n();
  return (
    <footer class="mt-24 pt-8 pb-16 border-t border-rule flex flex-wrap items-baseline justify-between gap-4">
      <span class="meta">{t("footer.line")}</span>
      <span class="meta">2026</span>
    </footer>
  );
};
