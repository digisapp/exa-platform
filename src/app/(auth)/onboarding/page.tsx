"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

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

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    bio: "",
    city: "",
    state: "",
    instagram_name: "",
    height: "",
  });
  const router = useRouter();
  const supabase = createClient();

  // Check if user already has a model profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Check by user_id
        const { data: model } = await (supabase.from("models") as any)
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (model) {
          router.push("/dashboard");
          return;
        }

        // Check by email
        if (user.email) {
          const { data: modelByEmail } = await (supabase.from("models") as any)
            .select("id")
            .eq("email", user.email)
            .single();

          if (modelByEmail) {
            // Update user_id and redirect
            await (supabase.from("models") as any)
              .update({ user_id: user.id })
              .eq("id", modelByEmail.id);
            router.push("/dashboard");
            return;
          }
        }

        setCheckingExisting(false);
      } catch {
        setCheckingExisting(false);
      }
    };

    checkExistingProfile();
  }, [supabase, router]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      // Create model profile directly
      const { error: modelError } = await (supabase.from("models") as any).insert({
        user_id: user.id,
        username: formData.username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        email: user.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio || null,
        city: formData.city || null,
        state: formData.state || null,
        instagram_name: formData.instagram_name.replace("@", "") || null,
        height: formData.height || null,
        is_approved: true,
        status: "approved",
        show_location: true,
        show_social_media: true,
      });

      if (modelError) throw modelError;

      toast.success("Profile created! Welcome to EXA!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create profile";
      console.error("Profile creation error:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for existing profile
  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent mb-2">
            EXA
          </div>
          <CardTitle>Create Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 3 — {step === 1 ? "Basic Info" : step === 2 ? "Location" : "Finish Up"}
          </CardDescription>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? "bg-gradient-to-r from-pink-500 to-violet-500" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="yourname"
                  value={formData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be your profile URL: examodels.com/{formData.username || "yourname"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Last name"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Miami"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={formData.state} onValueChange={(v) => updateField("state", v)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  placeholder="5'8&quot;"
                  value={formData.height}
                  onChange={(e) => updateField("height", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Example: 5&apos;6&quot;, 5&apos;10&quot;, etc.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  placeholder="@yourhandle"
                  value={formData.instagram_name}
                  onChange={(e) => updateField("instagram_name", e.target.value)}
                />
              </div>
              <div className="p-4 rounded-lg bg-muted/50 mt-4">
                <h4 className="font-medium mb-2">Profile Summary</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Username:</strong> @{formData.username || "—"}</p>
                  <p><strong>Name:</strong> {formData.first_name} {formData.last_name || ""}</p>
                  <p><strong>Location:</strong> {formData.city && formData.state ? `${formData.city}, ${formData.state}` : "—"}</p>
                  <p><strong>Instagram:</strong> {formData.instagram_name || "—"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!formData.username || !formData.first_name)}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
