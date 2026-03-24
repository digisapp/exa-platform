"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function MediaSubmitPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    instagram_handle: "",
    media_company: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/media-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Submission Received!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your interest. Our team will review your information and get back to you soon.
            </p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-3">
            <Camera className="h-7 w-7 text-violet-400" />
          </div>
          <CardTitle className="text-2xl">Media Inquiry</CardTitle>
          <CardDescription>
            Photographers, press, bloggers, and media partners — submit your info and our team will be in touch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram_handle}
                  onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))}
                  placeholder="@handle"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Company / Publication</Label>
              <Input
                value={form.media_company}
                onChange={(e) => setForm((f) => ({ ...f, media_company: e.target.value }))}
                placeholder="Your company or publication name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Tell us about your work and how you'd like to collaborate..."
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
