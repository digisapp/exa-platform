"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Instagram, LogOut, ArrowRight } from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";

export default function PendingApprovalPage() {
  const [applicationData, setApplicationData] = useState<{
    instagram_username?: string;
    tiktok_username?: string;
    created_at?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/signin";
        return;
      }

      // Check if user is already approved
      const { data: model } = await (supabase
        .from("models")
        .select("is_approved")
        .eq("user_id", user.id)
        .single() as any);

      if (model?.is_approved) {
        window.location.href = "/dashboard";
        return;
      }

      // Get application data
      const { data: application } = await (supabase
        .from("model_applications")
        .select("instagram_username, tiktok_username, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single() as any);

      setApplicationData(application);
      setLoading(false);
    };

    checkStatus();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Application Pending</CardTitle>
          <CardDescription className="text-base">
            We&apos;re reviewing your profile! You&apos;ll get full access once approved.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {applicationData && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm text-muted-foreground">Your application:</p>
              {applicationData.instagram_username && (
                <div className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  <span>@{applicationData.instagram_username}</span>
                </div>
              )}
              {applicationData.tiktok_username && (
                <div className="flex items-center gap-2 text-sm">
                  <TikTokIcon className="h-4 w-4" />
                  <span>@{applicationData.tiktok_username}</span>
                </div>
              )}
              {applicationData.created_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Submitted {new Date(applicationData.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <p className="text-sm font-medium mb-2">What happens next?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• We verify your social profiles</li>
              <li>• Approval typically takes 24-48 hours</li>
              <li>• We&apos;ll email you when you&apos;re approved</li>
            </ul>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>While you wait, you can:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/models" className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium">Browse Models</span>
                <span className="text-xs text-muted-foreground">See who&apos;s on EXA</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/for-models" className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium">Learn EXA</span>
                <span className="text-xs text-muted-foreground">How it works</span>
              </Link>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
