"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FanSignupDialogProps {
  children: React.ReactNode;
  /** Where to land after a successful signup (e.g. the model profile that prompted it). Defaults to /dashboard. */
  redirectTo?: string;
  /** Model that drove this signup — takes precedence over the localStorage referrer set by profile visits. */
  referrerModelId?: string | null;
  /** Personalize the dialog around the model who prompted it — the visitor
      clicked because of HER, so keep her on screen at the commitment moment. */
  modelName?: string | null;
  modelPhotoUrl?: string | null;
  /** One-line promise under the title (what signing up unlocks). Only shown with modelName. */
  prompt?: string;
  /** Which gate triggered this signup (e.g. "social_gate") — stored in auth
      user_metadata as signup_source for conversion measurement. */
  source?: string;
}

export function FanSignupDialog({
  children,
  redirectTo,
  referrerModelId: referrerModelIdProp,
  modelName,
  modelPhotoUrl,
  prompt,
  source,
}: FanSignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Please choose a username");
      return;
    }

    // Validate username format
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (cleanUsername.length > 20) {
      toast.error("Username must be 20 characters or less");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!ageConfirmed) {
      toast.error("Please confirm you are at least 18 years old");
      return;
    }

    setLoading(true);

    // Referrer: explicit prop (e.g. homepage carousel card) wins over the
    // localStorage value set when viewing a model profile
    let referrerModelId: string | null = referrerModelIdProp ?? null;
    if (!referrerModelId) {
      try {
        referrerModelId = localStorage.getItem("signup_referrer_model_id");
      } catch {
        // localStorage might be unavailable
      }
    }

    try {
      // Step 1: Create auth account (client-side, with user's chosen password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            signup_type: "fan",
            display_name: cleanUsername,
            referrer_model_id: referrerModelId,
            signup_source: source ?? null,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
          throw new Error("This email is already registered. Please sign in instead.");
        }
        if (authError.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please wait a moment and try again.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Check for duplicate signup (empty identities = existing unconfirmed user)
      if (authData.user.identities && authData.user.identities.length === 0) {
        throw new Error("This email is already registered. Please sign in instead.");
      }

      // Step 2: Auto-confirm email (no verification step for fans)
      await fetch("/api/auth/auto-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authData.user.id }),
      });

      // Step 3: Sign in directly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        toast.success("Account created! Please sign in.");
        window.location.href = redirectTo
          ? `/signin?redirect=${encodeURIComponent(redirectTo)}`
          : "/signin";
        return;
      }

      // Step 4: Create fan profile (now authenticated)
      await fetch("/api/auth/create-fan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: cleanUsername,
          referrerModelId,
          ageAttested: ageConfirmed,
        }),
      });

      toast.success("Welcome to EXA!");
      // Deliver on the promise that prompted the signup (e.g. "Sign Up to
      // View Profile" → that model's profile), not a generic dashboard
      window.location.href = redirectTo || "/dashboard";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setUsername("");
      setEmail("");
      setPassword("");
      setAgeConfirmed(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          {modelName ? (
            <>
              {/* The model who prompted this signup stays on screen at the
                  commitment moment — a generic logo converts worse than her face */}
              <div className="mx-auto mb-2 w-16 h-16 rounded-full overflow-hidden ring-2 ring-pink-500/60 shadow-[0_0_18px_rgba(236,72,153,0.4)]">
                {modelPhotoUrl ? (
                  <Image
                    src={modelPhotoUrl}
                    alt={modelName}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 flex items-center justify-center text-xl font-bold text-white">
                    {modelName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <DialogTitle className="text-xl">Join @{modelName} on EXA</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {prompt || `Free account — follow @${modelName} and unlock her socials and exclusive content.`}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-2">
                <Image
                  src="/exa-logo-white.png"
                  alt="EXA"
                  width={80}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <DialogTitle className="text-xl">Fan Sign Up</DialogTitle>
            </>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fanUsername">Username</Label>
            <Input
              id="fanUsername"
              placeholder="Choose a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              disabled={loading}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fanEmail">Email</Label>
            <Input
              id="fanEmail"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fanPassword">Password</Label>
            <div className="relative">
              <Input
                id="fanPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <label
            htmlFor="fanAgeConfirm"
            className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none"
          >
            <input
              id="fanAgeConfirm"
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              disabled={loading}
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 accent-pink-500"
            />
            <span>
              I confirm I am at least 18 years old and agree to the{" "}
              <Link href="/terms" target="_blank" className="text-pink-500 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-pink-500 hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <Button
            type="submit"
            className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
