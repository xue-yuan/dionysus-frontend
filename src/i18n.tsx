import { createSignal, createContext, useContext, createEffect, type JSX } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";
import type { Ingredient, Tag } from "./types";

export type Locale = "en" | "zh-TW";
export type Dict = typeof en;

/**
 * `Dict = typeof en` only catches keys missing from zh-TW, never the reverse.
 * These two assertions fail the build in both directions, and the error names
 * the offending key rather than just saying the shapes differ.
 */
type MissingFrom<A, B> = Exclude<keyof A, keyof B> & string;
type NoMissingKeys<T extends never = never> = T;
export type _EnCoversZh = NoMissingKeys<MissingFrom<typeof zhTW, typeof en>>;
export type _ZhCoversEn = NoMissingKeys<MissingFrom<typeof en, typeof zhTW>>;

const dict: Record<Locale, Record<string, string>> = {
  en,
  "zh-TW": zhTW,
};

/** Values the database stores in English and the client translates by slug. */
export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const STORAGE_KEY = "dionysus_locale";

interface I18nContextValue {
  t: i18n.NullableTranslator<Dict>;
  /**
   * `t` for a phrase with a count. English needs "1 bottle" against "2
   * bottles", so a `key_one` entry supplies the singular. zh-TW does not
   * inflect, but carries the same `_one` keys because both files must hold the
   * same set.
   */
  tCount: (key: keyof Dict, count: number) => string;
  /** For dynamic keys not known at compile-time (e.g. ingredient.translation_key). Falls back to `fallback` if key is missing. */
  tDynamic: (key: string, fallback: string) => string;
  /** Localised name for a catalogue row that carries its own translation_key. */
  tName: (item: { translation_key?: string; name?: string; title?: string } | undefined) => string;
  tCategory: (category: string | undefined) => string;
  tTagType: (type: string | undefined) => string;
  /** Preparation method, e.g. "Dry Shake & Shake". */
  tMethod: (method: string | undefined) => string;
  tGlassware: (glassware: string | undefined) => string;
  /**
   * A measure as it reads in the active language. Technique lines the seed
   * spells as words ("Top" + "up", "1" + "rinse") translate as whole phrases;
   * anything else is the amount followed by its translated unit.
   */
  tMeasure: (amount: string, unit: string) => string;
  /**
   * Recipe translation keys whose localised name matches `query`. The server
   * stores only English text, so this is what lets a search in Chinese reach
   * the archive — see `keys` in recipeService.getRecipes.
   */
  searchKeys: (query: string) => string[];
  locale: () => Locale;
  setLocale: (l: Locale) => void;
}

/** Matches the server's cap, so a wide query is trimmed rather than rejected. */
const MAX_SEARCH_KEYS = 200;

/**
 * Recipe translation keys whose localised name contains `query`.
 *
 * Both dictionaries are searched rather than only the active one, so the
 * archive answers to a drink's Chinese name while the interface is in English
 * and the other way round. Recipe names are the only keys the server can match
 * a row against, so nothing else is worth sending.
 *
 * Independent of the active locale, which is what lets it live outside the
 * provider and be tested on its own.
 */
export function resolveSearchKeys(query: string): string[] {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];

  const found = new Set<string>();
  for (const table of [en, zhTW] as Record<string, string>[]) {
    for (const key in table) {
      if (!key.startsWith("recipe.")) continue;
      if (table[key].toLowerCase().includes(needle)) found.add(key);
      if (found.size >= MAX_SEARCH_KEYS) return [...found];
    }
  }
  return [...found];
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

  const tCount = (key: keyof Dict, count: number): string => {
    const table = dict[locale()];
    const template = (count === 1 && table[`${key}_one`]) || table[key] || key;
    return i18n.resolveTemplate(template, { count });
  };

  const tName: I18nContextValue["tName"] = (item) => {
    const fallback = item?.name ?? item?.title ?? "";
    return tDynamic(item?.translation_key ?? "", fallback);
  };

  const tCategory = (category: string | undefined) =>
    tDynamic("ingredient.category." + (category ?? "").toLowerCase(), category ?? "");

  const tTagType = (type: string | undefined) =>
    tDynamic("tag.type." + (type ?? "").toLowerCase(), type ?? "");

  const tMethod = (method: string | undefined) =>
    tDynamic("method." + slug(method ?? ""), method ?? "");

  const tGlassware = (glassware: string | undefined) =>
    tDynamic("glassware." + slug(glassware ?? ""), glassware ?? "");

  const tMeasure = (amount: string, unit: string) => {
    const phrase = dict[locale()][`measure.${slug(amount)}_${slug(unit)}`];
    if (phrase) return phrase;
    return `${amount} ${tDynamic("unit." + slug(unit), unit)}`;
  };

  // Both dictionaries are searched, not just the active one, so the archive
  // answers to a drink's Chinese name while the interface is in English and
  // vice versa. Recipe names are the only keys the server can match against.
  const searchKeys = resolveSearchKeys;

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
        tCount,
        tDynamic,
        tName,
        tCategory,
        tTagType,
        tMethod,
        tGlassware,
        tMeasure,
        searchKeys,
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
