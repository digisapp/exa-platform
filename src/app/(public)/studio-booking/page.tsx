import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Camera,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EXA Studio | Book Free Studio Sessions",
  description:
    "Book free 1-hour studio sessions for your photoshoots and content creation. Professional lighting, backdrops, and sets — available to EXA models.",
  openGraph: {
    title: "EXA Studio | Book Free Studio Sessions",
    description:
      "Book free 1-hour studio sessions for your photoshoots and content creation. Professional lighting, backdrops, and sets — available to EXA models.",
  },
};

const steps = [
  {
    icon: UserPlus,
    title: "Sign up as a model",
    description: "Create your EXA profile to get access to studio bookings.",
  },
  {
    icon: CalendarCheck,
    title: "Pick an available slot",
    description: "Browse the calendar and reserve a 1-hour block that works for you.",
  },
  {
    icon: Camera,
    title: "Show up and shoot",
    description: "Arrive at the studio, set up, and create amazing content.",
  },
];

export default function StudioBookingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 md:px-8 py-12 max-w-4xl mx-auto">
        {/* Hero */}
        <section className="text-center py-16 md:py-24">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              EXA Studio
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Book free 1-hour studio sessions for your photoshoots and content
            creation
          </p>
        </section>

        {/* How It Works */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center relative">
                  <step.icon className="h-6 w-6 text-teal-400" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-16">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-lg px-8 py-6"
          >
            <Link href="/studio">Book Studio Time</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
