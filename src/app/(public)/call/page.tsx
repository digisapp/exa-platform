"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Instagram,
  User,
  Mail,
  MessageSquare,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function CallRequestForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "website";
  const sourceDetail = searchParams.get("ref") || searchParams.get("campaign") || null;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instagram_handle: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/call-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source,
          source_detail: sourceDetail,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success("Request submitted!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Request Received!</h1>
          <p className="text-muted-foreground mb-6">
            Thanks for reaching out! Our team will call you soon.
          </p>
          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Explore EXA
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/models">
              <Button variant="outline" className="w-full">
                Browse Models
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <Image
            src="/exa-logo.png"
            alt="EXA"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
        </Link>
      </div>

      <Card className="border-pink-500/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            <CardTitle>Request a Call</CardTitle>
          </div>
          <CardDescription>
            Interested in joining EXA? Let&apos;s chat! Fill out the form and we&apos;ll call you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Your Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                Instagram Handle
              </label>
              <Input
                value={form.instagram_handle}
                onChange={(e) => setForm({ ...form, instagram_handle: e.target.value.replace("@", "") })}
                placeholder="yourhandle"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number *
              </label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email (optional)
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Anything you&apos;d like to discuss? (optional)
              </label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us a bit about yourself or what you're interested in..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Request Call
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By submitting, you agree to receive a call from EXA Models.
          </p>
        </CardContent>
      </Card>

      {/* Already have an account */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already an EXA model?{" "}
        <Link href="/login" className="text-pink-500 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full animate-pulse" />
      </div>
      <Card className="border-pink-500/20">
        <CardContent className="pt-8 pb-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CallRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-cyan-500/5">
      <Suspense fallback={<LoadingFallback />}>
        <CallRequestForm />
      </Suspense>
    </div>
  );
}
