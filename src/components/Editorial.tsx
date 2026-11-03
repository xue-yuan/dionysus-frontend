import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";

/** Page opener: eyebrow, serif headline, optional standfirst and meta line. */
export const Masthead: Component<{
  eyebrow: string | undefined;
  title: string | undefined;
  meta?: JSX.Element;
  aside?: JSX.Element;
}> = (props) => (
  <div class="pt-14 pb-9 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
    {/* A rem cap, not a `ch` one: `ch` here would resolve against the wrapper's
        body font rather than the display face and squeeze the headline. */}
    <div class="max-w-[36rem]">
      <span class="eyebrow">{props.eyebrow}</span>
      <h1 class="display mt-3 text-[clamp(2.25rem,5vw,3.75rem)] text-balance">{props.title}</h1>
      <Show when={props.meta}>
        <div class="mt-4">{props.meta}</div>
      </Show>
    </div>
    <Show when={props.aside}>
      <div class="shrink-0">{props.aside}</div>
    </Show>
  </div>
);

/** Serif label, hairline, count — the running head above each grid. */
export const SectionHead: Component<{ title: string | undefined; count?: number }> = (props) => (
  <div class="flex items-baseline gap-4 mb-6">
    <h2 class="display text-[1.625rem] leading-none shrink-0">{props.title}</h2>
    <span class="h-px flex-1 bg-rule" aria-hidden="true" />
    <Show when={props.count !== undefined}>
      <span class="meta shrink-0">{props.count}</span>
    </Show>
  </div>
);

/**
 * Empty and error states. No oversized emoji and no all-caps letterspaced
 * shouting — a sentence, a reason, and one thing to do about it.
 */
export const Notice: Component<{
  title: string | undefined;
  body?: string | undefined;
  children?: JSX.Element;
  tone?: "quiet" | "error";
}> = (props) => (
  <div class="py-20 border-y border-rule text-center">
    <h3 class="display text-[1.75rem]" classList={{ "text-flag-missing": props.tone === "error" }}>
      {props.title}
    </h3>
    <Show when={props.body}>
      {(body) => <p class="mt-3 text-[15px] text-ink-muted max-w-[42ch] mx-auto">{body()}</p>}
    </Show>
    <Show when={props.children}>
      <div class="mt-7 flex justify-center">{props.children}</div>
    </Show>
  </div>
);

/** Underlined search input with a clear affordance. */
export const SearchField: Component<{
  value: string;
  onInput: (value: string) => void;
  label: string | undefined;
}> = (props) => {
  const { t } = useI18n();
  return (
    <div class="relative w-full max-w-sm">
      <input
        type="search"
        aria-label={props.label}
        placeholder={props.label}
        class="field"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
      />
      <Show
        when={props.value}
        fallback={
          <span
            class="absolute right-0 top-[11px] text-ink-faint pointer-events-none"
            aria-hidden="true"
          >
            <Icon name="search" />
          </span>
        }
      >
        <button
          type="button"
          aria-label={t("common.clearSearch") ?? "Clear"}
          onClick={() => props.onInput("")}
          class="absolute right-0 top-[11px] text-ink-faint hover:text-ink"
        >
          <Icon name="close" size={14} />
        </button>
      </Show>
    </div>
  );
};

/** The grid every route lays its cards out on. */
export const CardGrid: Component<{ children: JSX.Element }> = (props) => (
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
    {props.children}
  </div>
);
