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
  Camera,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface MediaAsset {
  id: string;
  asset_type: string;
  photo_url: string | null;
  url: string;
  created_at: string;
}

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
  const [portfolio, setPortfolio] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [activeTab, setActiveTab] = useState("portfolio");

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

    // Get portfolio content (photos/videos from media_assets)
    const { data: portfolioData } = await supabase
      .from("media_assets")
      .select("*")
      .eq("model_id", model.id)
      .in("asset_type", ["portfolio", "video"])
      .order("created_at", { ascending: false });

    setPortfolio(portfolioData || []);

    // Get premium content using model.id (PPV only - coin_price > 0)
    const { data: contentData } = await supabase
      .from("premium_content")
      .select("*")
      .eq("model_id", model.id)
      .eq("is_active", true)
      .gt("coin_price", 0)
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
      const formData = new FormData();
      formData.append("file", mediaFile);

      if (isPaid) {
        // Paid content goes to premium_content (PPV tab)
        const uploadResponse = await fetch("/api/upload/premium", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Failed to upload file");
        }

        await createPaidContent(uploadData.url);
      } else {
        // Free content goes to media_assets (Photos/Videos tabs)
        formData.append("type", mediaType === "video" ? "video" : "portfolio");

        const uploadResponse = await fetch("/api/upload/media", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Failed to upload file");
        }

        toast.success("Content uploaded to your portfolio!");
        setDialogOpen(false);
        resetForm();
        fetchContent(); // Refresh to show new content
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload content");
    } finally {
      setUploading(false);
    }
  };

  const createPaidContent = async (mediaUrl: string) => {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        description: description || null,
        mediaUrl,
        mediaType,
        previewUrl: null,
        coinPrice: parseInt(coinPrice) || 1,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create content");
    }

    toast.success("PPV content uploaded!");
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

  const handleDeletePortfolio = async (mediaId: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;

    const response = await fetch(`/api/upload?id=${mediaId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      toast.success("Deleted");
      setPortfolio((prev) => prev.filter((p) => p.id !== mediaId));
    } else {
      toast.error("Failed to delete");
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
          <h1 className="text-3xl font-bold">Content</h1>
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
                {isPaid
                  ? "Paid content appears in your PPV tab - fans pay to unlock"
                  : "Free content appears in your Photos/Videos tabs"
                }
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Portfolio ({portfolio.length})
          </TabsTrigger>
          <TabsTrigger value="ppv" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            PPV ({content.length})
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {portfolio.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No photos or videos yet</h3>
                <p className="text-muted-foreground mb-4">Upload free content to show in your Photos/Videos tabs</p>
                <Button
                  onClick={() => { setIsPaid(false); setDialogOpen(true); }}
                  className="bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Photo or Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {portfolio.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    {item.asset_type === "video" ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={item.photo_url || item.url}
                        alt="Portfolio content"
                        fill
                        className="object-cover"
                      />
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <div className="bg-black/70 px-2 py-1 rounded flex items-center gap-1">
                        {item.asset_type === "video" ? (
                          <Video className="h-3 w-3 text-white" />
                        ) : (
                          <ImageIcon className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleDeletePortfolio(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PPV Tab */}
        <TabsContent value="ppv" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  PPV Items
                </CardDescription>
                <CardTitle className="text-2xl">{content.length}</CardTitle>
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
                  Earnings
                </CardDescription>
                <CardTitle className="text-2xl text-pink-500">
                  {totalEarnings}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* PPV Content Grid */}
          {content.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No PPV content yet</h3>
                <p className="text-muted-foreground mb-4">Upload paid content that fans can unlock with coins</p>
                <Button
                  onClick={() => { setIsPaid(true); setDialogOpen(true); }}
                  className="bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add PPV Content
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
                        alt={item.title || "PPV content"}
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
                      <div className="bg-pink-500/90 px-2 py-1 rounded flex items-center gap-1">
                        <Coins className="h-3 w-3 text-white" />
                        <span className="text-white text-xs font-bold">{item.coin_price}</span>
                      </div>
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
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{item.unlock_count} unlocks</span>
                      </div>
                    </div>
                    {item.title && (
                      <p className="text-sm font-medium mt-1 truncate">{item.title}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
