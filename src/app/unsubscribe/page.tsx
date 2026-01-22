"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function processUnsubscribe() {
      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        const response = await fetch("/api/email/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setEmail(data.email);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    processUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Preferences</CardTitle>
          <CardDescription>Manage your email subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Processing your request...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-lg">Successfully Unsubscribed</p>
                <p className="text-muted-foreground mt-2">
                  {email ? `${email} has been` : "You have been"} unsubscribed from our marketing emails.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <p className="font-semibold text-lg">Something went wrong</p>
                <p className="text-muted-foreground mt-2">
                  We couldn&apos;t process your unsubscribe request. The link may have expired or is invalid.
                </p>
              </div>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-12 w-12 text-yellow-500" />
              <div className="text-center">
                <p className="font-semibold text-lg">Invalid Link</p>
                <p className="text-muted-foreground mt-2">
                  This unsubscribe link appears to be invalid or malformed.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Link href="/">
              <Button variant="outline">Return to Homepage</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
