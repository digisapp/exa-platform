import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmed! | EXA Models × Miami Swim Week 2026",
};

const PACKAGE_NAMES: Record<string, string> = {
  "opening-show": "Opening Show — May 26, 2026",
  "day-2": "Day 2 Show — May 27, 2026",
  "day-3": "Day 3 Show — May 28, 2026",
  "daytime-show": "Daytime Show — Thursday, May 28, 2026",
};

interface Props {
  searchParams: Promise<{ pkg?: string; type?: string }>;
}

export default async function MswBrandSuccessPage({ searchParams }: Props) {
  const { pkg, type } = await searchParams;
  const packageName = (pkg && PACKAGE_NAMES[pkg]) || "Your Show";
  const isInstallment = type === "installment";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 py-24 flex flex-col items-center text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center mb-8 shadow-xl shadow-pink-500/10">
          <CheckCircle2 className="h-12 w-12 text-pink-500" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">You&apos;re booked! 🎉</h1>

        <p className="text-xl text-muted-foreground mb-2">
          <strong className="text-foreground">{packageName}</strong>
        </p>

        <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
          {isInstallment
            ? "Your first installment has been processed. The remaining 2 payments will be charged monthly. You're all set!"
            : "Your payment has been processed and your show slot is confirmed. You'll receive a confirmation email shortly."}
        </p>

        <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 mb-8 max-w-md w-full">
          <p className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-2">What happens next</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our partnerships team will reach out within <strong className="text-foreground">24 hours</strong> to discuss your collection, model selection, and show details. We&apos;re excited to work with you!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl px-8 py-6 text-base shadow-lg shadow-pink-500/20"
          >
            <a href="mailto:partnerships@examodels.com">
              <Mail className="mr-2 h-5 w-5" />
              Email Our Team
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-xl px-8 py-6 text-base border-white/15">
            <Link href="/shows/miami-swim-week-2026">View the Show Page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
