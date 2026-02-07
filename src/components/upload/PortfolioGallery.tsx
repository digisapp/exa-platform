"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Star, Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MediaAsset } from "@/types/database";

interface PortfolioGalleryProps {
  photos: MediaAsset[];
  onDelete: (photoId: string) => void;
  onSetPrimary?: (photoId: string) => void;
  className?: string;
}

export function PortfolioGallery({
  photos,
  onDelete,
  onSetPrimary,
  className,
}: PortfolioGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const handleDelete = async (photo: MediaAsset) => {
    setDeletingId(photo.id);
    setConfirmDelete(null);

    try {
      const response = await fetch(`/api/upload?id=${photo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }

      onDelete(photo.id);
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete photo"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    if (!onSetPrimary) return;

    setSettingPrimary(photoId);

    try {
      // This would call an API to update the primary photo
      // For now, we'll just call the callback
      onSetPrimary(photoId);
      toast.success("Primary photo updated");
    } catch {
      toast.error("Failed to set primary photo");
    } finally {
      setSettingPrimary(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-12 bg-muted/30 rounded-xl border border-dashed",
          className
        )}
      >
        <ImageOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No photos yet</p>
        <p className="text-sm text-muted-foreground/70">
          Upload your first photo to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className
        )}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-square rounded-xl overflow-hidden bg-muted"
          >
            <Image
              src={photo.url || ""}
              alt="Portfolio photo"
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onSetPrimary && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleSetPrimary(photo.id)}
                  disabled={settingPrimary === photo.id || !!photo.is_primary}
                >
                  {settingPrimary === photo.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Star
                      className={cn(
                        "h-4 w-4",
                        photo.is_primary && "fill-yellow-400 text-yellow-400"
                      )}
                    />
                  )}
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                onClick={() => setConfirmDelete(photo)}
                disabled={deletingId === photo.id}
              >
                {deletingId === photo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Primary badge */}
            {photo.is_primary && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-yellow-950 text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Primary
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {confirmDelete && (
            <div className="my-4">
              <Image
                src={confirmDelete.url || ""}
                alt="Photo to delete"
                width={400}
                height={192}
                className="max-h-48 mx-auto rounded-lg"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
