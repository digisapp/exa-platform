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
import { Loader2, ArrowLeft, Camera, Check, Instagram, Globe, Video } from "lucide-react";
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

const MEDIA_TYPES = [
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "both", label: "Photographer & Videographer" },
  { value: "drone_operator", label: "Drone Operator" },
  { value: "editor", label: "Photo/Video Editor" },
  { value: "other", label: "Other" },
];

const SPECIALIZATIONS = [
  "Fashion Photography",
  "Editorial",
  "Commercial",
  "Beauty",
  "Lifestyle",
  "Events",
  "Runway",
  "Lookbook",
  "Street Style",
  "Portrait",
  "Product",
  "Other"
];

const EXPERIENCE_LEVELS = [
  { value: "0-2", label: "0-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "10+", label: "10+ years" },
];

const RATE_RANGES = [
  { value: "under_100", label: "Under $100/hr" },
  { value: "100_250", label: "$100 - $250/hr" },
  { value: "250_500", label: "$250 - $500/hr" },
  { value: "500_1000", label: "$500 - $1000/hr" },
  { value: "over_1000", label: "Over $1000/hr" },
  { value: "project", label: "Project-based only" },
];

export default function MediaSignupPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    media_type: "",
    company_name: "",
    years_experience: "",
    website_url: "",
    instagram_url: "",
    portfolio_url: "",
    specializations: "",
    equipment_list: "",
    services_offered: "",
    hourly_rate_range: "",
    available_for_shows: true,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.media_type) {
        throw new Error("Please fill in all required fields");
      }

      // Insert into media table
      const { error } = await (supabase.from("media") as any).insert([
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          city: formData.city || null,
          state: formData.state || null,
          media_type: formData.media_type,
          company_name: formData.company_name || null,
          years_experience: formData.years_experience || null,
          website_url: formData.website_url || null,
          instagram_url: formData.instagram_url || null,
          portfolio_url: formData.portfolio_url || null,
          specializations: formData.specializations || null,
          equipment_list: formData.equipment_list || null,
          services_offered: formData.services_offered || null,
          hourly_rate_range: formData.hourly_rate_range || null,
          available_for_shows: formData.available_for_shows,
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
            <div className="text-5xl mb-4">📸</div>
            <CardTitle className="exa-gradient-text">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for applying to join the EXA Media Network.
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
              <Camera className="h-6 w-6 text-[#FFED4E]" />
              <CardTitle className="text-2xl exa-gradient-text">Media Professional Application</CardTitle>
            </div>
            <CardDescription>
              Join the EXA Media Network and work with top models at exclusive events
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

                <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Professional Information */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#00BFFF]">02</span>
                  Professional Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="media_type" className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-[#FF69B4]" />
                      Media Type *
                    </Label>
                    <Select
                      value={formData.media_type}
                      onValueChange={(v) => handleChange("media_type", v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIA_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company / Studio Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleChange("company_name", e.target.value)}
                      placeholder="If applicable"
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_range">Rate Range</Label>
                    <Select
                      value={formData.hourly_rate_range}
                      onValueChange={(v) => handleChange("hourly_rate_range", v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {RATE_RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specializations">Specializations</Label>
                  <Select
                    value={formData.specializations}
                    onValueChange={(v) => handleChange("specializations", v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select primary specialization" />
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
                    placeholder="https://yourwebsite.com"
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
                      placeholder="https://instagram.com/yourhandle"
                      value={formData.instagram_url}
                      onChange={(e) => handleChange("instagram_url", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-[#FFED4E]" />
                      Portfolio URL
                    </Label>
                    <Input
                      id="portfolio_url"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      value={formData.portfolio_url}
                      onChange={(e) => handleChange("portfolio_url", e.target.value)}
                      disabled={loading}
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-[#FFED4E]">04</span>
                  Additional Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="equipment_list">Equipment</Label>
                  <Textarea
                    id="equipment_list"
                    placeholder="List your primary equipment (cameras, lenses, lighting, etc.)..."
                    value={formData.equipment_list}
                    onChange={(e) => handleChange("equipment_list", e.target.value)}
                    disabled={loading}
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="services_offered">Services Offered</Label>
                  <Textarea
                    id="services_offered"
                    placeholder="Describe your services (e.g., on-location shoots, studio work, same-day edits, etc.)..."
                    value={formData.services_offered}
                    onChange={(e) => handleChange("services_offered", e.target.value)}
                    disabled={loading}
                    className="bg-background/50 min-h-[100px]"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-background/30">
                  <input
                    type="checkbox"
                    id="available_for_shows"
                    checked={formData.available_for_shows}
                    onChange={(e) => handleChange("available_for_shows", e.target.checked)}
                    disabled={loading}
                    className="h-5 w-5 rounded border-border accent-[#FF69B4]"
                  />
                  <Label htmlFor="available_for_shows" className="cursor-pointer">
                    I&apos;m available to shoot EXA fashion shows and events
                  </Label>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <p className="text-sm font-medium">As an EXA Media Partner, you&apos;ll get:</p>
                {[
                  "Priority booking for EXA fashion shows",
                  "Direct connections with models and designers",
                  "Featured portfolio on the EXA platform",
                  "Access to exclusive industry events",
                  "Networking with top brands",
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
