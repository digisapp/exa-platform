import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { EntryForm } from "@/components/swimcrown/EntryForm";
import { Crown } from "lucide-react";

export const metadata: Metadata = {
  title: "Enter SwimCrown | EXA",
  description:
    "Enter the SwimCrown global swim model competition. Choose your tier and compete for the crown at Miami Swim Week 2026.",
  alternates: {
    canonical: "https://www.examodels.com/swimcrown/enter",
  },
  openGraph: {
    title: "Enter SwimCrown | EXA",
    description:
      "Enter the SwimCrown global swim model competition. Choose your tier and compete for the crown at Miami Swim Week 2026.",
    url: "https://www.examodels.com/swimcrown/enter",
    type: "website",
    siteName: "EXA Models",
  },
};

export default function SwimCrownEntryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f1628] to-[#0a0a1a]">
      <Navbar user={null} actorType={null} />

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="relative inline-flex items-center justify-center gap-2">
            <Crown className="h-7 w-7 text-amber-400" />
            <span className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-rose-400 to-pink-400 bg-clip-text text-transparent">
              Enter SwimCrown
            </span>
          </h1>
          <p className="mt-2 text-white">
            Fill in your details, pick your tier, and you&apos;re in!
          </p>
        </div>

        <EntryForm />
      </main>
    </div>
  );
}
