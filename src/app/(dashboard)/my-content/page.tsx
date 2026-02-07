"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2,
  FolderHeart,
  Image as ImageIcon,
  Video,
  Coins,
  Calendar,
  Play,
  Download,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface ContentItem {
  id: string;
  purchasedAt: string;
  coinsSpent: number;
  content: {
    id: string;
    title: string | null;
    description: string | null;
    mediaUrl: string;
    mediaType: string;
    previewUrl: string | null;
  };
  creator: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
  } | null;
}

export default function MyContentPage() {
  const [myContent, setMyContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin?redirect=/my-content");
        return;
      }
      fetchMyContent();
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMyContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchMyContent() {
    try {
      const typeParam = filter !== "all" ? `?type=${filter}` : "";
      const response = await fetch(`/api/content/my-content${typeParam}`);
      const data = await response.json();

      if (response.ok) {
        setMyContent(data.content || []);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  }

  const openViewer = (item: ContentItem) => {
    setSelectedItem(item);
    setShowViewer(true);
  };

  const handleDownload = async (item: ContentItem) => {
    try {
      const response = await fetch(item.content.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = item.content.mediaType === "video" ? "mp4" : "jpg";
      a.download = `${item.content.title || "content"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const stats = {
    total: myContent.length,
    photos: myContent.filter((i) => i.content.mediaType === "image").length,
    videos: myContent.filter((i) => i.content.mediaType === "video").length,
    totalSpent: myContent.reduce((acc, i) => acc + i.coinsSpent, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
            <FolderHeart className="h-6 w-6 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold">My Content</h1>
        </div>
        <p className="text-muted-foreground">
          All your purchased content in one place
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-card border">
          <p className="text-sm text-muted-foreground mb-1">Total Items</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <p className="text-sm text-muted-foreground mb-1">Photos</p>
          <p className="text-2xl font-bold">{stats.photos}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <p className="text-sm text-muted-foreground mb-1">Videos</p>
          <p className="text-2xl font-bold">{stats.videos}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <p className="text-sm text-muted-foreground mb-1">Coins Spent</p>
          <p className="text-2xl font-bold flex items-center gap-1">
            <Coins className="h-5 w-5 text-amber-500" />
            {stats.totalSpent}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className={cn(
            filter === "all" && "bg-gradient-to-r from-pink-500 to-violet-500"
          )}
        >
          All
        </Button>
        <Button
          variant={filter === "image" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("image")}
          className={cn(
            filter === "image" && "bg-gradient-to-r from-pink-500 to-violet-500"
          )}
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          Photos
        </Button>
        <Button
          variant={filter === "video" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("video")}
          className={cn(
            filter === "video" && "bg-gradient-to-r from-pink-500 to-violet-500"
          )}
        >
          <Video className="h-4 w-4 mr-1" />
          Videos
        </Button>
      </div>

      {/* Content Grid */}
      {myContent.length === 0 ? (
        <div className="text-center py-16">
          <FolderHeart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-6">
            Purchase exclusive content from models to build your collection
          </p>
          <Button asChild>
            <Link href="/models">Browse Models</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {myContent.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group relative rounded-xl overflow-hidden cursor-pointer",
                "bg-card border border-border/50",
                "hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10",
                "transition-all duration-300"
              )}
              onClick={() => openViewer(item)}
            >
              {/* Thumbnail */}
              <div
                className={cn(
                  "relative",
                  item.content.mediaType === "video"
                    ? "aspect-video"
                    : "aspect-[3/4]"
                )}
              >
                {item.content.previewUrl || item.content.mediaUrl ? (
                  <Image
                    src={item.content.previewUrl || item.content.mediaUrl}
                    alt={item.content.title || "Content"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                    {item.content.mediaType === "video" ? (
                      <Video className="h-8 w-8 text-white/50" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-white/50" />
                    )}
                  </div>
                )}

                {/* Owned Badge */}
                <div className="absolute top-2 left-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Owned
                  </div>
                </div>

                {/* Video indicator */}
                {item.content.mediaType === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
                      <Play className="h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      openViewer(item);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                {/* Creator */}
                {item.creator && (
                  <Link
                    href={`/${item.creator.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 mb-2 hover:opacity-80"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                      {item.creator.profilePhotoUrl ? (
                        <Image
                          src={item.creator.profilePhotoUrl}
                          alt={item.creator.username}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {item.creator.firstName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">
                      @{item.creator.username}
                    </span>
                  </Link>
                )}

                {/* Title */}
                {item.content.title && (
                  <p className="font-medium text-sm truncate mb-1">
                    {item.content.title}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.purchasedAt), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-500" />
                    {item.coinsSpent}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Content Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {selectedItem && (
            <>
              <DialogHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedItem.creator && (
                      <Link
                        href={`/${selectedItem.creator.username}`}
                        className="flex items-center gap-2 hover:opacity-80"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                          {selectedItem.creator.profilePhotoUrl ? (
                            <Image
                              src={selectedItem.creator.profilePhotoUrl}
                              alt={selectedItem.creator.username}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">
                              {selectedItem.creator.firstName?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {selectedItem.creator.firstName}{" "}
                            {selectedItem.creator.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{selectedItem.creator.username}
                          </p>
                        </div>
                      </Link>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                {selectedItem.content.title && (
                  <DialogTitle className="mt-3">
                    {selectedItem.content.title}
                  </DialogTitle>
                )}
              </DialogHeader>
              <div className="relative w-full mt-4">
                {selectedItem.content.mediaType === "video" ? (
                  <video
                    src={selectedItem.content.mediaUrl}
                    controls
                    className="w-full max-h-[70vh]"
                    autoPlay
                  />
                ) : (
                  <Image
                    src={selectedItem.content.mediaUrl}
                    alt={selectedItem.content.title || "Content"}
                    width={1200}
                    height={800}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                )}
              </div>
              <div className="p-4 pt-2 flex items-center justify-between text-sm text-muted-foreground border-t">
                <span>
                  Purchased {format(new Date(selectedItem.purchasedAt), "MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {selectedItem.coinsSpent} coins
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
