"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
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
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    bio: "",
    city: "",
    state: "",
    instagram_handle: "",
    height_inches: "",
  });
  const router = useRouter();
  const supabase = createClient();

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      // Create actor record
      const { data: actor, error: actorError } = await supabase
        .from("actors")
        .insert({
          user_id: user.id,
          type: "model",
        } as any)
        .select()
        .single();

      if (actorError) throw actorError;

      // Create model profile
      const { error: modelError } = await supabase
        .from("models")
        .insert({
          id: (actor as any).id,
          username: formData.username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          email: user.email,
          name: formData.name,
          bio: formData.bio,
          city: formData.city,
          state: formData.state,
          instagram_handle: formData.instagram_handle.replace("@", ""),
          height_inches: formData.height_inches ? parseInt(formData.height_inches) : null,
          is_approved: true, // Auto-approve for now
          profile_complete: true,
        } as any);

      if (modelError) throw modelError;

      // Award points for completing profile
      await (supabase.rpc as any)("award_points", {
        p_model_id: (actor as any).id,
        p_action: "profile_complete",
        p_points: 100,
        p_metadata: {},
      });

      toast.success("Profile created! Welcome to EXA!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
                  This will be your profile URL: exa.com/models/{formData.username || "yourname"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
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
                <Label htmlFor="height">Height (inches)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="66"
                  value={formData.height_inches}
                  onChange={(e) => updateField("height_inches", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Example: 5&apos;6&quot; = 66 inches, 5&apos;10&quot; = 70 inches
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
                  value={formData.instagram_handle}
                  onChange={(e) => updateField("instagram_handle", e.target.value)}
                />
              </div>
              <div className="p-4 rounded-lg bg-muted/50 mt-4">
                <h4 className="font-medium mb-2">Profile Summary</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Username:</strong> @{formData.username || "—"}</p>
                  <p><strong>Name:</strong> {formData.name || "—"}</p>
                  <p><strong>Location:</strong> {formData.city && formData.state ? `${formData.city}, ${formData.state}` : "—"}</p>
                  <p><strong>Instagram:</strong> {formData.instagram_handle || "—"}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;ll earn <strong className="text-primary">+100 points</strong> for completing your profile!
              </p>
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
              disabled={step === 1 && (!formData.username || !formData.name)}
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
