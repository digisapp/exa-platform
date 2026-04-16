import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import {
  Instagram,
  CheckCircle,
  ArrowRight,
  Crown,
  Globe,
  Shield,
  Users,
  DollarSign,
} from "lucide-react";
import { ModelSignupDialogES } from "@/components/auth/ModelSignupDialogES";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Para Modelos | EXA Models",
  description:
    "Convierte tu influencia en ingresos. EXA es donde tu contenido, tu tiempo y tu personalidad realmente te pagan.",
  openGraph: {
    title: "EXA Models — Plataforma Global para Modelos",
    description:
      "Gigs, bookings, contenido exclusivo y más. Únete a la comunidad de modelos más grande del mundo.",
    locale: "es_LA",
  },
};

export default function ModeloPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 md:px-8 py-12 max-w-4xl mx-auto">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <Link
            href="/for-models"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 text-xs font-semibold text-white/70 hover:text-pink-300 transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            English
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-3">
            Para la vida real
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="exa-gradient-text">Sé Modelo en EXA</span>
          </h1>
          <p className="text-xl text-white font-medium mb-2">
            Convierte tu influencia en ingresos reales.
          </p>
          <p className="text-white/60 max-w-xl mx-auto">
            EXA es donde tu contenido, tu tiempo y tu personalidad realmente te
            pagan — no solo &quot;likes.&quot;
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <ModelSignupDialogES>
            <button
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white text-lg font-bold shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:shadow-[0_0_32px_rgba(236,72,153,0.7)] active:scale-[0.98] transition-all"
            >
              Aplicar Ahora
              <ArrowRight className="h-5 w-5" />
            </button>
          </ModelSignupDialogES>
          <p className="text-xs text-white/50 mt-3">
            Registro gratuito — aprobación en 24 horas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <StatCard emoji="💸" label="6+ Fuentes de Ingreso" />
          <StatCard emoji="🌙" label="Ganancias Pasivas 24/7" />
          <StatCard emoji="💎" label="$0.10 USD Por Moneda" />
          <StatCard emoji="🫶" label="100% TU Contenido" />
        </div>

        {/* Think of EXA as */}
        <div
          className="relative overflow-hidden rounded-2xl border border-pink-500/30 p-6 mb-12"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,105,180,0.15) 0%, rgba(139,92,246,0.10) 50%, rgba(245,158,11,0.12) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 w-40 h-40 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="relative">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-4">
              Modelo mental
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-500/15 ring-1 ring-pink-500/30 mb-2">
                  <Instagram className="h-7 w-7 text-pink-300" />
                </div>
                <p className="font-bold text-white">Instagram</p>
                <p className="text-xs text-white/50">tu vitrina gratuita</p>
              </div>
              <ArrowRight className="h-6 w-6 text-white/40 hidden md:block" />
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/40 mb-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Crown className="h-7 w-7 text-amber-300" />
                </div>
                <p className="font-bold text-white">EXA</p>
                <p className="text-xs text-amber-300/80">tu mundo VIP que realmente te paga</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why EXA */}
        <SectionHeader kicker="Beneficios" emoji="🌎" title="¿Por Qué EXA?" />

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 mb-4">
          <div className="space-y-4">
            {[
              {
                title: "Gigs y Shows Internacionales",
                desc: "Miami Swim Week, campañas de moda, eventos y más — todo en una plataforma",
              },
              {
                title: "Pagos Seguros",
                desc: "Recibe pagos directamente — Payoneer para pagos internacionales a tu cuenta bancaria local",
              },
              {
                title: "Tu Portafolio Profesional",
                desc: "Perfil completo con fotos, medidas, tarifas — todo lo que las marcas necesitan para contratarte",
              },
              {
                title: "Contenido Exclusivo",
                desc: "Vende fotos, videos, rutinas y más — tus fans pagan por acceso VIP",
              },
              {
                title: "Mensajes Pagados",
                desc: "Los fans pagan para escribirte — tú respondes cuando quieras",
              },
              {
                title: "Propinas de Fans",
                desc: "Recibe propinas directamente en la plataforma — sin Venmo, sin PayPal",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How Models Earn */}
        <SectionHeader kicker="Ejemplos" emoji="💰" title="Cómo Ganan las Modelos" />

        <ScenarioCard number={1} title="Contenido Exclusivo = Ingreso Pasivo">
          <p className="text-white/60 mb-4">
            En Instagram compartes gratis. En EXA:
          </p>
          <ul className="space-y-1 mb-4">
            <li>• Sube tu rutina de gym completa (50–100 monedas)</li>
            <li>• Tutoriales de maquillaje y styling</li>
            <li>• Vlogs de viajes y día a día</li>
            <li>• Guías de preparación de comida</li>
          </ul>
          <p className="text-pink-300 font-semibold">
            Sube una vez, gana para siempre.
          </p>
        </ScenarioCard>

        <ScenarioCard number={2} title="Reservaciones de Marcas">
          <p className="text-white/60 mb-4">
            Las marcas pueden ver tu perfil y contratarte directamente:
          </p>
          <ul className="mb-4 space-y-1">
            <li>• Sesiones de fotos</li>
            <li>• Eventos y apariciones</li>
            <li>• Campañas de marca</li>
            <li>• Embajadora de marca</li>
          </ul>
          <p className="text-white/60">Sin más:</p>
          <ul className="text-rose-300 space-y-1">
            <li>❌ &quot;DM para collab&quot;</li>
            <li>❌ Sesiones sin pago por &quot;exposición&quot;</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard number={3} title="Shows y Pasarela">
          <p className="text-white/60 mb-4">
            Accede a oportunidades de pasarela reales:
          </p>
          <ul className="space-y-1 mb-4">
            <li>• Miami Swim Week</li>
            <li>• Shows de diseñadores</li>
            <li>• Eventos de moda internacionales</li>
          </ul>
          <p className="text-pink-300 font-semibold">
            Diseñadores buscan modelos en EXA todos los días.
          </p>
        </ScenarioCard>

        <ScenarioCard number={4} title="Mensajes y Propinas">
          <p className="text-white/60 mb-4">
            Instagram = trabajo emocional gratis
            <br />
            EXA = conversaciones pagadas
          </p>
          <p className="text-white/80">Los fans pagan monedas para escribirte →</p>
          <p className="font-semibold text-pink-300">
            tú respondes cuando TÚ quieras.
          </p>
        </ScenarioCard>

        {/* Income Stack */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            Ingresos
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 text-white">
            💅 <span className="exa-gradient-text">Tus Fuentes de Ingreso en EXA</span>
          </h2>
          <div
            className="relative overflow-hidden rounded-2xl border border-pink-500/30 p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.10) 50%, rgba(0,191,255,0.12) 100%)",
            }}
          >
            <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-white/70 mb-4 font-medium">
                En UN mes puedes ganar de:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <IncomeItem label="Propinas" />
                <IncomeItem label="Contenido PPV" />
                <IncomeItem label="Mensajes pagados" />
                <IncomeItem label="Sesiones de fotos" />
                <IncomeItem label="Gigs de marcas" />
                <IncomeItem label="Eventos" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-white/60">
                  Instagram = millones de vistas,{" "}
                  <span className="text-rose-300 font-semibold">$0</span>
                </p>
                <p className="font-bold text-lg text-white">
                  EXA = audiencia pequeña,{" "}
                  <span className="text-emerald-300">DINERO REAL</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Countries */}
        <SectionHeader kicker="Global" emoji="🌎" title="Modelos de Todo el Mundo" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 mb-8">
          <p className="text-white/60 mb-4">EXA acepta modelos de:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { flag: "🇲🇽", country: "México" },
              { flag: "🇨🇴", country: "Colombia" },
              { flag: "🇦🇷", country: "Argentina" },
              { flag: "🇧🇷", country: "Brasil" },
              { flag: "🇩🇴", country: "República Dominicana" },
              { flag: "🇻🇪", country: "Venezuela" },
              { flag: "🇵🇪", country: "Perú" },
              { flag: "🇨🇱", country: "Chile" },
              { flag: "🇪🇸", country: "España" },
              { flag: "🇪🇨", country: "Ecuador" },
              { flag: "🇵🇦", country: "Panamá" },
              { flag: "🇺🇸", country: "Estados Unidos" },
            ].map(({ flag, country }) => (
              <div
                key={country}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 transition-colors"
              >
                <span className="text-xl">{flag}</span>
                <span className="text-sm font-semibold text-white">{country}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 mt-4 text-center">
            + más de 30 países con pagos internacionales via Payoneer
          </p>
        </div>

        {/* Why EXA vs Others */}
        <SectionHeader kicker="Por qué somos diferentes" emoji="🛡️" title="¿Por Qué EXA y No Otras Plataformas?" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 mb-4">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 shrink-0">
                <Shield className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="font-semibold text-white">Plataforma Segura y Profesional</p>
                <p className="text-sm text-white/60">
                  EXA es para modelos profesionales. Tu imagen y reputación
                  están protegidas. Contenido limpio y profesional.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30 shrink-0">
                <DollarSign className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="font-semibold text-white">Pagos Internacionales Reales</p>
                <p className="text-sm text-white/60">
                  Pagos a tu cuenta bancaria local via Payoneer en pesos,
                  colones, soles, o tu moneda local. Sin complicaciones con
                  dólares.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/30 shrink-0">
                <Globe className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <p className="font-semibold text-white">Hecha para Modelos Globales</p>
                <p className="text-sm text-white/60">
                  EXA es global, profesional, y te da oportunidades reales —
                  gigs, shows, bookings, y contenido exclusivo todo en un
                  solo lugar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Program */}
        <SectionHeader kicker="Ingreso extra" emoji="🤝" title="Programa de Referidos" />
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-6 mb-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(249,115,22,0.10) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40 shrink-0 shadow-[0_0_18px_rgba(245,158,11,0.25)]">
              <Users className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white mb-2">
                Gana invitando a otras modelos
              </h3>
              <p className="text-white/70 mb-3">
                Comparte tu enlace de referido y gana el{" "}
                <span className="font-bold text-amber-300">
                  5% de los ingresos
                </span>{" "}
                de cada modelo que invites — durante{" "}
                <span className="font-bold text-amber-300">12 meses</span>.
              </p>
              <p className="text-sm text-white/60">
                Si invitas a 10 modelos que ganan $500/mes cada una, tú ganas
                $250/mes extra sin hacer nada.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            Configuración de 5 minutos
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
            <span className="exa-gradient-text">INICIO RÁPIDO</span>
          </h2>
          <div
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(20,184,166,0.08) 100%)",
            }}
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative space-y-3">
              <QuickStartItem emoji="📸" text="Sube tu foto de perfil" />
              <QuickStartItem emoji="🖼️" text="Agrega 5 fotos de portafolio" />
              <QuickStartItem emoji="💰" text="Establece tus tarifas" />
              <QuickStartItem emoji="🔒" text="Publica 1 contenido PPV" />
              <QuickStartItem emoji="🏦" text="Conecta tu banco" />
              <QuickStartItem emoji="🔗" text="Pon EXA en tu bio" />
            </div>
          </div>
        </div>

        {/* Miami Swim Week CTA */}
        <div
          className="relative overflow-hidden rounded-2xl border border-cyan-500/40 p-8 text-center mb-12 shadow-[0_0_32px_rgba(34,211,238,0.2)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,191,255,0.18) 0%, rgba(255,105,180,0.15) 50%, rgba(249,115,22,0.18) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-orange-500/30 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
              Pasarela 2026
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Miami Swim Week 2026
            </h2>
            <p className="text-white/70 mb-4">
              Diseñadores están buscando modelos AHORA en EXA para sus shows y
              campañas. Completa tu perfil para que te descubran.
            </p>
            <p className="font-bold text-lg bg-gradient-to-r from-cyan-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">
              Tu próximo show empieza aquí.
            </p>
          </div>
        </div>

        {/* Final Truth */}
        <div
          className="relative overflow-hidden rounded-2xl border border-pink-500/40 p-8 text-center mb-12 shadow-[0_0_32px_rgba(236,72,153,0.2)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,105,180,0.18) 0%, rgba(139,92,246,0.15) 50%, rgba(0,191,255,0.18) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
              Hablando claro
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              La Verdad
            </h2>
            <p className="text-white/70 mb-4">Tus seguidores ya:</p>
            <ul className="space-y-1 mb-6 text-white/80">
              <li>• Te piden rutinas</li>
              <li>• Quieren consejos</li>
              <li>• Quieren más de ti</li>
            </ul>
            <p className="font-semibold text-white mb-4">EXA hace que sea JUSTO.</p>
            <div className="space-y-2">
              <p className="text-white/60">Los likes no pagan la renta.</p>
              <p className="text-2xl md:text-3xl font-bold exa-gradient-text">
                Tu personalidad sí.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <ModelSignupDialogES>
            <button
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white text-lg font-bold shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:shadow-[0_0_32px_rgba(236,72,153,0.7)] active:scale-[0.98] transition-all"
            >
              Aplicar Ahora
              <ArrowRight className="h-5 w-5" />
            </button>
          </ModelSignupDialogES>
          <p className="text-xs text-white/50 mt-3">
            Registro gratuito — aprobación en 24 horas
          </p>
        </div>
      </main>

      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} EXA Models. Todos los derechos
          reservados.
        </p>
      </footer>
    </div>
  );
}

function StatCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 text-center hover:border-pink-500/30 hover:bg-white/[0.06] transition-all">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-sm font-semibold text-white">{label}</div>
    </div>
  );
}

function SectionHeader({ emoji, title, kicker }: { emoji: string; title: string; kicker?: string }) {
  return (
    <div className="mt-12 mb-6">
      {kicker && (
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">
        <span>{emoji}</span>
        <span className="exa-gradient-text">{title}</span>
      </h2>
    </div>
  );
}

function ScenarioCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 mb-4 hover:border-pink-500/25 transition-all">
      <h3 className="font-bold text-lg mb-4 text-white">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mr-2 shadow-[0_0_10px_rgba(236,72,153,0.15)]">
          {number}
        </span>
        {title}
      </h3>
      <div className="text-white/80">{children}</div>
    </div>
  );
}

function IncomeItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/30 transition-colors">
      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-sm font-semibold text-white">{label}</span>
    </div>
  );
}

function QuickStartItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all">
      <span className="text-xl">{emoji}</span>
      <span className="font-semibold text-white">{text}</span>
    </div>
  );
}
