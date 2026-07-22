"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { ModelSignupForm } from "@/components/auth/ModelSignupForm";
import { useLocale, type Locale } from "@/i18n";
import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";

interface ModelSignupDialogProps {
  children: React.ReactNode;
  /**
   * Pin the dialog to one language regardless of the visitor's locale —
   * used on language-specific landing pages like /modelo.
   */
  forceLocale?: Locale;
}

/**
 * Thin dialog wrapper around the shared ModelSignupForm. Form state lives in
 * the form component, which Radix unmounts when the dialog closes — so the
 * form resets on close without any explicit bookkeeping.
 */
export function ModelSignupDialog({ children, forceLocale }: ModelSignupDialogProps) {
  const { locale: contextLocale } = useLocale();
  const locale = forceLocale ?? contextLocale;
  const s = locale === "es" ? es.signup : en.signup;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={80}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <DialogTitle className="text-xl">{s.title}</DialogTitle>
        </DialogHeader>

        <ModelSignupForm forceLocale={forceLocale} className="mt-4" />
      </DialogContent>
    </Dialog>
  );
}
