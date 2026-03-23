"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Coins,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  Camera,
  ExternalLink,
  Sparkles,
  TrendingUp,
  FolderDown,
  Inbox,
  DollarSign,
  CameraIcon,
  ImagePlus,
  XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LibraryContentCard } from "@/components/deliveries/LibraryContentCard";
import { LibraryContentDetailSheet } from "@/components/deliveries/LibraryContentDetailSheet";

interface MediaAsset {
  id: string;
  asset_type: string;
  photo_url: string | null;
  url: string;
  created_at: string;
  title: string | null;
  is_visible: boolean | null;
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

interface LibraryItem {
  assignmentId: string;
  libraryItemId: string;
  title: string;
  description: string | null;
  notes: string | null;
  assignedAt: string;
  fileCount: number;
  totalSize: number;
}

export default function ContentPage() {
  const supabase = createClient();

  const [content, setContent] = useState<PremiumContent[]>([]);
  const [portfolio, setPortfolio] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string | null>(null);
  const [librarySheetOpen, setLibrarySheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "portfolio" | "ppv" } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [coinPrice, setCoinPrice] = useState("10");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  // Multi-file upload state (portfolio only)
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null); // e.g. "Uploading 2 of 5..."
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);

  const fetchContent = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "model" && actor.type !== "admin")) return;

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
    // Note: is_visible column added via migration - using * to include it when available
    const { data: portfolioData } = await supabase
      .from("media_assets")
      .select("*")
      .eq("model_id", model.id)
      .in("asset_type", ["portfolio", "video"])
      .order("created_at", { ascending: false });

    setPortfolio((portfolioData || []) as unknown as MediaAsset[]);

    // Get PPV content via API (generates fresh signed URLs)
    try {
      const res = await fetch(`/api/content?modelId=${model.id}`);
      if (res.ok) {
        const data = await res.json();
        const items = (data.content || []).map((item: any) => ({
          ...item,
          media_url: item.mediaUrl || item.media_url,
        }));
        setContent(items);
      }
    } catch (error) {
      console.error("Failed to load PPV content:", error);
    }

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

  const loadLibraryItems = useCallback(async () => {
    try {
      const res = await fetch("/api/media-hub/assigned");
      if (res.ok) {
        const data = await res.json();
        setLibraryItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load library items:", error);
    }
  }, []);

  useEffect(() => {
    fetchContent();
    loadLibraryItems();
  }, [fetchContent, loadLibraryItems]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Unsupported format", {
        description: "Please select a JPG, PNG, WebP, GIF image or MP4, MOV, WebM video.",
        duration: 5000,
      });
      return false;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileType = file.type.startsWith("video/") ? "Video" : "Photo";
      toast.error(`${fileType} too large`, {
        description: `Your file is ${formatFileSize(file.size)}. Maximum size is 50MB.`,
        duration: 5000,
      });
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset the input so the same file(s) can be re-selected
    e.target.value = "";

    if (isPaid) {
      // PPV: single file only
      const file = files[0];
      if (!validateFile(file)) return;
      setMediaType(file.type.startsWith("video/") ? "video" : "image");
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      // Portfolio: multi-file support
      const valid = files.filter(validateFile);
      if (valid.length === 0) return;

      if (valid.length === 1 && mediaFiles.length === 0) {
        // Single file - also set the legacy single-file state for preview
        setMediaType(valid[0].type.startsWith("video/") ? "video" : "image");
        setMediaFile(valid[0]);
        setMediaPreview(URL.createObjectURL(valid[0]));
      }

      setMediaFiles((prev) => [...prev, ...valid]);
      setMediaPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    }
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
  const uploadViaSigned = async (file: File, fileTitle?: string) => {
    // Step 1: Get signed URL
    setUploadProgress(5);
    const signedResponse = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        title: fileTitle ?? title || null,
      }),
    });

    const signedData = await safeJsonParse(signedResponse);
    if (!signedResponse.ok) throw new Error(signedData.error || "Failed to get upload URL");

    // Step 2: Upload directly to Supabase Storage with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedData.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Map upload progress to 10-85% range (5% for signed URL, 85-100% for completion)
          const pct = Math.round(10 + (e.loaded / e.total) * 75);
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload to storage failed"));
      };
      xhr.onerror = () => reject(new Error("Upload to storage failed"));
      xhr.send(file);
    });

    // Step 3: Complete the upload
    setUploadProgress(90);
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

    setUploadProgress(100);
    return completeData;
  };

  const uploadSingleFile = async (file: File, fileTitle?: string) => {
    const VERCEL_LIMIT = 4 * 1024 * 1024;
    const type = file.type.startsWith("video/") ? "video" : "image";

    if (isPaid) {
      if (file.size > VERCEL_LIMIT) {
        const data = await uploadViaSigned(file, fileTitle);
        await createPaidContent(data.storagePath || data.url);
      } else {
        setUploadProgress(10);
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/upload/premium", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(80);
        const uploadData = await safeJsonParse(uploadResponse);
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Failed to upload file");

        await createPaidContent(uploadData.storagePath || uploadData.url);
        setUploadProgress(100);
      }
    } else {
      if (file.size > VERCEL_LIMIT) {
        await uploadViaSigned(file, fileTitle);
      } else {
        setUploadProgress(10);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type === "video" ? "video" : "portfolio");
        if (fileTitle) formData.append("title", fileTitle);

        const uploadResponse = await fetch("/api/upload/media", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(80);
        const uploadData = await safeJsonParse(uploadResponse);
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Failed to upload file");
        setUploadProgress(100);
      }
    }
  };

  const handleUpload = async () => {
    if (!modelId) return;

    // Determine which files to upload
    const filesToUpload = isPaid ? (mediaFile ? [mediaFile] : []) : mediaFiles.length > 0 ? mediaFiles : (mediaFile ? [mediaFile] : []);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(0);

        if (filesToUpload.length > 1) {
          setUploadStatus(`Uploading ${i + 1} of ${filesToUpload.length}...`);
        }

        try {
          await uploadSingleFile(file, filesToUpload.length > 1 ? undefined : title || undefined);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to upload file ${i + 1}:`, error);
        }
      }

      if (isPaid) {
        // PPV success is handled in createPaidContent
      } else {
        if (failCount === 0) {
          toast.success(
            successCount === 1
              ? "Added to your portfolio!"
              : `${successCount} items added to your portfolio!`
          );
        } else {
          toast.warning(`${successCount} uploaded, ${failCount} failed`, {
            description: "Some files couldn't be uploaded. Try again for the failed ones.",
            duration: 5000,
          });
        }
        setDialogOpen(false);
        resetForm();
        fetchContent();
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const fileType = mediaType === "video" ? "video" : "photo";

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
      setUploadProgress(0);
      setUploadStatus(null);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "ppv") {
      const response = await fetch(`/api/content?id=${deleteTarget.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Deleted");
        setContent((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        toast.error("Failed to delete");
      }
    } else {
      const response = await fetch(`/api/upload?id=${deleteTarget.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Deleted");
        setPortfolio((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      } else {
        toast.error("Failed to delete");
      }
    }

    setDeleteTarget(null);
  };

  const handleToggleVisibility = async (mediaId: string, currentVisible: boolean | null) => {
    const newVisible = !(currentVisible !== false); // Toggle: null/true → false, false → true
    // Note: is_visible column added via migration - using type assertion until types are regenerated
    const { error } = await (supabase
      .from("media_assets") as any)
      .update({ is_visible: newVisible })
      .eq("id", mediaId);

    if (!error) {
      setPortfolio((prev) =>
        prev.map((p) => (p.id === mediaId ? { ...p, is_visible: newVisible } : p))
      );
      toast.success(newVisible ? "Now visible on profile" : "Hidden from profile");
    } else {
      toast.error("Failed to update visibility");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIsPaid(false);
    setCoinPrice("10");
    setMediaFile(null);
    setMediaPreview(null);
    setMediaFiles([]);
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setMediaPreviews([]);
    setUploadProgress(0);
    setUploadStatus(null);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    // If removing the last file, also clear single-file state
    if (mediaFiles.length <= 1) {
      setMediaFile(null);
      setMediaPreview(null);
    }
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
                {totalEarnings > 0 && (
                  <p className="text-xs text-green-500 font-medium flex items-center gap-0.5 mt-0.5">
                    <DollarSign className="h-3 w-3" />
                    {(totalEarnings * 0.10).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - sticky on scroll */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md -mx-4 px-4 py-2 md:-mx-8 md:px-8">
          <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="portfolio" className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="ppv" className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            PPV Content
          </TabsTrigger>
          <TabsTrigger value="exa" className="flex items-center gap-2 text-base">
            <FolderDown className="h-4 w-4" />
            From EXA {libraryItems.length > 0 && `(${libraryItems.length})`}
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
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        preload="metadata"
                      />
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

                    {/* Action Buttons - visible on mobile, hover on desktop */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          item.is_visible === false ? "bg-yellow-500/80 hover:bg-yellow-500" : "bg-white/80 hover:bg-white"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(item.id, item.is_visible);
                        }}
                        title={item.is_visible === false ? "Hidden from profile - click to show" : "Visible on profile - click to hide"}
                      >
                        {item.is_visible === false ? (
                          <EyeOff className="h-4 w-4 text-yellow-900" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-700" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: item.id, type: "portfolio" });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Hidden indicator - always visible when hidden */}
                    {item.is_visible === false && (
                      <div className="absolute bottom-2 right-2 bg-yellow-500 px-2 py-1 rounded-full flex items-center gap-1">
                        <EyeOff className="h-3 w-3 text-yellow-900" />
                        <span className="text-yellow-900 text-xs font-medium">Hidden</span>
                      </div>
                    )}

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
                      <span>{totalEarnings} coins (${(totalEarnings * 0.10).toFixed(2)})</span>
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
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        preload="metadata"
                      />
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
                        setDeleteTarget({ id: item.id, type: "ppv" });
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

        {/* From EXA Tab */}
        <TabsContent value="exa" className="space-y-4">
          {libraryItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No shared content yet</p>
              <p className="text-sm mt-1">
                Content shared by EXA will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {libraryItems.map((item) => (
                <LibraryContentCard
                  key={item.assignmentId}
                  item={item}
                  onClick={() => {
                    setSelectedLibraryItemId(item.libraryItemId);
                    setLibrarySheetOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteTarget?.type === "ppv" ? "PPV content" : "portfolio item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "ppv"
                ? "This will permanently remove this content and it will no longer be available to fans."
                : "This will permanently remove this item from your portfolio and public profile."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Library Content Detail Sheet */}
      <LibraryContentDetailSheet
        open={librarySheetOpen}
        onOpenChange={setLibrarySheetOpen}
        libraryItemId={selectedLibraryItemId}
      />

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!uploading) { setDialogOpen(open); if (!open) resetForm(); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPaid ? "Create PPV Content" : "Upload to Portfolio"}</DialogTitle>
            <DialogDescription>
              {isPaid
                ? "Set a price and fans will pay coins to unlock this content"
                : "Add photos and videos to your public profile"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Selection Area */}
            <div className="space-y-3">
              {/* Single file preview (PPV) or multi-file thumbnails (portfolio) */}
              {isPaid && mediaPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                  {mediaType === "video" ? (
                    <video src={mediaPreview} className="w-full h-full object-contain" controls playsInline />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" fill className="object-contain" />
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaFiles([]); setMediaPreviews([]); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : !isPaid && mediaFiles.length > 0 ? (
                <div className="space-y-3">
                  {/* Multi-file thumbnail grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {mediaPreviews.map((preview, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {mediaFiles[i]?.type.startsWith("video/") ? (
                          <video src={preview} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        ) : (
                          <Image src={preview} alt={`File ${i + 1}`} fill className="object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"
                        >
                          <XCircle className="h-4 w-4 text-white" />
                        </button>
                        {mediaFiles[i]?.type.startsWith("video/") && (
                          <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                            Video
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Add more button in grid */}
                    <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Add more</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""} selected
                    ({formatFileSize(mediaFiles.reduce((sum, f) => sum + f.size, 0))})
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Main upload area */}
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors">
                    <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      {isPaid ? "Select photo or video" : "Select from library"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isPaid ? "Photo or video up to 50MB" : "Select multiple photos & videos"}
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple={!isPaid}
                      onChange={handleFileSelect}
                    />
                  </label>

                  {/* Camera capture buttons - visible on all devices, functional on mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <CameraIcon className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12"
                      onClick={() => videoCameraInputRef.current?.click()}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Record Video
                    </Button>
                    {/* Hidden camera inputs with capture attribute for iOS/Android */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                    />
                    <input
                      ref={videoCameraInputRef}
                      type="file"
                      className="hidden"
                      accept="video/*"
                      capture="environment"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Title Input - show for PPV or single portfolio file */}
            {(isPaid || mediaFiles.length <= 1) && (
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Add a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}

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
                onCheckedChange={(checked) => {
                  setIsPaid(checked);
                  // When switching to PPV, keep only first file
                  if (checked && mediaFiles.length > 1) {
                    const first = mediaFiles[0];
                    const firstPreview = mediaPreviews[0];
                    mediaPreviews.slice(1).forEach((url) => URL.revokeObjectURL(url));
                    setMediaFiles([first]);
                    setMediaPreviews([firstPreview]);
                    setMediaFile(first);
                    setMediaPreview(firstPreview);
                    setMediaType(first.type.startsWith("video/") ? "video" : "image");
                  }
                }}
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
                      inputMode="numeric"
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

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadStatus || "Uploading..."}
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={(isPaid ? !mediaFile : mediaFiles.length === 0) || uploading}
              className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {uploadStatus || "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  {isPaid
                    ? `Create PPV (${coinPrice} coins)`
                    : mediaFiles.length > 1
                      ? `Upload ${mediaFiles.length} Files`
                      : "Upload to Portfolio"
                  }
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
