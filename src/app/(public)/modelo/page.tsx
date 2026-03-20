import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  CheckCircle,
  ArrowRight,
  Crown,
  Globe,
  Shield,
  Users,
  DollarSign,
  XCircle,
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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-pink-500 transition-colors"
          >
            <Globe className="h-4 w-4" />
            English
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
              Sé Modelo en EXA
            </span>
          </h1>
          <p className="text-xl mb-2">
            Convierte tu influencia en ingresos reales.
          </p>
          <p className="text-muted-foreground">
            EXA es donde tu contenido, tu tiempo y tu personalidad realmente te
            pagan — no solo &quot;likes.&quot;
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <ModelSignupDialogES>
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg px-10 h-14 rounded-full"
            >
              Aplicar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </ModelSignupDialogES>
          <p className="text-sm text-muted-foreground mt-3">
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
        <Card className="p-6 mb-12 bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <p className="text-center text-lg">
            <span className="font-bold">Piensa en EXA como:</span>
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
            <div className="text-center">
              <Instagram className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Instagram</p>
              <p className="text-sm text-muted-foreground">
                tu vitrina gratuita
              </p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
            <div className="text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="font-medium">EXA</p>
              <p className="text-sm text-muted-foreground">
                tu mundo VIP que realmente te paga
              </p>
            </div>
          </div>
        </Card>

        {/* Why EXA */}
        <SectionHeader emoji="🌎" title="¿Por Qué EXA?" />

        <Card className="p-6 mb-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Gigs y Shows Internacionales</p>
                <p className="text-sm text-muted-foreground">
                  Miami Swim Week, campañas de moda, eventos y más — todo en una
                  plataforma
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Pagos Seguros</p>
                <p className="text-sm text-muted-foreground">
                  Recibe pagos directamente — Payoneer para pagos
                  internacionales a tu cuenta bancaria local
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Tu Portafolio Profesional</p>
                <p className="text-sm text-muted-foreground">
                  Perfil completo con fotos, medidas, tarifas — todo lo que las
                  marcas necesitan para contratarte
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Contenido Exclusivo</p>
                <p className="text-sm text-muted-foreground">
                  Vende fotos, videos, rutinas y más — tus fans pagan por acceso
                  VIP
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Mensajes Pagados</p>
                <p className="text-sm text-muted-foreground">
                  Los fans pagan para escribirte — tú respondes cuando quieras
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Propinas de Fans</p>
                <p className="text-sm text-muted-foreground">
                  Recibe propinas directamente en la plataforma — sin Venmo, sin
                  PayPal
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* How Models Earn */}
        <SectionHeader emoji="💰" title="Cómo Ganan las Modelos" />

        <ScenarioCard
          number={1}
          title="Contenido Exclusivo = Ingreso Pasivo"
        >
          <p className="text-muted-foreground mb-4">
            En Instagram compartes gratis. En EXA:
          </p>
          <ul className="space-y-1 mb-4">
            <li>• Sube tu rutina de gym completa (50–100 monedas)</li>
            <li>• Tutoriales de maquillaje y styling</li>
            <li>• Vlogs de viajes y día a día</li>
            <li>• Guías de preparación de comida</li>
          </ul>
          <p className="text-pink-500 font-medium">
            Sube una vez, gana para siempre.
          </p>
        </ScenarioCard>

        <ScenarioCard number={2} title="Reservaciones de Marcas">
          <p className="text-muted-foreground mb-4">
            Las marcas pueden ver tu perfil y contratarte directamente:
          </p>
          <ul className="mb-4 space-y-1">
            <li>• Sesiones de fotos</li>
            <li>• Eventos y apariciones</li>
            <li>• Campañas de marca</li>
            <li>• Embajadora de marca</li>
          </ul>
          <p className="text-muted-foreground">Sin más:</p>
          <ul className="text-red-400 space-y-1">
            <li>❌ &quot;DM para collab&quot;</li>
            <li>❌ Sesiones sin pago por &quot;exposición&quot;</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard number={3} title="Shows y Pasarela">
          <p className="text-muted-foreground mb-4">
            Accede a oportunidades de pasarela reales:
          </p>
          <ul className="space-y-1 mb-4">
            <li>• Miami Swim Week</li>
            <li>• Shows de diseñadores</li>
            <li>• Eventos de moda internacionales</li>
          </ul>
          <p className="text-pink-500 font-medium">
            Diseñadores buscan modelos en EXA todos los días.
          </p>
        </ScenarioCard>

        <ScenarioCard number={4} title="Mensajes y Propinas">
          <p className="text-muted-foreground mb-4">
            Instagram = trabajo emocional gratis
            <br />
            EXA = conversaciones pagadas
          </p>
          <p>Los fans pagan monedas para escribirte →</p>
          <p className="font-medium text-pink-500">
            tú respondes cuando TÚ quieras.
          </p>
        </ScenarioCard>

        {/* Income Stack */}
        <div className="my-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            💅 Tus Fuentes de Ingreso en EXA
          </h2>
          <Card className="p-6 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 border-pink-500/20">
            <p className="text-muted-foreground mb-4">
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
              <p className="text-muted-foreground">
                Instagram = millones de vistas,{" "}
                <span className="text-red-400">$0</span>
              </p>
              <p className="font-bold text-lg">
                EXA = audiencia pequeña,{" "}
                <span className="text-green-500">DINERO REAL</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Countries */}
        <SectionHeader emoji="🌎" title="Modelos de Todo el Mundo" />
        <Card className="p-6 mb-8">
          <p className="text-muted-foreground mb-4">
            EXA acepta modelos de:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <span className="text-xl">{flag}</span>
                <span className="text-sm font-medium">{country}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            + más de 30 países con pagos internacionales via Payoneer
          </p>
        </Card>

        {/* Why EXA vs Others */}
        <SectionHeader emoji="🛡️" title="¿Por Qué EXA y No Otras Plataformas?" />
        <Card className="p-6 mb-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Plataforma Segura y Profesional</p>
                <p className="text-sm text-muted-foreground">
                  EXA es para modelos profesionales — no es OnlyFans. Tu imagen
                  y reputación están protegidas. Contenido limpio y profesional.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Pagos Internacionales Reales</p>
                <p className="text-sm text-muted-foreground">
                  Pagos a tu cuenta bancaria local via Payoneer en pesos, colones,
                  soles, o tu moneda local. Sin complicaciones con dólares.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Otras Plataformas No Te Apoyan</p>
                <p className="text-sm text-muted-foreground">
                  Fanfix y Passes son solo para Estados Unidos y en inglés.
                  OnlyFans tiene estigma de contenido adulto. EXA es global,
                  profesional, y te da oportunidades reales.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Referral Program */}
        <SectionHeader emoji="🤝" title="Programa de Referidos" />
        <Card className="p-6 mb-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <div className="flex items-start gap-4">
            <Users className="h-8 w-8 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg mb-2">
                Gana invitando a otras modelos
              </h3>
              <p className="text-muted-foreground mb-3">
                Comparte tu enlace de referido y gana el{" "}
                <span className="font-bold text-amber-500">
                  5% de los ingresos
                </span>{" "}
                de cada modelo que invites — durante{" "}
                <span className="font-bold text-amber-500">12 meses</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                Si invitas a 10 modelos que ganan $500/mes cada una, tú ganas
                $250/mes extra sin hacer nada.
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Start */}
        <div className="my-12">
          <h2 className="text-2xl font-bold mb-6">
            INICIO RÁPIDO (5 minutos)
          </h2>
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="space-y-3">
              <QuickStartItem emoji="📸" text="Sube tu foto de perfil" />
              <QuickStartItem emoji="🖼️" text="Agrega 5 fotos de portafolio" />
              <QuickStartItem emoji="💰" text="Establece tus tarifas" />
              <QuickStartItem emoji="🔒" text="Publica 1 contenido PPV" />
              <QuickStartItem emoji="🏦" text="Conecta tu banco" />
              <QuickStartItem emoji="🔗" text="Pon EXA en tu bio" />
            </div>
          </Card>
        </div>

        {/* Miami Swim Week CTA */}
        <Card className="p-8 text-center bg-gradient-to-br from-cyan-500/20 via-pink-500/20 to-orange-500/20 border-pink-500/30 mb-12">
          <h2 className="text-2xl font-bold mb-4">
            Miami Swim Week 2026
          </h2>
          <p className="text-muted-foreground mb-4">
            Diseñadores están buscando modelos AHORA en EXA para sus shows y
            campañas. Completa tu perfil para que te descubran.
          </p>
          <p className="font-bold text-lg bg-gradient-to-r from-cyan-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            Tu próximo show empieza aquí.
          </p>
        </Card>

        {/* Final CTA */}
        <Card className="p-8 text-center bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border-pink-500/30 mb-12">
          <h2 className="text-2xl font-bold mb-4">La Verdad</h2>
          <p className="text-muted-foreground mb-4">Tus seguidores ya:</p>
          <ul className="space-y-1 mb-6">
            <li>• Te piden rutinas</li>
            <li>• Quieren consejos</li>
            <li>• Quieren más de ti</li>
          </ul>
          <p className="font-medium mb-4">EXA hace que sea JUSTO.</p>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Los likes no pagan la renta.
            </p>
            <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              Tu personalidad sí.
            </p>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center mb-12">
          <ModelSignupDialogES>
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg px-10 h-14 rounded-full"
            >
              Aplicar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </ModelSignupDialogES>
          <p className="text-sm text-muted-foreground mt-3">
            Registro gratuito — aprobación en 24 horas
          </p>
        </div>
      </main>

      <footer className="border-t mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} EXA Models. Todos los derechos
          reservados.
        </p>
      </footer>
    </div>
  );
}

function StatCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
    </Card>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
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
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-lg mb-4">
        <span className="text-pink-500">{number}.</span> {title}
      </h3>
      {children}
    </Card>
  );
}

function IncomeItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function QuickStartItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
      <span className="text-xl">{emoji}</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}
