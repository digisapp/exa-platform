"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import type { Dictionary } from "./dictionaries/en";

export type Locale = "en" | "es";

const dictionaries: Record<Locale, Dictionary> = { en, es };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

/**
 * Get the stored locale from localStorage, or detect from browser.
 */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";

  // Check localStorage first (user's explicit choice)
  const stored = localStorage.getItem("exa-locale");
  if (stored === "en" || stored === "es") return stored;

  // Fall back to browser language
  const lang = navigator.language || "";
  return lang.startsWith("es") ? "es" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("exa-locale", newLocale);
  }, []);

  // Use English until mounted to prevent hydration mismatch
  const t = mounted ? dictionaries[locale] : en;

  return (
    <I18nContext.Provider value={{ locale: mounted ? locale : "en", setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access translations.
 * Returns the full dictionary typed object.
 * Usage: const { t } = useTranslation();
 *        t.nav.home // "Home" or "Inicio"
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  return { t: context.t, locale: context.locale, setLocale: context.setLocale };
}

/**
 * Hook to access just the locale and setter.
 */
export function useLocale() {
  const context = useContext(I18nContext);
  return { locale: context.locale, setLocale: context.setLocale };
}
