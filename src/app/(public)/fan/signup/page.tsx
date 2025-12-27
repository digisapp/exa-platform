"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create actor record
        const { data: actor, error: actorError } = await (supabase
          .from("actors") as any)
          .insert({
            user_id: authData.user.id,
            type: "fan",
          })
          .select()
          .single();

        if (actorError) throw actorError;

        // Create fan profile
        const { error: fanError } = await (supabase
          .from("fans") as any)
          .insert({
            id: actor.id,
            user_id: authData.user.id,
            email: email,
            display_name: displayName || email.split("@")[0],
            coin_balance: 10, // Welcome bonus!
          });

        if (fanError) throw fanError;

        // Record the welcome bonus transaction
        await (supabase.from("coin_transactions") as any).insert({
          actor_id: actor.id,
          amount: 10,
          action: "signup_bonus",
          metadata: { reason: "Welcome bonus for new fan signup" },
        });

        toast.success("Welcome to EXA! You got 10 free coins!");
        window.location.href = "/models";
      }
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
          <CardTitle>Join as a Fan</CardTitle>
          <CardDescription>
            Connect with your favorite models on EXA
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
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
                  Creating account...
                </>
              ) : (
                "Create Fan Account"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Want to join as a model?{" "}
              <Link href="/signup" className="text-pink-500 hover:underline font-medium">
                Model signup
              </Link>
            </div>
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
