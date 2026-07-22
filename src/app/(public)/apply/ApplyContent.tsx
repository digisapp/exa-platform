"use client";

import Link from "next/link";
import { ModelSignupForm } from "@/components/auth/ModelSignupForm";
import { useLocale } from "@/i18n";

// Page copy lives inline (like /modelo) — the form itself localizes via the
// shared signup dictionary. LatAm visitors get Spanish automatically through
// the exa-geo-locale cookie picked up by the global I18nProvider.
const copy = {
  en: {
    eyebrow: "Model Application",
    title: "Join EXA",
    subtitle: "Turn your influence into income — fashion shows, bookings, exclusive content, and fans that pay.",
    note: "Free to apply — approval within 24 hours",
    haveAccount: "Already on EXA?",
    signIn: "Sign in",
    fanNote: "Here to support models?",
    fanSignup: "Create a fan account",
  },
  es: {
    eyebrow: "Solicitud de Modelo",
    title: "Únete a EXA",
    subtitle: "Convierte tu influencia en ingresos — desfiles, bookings, contenido exclusivo y fans que pagan.",
    note: "Aplicar es gratis — aprobación en 24 horas",
    haveAccount: "¿Ya estás en EXA?",
    signIn: "Inicia sesión",
    fanNote: "¿Vienes a apoyar a las modelos?",
    fanSignup: "Crea una cuenta de fan",
  },
};

export function ApplyContent() {
  const { locale } = useLocale();
  const c = locale === "es" ? copy.es : copy.en;

  return (
    <main className="container px-4 md:px-8 py-12 max-w-lg mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-3">
          {c.eyebrow}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="exa-gradient-text">{c.title}</span>
          <span className="ml-2">✨</span>
        </h1>
        <p className="text-white/60 max-w-md mx-auto">{c.subtitle}</p>
        <p className="text-xs text-white/50 mt-3">{c.note}</p>
      </div>

      {/* Application form */}
      <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-white/[0.02] p-6 md:p-8 shadow-[0_0_40px_rgba(236,72,153,0.12)]">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <ModelSignupForm />
        </div>
      </div>

      {/* Alt paths */}
      <div className="mt-6 space-y-2 text-center text-sm text-white/50">
        <p>
          {c.haveAccount}{" "}
          <Link href="/signin" className="text-pink-400 hover:text-pink-300 underline underline-offset-2">
            {c.signIn}
          </Link>
        </p>
        <p>
          {c.fanNote}{" "}
          <Link href="/fan/signup" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            {c.fanSignup}
          </Link>
        </p>
      </div>
    </main>
  );
}
