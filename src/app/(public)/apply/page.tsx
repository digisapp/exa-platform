"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Instagram, CheckCircle, Clock, XCircle } from "lucide-react";

export default function ApplyPage() {
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{
    status: string;
    created_at: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setChecking(false);
        return;
      }

      setIsLoggedIn(true);

      // Check if user is already a model
      const { data: model } = await (supabase.from("models") as any)
        .select("id, is_approved")
        .eq("user_id", user.id)
        .single();

      if (model?.is_approved) {
        router.push("/dashboard");
        return;
      }

      // Check for existing application
      const { data: application } = await (supabase.from("model_applications") as any)
        .select("status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (application) {
        setExistingApplication(application);
      }

      setChecking(false);
    };

    checkStatus();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instagram && !tiktok) {
      toast.error("Please provide at least one social media handle");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram_username: instagram.replace("@", "").trim(),
          tiktok_username: tiktok.replace("@", "").trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      toast.success("Application submitted! We'll review it soon.");
      setExistingApplication({ status: "pending", created_at: new Date().toISOString() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
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
              Sign in or create an account to apply
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full exa-gradient-button">
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">Create Account</Link>
            </Button>
            <Link href="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Has existing application
  if (existingApplication) {
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
            {existingApplication.status === "pending" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
                <CardTitle>Application Pending</CardTitle>
                <CardDescription>
                  Your application is being reviewed. We&apos;ll notify you once it&apos;s approved!
                </CardDescription>
              </>
            )}
            {existingApplication.status === "approved" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle>Application Approved!</CardTitle>
                <CardDescription>
                  Congratulations! You&apos;re now a verified model.
                </CardDescription>
              </>
            )}
            {existingApplication.status === "rejected" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <CardTitle>Application Not Approved</CardTitle>
                <CardDescription>
                  Unfortunately, your application wasn&apos;t approved at this time.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Submitted {new Date(existingApplication.created_at).toLocaleDateString()}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {existingApplication.status === "approved" ? (
              <Button asChild className="w-full exa-gradient-button">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/models">Browse Models</Link>
              </Button>
            )}
            <Link href="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Application form
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
          <CardTitle>Become a Verified Model</CardTitle>
          <CardDescription>
            Share your social media so we can verify your profile
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram Username
              </Label>
              <Input
                id="instagram"
                placeholder="@yourhandle"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok" className="flex items-center gap-2">
                <span className="text-sm font-bold">T</span>
                TikTok Username
              </Label>
              <Input
                id="tiktok"
                placeholder="@yourhandle"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What happens next?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>We&apos;ll review your social profiles</li>
                <li>Approval typically takes 24-48 hours</li>
                <li>Once approved, you&apos;ll get full model access</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12 text-base"
              disabled={loading || (!instagram && !tiktok)}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
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
