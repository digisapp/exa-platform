"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MediaAsset } from "@/types/database";
import { ImageCropper } from "./ImageCropper";

interface PhotoUploaderProps {
  type: "portfolio" | "message" | "avatar";
  onUploadComplete: (url: string, mediaAsset: MediaAsset) => void;
  onError?: (error: string) => void;
  className?: string;
  compact?: boolean; // For message attachments
}

export function PhotoUploader({
  type,
  onUploadComplete,
  onError,
  className,
  compact = false,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Actual upload function (used after validation and optional cropping)
  const uploadFile = async (fileOrBlob: File | Blob, fileName?: string) => {
    // Create preview
    setPreview(URL.createObjectURL(fileOrBlob));
    setUploading(true);

    try {
      const formData = new FormData();
      // If it's a Blob (from cropper), convert to File with a name
      if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
        const file = new File([fileOrBlob], fileName || "cropped-image.jpg", {
          type: fileOrBlob.type || "image/jpeg",
        });
        formData.append("file", file);
      } else {
        formData.append("file", fileOrBlob);
      }
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploadComplete(data.url, data.mediaAsset);

      if (data.pointsAwarded > 0) {
        toast.success(`Photo uploaded! +${data.pointsAwarded} points`);
      } else {
        toast.success("Photo uploaded successfully!");
      }

      // Clear preview after successful upload
      setPreview(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      onError?.(message);
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset file input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // Handle file selection (validates and optionally shows cropper)
  const handleFileSelect = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      const error = "Please select a valid image (JPEG, PNG, WebP, or GIF)";
      onError?.(error);
      toast.error(error);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      const error = "Image must be less than 5MB";
      onError?.(error);
      toast.error(error);
      return;
    }

    // For avatar uploads, show the cropper
    if (type === "avatar") {
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setCropperOpen(true);
      return;
    }

    // For other types, upload directly
    await uploadFile(file);
  };

  // Handle cropped image from the cropper
  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    await uploadFile(croppedBlob, "profile-photo.jpg");
  };

  // Handle cropper close
  const handleCropperClose = () => {
    setCropperOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const cancelUpload = () => {
    setPreview(null);
    setUploading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Compact version for message attachments
  if (compact) {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-muted-foreground hover:text-primary"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading}
      />

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          uploading && "pointer-events-none opacity-70"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 rounded-lg mx-auto"
            />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">
                Drag and drop a photo here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF (max 5MB)
              </p>
            </div>
            <Button type="button" variant="outline" disabled={uploading}>
              Choose Photo
            </Button>
          </div>
        )}
      </div>

      {type === "portfolio" && (
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Each portfolio photo earns you +10 points!
        </p>
      )}

      {/* Image Cropper Dialog for avatars */}
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
