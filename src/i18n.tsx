import { createSignal, createContext, useContext } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";

export type Locale = "en" | "zh-TW";
export type Dict = typeof en;

const dict = {
  en: en,
  "zh-TW": zhTW,
};

interface I18nContextValue {
  t: i18n.NullableTranslator<Dict>;
  /** For dynamic keys not known at compile-time (e.g. ingredient.translation_key). Falls back to `fallback` if key is missing. */
  tDynamic: (key: string, fallback: string) => string;
  locale: () => Locale;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>();

export function I18nProvider(props: { children: any }) {
  const [locale, setLocale] = createSignal<Locale>(
    (localStorage.getItem("dionysus_locale") as Locale) || "en"
  );

  const t = i18n.translator(() => dict[locale()], i18n.resolveTemplate);
  const tDynamic = (key: string, fallback: string): string => {
    if (!key) return fallback;
    const currentDict = dict[locale()] as Record<string, string>;
    return currentDict[key] ?? fallback;
  };

  const setLocaleWithPersistence = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("dionysus_locale", l);
  };

  return (
    <I18nContext.Provider value={{ t, tDynamic, locale, setLocale: setLocaleWithPersistence }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
