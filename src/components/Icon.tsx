import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

/**
 * The small line-drawn set the UI needs. Emoji used to stand in for all of
 * these, which is a large part of why the old interface looked machine-made:
 * emoji render in whatever colourful style the OS ships and ignore the page's
 * palette entirely.
 *
 * Everything here is stroked in `currentColor` at a 1.25 hairline so icons sit
 * at the same weight as the rules elsewhere on the page.
 */
export type IconName =
  | "search"
  | "close"
  | "heart"
  | "shuffle"
  | "arrow-down"
  | "arrow-up"
  | "check"
  | "plus"
  | "minus"
  | "chevron-right"
  | "book"
  | "sun"
  | "moon";

interface IconProps {
  name: IconName;
  /** Pixel size of the square viewport. Defaults to 16. */
  size?: number;
  /** Heart only: draw it filled rather than outlined. */
  filled?: boolean;
  class?: string;
}

/**
 * Factories, not elements. A bare `<path/>` stored in a module-level object is
 * a single real DOM node under Solid, so rendering the same icon twice *moves*
 * it rather than copying it — three "add kit" buttons ended up sharing one plus
 * sign. Calling the factory per instance gives each its own node.
 */
const PATHS: Record<IconName, () => JSX.Element> = {
  search: () => (
    <>
      <circle cx="7.2" cy="7.2" r="4.7" />
      <path d="M10.7 10.7 14 14" />
    </>
  ),
  close: () => <path d="M4 4l8 8M12 4l-8 8" />,
  heart: () => (
    <path d="M8 13.2C4.3 10.7 2.2 8.8 2.2 6.6a3 3 0 0 1 5.8-1.1 3 3 0 0 1 5.8 1.1c0 2.2-2.1 4.1-5.8 6.6Z" />
  ),
  shuffle: () => (
    <>
      <path d="M2.5 4h2.2l6.6 8h2.2M2.5 12h2.2l2.4-2.9M9.1 6.1l2-2.1h2.4" />
      <path d="M12 2.2 14 4l-2 1.8M12 10.2 14 12l-2 1.8" />
    </>
  ),
  "arrow-down": () => <path d="M8 2.8v10.4M4 9.4 8 13.2l4-3.8" />,
  "arrow-up": () => <path d="M8 13.2V2.8M4 6.6 8 2.8l4 3.8" />,
  check: () => <path d="M3 8.4 6.3 11.7 13 5" />,
  plus: () => <path d="M8 3.2v9.6M3.2 8h9.6" />,
  minus: () => <path d="M3.2 8h9.6" />,
  "chevron-right": () => <path d="m6.2 3.4 4.6 4.6-4.6 4.6" />,
  sun: () => (
    <>
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1.05 1.05M11.45 11.45l1.05 1.05M3.5 12.5l1.05-1.05M11.45 4.55 12.5 3.5" />
    </>
  ),
  moon: () => <path d="M13.3 9.7A5.7 5.7 0 0 1 6.3 2.7a5.7 5.7 0 1 0 7 7Z" />,
  book: () => (
    <>
      <path d="M2.6 3.2h4a2 2 0 0 1 2 2v8a1.6 1.6 0 0 0-1.6-1.6H2.6Z" />
      <path d="M13.4 3.2h-4a2 2 0 0 0-2 2v8a1.6 1.6 0 0 1 1.6-1.6h4.4Z" />
    </>
  ),
};

export const Icon: Component<IconProps> = (props) => (
  <svg
    viewBox="0 0 16 16"
    width={props.size ?? 16}
    height={props.size ?? 16}
    class={props.class}
    fill={props.name === "heart" && props.filled ? "currentColor" : "none"}
    stroke="currentColor"
    stroke-width="1.25"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {PATHS[props.name]()}
  </svg>
);

/**
 * The five-step meters used for sweet / sour / strength. Filled ticks are drawn
 * in the accent, the rest as hairlines — a printed scale rather than a
 * gradient-filled progress bar.
 */
export const TickMeter: Component<{ value: number; label?: string }> = (props) => (
  <span class="inline-flex items-center gap-1" role="img" aria-label={props.label}>
    {[1, 2, 3, 4, 5].map((step) => (
      <span
        class="h-[9px] w-[2px]"
        classList={{
          "bg-accent": step <= (props.value ?? 0),
          "bg-rule-strong": step > (props.value ?? 0),
        }}
      />
    ))}
    <Show when={props.label === undefined}>
      <span class="sr-only">{props.value} of 5</span>
    </Show>
  </span>
);
