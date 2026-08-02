import { createSignal, createContext, useContext, createEffect, type JSX } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";
import type { Ingredient, Tag } from "./types";

export type Locale = "en" | "zh-TW";
export type Dict = typeof en;

const dict: Record<Locale, Record<string, string>> = {
  en,
  "zh-TW": zhTW,
};

const STORAGE_KEY = "dionysus_locale";

interface I18nContextValue {
  t: i18n.NullableTranslator<Dict>;
  /** For dynamic keys not known at compile-time (e.g. ingredient.translation_key). Falls back to `fallback` if key is missing. */
  tDynamic: (key: string, fallback: string) => string;
  /** Localised name for a catalogue row that carries its own translation_key. */
  tName: (item: { translation_key?: string; name?: string; title?: string } | undefined) => string;
  tCategory: (category: string | undefined) => string;
  tTagType: (type: string | undefined) => string;
  locale: () => Locale;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>();

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "zh-TW" || stored === "en" ? stored : "en";
}

export function I18nProvider(props: { children: JSX.Element }) {
  const [locale, setLocale] = createSignal<Locale>(initialLocale());

  const t = i18n.translator(() => dict[locale()] as Dict, i18n.resolveTemplate);

  const tDynamic = (key: string, fallback: string): string => {
    if (!key) return fallback;
    return dict[locale()][key] ?? fallback;
  };

  const tName: I18nContextValue["tName"] = (item) => {
    const fallback = item?.name ?? item?.title ?? "";
    return tDynamic(item?.translation_key ?? "", fallback);
  };

  const tCategory = (category: string | undefined) =>
    tDynamic("ingredient.category." + (category ?? "").toLowerCase(), category ?? "");

  const tTagType = (type: string | undefined) =>
    tDynamic("tag.type." + (type ?? "").toLowerCase(), type ?? "");

  const setLocaleWithPersistence = (l: Locale) => {
    setLocale(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  // Keep the document language in step so screen readers and the browser's
  // translation prompt do not keep announcing the page as English.
  createEffect(() => {
    document.documentElement.lang = locale();
  });

  return (
    <I18nContext.Provider
      value={{
        t,
        tDynamic,
        tName,
        tCategory,
        tTagType,
        locale,
        setLocale: setLocaleWithPersistence,
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

/** Convenience helpers so callers do not re-derive the shape of catalogue rows. */
export type Translatable = Ingredient | Tag;
