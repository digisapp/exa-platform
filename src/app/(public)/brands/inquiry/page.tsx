"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Building2, Globe, Target, Instagram } from "lucide-react";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

const INDUSTRIES = [
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Jewelry & Accessories",
  "Swimwear",
  "Lifestyle",
  "Hospitality",
  "Events & Entertainment",
  "Food & Beverage",
  "Health & Wellness",
  "Technology",
  "Other"
];

const CAMPAIGN_TYPES = [
  { value: "fashion_show", label: "Fashion Shows / Runway" },
  { value: "photoshoot", label: "Photoshoots" },
  { value: "events", label: "Brand Events / Activations" },
  { value: "social_media", label: "Social Media / Influencer Marketing" },
  { value: "tiktok_live", label: "TikTok Shop / Live Shopping" },
  { value: "tech_app", label: "Tech / App Promotions" },
  { value: "ambassador", label: "Brand Ambassador Program" },
  { value: "content_creation", label: "Content Creation" },
  { value: "other", label: "Other" },
];

const BUDGET_RANGES = [
  { value: "under_5k", label: "Under $5,000" },
  { value: "5k_15k", label: "$5,000 - $15,000" },
  { value: "15k_50k", label: "$15,000 - $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "over_100k", label: "Over $100,000" },
  { value: "discuss", label: "Prefer to Discuss" },
];

export default function BrandInquiryPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    instagram: "",
    industry: "",
    partnership_type: "",
    budget_range: "",
    message: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.company_name || !formData.contact_name || !formData.email) {
        throw new Error("Please fill in all required fields");
      }

      // Insert into brands table
      const { error } = await (supabase.from("brands") as any).insert([
        {
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          email: formData.email,
          website: formData.website || null,
          bio: formData.message || null,
          is_verified: false,
          subscription_tier: "inquiry",
          form_data: {
            ...formData,
            submitted_at: new Date().toISOString(),
          },
        },
      ]);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Inquiry submitted successfully!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit inquiry";
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
            <div className="text-5xl mb-4">🤝</div>
            <CardTitle className="exa-gradient-text">Inquiry Received!</CardTitle>
            <CardDescription>
              Thank you for your interest in working with EXA.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground space-y-4">
            <p>Our team will review your inquiry and get back to you within 24-48 hours.</p>
            <p>You&apos;ll receive a response at <strong className="text-foreground">{formData.email}</strong></p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
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

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Back Link */}
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
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-[#00BFFF]" />
              <CardTitle className="text-2xl exa-gradient-text">Brand Inquiry</CardTitle>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#FF69B4]">01</span>
                  Company Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Name *</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => handleChange("contact_name", e.target.value)}
                      required
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={loading}
                    className="bg-background/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#00BFFF]" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={formData.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-[#FF69B4]" />
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      placeholder="@yourbrand"
                      value={formData.instagram}
                      onChange={(e) => handleChange("instagram", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(v) => handleChange("industry", v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#00BFFF]">02</span>
                  Campaign Details
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="partnership_type" className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#FF69B4]" />
                    Type of Campaign
                  </Label>
                  <Select
                    value={formData.partnership_type}
                    onValueChange={(v) => handleChange("partnership_type", v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_range">Budget Range</Label>
                  <Select
                    value={formData.budget_range}
                    onValueChange={(v) => handleChange("budget_range", v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Tell Us About Your Goals</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe what you're looking to achieve with this partnership. What kind of models are you looking for? Any specific events or campaigns in mind?"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    disabled={loading}
                    className="bg-background/50 min-h-[120px]"
                  />
                </div>
              </div>

            </CardContent>

            <CardFooter className="flex flex-col gap-4">
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
                  "Submit Inquiry"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to our{" "}
                <Link href="/terms" className="text-[#00BFFF] hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#00BFFF] hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
