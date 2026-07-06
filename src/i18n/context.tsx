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

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolve the visitor's locale, most explicit signal first:
 * 1. localStorage (user's explicit choice via a language toggle)
 * 2. exa-geo-locale cookie (set by middleware from Vercel geo / Accept-Language)
 * 3. navigator.language
 */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";

  const stored = localStorage.getItem("exa-locale");
  if (stored === "en" || stored === "es") return stored;

  const geo = readCookie("exa-geo-locale");
  if (geo === "en" || geo === "es") return geo;

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

  // Keep <html lang> in sync for screen readers / translation tools. The
  // attribute is server-rendered as "en" (root layout must stay static), so
  // this is the only place it can reflect the visitor's actual language.
  useEffect(() => {
    if (mounted) document.documentElement.lang = locale;
  }, [locale, mounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("exa-locale", newLocale);
    document.documentElement.lang = newLocale;
    // Persist to the account so emails/SMS follow the user's language.
    // Fire-and-forget: 401s (logged-out visitors) are expected and fine.
    fetch("/api/account/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLocale }),
    }).catch(() => {});
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
