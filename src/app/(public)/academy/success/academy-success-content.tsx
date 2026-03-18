"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Award,
  BookOpen,
  Users,
} from "lucide-react";
export function AcademySuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("canvas-confetti").then(mod => {
      if (cancelled) return;
      const confetti = mod.default;
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#ec4899", "#8b5cf6", "#d946ef"] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#ec4899", "#8b5cf6", "#d946ef"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });

    const timer = setTimeout(() => { setLoading(false); }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            {loading ? (
              <div className="mx-auto p-4 rounded-full bg-muted mb-4">
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="mx-auto p-4 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            )}
            <CardTitle className="text-2xl">
              {loading ? "Processing..." : "Welcome to EXA Beauty Academy!"}
            </CardTitle>
            <CardDescription className="text-base">
              {loading
                ? "Please wait while we confirm your enrollment..."
                : "Your enrollment has been confirmed. You're in!"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!loading && (
              <>
                {/* Animated icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative p-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500">
                      <Award className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Next steps */}
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-5 w-5 text-pink-500 flex-shrink-0" />
                      <span>
                        Confirmation email with program details has been sent
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="h-5 w-5 text-violet-500 flex-shrink-0" />
                      <span>Orientation details and class schedule coming soon</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                      <span>You&apos;ll be invited to the student community group</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                    <p className="text-sm text-pink-200">
                      <strong>Get Ready!</strong> Your journey to becoming an EXA Certified
                      Runway Makeup Artist starts now. Check your email for next steps
                      and your recommended makeup kit list.
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Check your inbox (and spam folder) for your enrollment confirmation.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4">
                  <Button variant="outline" asChild>
                    <Link href="/academy">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Academy
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                  >
                    <Link href="/">Explore EXA Models</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
