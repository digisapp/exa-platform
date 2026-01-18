"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const type = searchParams.get("type") || "fan"; // "model" or "fan"
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResendEmail = async () => {
    if (!email || resending) return;

    setResending(true);
    try {
      // Use our custom Resend endpoint instead of Supabase's email
      const response = await fetch("/api/auth/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          signupType: type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send email");
      } else {
        setResent(true);
        toast.success("Confirmation email sent!");
      }
    } catch {
      toast.error("Failed to resend email");
    } finally {
      setResending(false);
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
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
            <Mail className="h-10 w-10 text-pink-500" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription className="text-base">
            We sent a confirmation link to{" "}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              "your email"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="text-sm font-medium">Next steps:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Click the confirmation link from EXA</li>
              <li>
                {type === "model"
                  ? "We'll review your application (24-48 hours)"
                  : "Start exploring models on EXA"
                }
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Can&apos;t find the email?</span>{" "}
              Check your spam folder, or click below to resend.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={resending || !email}
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resent ? (
              "Email Sent!"
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Confirmation Email
              </>
            )}
          </Button>

          <Link
            href="/signin"
            className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
