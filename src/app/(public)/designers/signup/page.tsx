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
import { Loader2, ArrowLeft, Palette, Check, Instagram, Globe, Briefcase } from "lucide-react";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const SPECIALIZATIONS = [
  "Haute Couture",
  "Ready-to-Wear",
  "Swimwear",
  "Streetwear",
  "Evening Wear",
  "Bridal",
  "Sustainable Fashion",
  "Accessories",
  "Jewelry",
  "Footwear",
  "Other"
];

const EXPERIENCE_LEVELS = [
  { value: "0-2", label: "0-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "10+", label: "10+ years" },
];

export default function DesignerSignupPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    brand_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "USA",
    website_url: "",
    instagram_url: "",
    instagram_followers: "",
    portfolio_url: "",
    years_experience: "",
    specialization: "",
    previous_shows: "",
    designer_statement: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.brand_name) {
        throw new Error("Please fill in all required fields");
      }

      // Insert into designers table
      const { error } = await (supabase.from("designers") as any).insert([
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          brand_name: formData.brand_name,
          email: formData.email,
          phone: formData.phone || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || "USA",
          website_url: formData.website_url || null,
          instagram_url: formData.instagram_url || null,
          instagram_followers: formData.instagram_followers ? parseInt(formData.instagram_followers) : null,
          portfolio_url: formData.portfolio_url || null,
          years_experience: formData.years_experience || null,
          specialization: formData.specialization || null,
          previous_shows: formData.previous_shows || null,
          designer_statement: formData.designer_statement || null,
          is_approved: false,
          status: "pending",
          form_data: formData,
        },
      ]);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit application";
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
            <div className="text-5xl mb-4">🎨</div>
            <CardTitle className="exa-gradient-text">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for applying to join EXA as a designer.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground space-y-4">
            <p>We&apos;ve received your application and will review it shortly.</p>
            <p>You&apos;ll receive an email at <strong className="text-foreground">{formData.email}</strong> once your application has been reviewed.</p>
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <Palette className="h-6 w-6 text-[#FF69B4]" />
              <CardTitle className="text-2xl exa-gradient-text">Designer Application</CardTitle>
            </div>
            <CardDescription>
              Join EXA to showcase your collections and connect with top models
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#FF69B4]">01</span>
                  Personal Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      required
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      required
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
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
              </div>

              {/* Brand Information */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#00BFFF]">02</span>
                  Brand Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="brand_name">Brand Name *</Label>
                  <Input
                    id="brand_name"
                    value={formData.brand_name}
                    onChange={(e) => handleChange("brand_name", e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => handleChange("state", v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Select
                      value={formData.specialization}
                      onValueChange={(v) => handleChange("specialization", v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALIZATIONS.map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Select
                      value={formData.years_experience}
                      onValueChange={(v) => handleChange("years_experience", v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Online Presence */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#FF00FF]">03</span>
                  Online Presence
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#00BFFF]" />
                    Website URL
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    placeholder="https://yourbrand.com"
                    value={formData.website_url}
                    onChange={(e) => handleChange("website_url", e.target.value)}
                    disabled={loading}
                    className="bg-background/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram_url" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-[#FF69B4]" />
                      Instagram URL
                    </Label>
                    <Input
                      id="instagram_url"
                      type="url"
                      placeholder="https://instagram.com/yourbrand"
                      value={formData.instagram_url}
                      onChange={(e) => handleChange("instagram_url", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram_followers">Instagram Followers</Label>
                    <Input
                      id="instagram_followers"
                      type="number"
                      placeholder="e.g., 10000"
                      value={formData.instagram_followers}
                      onChange={(e) => handleChange("instagram_followers", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#FFED4E]" />
                    Portfolio URL
                  </Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    placeholder="https://behance.net/yourbrand"
                    value={formData.portfolio_url}
                    onChange={(e) => handleChange("portfolio_url", e.target.value)}
                    disabled={loading}
                    className="bg-background/50"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#FFED4E]">04</span>
                  Additional Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="previous_shows">Previous Shows / Events</Label>
                  <Textarea
                    id="previous_shows"
                    placeholder="List any fashion shows, pop-ups, or events you've participated in..."
                    value={formData.previous_shows}
                    onChange={(e) => handleChange("previous_shows", e.target.value)}
                    disabled={loading}
                    className="bg-background/50 min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designer_statement">Designer Statement</Label>
                  <Textarea
                    id="designer_statement"
                    placeholder="Tell us about your design philosophy, inspiration, and what makes your brand unique..."
                    value={formData.designer_statement}
                    onChange={(e) => handleChange("designer_statement", e.target.value)}
                    disabled={loading}
                    className="bg-background/50 min-h-[120px]"
                  />
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <p className="text-sm font-medium">As an EXA Designer, you&apos;ll get:</p>
                {[
                  "Access to our network of verified models",
                  "Feature your collections in EXA shows",
                  "Connect with brands and media partners",
                  "Dedicated support for your events",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    {benefit}
                  </div>
                ))}
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
                  "Submit Application"
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
