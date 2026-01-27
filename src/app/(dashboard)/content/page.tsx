"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  Camera,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  asset_type: string;
  photo_url: string | null;
  url: string;
  created_at: string;
  title: string | null;
}

interface PremiumContent {
  id: string;
  title: string | null;
  description: string | null;
  media_type: string;
  media_url: string;
  preview_url: string | null;
  coin_price: number;
  unlock_count: number | null;
  created_at: string | null;
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
  const [modelUsername, setModelUsername] = useState<string | null>(null);
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
    if (!user) return;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "model" && actor.type !== "admin")) return;

    setActorId(actor.id);

    const { data: model } = await supabase
      .from("models")
      .select("id, username")
      .eq("user_id", user.id)
      .single() as { data: { id: string; username: string } | null };

    if (!model) {
      setLoading(false);
      return;
    }

    setModelId(model.id);
    setModelUsername(model.username);

    // Get portfolio content
    const { data: portfolioData } = await supabase
      .from("media_assets")
      .select("id, asset_type, photo_url, url, created_at, title")
      .eq("model_id", model.id)
      .in("asset_type", ["portfolio", "video"])
      .order("created_at", { ascending: false });

    setPortfolio((portfolioData || []) as MediaAsset[]);

    // Get PPV content
    const { data: contentData } = await supabase
      .from("premium_content")
      .select("*")
      .eq("model_id", model.id)
      .eq("is_active", true)
      .gt("coin_price", 0)
      .order("created_at", { ascending: false });

    setContent(contentData || []);

    // Get total earnings
    const { data: earnings } = await supabase
      .from("coin_transactions")
      .select("amount")
      .eq("actor_id", actor.id)
      .eq("action", "content_sale") as { data: { amount: number }[] | null };

    const total = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
    setTotalEarnings(total);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast.error("Unsupported format", {
        description: "Please select a JPG, PNG, WebP, GIF image or MP4, MOV, WebM video.",
        duration: 5000,
      });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileType = file.type.startsWith("video/") ? "Video" : "Photo";
      toast.error(`${fileType} too large`, {
        description: `Your file is ${formatFileSize(file.size)}. Maximum size is 50MB.`,
        duration: 5000,
      });
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  // Helper to safely parse JSON response
  const safeJsonParse = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      if (response.status === 413) {
        throw new Error("File too large for this upload method");
      }
      throw new Error("Server error - please try again");
    }
  };

  // Direct upload to Supabase using signed URL (bypasses Vercel's 4.5MB limit)
  const uploadViaSigned = async (file: File) => {
    // Step 1: Get signed URL
    const signedResponse = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        title: title || null,
      }),
    });

    const signedData = await safeJsonParse(signedResponse);
    if (!signedResponse.ok) throw new Error(signedData.error || "Failed to get upload URL");

    // Step 2: Upload directly to Supabase Storage
    const uploadResponse = await fetch(signedData.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) throw new Error("Upload to storage failed");

    // Step 3: Complete the upload
    const completeResponse = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signedData.storagePath,
        bucket: signedData.bucket,
        uploadMeta: signedData.uploadMeta,
      }),
    });

    const completeData = await safeJsonParse(completeResponse);
    if (!completeResponse.ok) throw new Error(completeData.error || "Failed to complete upload");

    return completeData;
  };

  const handleUpload = async () => {
    if (!mediaFile || !modelId) return;

    setUploading(true);
    const VERCEL_LIMIT = 4 * 1024 * 1024; // 4MB (conservative, Vercel is 4.5MB)

    try {
      if (isPaid) {
        // Premium content - use signed URL for large files
        if (mediaFile.size > VERCEL_LIMIT) {
          const data = await uploadViaSigned(mediaFile);
          await createPaidContent(data.url);
        } else {
          const formData = new FormData();
          formData.append("file", mediaFile);

          const uploadResponse = await fetch("/api/upload/premium", {
            method: "POST",
            body: formData,
          });

          const uploadData = await safeJsonParse(uploadResponse);
          if (!uploadResponse.ok) throw new Error(uploadData.error || "Failed to upload file");

          await createPaidContent(uploadData.url);
        }
      } else {
        // Free portfolio content - use signed URL for large files
        if (mediaFile.size > VERCEL_LIMIT) {
          await uploadViaSigned(mediaFile);
        } else {
          const formData = new FormData();
          formData.append("file", mediaFile);
          formData.append("type", mediaType === "video" ? "video" : "portfolio");
          if (title) {
            formData.append("title", title);
          }

          const uploadResponse = await fetch("/api/upload/media", {
            method: "POST",
            body: formData,
          });

          const uploadData = await safeJsonParse(uploadResponse);
          if (!uploadResponse.ok) throw new Error(uploadData.error || "Failed to upload file");
        }

        toast.success("Added to your portfolio!");
        setDialogOpen(false);
        resetForm();
        fetchContent();
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const fileType = mediaType === "video" ? "video" : "photo";

      // Provide user-friendly error messages
      if (errorMessage.includes("too large") || errorMessage.includes("413")) {
        toast.error("File too large", {
          description: `Your ${fileType} exceeds the 50MB limit. Please compress it or try a smaller file.`,
          duration: 5000,
        });
      } else if (errorMessage.includes("Invalid file type")) {
        toast.error("Unsupported format", {
          description: `This ${fileType} format isn't supported. Try MP4 for videos or JPG/PNG for photos.`,
          duration: 5000,
        });
      } else if (errorMessage.includes("storage failed")) {
        toast.error("Upload failed", {
          description: "We couldn't save your file. Please check your connection and try again.",
          duration: 5000,
        });
      } else {
        toast.error("Upload failed", {
          description: errorMessage,
          duration: 5000,
        });
      }
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

    toast.success("PPV content created!");
    setDialogOpen(false);
    resetForm();
    fetchContent();
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("Delete this content?")) return;

    const response = await fetch(`/api/content?id=${contentId}`, { method: "DELETE" });
    if (response.ok) {
      toast.success("Deleted");
      setContent((prev) => prev.filter((c) => c.id !== contentId));
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleDeletePortfolio = async (mediaId: string) => {
    const response = await fetch(`/api/upload?id=${mediaId}`, { method: "DELETE" });
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

  const openUploadDialog = (paid: boolean) => {
    setIsPaid(paid);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalUnlocks = content.reduce((sum, c) => sum + (c.unlock_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Content</h1>
        </div>
        <div className="flex items-center gap-3">
          {modelUsername && (
            <Button variant="outline" asChild>
              <Link href={`/${modelUsername}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </Button>
          )}
          <Button
            onClick={() => openUploadDialog(false)}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Camera className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{portfolio.length}</p>
                <p className="text-xs text-muted-foreground">Portfolio Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-500/20">
                <Lock className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content.length}</p>
                <p className="text-xs text-muted-foreground">PPV Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnlocks}</p>
                <p className="text-xs text-muted-foreground">Total Unlocks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEarnings}</p>
                <p className="text-xs text-muted-foreground">Coins Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - sticky on scroll */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md -mx-4 px-4 py-2 md:-mx-8 md:px-8">
          <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="portfolio" className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="ppv" className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            PPV Content
          </TabsTrigger>
          </TabsList>
        </div>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {portfolio.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Build Your Portfolio</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Upload photos and videos that showcase your work. These appear in your public profile.
                </p>
                <Button
                  onClick={() => openUploadDialog(false)}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Your First Photo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {portfolio.length} item{portfolio.length !== 1 ? 's' : ''} in your portfolio
                </p>
                <Button variant="outline" size="sm" onClick={() => openUploadDialog(false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add More
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    {item.asset_type === "video" ? (
                      <video src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={item.photo_url || item.url}
                        alt="Portfolio"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        {item.asset_type === "video" ? (
                          <Video className="h-3 w-3 text-white" />
                        ) : (
                          <ImageIcon className="h-3 w-3 text-white" />
                        )}
                        <span className="text-white text-xs">
                          {item.asset_type === "video" ? "Video" : "Photo"}
                        </span>
                      </div>
                    </div>

                    {/* Delete Button - visible on mobile, hover on desktop */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* Title overlay - show on hover */}
                    {item.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* PPV Tab */}
        <TabsContent value="ppv" className="space-y-4">
          {content.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 mb-4">
                  <Sparkles className="h-10 w-10 text-pink-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start Earning with PPV</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Upload exclusive content that fans can unlock with coins. Set your own prices and earn from every unlock.
                </p>
                <Button
                  onClick={() => openUploadDialog(true)}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  <Lock className="mr-2 h-5 w-5" />
                  Create PPV Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    {content.length} PPV item{content.length !== 1 ? 's' : ''}
                  </p>
                  {totalEarnings > 0 && (
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>{totalEarnings} coins earned</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => openUploadDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add PPV
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {content.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    {item.media_type === "video" ? (
                      <video src={item.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={item.media_url}
                        alt={item.title || "PPV"}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                    {/* Price Badge */}
                    <div className="absolute top-2 left-2">
                      <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                        <Coins className="h-3.5 w-3.5 text-white" />
                        <span className="text-white text-sm font-bold">{item.coin_price}</span>
                      </div>
                    </div>

                    {/* Stats Badge */}
                    {(item.unlock_count || 0) > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          <Eye className="h-3 w-3 text-white" />
                          <span className="text-white text-xs">{item.unlock_count || 0}</span>
                        </div>
                      </div>
                    )}

                    {/* Delete Button - visible on mobile, hover on desktop */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* Title overlay */}
                    {item.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isPaid ? "Create PPV Content" : "Upload to Portfolio"}</DialogTitle>
            <DialogDescription>
              {isPaid
                ? "Set a price and fans will pay coins to unlock this content"
                : "This will appear in your Photos/Videos tabs on your profile"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              {mediaPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                  {mediaType === "video" ? (
                    <video src={mediaPreview} className="w-full h-full object-contain" controls />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" fill className="object-contain" />
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Photo or video up to 50MB</p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {/* Title Input - for all content */}
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Add a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shows when viewers hover over your content
              </p>
            </div>

            {/* Content Type Toggle */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-colors",
              isPaid ? "border-pink-500/50 bg-pink-500/5" : "border-muted"
            )}>
              <div className="space-y-0.5">
                <Label htmlFor="paid-toggle" className="text-base font-medium">
                  {isPaid ? "PPV Content" : "Free Content"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPaid ? "Fans pay coins to unlock" : "Visible to everyone"}
                </p>
              </div>
              <Switch
                id="paid-toggle"
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
            </div>

            {/* PPV Options */}
            {isPaid && (
              <div className="space-y-4 p-4 rounded-xl bg-muted/50">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                    <Input
                      type="number"
                      min="1"
                      value={coinPrice}
                      onChange={(e) => setCoinPrice(e.target.value)}
                      className="pl-10 text-lg font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      coins
                    </span>
                  </div>
                </div>

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
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!mediaFile || uploading}
              className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  {isPaid ? `Create PPV (${coinPrice} coins)` : "Upload to Portfolio"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
