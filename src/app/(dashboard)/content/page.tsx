"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Lock,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Coins,
  Eye,
  Image as ImageIcon,
  Video,
  Unlock,
  Images,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PremiumContent {
  id: string;
  title: string | null;
  description: string | null;
  media_type: string;
  media_url: string;
  preview_url: string | null;
  coin_price: number;
  unlock_count: number;
  created_at: string;
}

export default function ContentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState<PremiumContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [coinPrice, setCoinPrice] = useState("10");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  const fetchContent = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Layout already handles auth redirect
      return;
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "model" && actor.type !== "admin")) {
      // Not a model, show empty state or redirect handled elsewhere
      return;
    }

    setActorId(actor.id);

    // Get model ID (models are linked via user_id, not actor.id)
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!model) {
      setLoading(false);
      return;
    }

    setModelId(model.id);

    // Get premium content using model.id
    const { data: contentData } = await supabase
      .from("premium_content")
      .select("*")
      .eq("model_id", model.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setContent(contentData || []);

    // Get total earnings from content sales
    const { data: earnings } = await supabase
      .from("coin_transactions")
      .select("amount")
      .eq("actor_id", actor.id)
      .eq("action", "content_sale") as { data: { amount: number }[] | null };

    const total = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
    setTotalEarnings(total);

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast.error("Please select an image or video file");
      return;
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!mediaFile || !modelId) return;

    setUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${modelId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("premium-content")
        .upload(fileName, mediaFile);

      if (uploadError) {
        // If bucket doesn't exist, try uploads bucket
        const { error: altUploadError } = await supabase.storage
          .from("uploads")
          .upload(`premium/${fileName}`, mediaFile);

        if (altUploadError) {
          throw new Error("Failed to upload file");
        }

        // Get public URL from uploads bucket
        const { data: { publicUrl } } = supabase.storage
          .from("uploads")
          .getPublicUrl(`premium/${fileName}`);

        await createContent(publicUrl);
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("premium-content")
          .getPublicUrl(fileName);

        await createContent(publicUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload content");
    } finally {
      setUploading(false);
    }
  };

  const createContent = async (mediaUrl: string) => {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        description: description || null,
        mediaUrl,
        mediaType,
        previewUrl: null,
        coinPrice: isPaid ? parseInt(coinPrice) : 0,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create content");
    }

    toast.success("Content uploaded!");
    setDialogOpen(false);
    resetForm();
    fetchContent();
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    const response = await fetch(`/api/content?id=${contentId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      toast.success("Content deleted");
      setContent((prev) => prev.filter((c) => c.id !== contentId));
    } else {
      toast.error("Failed to delete content");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIsPaid(false);
    setCoinPrice("10");
    setMediaFile(null);
    setMediaPreview(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Images className="h-8 w-8 text-pink-500" />
            Content
          </h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Content</DialogTitle>
              <DialogDescription>
                Upload a photo or video for your profile page
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Media File</Label>
                {mediaPreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    {mediaType === "video" ? (
                      <video
                        src={mediaPreview}
                        className="w-full h-full object-contain"
                        controls
                      />
                    ) : (
                      <Image
                        src={mediaPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload photo or video
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 50MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Give your content a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what fans will see..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Free/Paid Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="paid-toggle" className="text-base">Paid Content</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPaid ? "Fans pay coins to unlock" : "Free for all fans"}
                  </p>
                </div>
                <Switch
                  id="paid-toggle"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
              </div>

              {/* Price - only show if paid */}
              {isPaid && (
                <div className="space-y-2">
                  <Label>Price in Coins</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                    <Input
                      type="number"
                      min="0"
                      value={coinPrice}
                      onChange={(e) => setCoinPrice(e.target.value)}
                      placeholder="Enter price"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set to 0 for free content
                  </p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!mediaFile || uploading}
                className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Content
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Images className="h-3 w-3" />
              Total Content
            </CardDescription>
            <CardTitle className="text-2xl">{content.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Paid Content
            </CardDescription>
            <CardTitle className="text-2xl">
              {content.filter((c) => c.coin_price > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Total Unlocks
            </CardDescription>
            <CardTitle className="text-2xl">
              {content.reduce((sum, c) => sum + c.unlock_count, 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Total Earnings
            </CardDescription>
            <CardTitle className="text-2xl text-pink-500">
              {totalEarnings}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Content Grid */}
      {content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Images className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-violet-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Content
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {content.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-square">
                {item.media_type === "video" ? (
                  <video
                    src={item.media_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={item.media_url}
                    alt={item.title || "Premium content"}
                    fill
                    className="object-cover"
                  />
                )}

                {/* Type Badge */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <div className="bg-black/70 px-2 py-1 rounded flex items-center gap-1">
                    {item.media_type === "video" ? (
                      <Video className="h-3 w-3 text-white" />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                  {item.coin_price > 0 ? (
                    <div className="bg-pink-500/90 px-2 py-1 rounded flex items-center gap-1">
                      <Lock className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="bg-green-500/90 px-2 py-1 rounded flex items-center gap-1">
                      <Unlock className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  {item.coin_price > 0 ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Coins className="h-4 w-4 text-pink-500" />
                      <span className="font-semibold">{item.coin_price}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <Unlock className="h-4 w-4" />
                      <span className="font-semibold">Free</span>
                    </div>
                  )}
                  {item.coin_price > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{item.unlock_count}</span>
                    </div>
                  )}
                </div>
                {item.title && (
                  <p className="text-sm font-medium mt-1 truncate">{item.title}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
