"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

interface FanSignupDialogProps {
  children: React.ReactNode;
}

export function FanSignupDialog({ children }: FanSignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Check if username is taken (across models, fans, brands)
    const { data: existingModel } = await (supabase.from("models") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingFan } = await (supabase.from("fans") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingBrand } = await (supabase.from("brands") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    if (existingModel || existingFan || existingBrand) {
      toast.error("This username is already taken");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Create actor record
      const { data: actor, error: actorError } = await (supabase
        .from("actors") as any)
        .insert({
          user_id: authData.user.id,
          type: "fan",
        })
        .select()
        .single();

      if (actorError) {
        console.error("Actor error:", actorError);
        throw actorError;
      }

      // Create fan profile
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error: fanError } = await (supabase
        .from("fans") as any)
        .insert({
          id: actor.id,
          user_id: authData.user.id,
          email: email.toLowerCase().trim(),
          username: cleanUsername,
          display_name: cleanUsername,
          coin_balance: 10, // Welcome bonus
        });

      if (fanError) {
        console.error("Fan error:", fanError);
        throw fanError;
      }

      // Record the welcome bonus transaction
      await (supabase.from("coin_transactions") as any).insert({
        actor_id: actor.id,
        amount: 10,
        action: "signup_bonus",
        metadata: { reason: "Welcome bonus for new fan signup" },
      });

      // Send our custom confirmation email via Resend (more reliable than Supabase SMTP)
      try {
        await fetch("/api/auth/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            displayName: cleanUsername,
            signupType: "fan",
          }),
        });
      } catch {
        // Non-blocking
      }

      setSubmitted(true);
      toast.success("Welcome to EXA! You got 10 free coins!");

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
      setSubmitted(false);
      setUsername("");
      setEmail("");
      setPassword("");
    }, 300);
  };

  const handleGoToModels = () => {
    window.location.href = "/models";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Welcome to EXA!</DialogTitle>
              <p className="text-muted-foreground mt-2">
                Your account is ready. You got 10 free coins!
              </p>
            </DialogHeader>
            <Button
              onClick={handleGoToModels}
              className="mt-6 bg-gradient-to-r from-pink-500 to-violet-500"
            >
              Browse Models
            </Button>
          </div>
        ) : (
          <>
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
              <DialogTitle className="text-xl">Fan Sign Up</DialogTitle>
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
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
