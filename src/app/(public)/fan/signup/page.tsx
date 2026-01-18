"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, MessageCircle, Coins, Heart } from "lucide-react";

export default function FanSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Check if they already have a profile
          const response = await fetch("/api/auth/check-profile");
          const data = await response.json();

          if (data.hasProfile) {
            // Already has profile - redirect based on type
            if (data.type === "admin") {
              window.location.href = "/admin";
            } else if (data.type === "model") {
              window.location.href = "/dashboard";
            } else {
              window.location.href = "/models";
            }
            return;
          }

          // Authenticated but no profile - show simplified form
          setIsAuthenticated(true);
          setUserEmail(user.email || null);
          setDisplayName(user.email?.split("@")[0] || "");
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get referrer model ID from localStorage (set when viewing a model profile)
    let referrerModelId: string | null = null;
    try {
      referrerModelId = localStorage.getItem("signup_referrer_model_id");
    } catch {
      // localStorage might be unavailable
    }

    try {
      if (isAuthenticated) {
        // Already authenticated - just create the profile
        const response = await fetch("/api/auth/create-fan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            referrerModelId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create profile");
        }

        toast.success("Welcome to EXA! You got 10 free coins!");
        window.location.href = "/models";
      } else {
        // New user - create auth account first
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              signup_type: "fan",
              display_name: displayName.trim() || email.split("@")[0],
              referrer_model_id: referrerModelId,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Check if user already exists (identities will be empty for existing unconfirmed users)
          if (authData.user.identities && authData.user.identities.length === 0) {
            throw new Error("This email is already registered. Please sign in or check your email for a confirmation link.");
          }

          // Redirect to email confirmation page
          window.location.href = `/confirm-email?email=${encodeURIComponent(email)}&type=fan`;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking auth
  if (checkingAuth) {
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
          <CardTitle>
            {isAuthenticated ? "Complete Your Profile" : "Join as a Fan"}
          </CardTitle>
          <CardDescription>
            {isAuthenticated
              ? "Just one more step to get started"
              : "Connect with your favorite models on EXA"}
          </CardDescription>
        </CardHeader>

        {/* Benefits */}
        <CardContent className="pb-2">
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

        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>

            {!isAuthenticated && (
              <>
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
                    autoComplete="email"
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
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
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
              </>
            )}

            {isAuthenticated && userEmail && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Signed in as <span className="font-medium text-foreground">{userEmail}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAuthenticated ? "Creating profile..." : "Creating account..."}
                </>
              ) : (
                isAuthenticated ? "Complete Setup" : "Create Fan Account"
              )}
            </Button>

            {!isAuthenticated && (
              <>
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/signin" className="text-primary hover:underline font-medium">
                    Sign In
                  </Link>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Want to join as a model?{" "}
                  <Link href="/signup" className="text-pink-500 hover:underline font-medium">
                    Model signup
                  </Link>
                </div>
              </>
            )}

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
