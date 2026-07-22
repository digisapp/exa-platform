"use client";

import { useEffect, useState } from "react";
import { Globe, Check, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n";
import { readCookie } from "@/i18n/context";
import { cn } from "@/lib/utils";

// Languages beyond en/es have no native dictionary — they ride on the Google
// Translate widget (hidden combo mounted by <GoogleTranslate />). Must stay a
// subset of includedLanguages in GoogleTranslate.tsx. Labels are written in
// their own language on purpose: a reader who needs the switch can't be
// expected to find their language spelled in English.
const GT_LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "zh-CN", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

/** Target language of an active Google Translate session, e.g. "/en/pt" → "pt". */
function getGoogTransLang(): string | null {
  const raw = readCookie("googtrans");
  const target = raw?.split("/")[2];
  return target && target !== "en" ? target : null;
}

/**
 * Drive the hidden Google Translate <select>. The widget script loads async,
 * so retry briefly if the combo isn't in the DOM yet.
 */
function applyGoogleTranslate(code: string, attempts = 20) {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event("change"));
  } else if (attempts > 0) {
    setTimeout(() => applyGoogleTranslate(code, attempts - 1), 250);
  }
}

/**
 * Reverting to the original language requires killing the googtrans cookie
 * (Google sets it on both host and base domain) and reloading — the widget
 * has no clean "show original" API.
 */
function clearGoogleTranslate() {
  const host = window.location.hostname;
  const domains = new Set(["", host, `.${host}`, `.${host.replace(/^www\./, "")}`]);
  for (const domain of domains) {
    document.cookie = `googtrans=;path=/;${domain ? `domain=${domain};` : ""}expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

const ITEM_CLASS =
  "cursor-pointer rounded-lg px-2.5 py-2 text-sm text-white/80 focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white";

/**
 * Globe language menu in the top nav. English/Español switch the native
 * dictionary (and persist preferred_language for emails); Español also applies
 * Google Translate so page bodies without native copy read in Spanish too.
 * Other languages are Google-Translate-only.
 */
export function LanguageSwitcher() {
  const { t, locale, setLocale } = useTranslation();
  const [gtLang, setGtLang] = useState<string | null>(null);

  useEffect(() => {
    setGtLang(getGoogTransLang());
  }, []);

  const activeCode = gtLang && gtLang !== "es" ? gtLang : locale === "es" || gtLang === "es" ? "es" : "en";

  const selectEnglish = () => {
    setLocale("en");
    if (getGoogTransLang()) {
      clearGoogleTranslate();
      window.location.reload();
      return;
    }
    setGtLang(null);
  };

  const selectSpanish = () => {
    setLocale("es");
    applyGoogleTranslate("es");
    setGtLang("es");
  };

  const selectGtLanguage = (code: string) => {
    applyGoogleTranslate(code);
    setGtLang(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t.nav.language}
          title={t.nav.language}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-all"
        >
          <Globe className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 p-1.5 bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 text-white shadow-2xl shadow-violet-500/10 max-h-[70vh] overflow-y-auto"
      >
        <DropdownMenuItem className={cn(ITEM_CLASS, "notranslate")} onClick={selectEnglish}>
          <span className="flex-1">English</span>
          {activeCode === "en" && <Check className="h-4 w-4 text-pink-400" />}
        </DropdownMenuItem>
        <DropdownMenuItem className={cn(ITEM_CLASS, "notranslate")} onClick={selectSpanish}>
          <span className="flex-1">Español</span>
          {activeCode === "es" && <Check className="h-4 w-4 text-pink-400" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10 my-1.5" />
        <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-0.5 text-[10px] uppercase tracking-wider text-white/40">
          <Languages className="h-3 w-3" />
          {t.nav.autoTranslated}
        </div>

        {GT_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={cn(ITEM_CLASS, "notranslate")}
            onClick={() => selectGtLanguage(lang.code)}
          >
            <span className="flex-1">{lang.label}</span>
            {activeCode === lang.code && <Check className="h-4 w-4 text-pink-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
