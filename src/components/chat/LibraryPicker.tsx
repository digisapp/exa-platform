"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Video, Lock, Loader2, Check, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ContentItem {
  id: string;
  url: string;
  type: "photo" | "video";
  coinPrice?: number;
  thumbnail?: string | null;
}

interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ContentItem) => void;
  modelId: string;
}

export function LibraryPicker({
  open,
  onClose,
  onSelect,
  modelId,
}: LibraryPickerProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<ContentItem[]>([]);
  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [ppvContent, setPpvContent] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState("photos");

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, modelId]);

  const loadContent = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Load portfolio photos
      const { data: mediaAssets } = await (supabase
        .from("media_assets") as any)
        .select("id, photo_url, url, asset_type")
        .eq("model_id", modelId)
        .order("created_at", { ascending: false });

      if (mediaAssets) {
        const assets = mediaAssets as Array<{
          id: string;
          photo_url: string | null;
          url: string | null;
          asset_type: string;
        }>;

        const photoItems = assets
          .filter((a) => a.asset_type === "portfolio" || a.asset_type === "photo")
          .map((a) => ({
            id: a.id,
            url: a.photo_url || a.url || "",
            type: "photo" as const,
          }));

        const videoItems = assets
          .filter((a) => a.asset_type === "video")
          .map((a) => ({
            id: a.id,
            url: a.url || "",
            type: "video" as const,
          }));

        setPhotos(photoItems);
        setVideos(videoItems);
      }

      // Load PPV content
      const { data: premiumContent } = await (supabase
        .from("premium_content") as any)
        .select("id, media_url, media_type, coin_price, thumbnail_url")
        .eq("model_id", modelId)
        .eq("is_active", true)
        .gt("coin_price", 0)
        .order("created_at", { ascending: false });

      if (premiumContent) {
        const content = premiumContent as Array<{
          id: string;
          media_url: string;
          media_type: string;
          coin_price: number;
          thumbnail_url: string | null;
        }>;

        const ppvItems = content.map((p) => ({
          id: p.id,
          url: p.media_url,
          type: (p.media_type === "video" ? "video" : "photo") as "photo" | "video",
          coinPrice: p.coin_price,
          thumbnail: p.thumbnail_url,
        }));
        setPpvContent(ppvItems);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      setSelectedItem(null);
      onClose();
    }
  };

  const renderContentGrid = (items: ContentItem[], showPrice = false) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No content available</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
              selectedItem?.id === item.id
                ? "border-pink-500 ring-2 ring-pink-500/30"
                : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <img
                src={item.thumbnail || item.url}
                alt=""
                className="w-full h-full object-cover"
              />
            )}

            {/* Video indicator */}
            {item.type === "video" && (
              <div className="absolute top-1 left-1 p-1 rounded bg-black/60">
                <Video className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Price badge for PPV */}
            {showPrice && item.coinPrice && (
              <div className="absolute bottom-1 right-1">
                <Badge className="bg-pink-500 text-white text-xs gap-1">
                  <Coins className="h-3 w-3" />
                  {item.coinPrice}
                </Badge>
              </div>
            )}

            {/* Selected check */}
            {selectedItem?.id === item.id && (
              <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select from Library</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="photos" className="gap-2">
                  <Camera className="h-4 w-4" />
                  Photos
                  {photos.length > 0 && (
                    <span className="text-xs opacity-60">({photos.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-2">
                  <Video className="h-4 w-4" />
                  Videos
                  {videos.length > 0 && (
                    <span className="text-xs opacity-60">({videos.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ppv" className="gap-2">
                  <Lock className="h-4 w-4" />
                  PPV
                  {ppvContent.length > 0 && (
                    <span className="text-xs opacity-60">({ppvContent.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photos" className="mt-4">
                {renderContentGrid(photos)}
              </TabsContent>

              <TabsContent value="videos" className="mt-4">
                {renderContentGrid(videos)}
              </TabsContent>

              <TabsContent value="ppv" className="mt-4">
                {renderContentGrid(ppvContent, true)}
              </TabsContent>
            </Tabs>

            {/* Selected item info */}
            {selectedItem && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  {selectedItem.type === "video" ? (
                    <Video className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Camera className="h-4 w-4 text-pink-500" />
                  )}
                  <span className="text-sm font-medium">
                    {selectedItem.type === "video" ? "Video" : "Photo"} selected
                  </span>
                  {selectedItem.coinPrice && (
                    <Badge variant="secondary" className="gap-1">
                      <Coins className="h-3 w-3" />
                      {selectedItem.coinPrice} coins
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSelect}
                disabled={!selectedItem}
                className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500"
              >
                Send
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
