"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, Instagram, DollarSign, Users, Sparkles } from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";
import { FormFieldError } from "@/components/ui/form-field-error";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!instagram && !tiktok) {
      errors.social = "Please provide at least one social media handle";
    }

    // Catch users who accidentally type their email in the social fields
    if (instagram && instagram.includes(".") && /\.(com|net|org|io|co)$/i.test(instagram.replace("@", ""))) {
      errors.instagram = "Please enter your Instagram username, not a website or email address";
    }
    if (tiktok && tiktok.includes(".") && /\.(com|net|org|io|co)$/i.test(tiktok.replace("@", ""))) {
      errors.tiktok = "Please enter your TikTok username, not a website or email address";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const name = displayName.trim() || instagram.replace("@", "").trim() || tiktok.replace("@", "").trim() || email.split("@")[0];

    setLoading(true);

    try {
      // Step 1: Create auth account (client-side, with user's chosen password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            signup_type: "model",
            display_name: name,
            instagram_username: instagram.replace("@", "").trim(),
            tiktok_username: tiktok.replace("@", "").trim(),
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

      // Step 2: Create application + auto-confirm via API
      const signupRes = await fetch("/api/auth/model-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email.toLowerCase().trim(),
          userId: authData.user.id,
          instagram_username: instagram.trim().replace("@", "") || null,
          tiktok_username: tiktok.trim().replace("@", "") || null,
        }),
      });

      if (!signupRes.ok) {
        const signupData = await signupRes.json();
        throw new Error(signupData.error || "Failed to create account");
      }

      // Step 3: Sign in directly (email is auto-confirmed by the API)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        toast.success("Account created! Please sign in.");
        window.location.href = "/signin";
        return;
      }

      // Step 4: Redirect to pending approval
      window.location.href = "/pending-approval";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>Become a Model</CardTitle>
          <CardDescription>
            Join EXA and start earning
          </CardDescription>
        </CardHeader>

        {/* Benefits */}
        <CardContent className="pb-2">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Earn Money</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Sparkles className="h-5 w-5 mx-auto mb-1 text-pink-500" />
              <p className="text-xs text-muted-foreground">Get Gigs</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 mx-auto mb-1 text-violet-500" />
              <p className="text-xs text-muted-foreground">Grow Fanbase</p>
            </div>
          </div>
        </CardContent>

        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name or stage name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
                  required
                  disabled={loading}
                  className="pr-10"
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormFieldError id="password-error" message={fieldErrors.password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => { const { confirmPassword: _, ...rest } = prev; return rest; }); }}
                  required
                  disabled={loading}
                  className="pr-10"
                  aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                  aria-invalid={!!fieldErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormFieldError id="confirm-password-error" message={fieldErrors.confirmPassword} />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Social Media (for verification)</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2 text-sm">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    placeholder="@yourhandle"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    disabled={loading}
                  />
                  <FormFieldError id="instagram-error" message={fieldErrors.instagram} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok" className="flex items-center gap-2 text-sm">
                    <TikTokIcon className="h-4 w-4" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok"
                    placeholder="@yourhandle"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    disabled={loading}
                  />
                  <FormFieldError id="tiktok-error" message={fieldErrors.tiktok} />
                </div>
              </div>
              <FormFieldError id="social-error" message={fieldErrors.social} />
              {!fieldErrors.social && (
                <p className="text-xs text-muted-foreground mt-2">
                  Provide at least one for verification
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Apply Now"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Not a model?{" "}
              <Link href="/fan/signup" className="text-pink-500 hover:underline">
                Sign up as a fan
              </Link>
            </p>
            <Link href="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
