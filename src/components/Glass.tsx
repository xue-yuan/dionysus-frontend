import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import { slug } from "../i18n";

/**
 * The glass each drink is served in, drawn the way a bar manual prints them:
 * one hairline, no fill. The archive ships no photographs, and a grid of cards
 * that differ only in their title gave the eye nothing to land on; the glass is
 * real information — what to reach for — that also breaks the grid up.
 *
 * Drawn on a 32×40 grid with the foot on y=37, so every glass stands on the
 * same line. Factories, for the same reason as in Icon.tsx: a shared element
 * would be moved between cards rather than copied.
 */
const GLASSES: Record<string, () => JSX.Element> = {
  coupe: () => (
    <>
      <path d="M4 8h24c0 6-5.4 10-12 10S4 14 4 8Z" />
      <path d="M16 18v19M10 37h12" />
    </>
  ),
  martini: () => (
    <>
      <path d="M4 7h24L16 21Z" />
      <path d="M16 21v16M10 37h12" />
    </>
  ),
  champagne_flute: () => (
    <>
      <path d="M12.5 3h7c.4 7-.4 14.5-3.5 18-3.1-3.5-3.9-11-3.5-18Z" />
      <path d="M16 21v16M11 37h10" />
    </>
  ),
  wine_glass: () => (
    <>
      <path d="M9 5h14c1 8.5-1.5 15-7 15S8 13.5 9 5Z" />
      <path d="M16 20v17M10 37h12" />
    </>
  ),
  rocks: () => (
    <>
      <path d="M6.5 16h19l-1.2 21H7.7Z" />
      <path d="M7.6 34h16.8" />
    </>
  ),
  highball: () => (
    <>
      <path d="M9.5 4h13l-1 33h-11Z" />
      <path d="M10.6 34h10.8" />
    </>
  ),
  hurricane: () => (
    <>
      <path d="M10 3h12c0 4-3 6-3 10s3.5 6 3.5 10.5S19 31 16 31s-6.5-3-6.5-7.5S13 17 13 13s-3-6-3-10Z" />
      <path d="M16 31v6M11 37h10" />
    </>
  ),
  irish_coffee_glass: () => (
    <>
      <path d="M9 6h14l-1 15a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z" />
      <path d="M22.7 9.5h2.3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2.8" />
      <path d="M16 23v14M10.5 37h11" />
    </>
  ),
  julep_cup: () => (
    <>
      <path d="M8.5 7h15l-1.8 30H10.3Z" />
      <path d="M8.8 10h14.4M10.1 33.5h11.8" />
    </>
  ),
  copper_mug: () => (
    <>
      <path d="M7 11h15v24a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
      <path d="M22 15h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3" />
    </>
  ),
  tiki_mug: () => (
    <>
      <path d="M9 5h14c.8 4 1.2 9 1.2 16s-.4 12-1.2 16H9c-.8-4-1.2-9-1.2-16S8.2 9 9 5Z" />
      <path d="M12 15h2.5M17.5 15h2.5M13 24c1.8 1.2 4.2 1.2 6 0" />
    </>
  ),
};

/** Renders nothing for a glass it has no drawing of, rather than a wrong one. */
export const Glass: Component<{ glassware: string | undefined; class?: string }> = (props) => {
  const draw = () => GLASSES[slug(props.glassware ?? "")];
  return (
    <Show when={draw()}>
      {(factory) => (
        <svg
          viewBox="0 0 32 40"
          class={props.class}
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          {factory()()}
        </svg>
      )}
    </Show>
  );
};
