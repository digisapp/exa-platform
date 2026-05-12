"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Instagram, LogOut } from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";

const t = {
  en: {
    title: "Application Pending",
    subtitle: "We're reviewing your profile! You'll get full access once approved.",
    yourApp: "Your application:",
    submitted: "Submitted",
    whatsNext: "What happens next?",
    step1: "We verify your social profiles",
    step2: "Approval typically takes 24-48 hours",
    step3: "We'll email you when you're approved",
    whileYouWait: "While you wait, you can:",
    browseModels: "Browse Models",
    browseDesc: "See who's on EXA",
    learnExa: "Learn EXA",
    learnDesc: "How it works",
    signOut: "Sign out",
  },
  es: {
    title: "Solicitud Pendiente",
    subtitle: "¡Estamos revisando tu perfil! Tendrás acceso completo una vez aprobada.",
    yourApp: "Tu solicitud:",
    submitted: "Enviada el",
    whatsNext: "¿Qué pasa después?",
    step1: "Verificamos tus redes sociales",
    step2: "La aprobación toma 24-48 horas",
    step3: "Te enviaremos un correo cuando seas aprobada",
    whileYouWait: "Mientras esperas, puedes:",
    browseModels: "Ver Modelos",
    browseDesc: "Mira quién está en EXA",
    learnExa: "Conoce EXA",
    learnDesc: "Cómo funciona",
    signOut: "Cerrar sesión",
  },
};

function getLanguage(): "en" | "es" {
  if (typeof window === "undefined") return "en";
  const lang = navigator.language || "";
  return lang.startsWith("es") ? "es" : "en";
}

export type PendingApplication = {
  instagram_username?: string | null;
  tiktok_username?: string | null;
  created_at?: string | null;
};

export function PendingApprovalView({ application }: { application: PendingApplication | null }) {
  const [lang, setLang] = useState<"en" | "es">("en");
  const supabase = createClient();

  useEffect(() => {
    setLang(getLanguage());

    // Safety net: if the server-side guard missed (e.g. cached response, stale session),
    // re-check approval status client-side and redirect away if approved.
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: model } = await (supabase
        .from("models")
        .select("is_approved")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (!cancelled && model?.is_approved) {
        window.location.href = "/dashboard";
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const s = t[lang];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={100}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">{s.title}</CardTitle>
          <CardDescription className="text-base">
            {s.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {application && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm text-muted-foreground">{s.yourApp}</p>
              {application.instagram_username && (
                <div className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  <span>@{application.instagram_username}</span>
                </div>
              )}
              {application.tiktok_username && (
                <div className="flex items-center gap-2 text-sm">
                  <TikTokIcon className="h-4 w-4" />
                  <span>@{application.tiktok_username}</span>
                </div>
              )}
              {application.created_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  {s.submitted} {new Date(application.created_at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US")}
                </p>
              )}
            </div>
          )}

          <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <p className="text-sm font-medium mb-2">{s.whatsNext}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {s.step1}</li>
              <li>• {s.step2}</li>
              <li>• {s.step3}</li>
            </ul>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>{s.whileYouWait}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/models" className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium">{s.browseModels}</span>
                <span className="text-xs text-muted-foreground">{s.browseDesc}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href={lang === "es" ? "/modelo" : "/for-models"} className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium">{s.learnExa}</span>
                <span className="text-xs text-muted-foreground">{s.learnDesc}</span>
              </Link>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {s.signOut}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
