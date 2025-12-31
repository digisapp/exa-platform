"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MessageCircle, Coins, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Check if user already has an account
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/signin");
          return;
        }

        // Use API to check existing profile (bypasses RLS issues)
        const response = await fetch("/api/auth/check-profile");
        const data = await response.json();

        if (data.hasProfile) {
          // Already has an account - redirect based on type
          if (data.type === "admin") {
            router.push("/admin");
          } else if (data.type === "model") {
            router.push("/dashboard");
          } else {
            router.push("/models");
          }
          return;
        }

        // Pre-fill display name from email
        if (user.email) {
          setDisplayName(user.email.split("@")[0]);
        }

        setCheckingExisting(false);
      } catch {
        setCheckingExisting(false);
      }
    };

    checkExistingProfile();
  }, [supabase, router]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/create-fan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      toast.success("Welcome to EXA! You got 10 free coins!");
      window.location.href = "/models";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      console.error("Account creation error:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for existing profile
  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <CardTitle>Welcome to EXA</CardTitle>
          <CardDescription>
            Complete your account setup to get started
          </CardDescription>
        </CardHeader>

        {/* Benefits */}
        <CardContent className="pb-4">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <MessageCircle className="h-5 w-5 mx-auto mb-1 text-pink-500" />
              <p className="text-xs text-muted-foreground">Direct Messages</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Coins className="h-5 w-5 mx-auto mb-1 text-violet-500" />
              <p className="text-xs text-muted-foreground">10 Free Coins</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-xs text-muted-foreground">Support Models</p>
            </div>
          </div>
        </CardContent>

        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This is how others will see you on EXA
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || !displayName.trim()}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Are you a model?{" "}
            <Link href="/apply" className="text-pink-500 hover:underline">
              Apply to become verified
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
