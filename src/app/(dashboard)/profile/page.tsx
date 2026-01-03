"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Loader2, User, Lock, DollarSign, Camera, BarChart3, Coins, Trash2, AlertTriangle, Building2, Globe } from "lucide-react";
import type { Model, Fan, Actor, Brand } from "@/types/database";
import { ImageCropper } from "@/components/upload/ImageCropper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function ProfilePage() {
  const [model, setModel] = useState<Model | null>(null);
  const [fan, setFan] = useState<Fan | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [originalUsername, setOriginalUsername] = useState<string>("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if username can be changed (14 day cooldown like Instagram)
  const canChangeUsername = () => {
    if (!model) return false;
    if (!model.username_changed_at) return true; // Never changed, can change

    const lastChange = new Date(model.username_changed_at);
    const now = new Date();
    const daysSinceChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 14;
  };

  // Check username availability with debounce
  const checkUsernameAvailability = (username: string) => {
    // Clear previous timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Reset if empty or same as original
    if (!username || username === originalUsername) {
      setUsernameStatus({ checking: false, available: null, reason: null });
      return;
    }

    // Basic validation before API call
    if (username.length < 3) {
      setUsernameStatus({ checking: false, available: false, reason: "Must be at least 3 characters" });
      return;
    }
    if (username.length > 30) {
      setUsernameStatus({ checking: false, available: false, reason: "Must be 30 characters or less" });
      return;
    }

    // Set checking state
    setUsernameStatus({ checking: true, available: null, reason: null });

    // Debounce API call
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (res.ok) {
          setUsernameStatus({
            checking: false,
            available: data.available,
            reason: data.reason,
          });
        } else {
          setUsernameStatus({ checking: false, available: null, reason: "Error checking username" });
        }
      } catch {
        setUsernameStatus({ checking: false, available: null, reason: "Error checking username" });
      }
    }, 400);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image (JPEG, PNG, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Open cropper instead of uploading directly
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropperOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }

    setUploadingAvatar(true);
    try {
      const file = new File([croppedBlob], "profile-photo.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setModel((prev) => prev ? { ...prev, profile_photo_url: data.url } : prev);
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleCropperClose = () => {
    setCropperOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Layout already handles auth redirect, just wait
        return;
      }

      setUserEmail(user.email || "");

      const { data: actorData } = await supabase
        .from("actors")
        .select("*")
        .eq("user_id", user.id)
        .single() as { data: Actor | null };

      if (!actorData) {
        // Layout already handles this case
        return;
      }

      setActor(actorData);

      if (actorData.type === "model" || actorData.type === "admin") {
        // Models are linked via user_id, not actor.id
        const { data: modelData } = await supabase
          .from("models")
          .select("*")
          .eq("user_id", user.id)
          .single() as { data: Model | null };

        if (modelData) {
          setModel(modelData);
          setOriginalUsername(modelData.username || "");
        }
      } else if (actorData.type === "fan") {
        // Try to find fan by user_id first, then by actor id
        let fanData: Fan | null = null;

        const { data: fanByUser } = await supabase
          .from("fans")
          .select("*")
          .eq("user_id", user.id)
          .single() as { data: Fan | null };

        if (fanByUser) {
          fanData = fanByUser;
        } else {
          // Fallback to actor.id
          const { data: fanById } = await supabase
            .from("fans")
            .select("*")
            .eq("id", actorData.id)
            .single() as { data: Fan | null };
          fanData = fanById;
        }

        if (fanData) {
          setFan(fanData);
        }
      } else if (actorData.type === "brand") {
        // Load brand data
        const { data: brandData } = await supabase
          .from("brands")
          .select("*")
          .eq("id", actorData.id)
          .single() as { data: Brand | null };

        if (brandData) {
          setBrand(brandData);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  const handleFanSave = async () => {
    if (!fan) return;
    setSaving(true);

    try {
      // Validate username if provided
      if (fan.username) {
        if (fan.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }
        if (fan.username.length > 30) {
          throw new Error("Username must be less than 30 characters");
        }

        // Check username availability (includes reserved names check)
        const checkRes = await fetch(`/api/username/check?username=${encodeURIComponent(fan.username)}`);
        const checkData = await checkRes.json();

        if (!checkData.available) {
          throw new Error(checkData.reason || "This username is not available");
        }
      }

      const { error } = await (supabase.from("fans") as any)
        .update({
          display_name: fan.display_name,
          username: fan.username || null,
          bio: fan.bio || null,
          phone: fan.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fan.id);

      if (error) throw error;
      toast.success("Settings saved!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBrandSave = async () => {
    if (!brand) return;
    setSaving(true);

    try {
      // Validate username if provided
      if (brand.username) {
        if (brand.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }
        if (brand.username.length > 30) {
          throw new Error("Username must be less than 30 characters");
        }

        // Check username availability (includes reserved names check)
        const checkRes = await fetch(`/api/username/check?username=${encodeURIComponent(brand.username)}`);
        const checkData = await checkRes.json();

        if (!checkData.available) {
          throw new Error(checkData.reason || "This username is not available");
        }
      }

      const { error } = await (supabase.from("brands") as any)
        .update({
          company_name: brand.company_name,
          contact_name: brand.contact_name,
          username: brand.username || null,
          bio: brand.bio || null,
          website: brand.website || null,
          phone: (brand as any).phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brand.id);

      if (error) throw error;
      toast.success("Settings saved!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Account deleted successfully");
      router.push("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!model) return;
    setSaving(true);

    try {
      const usernameChanged = model.username !== originalUsername;

      // If username changed, validate it
      if (usernameChanged) {
        if (!canChangeUsername()) {
          throw new Error("You can only change your username once every 14 days");
        }

        if (!model.username || model.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }

        if (model.username.length > 30) {
          throw new Error("Username must be less than 30 characters");
        }

        // Check username availability (includes reserved names check)
        const checkRes = await fetch(`/api/username/check?username=${encodeURIComponent(model.username)}`);
        const checkData = await checkRes.json();

        if (!checkData.available) {
          throw new Error(checkData.reason || "This username is not available");
        }
      }

      const updateData: any = {
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
        affiliate_links: model.affiliate_links || [],
        show_measurements: model.show_measurements,
        show_location: model.show_location,
        show_social_media: model.show_social_media,
        availability_status: model.availability_status,
        video_call_rate: model.video_call_rate || 1,
        voice_call_rate: model.voice_call_rate || 1,
        message_rate: model.message_rate || 0,
        // Booking rates
        photoshoot_hourly_rate: model.photoshoot_hourly_rate || 0,
        photoshoot_half_day_rate: model.photoshoot_half_day_rate || 0,
        photoshoot_full_day_rate: model.photoshoot_full_day_rate || 0,
        promo_hourly_rate: model.promo_hourly_rate || 0,
        private_event_hourly_rate: model.private_event_hourly_rate || 0,
        social_companion_hourly_rate: model.social_companion_hourly_rate || 0,
        brand_ambassador_daily_rate: model.brand_ambassador_daily_rate || 0,
        meet_greet_rate: model.meet_greet_rate || 0,
        travel_fee: model.travel_fee || 0,
        show_booking_rates: model.show_booking_rates ?? true,
        show_on_rates_page: model.show_on_rates_page ?? false,
        updated_at: new Date().toISOString(),
      };

      // Add username fields if changed
      if (usernameChanged) {
        updateData.username = model.username;
        updateData.username_changed_at = new Date().toISOString();
      }

      const { error } = await (supabase
        .from("models") as any)
        .update(updateData)
        .eq("id", model.id);

      if (error) throw error;

      // Update original username if changed
      if (usernameChanged) {
        setOriginalUsername(model.username || "");
        setModel({ ...model, username_changed_at: new Date().toISOString() });
      }

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

  // Show fan settings page
  if (actor?.type === "fan" && fan) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={fan.display_name || ""}
                onChange={(e) => setFan({ ...fan, display_name: e.target.value })}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={fan.username || ""}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setFan({ ...fan, username: value });
                    checkUsernameAvailability(value);
                  }}
                  placeholder="username"
                  className={fan.username ? (
                    usernameStatus.available === true ? "pr-10 border-green-500 focus-visible:ring-green-500" :
                    usernameStatus.available === false ? "pr-10 border-red-500 focus-visible:ring-red-500" : "pr-10"
                  ) : ""}
                />
                {fan.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus.checking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameStatus.available === true ? (
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : usernameStatus.available === false ? (
                      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : null}
                  </div>
                )}
              </div>
              {fan.username && usernameStatus.available === true && (
                <p className="text-xs text-green-500">Username is available!</p>
              )}
              {fan.username && usernameStatus.available === false && usernameStatus.reason && (
                <p className="text-xs text-red-500">{usernameStatus.reason}</p>
              )}
              {(!fan.username || usernameStatus.available === null) && !usernameStatus.checking && (
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={fan.bio || ""}
                onChange={(e) => setFan({ ...fan, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={fan.phone || ""}
                onChange={(e) => setFan({ ...fan, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
              <div>
                <p className="text-3xl font-bold">{fan.coin_balance?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Available coins</p>
              </div>
              <Button asChild className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                <Link href="/coins">Buy Coins</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use coins to message models, unlock exclusive content, and more.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account, all your data, coin balance, and remove your access to EXA.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push("/models")}>
            Cancel
          </Button>
          <Button
            onClick={handleFanSave}
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

  // Show brand settings page
  if (actor?.type === "brand" && brand) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Brand Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your brand profile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={brand.company_name || ""}
                onChange={(e) => setBrand({ ...brand, company_name: e.target.value })}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_username">Username</Label>
              <div className="relative">
                <Input
                  id="brand_username"
                  value={brand.username || ""}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setBrand({ ...brand, username: value });
                    checkUsernameAvailability(value);
                  }}
                  placeholder="brand_username"
                  className={brand.username ? (
                    usernameStatus.available === true ? "pr-10 border-green-500 focus-visible:ring-green-500" :
                    usernameStatus.available === false ? "pr-10 border-red-500 focus-visible:ring-red-500" : "pr-10"
                  ) : ""}
                />
                {brand.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus.checking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameStatus.available === true ? (
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : usernameStatus.available === false ? (
                      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : null}
                  </div>
                )}
              </div>
              {brand.username && usernameStatus.available === true && (
                <p className="text-xs text-green-500">Username is available!</p>
              )}
              {brand.username && usernameStatus.available === false && usernameStatus.reason && (
                <p className="text-xs text-red-500">{usernameStatus.reason}</p>
              )}
              {(!brand.username || usernameStatus.available === null) && !usernameStatus.checking && (
                <p className="text-xs text-muted-foreground">
                  Your profile URL will be examodels.com/{brand.username || "username"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Person</Label>
              <Input
                id="contact_name"
                value={brand.contact_name || ""}
                onChange={(e) => setBrand({ ...brand, contact_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_bio">About Your Brand</Label>
              <Textarea
                id="brand_bio"
                value={brand.bio || ""}
                onChange={(e) => setBrand({ ...brand, bio: e.target.value })}
                placeholder="Tell models about your brand and what you're looking for..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Contact & Web
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand_email">Email</Label>
              <Input
                id="brand_email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_phone">Phone (optional)</Label>
              <Input
                id="brand_phone"
                type="tel"
                value={(brand as any).phone || ""}
                onChange={(e) => setBrand({ ...brand, phone: e.target.value } as any)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={brand.website || ""}
                onChange={(e) => setBrand({ ...brand, website: e.target.value })}
                placeholder="https://yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your brand account
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      brand account and remove your access to EXA.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push("/models")}>
            Cancel
          </Button>
          <Button
            onClick={handleBrandSave}
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

  if (!model) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="rates">
            <DollarSign className="h-4 w-4 mr-2" />
            Rates
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Lock className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Picture - Clickable Avatar */}
          <div className="flex items-center gap-4">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group"
            >
              {model.profile_photo_url ? (
                <img
                  src={model.profile_photo_url}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-pink-500/50 group-hover:border-pink-500 transition-colors"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                  {model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              {/* Hover overlay with camera icon */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
            <div>
              <p className="font-medium">Profile Picture</p>
              <p className="text-sm text-muted-foreground">Click to upload</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={model.username || ""}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setModel({ ...model, username: value });
                      checkUsernameAvailability(value);
                    }}
                    disabled={!canChangeUsername()}
                    placeholder="username"
                    className={model.username !== originalUsername ? (
                      usernameStatus.available === true ? "pr-10 border-green-500 focus-visible:ring-green-500" :
                      usernameStatus.available === false ? "pr-10 border-red-500 focus-visible:ring-red-500" : "pr-10"
                    ) : ""}
                  />
                  {model.username !== originalUsername && canChangeUsername() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus.checking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : usernameStatus.available === true ? (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : usernameStatus.available === false ? (
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : null}
                    </div>
                  )}
                </div>
                {model.username !== originalUsername && usernameStatus.available === true && (
                  <p className="text-xs text-green-500">Username is available!</p>
                )}
                {model.username !== originalUsername && usernameStatus.available === false && usernameStatus.reason && (
                  <p className="text-xs text-red-500">{usernameStatus.reason}</p>
                )}
                {!canChangeUsername() && model.username_changed_at ? (
                  <p className="text-xs text-muted-foreground">
                    Username can be changed again on {new Date(new Date(model.username_changed_at).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                ) : model.username === originalUsername ? (
                  <p className="text-xs text-muted-foreground">
                    Username can only be changed once every 14 days. Your profile URL will be examodels.com/{model.username}
                  </p>
                ) : null}
              </div>

              {/* First Name and Last Name - Same Row */}
              <div className="grid md:grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Affiliate Links */}
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Links</CardTitle>
              <CardDescription>Add links to your brand deals, promo codes, merch, or Amazon affiliate products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {((model.affiliate_links || []) as { title: string; url: string }[]).map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={link.title}
                    onChange={(e) => {
                      const links = [...((model.affiliate_links || []) as { title: string; url: string }[])];
                      links[index] = { ...links[index], title: e.target.value };
                      setModel({ ...model, affiliate_links: links as any });
                    }}
                    placeholder="Link title (e.g., My Merch Store)"
                    className="flex-1"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => {
                      const links = [...((model.affiliate_links || []) as { title: string; url: string }[])];
                      links[index] = { ...links[index], url: e.target.value };
                      setModel({ ...model, affiliate_links: links as any });
                    }}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const links = ((model.affiliate_links || []) as { title: string; url: string }[]).filter((_, i) => i !== index);
                      setModel({ ...model, affiliate_links: links as any });
                    }}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const links = [...((model.affiliate_links || []) as { title: string; url: string }[]), { title: "", url: "" }];
                  setModel({ ...model, affiliate_links: links as any });
                }}
                className="w-full"
              >
                + Add Affiliate Link
              </Button>
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
        </TabsContent>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rates</CardTitle>
              <CardDescription>
                Set your rates for video calls, voice calls, and messages. Rates are in coins per minute/message.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {/* Video Call Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-violet-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Video Call Rate</Label>
                      <p className="text-sm text-muted-foreground">Per minute rate for video calls (min: 1 coin)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={model.video_call_rate || 1}
                      onChange={(e) => setModel({ ...model, video_call_rate: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">coins/min</span>
                  </div>
                </div>

                {/* Voice Call Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Voice Call Rate</Label>
                      <p className="text-sm text-muted-foreground">Per minute rate for voice calls (min: 1 coin)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={model.voice_call_rate || 1}
                      onChange={(e) => setModel({ ...model, voice_call_rate: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">coins/min</span>
                  </div>
                </div>

                {/* Message Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Message Rate</Label>
                      <p className="text-sm text-muted-foreground">Cost per message to chat with you</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={model.message_rate || 0}
                      onChange={(e) => setModel({ ...model, message_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">coins/msg</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Booking Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Rates</CardTitle>
              <CardDescription>
                Set your rates for in-person services. Brands and fans will see these on your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show Booking Rates Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div>
                  <Label className="text-base font-semibold">Show Booking Rates</Label>
                  <p className="text-sm text-muted-foreground">Display your booking rates on your public profile</p>
                </div>
                <Switch
                  checked={model.show_booking_rates ?? true}
                  onCheckedChange={(v) => setModel({ ...model, show_booking_rates: v })}
                />
              </div>

              {/* Show on Rates Directory Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-violet-500/10">
                <div>
                  <Label className="text-base font-semibold">List on Rates Directory</Label>
                  <p className="text-sm text-muted-foreground">
                    Appear on the public <Link href="/rates" className="text-pink-500 hover:underline">/rates</Link> page where brands can discover and book you
                  </p>
                </div>
                <Switch
                  checked={model.show_on_rates_page ?? false}
                  onCheckedChange={(v) => setModel({ ...model, show_on_rates_page: v })}
                />
              </div>

              {/* Photography Rates */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-pink-500" />
                  Photography & Content
                </h4>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Hourly Rate</Label>
                      <p className="text-xs text-muted-foreground">Per hour for photoshoots</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={model.photoshoot_hourly_rate || ""}
                        onChange={(e) => setModel({ ...model, photoshoot_hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Half-Day Rate</Label>
                      <p className="text-xs text-muted-foreground">4 hours of shooting</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="50000"
                        value={model.photoshoot_half_day_rate || ""}
                        onChange={(e) => setModel({ ...model, photoshoot_half_day_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Full-Day Rate</Label>
                      <p className="text-xs text-muted-foreground">8 hours of shooting</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="100000"
                        value={model.photoshoot_full_day_rate || ""}
                        onChange={(e) => setModel({ ...model, photoshoot_full_day_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Promotional Rates */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Promotional & Events
                </h4>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Promo Modeling</Label>
                      <p className="text-xs text-muted-foreground">Per hour for promotional work</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={model.promo_hourly_rate || ""}
                        onChange={(e) => setModel({ ...model, promo_hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Brand Ambassador</Label>
                      <p className="text-xs text-muted-foreground">Daily rate for brand work</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="50000"
                        value={model.brand_ambassador_daily_rate || ""}
                        onChange={(e) => setModel({ ...model, brand_ambassador_daily_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Private & Social Rates */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-violet-500" />
                  Private & Social
                </h4>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Private Events</Label>
                      <p className="text-xs text-muted-foreground">Per hour for private events</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={model.private_event_hourly_rate || ""}
                        onChange={(e) => setModel({ ...model, private_event_hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Social Companion</Label>
                      <p className="text-xs text-muted-foreground">Per hour for social events</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={model.social_companion_hourly_rate || ""}
                        onChange={(e) => setModel({ ...model, social_companion_hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label>Meet & Greet</Label>
                      <p className="text-xs text-muted-foreground">Flat fee for appearances</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        max="50000"
                        value={model.meet_greet_rate || ""}
                        onChange={(e) => setModel({ ...model, meet_greet_rate: parseInt(e.target.value) || 0 })}
                        className="w-24 text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Travel Fee */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-500" />
                  Additional Fees
                </h4>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Travel Fee</Label>
                    <p className="text-xs text-muted-foreground">For out-of-area bookings</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      value={model.travel_fee || ""}
                      onChange={(e) => setModel({ ...model, travel_fee: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="0"
                    />
                  </div>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{(model as any).followers_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Favorites</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{(model as any).profile_views || 0}</p>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{(model as any).total_earnings || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{(model as any).content_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Content Items</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Track your engagement and earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed analytics coming soon</p>
                <p className="text-sm">Track your profile views, message stats, and earnings trends</p>
              </div>
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

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onClose={handleCropperClose}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          circularCrop={true}
        />
      )}
    </div>
  );
}
