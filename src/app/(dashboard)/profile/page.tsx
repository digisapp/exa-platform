"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, User, Lock, Camera } from "lucide-react";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import { PortfolioGallery } from "@/components/upload/PortfolioGallery";
import type { Model, MediaAsset } from "@/types/database";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function ProfilePage() {
  const [model, setModel] = useState<Model | null>(null);
  const [photos, setPhotos] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Layout already handles auth redirect, just wait
        return;
      }

      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor) {
        // Layout already handles this case
        return;
      }

      // Models are linked via user_id, not actor.id
      const { data: modelData } = await supabase
        .from("models")
        .select("*")
        .eq("user_id", user.id)
        .single() as { data: Model | null };

      if (modelData) {
        setModel(modelData);
      }

      // Fetch portfolio photos
      const { data: photosData } = await supabase
        .from("media_assets")
        .select("*")
        .eq("owner_id", actor.id)
        .eq("source", "portfolio")
        .order("created_at", { ascending: false }) as { data: MediaAsset[] | null };

      if (photosData) {
        setPhotos(photosData);
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!model) return;
    setSaving(true);

    try {
      const { error } = await (supabase
        .from("models") as any)
        .update({
          first_name: model.first_name,
          last_name: model.last_name,
          bio: model.bio,
          city: model.city,
          state: model.state,
          height: model.height,
          bust: model.bust,
          waist: model.waist,
          hips: model.hips,
          dress_size: model.dress_size,
          shoe_size: model.shoe_size,
          hair_color: model.hair_color,
          eye_color: model.eye_color,
          instagram_name: model.instagram_name,
          tiktok_username: model.tiktok_username,
          snapchat_username: model.snapchat_username,
          x_username: model.x_username,
          youtube_username: model.youtube_username,
          twitch_username: model.twitch_username,
          digis_username: model.digis_username,
          show_measurements: model.show_measurements,
          show_location: model.show_location,
          show_social_media: model.show_social_media,
          availability_status: model.availability_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", model.id);

      if (error) throw error;

      toast.success("Profile updated!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground">Update your public profile information</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Lock className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-2" />
            Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {model.profile_photo_url ? (
                    <img
                      src={model.profile_photo_url}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-pink-500/50"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-3xl font-bold">
                      {model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a profile picture. JPG, PNG or WebP, max 5MB.
                  </p>
                  <PhotoUploader
                    actorId={model.id}
                    onUploadComplete={(url) => {
                      setModel({ ...model, profile_photo_url: url });
                      toast.success("Profile picture updated!");
                    }}
                    uploadType="avatar"
                    buttonText="Upload Photo"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={model.username} disabled />
                  <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={model.first_name || ""}
                    onChange={(e) => setModel({ ...model, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={model.last_name || ""}
                    onChange={(e) => setModel({ ...model, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={model.bio || ""}
                  onChange={(e) => setModel({ ...model, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell people about yourself..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={model.city || ""}
                    onChange={(e) => setModel({ ...model, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={model.state || ""}
                    onValueChange={(v) => setModel({ ...model, state: v })}
                  >
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Physical Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Height and Measurements */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    value={model.height || ""}
                    onChange={(e) => setModel({ ...model, height: e.target.value })}
                    placeholder="5'8&quot;"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bust">Bust</Label>
                  <Input
                    id="bust"
                    value={model.bust || ""}
                    onChange={(e) => setModel({ ...model, bust: e.target.value })}
                    placeholder="34&quot;"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Waist</Label>
                  <Input
                    id="waist"
                    value={model.waist || ""}
                    onChange={(e) => setModel({ ...model, waist: e.target.value })}
                    placeholder="26&quot;"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hips">Hips</Label>
                  <Input
                    id="hips"
                    value={model.hips || ""}
                    onChange={(e) => setModel({ ...model, hips: e.target.value })}
                    placeholder="36&quot;"
                  />
                </div>
              </div>

              {/* Row 2: Sizes and Colors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dress">Dress Size</Label>
                  <Input
                    id="dress"
                    value={model.dress_size || ""}
                    onChange={(e) => setModel({ ...model, dress_size: e.target.value })}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoe">Shoe Size</Label>
                  <Input
                    id="shoe"
                    value={model.shoe_size || ""}
                    onChange={(e) => setModel({ ...model, shoe_size: e.target.value })}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hair">Hair Color</Label>
                  <Input
                    id="hair"
                    value={model.hair_color || ""}
                    onChange={(e) => setModel({ ...model, hair_color: e.target.value })}
                    placeholder="Brown"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eyes">Eye Color</Label>
                  <Input
                    id="eyes"
                    value={model.eye_color || ""}
                    onChange={(e) => setModel({ ...model, eye_color: e.target.value })}
                    placeholder="Blue"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={model.instagram_name || ""}
                    onChange={(e) => setModel({ ...model, instagram_name: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={model.tiktok_username || ""}
                    onChange={(e) => setModel({ ...model, tiktok_username: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="snapchat">Snapchat</Label>
                  <Input
                    id="snapchat"
                    value={model.snapchat_username || ""}
                    onChange={(e) => setModel({ ...model, snapchat_username: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x">X (Twitter)</Label>
                  <Input
                    id="x"
                    value={model.x_username || ""}
                    onChange={(e) => setModel({ ...model, x_username: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    value={model.youtube_username || ""}
                    onChange={(e) => setModel({ ...model, youtube_username: e.target.value.replace("@", "") })}
                    placeholder="channel name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitch">Twitch</Label>
                  <Input
                    id="twitch"
                    value={model.twitch_username || ""}
                    onChange={(e) => setModel({ ...model, twitch_username: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digis">Digis.cc</Label>
                  <Input
                    id="digis"
                    value={model.digis_username || ""}
                    onChange={(e) => setModel({ ...model, digis_username: e.target.value.replace("@", "") })}
                    placeholder="username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control what information is visible on your public profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Location</Label>
                  <p className="text-sm text-muted-foreground">Display your city and state</p>
                </div>
                <Switch
                  checked={model.show_location}
                  onCheckedChange={(v) => setModel({ ...model, show_location: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Measurements</Label>
                  <p className="text-sm text-muted-foreground">Display height and body measurements</p>
                </div>
                <Switch
                  checked={model.show_measurements}
                  onCheckedChange={(v) => setModel({ ...model, show_measurements: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Social Media</Label>
                  <p className="text-sm text-muted-foreground">Display Instagram and TikTok handles</p>
                </div>
                <Switch
                  checked={model.show_social_media}
                  onCheckedChange={(v) => setModel({ ...model, show_social_media: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Let brands know if you&apos;re available for bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={model.availability_status || "available"}
                onValueChange={(v: string) => setModel({ ...model, availability_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="not_available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Photos</CardTitle>
              <CardDescription>
                Add photos to your portfolio. Each photo earns +10 points!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                type="portfolio"
                onUploadComplete={(url, mediaAsset) => {
                  setPhotos((prev) => [mediaAsset, ...prev]);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Portfolio</CardTitle>
              <CardDescription>
                {photos.length} photo{photos.length !== 1 ? "s" : ""} in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortfolioGallery
                photos={photos}
                onDelete={(photoId) => {
                  setPhotos((prev) => prev.filter((p) => p.id !== photoId));
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-pink-500 to-violet-500"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
