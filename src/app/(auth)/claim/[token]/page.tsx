"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

interface ModelData {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [model, setModel] = useState<ModelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Load model data
  useEffect(() => {
    async function loadModel() {
      const { data, error } = await (supabase
        .from("models") as any)
        .select("id, email, username, first_name, last_name, profile_photo_url, claimed_at, user_id")
        .eq("invite_token", token)
        .single();

      if (error || !data) {
        setError("Invalid or expired invite link");
        setLoading(false);
        return;
      }

      if (data.claimed_at || data.user_id) {
        setError("This profile has already been claimed");
        setLoading(false);
        return;
      }

      setModel(data);
      setUsername(data.username || "");
      setLoading(false);
    }

    loadModel();
  }, [token, supabase]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === model?.username) {
      setUsernameAvailable(username === model?.username ? true : null);
      setUsernameError(null);
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false);
      setUsernameError("Only letters, numbers, and underscores allowed");
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(false);
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameError(null);

      const { data } = await (supabase
        .from("models") as any)
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", model?.id)
        .single();

      setCheckingUsername(false);
      setUsernameAvailable(!data);
      if (data) {
        setUsernameError("Username is taken");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, model, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!model) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (usernameAvailable === false) {
      toast.error("Please choose an available username");
      return;
    }

    setSubmitting(true);

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: model.email,
        password,
        options: {
          data: {
            model_id: model.id,
          },
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered")) {
          toast.error("An account with this email already exists. Try signing in instead.");
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Update model with user_id, username, and claimed_at
      const { error: updateError } = await (supabase
        .from("models") as any)
        .update({
          user_id: authData.user.id,
          username: username.toLowerCase(),
          claimed_at: new Date().toISOString(),
        })
        .eq("id", model.id);

      if (updateError) throw updateError;

      // Create actor record
      const { error: actorError } = await (supabase
        .from("actors") as any)
        .insert({
          user_id: authData.user.id,
          type: "model",
        });

      if (actorError) {
        console.error("Actor error:", actorError);
        // Don't fail - actor might already exist
      }

      // Send our custom confirmation email via Resend (more reliable than Supabase SMTP)
      try {
        await fetch("/api/auth/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: model.email,
            displayName: model.first_name || username,
            signupType: "model",
          }),
        });
      } catch {
        // Non-blocking
      }

      toast.success("Profile claimed! Welcome to EXA!");

      // Sign in the user
      await supabase.auth.signInWithPassword({
        email: model.email,
        password,
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Claim error:", error);
      toast.error(error.message || "Failed to claim profile");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <FloatingOrbs />
        <Card className="w-full max-w-md relative z-10 glass-card">
          <CardHeader className="text-center">
            <div className="text-5xl mb-4">😔</div>
            <CardTitle className="text-red-500">{error}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              If you believe this is a mistake, please contact support.
            </p>
            <Button asChild>
              <Link href="/signin">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative py-8 px-4">
      <FloatingOrbs />

      <div className="relative z-10 max-w-md mx-auto">
        <Card className="glass-card">
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

            {/* Profile Preview */}
            {model?.profile_photo_url ? (
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-pink-500/50 mb-4">
                <Image
                  src={model.profile_photo_url}
                  alt={model.first_name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-3xl text-white font-bold mb-4">
                {model?.first_name?.charAt(0) || "?"}
              </div>
            )}

            <CardTitle className="text-2xl">
              Welcome, {model?.first_name || "Model"}!
            </CardTitle>
            <CardDescription>
              Claim your EXA profile to get started
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={model?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Username (editable) */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pl-8 pr-10"
                    placeholder="yourname"
                    disabled={submitting}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingUsername && usernameAvailable === true && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {usernameError && (
                  <p className="text-xs text-red-500">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  examodels.com/{username || "yourname"}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder="At least 8 characters"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={submitting}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords don&apos;t match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full exa-gradient-button h-12 text-lg"
                disabled={submitting || !usernameAvailable || !password || password !== confirmPassword}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim My Profile"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By claiming your profile, you agree to our{" "}
                <Link href="/terms" className="text-pink-500 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-pink-500 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </CardContent>
          </form>
        </Card>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="text-pink-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
