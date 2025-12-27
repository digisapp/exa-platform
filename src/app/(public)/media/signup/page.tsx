"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

export default function MediaSignupPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: "",
    instagram: "",
    email: "",
    phone: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.email) {
        throw new Error("Please fill in name and email");
      }

      const { error } = await (supabase.from("media") as any).insert([
        {
          first_name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          instagram_url: formData.instagram || null,
          services_offered: formData.notes || null,
          is_approved: false,
          status: "pending",
          form_data: formData,
        },
      ]);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Application submitted!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <FloatingOrbs />
        <Card className="w-full max-w-md relative z-10 glass-card">
          <CardHeader className="text-center">
            <div className="text-5xl mb-4">📸</div>
            <CardTitle className="exa-gradient-text">Application Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground space-y-4">
            <p>We&apos;ll review your application and get back to you at <strong className="text-foreground">{formData.email}</strong></p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full exa-gradient-button">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative py-8 px-4">
      <FloatingOrbs />

      <div className="relative z-10 max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#00BFFF] hover:text-[#FF69B4] transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="glass-card">
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
            <CardTitle className="text-2xl exa-gradient-text">Media Application</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@yourhandle"
                  value={formData.instagram}
                  onChange={(e) => handleChange("instagram", e.target.value)}
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Why do you want to work with us?</Label>
                <Textarea
                  id="notes"
                  placeholder="Tell us about yourself and why you'd like to work with EXA..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  disabled={loading}
                  className="bg-background/50 min-h-[120px]"
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="w-full exa-gradient-button h-12 text-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
