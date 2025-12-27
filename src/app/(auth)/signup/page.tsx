"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Check } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?signup=true`,
        },
      });

      if (error) throw error;

      setSent(true);
      toast.success("Check your email to complete signup!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send signup link";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-5xl mb-4">✨</div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We sent a signup link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Click the link in your email to create your account and start building your profile.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button variant="ghost" onClick={() => setSent(false)} className="w-full">
              Use a different email
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent mb-4 inline-block">
            EXA
          </Link>
          <CardTitle>Join EXA</CardTitle>
          <CardDescription>
            Create your model profile and start your journey
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-6">
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

            {/* Benefits */}
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium">What you&apos;ll get:</p>
              {[
                "Personal model profile & portfolio",
                "Access to shows & experiences",
                "Points & leveling system",
                "Direct brand connections",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  {benefit}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 pt-6">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
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
