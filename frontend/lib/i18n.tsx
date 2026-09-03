"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import frMessages from "@/messages/fr.json";

export type Locale = "fr" | "en" | "ar";

const MESSAGES = {
  fr: frMessages,
  en: enMessages,
  ar: arMessages,
} as const;

export const LOCALE_STORAGE_KEY = "bts_locale";
export const DEFAULT_LOCALE: Locale = "fr";

export const AVAILABLE_LOCALES: { code: Locale; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LOCALE;
    }
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    return saved && MESSAGES[saved] ? saved : DEFAULT_LOCALE;
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string) => {
      const parts = key.split(".");
      const dict = MESSAGES[locale] as Record<string, unknown>;
      let value: unknown = dict;
      for (const part of parts) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[part];
        }
      }
      return typeof value === "string" ? value : key;
    },
    [locale],
  );

  const isRTL = locale === "ar";

  const value = useMemo(
    () => ({ locale, setLocale, t, isRTL }),
    [locale, setLocale, t, isRTL],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}