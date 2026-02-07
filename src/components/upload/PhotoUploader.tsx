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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Direct upload to Supabase using signed URL (bypasses Vercel's 4.5MB limit)
  const uploadFileDirect = async (fileOrBlob: File | Blob, fileName?: string) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert Blob to File if needed
      let file: File;
      if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
        file = new File([fileOrBlob], fileName || "image.jpg", {
          type: fileOrBlob.type || "image/jpeg",
        });
      } else {
        file = fileOrBlob as File;
      }

      // Create preview
      setPreview(URL.createObjectURL(file));

      // Step 1: Get signed URL from our API
      const signedUrlResponse = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          title: null,
        }),
      });

      // Parse signed URL response with error handling
      let signedUrlData;
      try {
        signedUrlData = await signedUrlResponse.json();
      } catch {
        // Response wasn't valid JSON - likely a Vercel error page
        if (signedUrlResponse.status === 413) {
          throw new Error("FILE_TOO_LARGE");
        }
        throw new Error("Failed to get upload URL - server error");
      }

      if (!signedUrlResponse.ok) {
        throw new Error(signedUrlData.error || "Failed to get upload URL");
      }

      const { signedUrl, storagePath, bucket, uploadMeta } = signedUrlData;

      setUploadProgress(20);

      // Step 2: Upload directly to Supabase Storage
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Direct upload to storage failed");
      }

      setUploadProgress(80);

      // Step 3: Complete the upload by creating the media record
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          bucket,
          uploadMeta,
        }),
      });

      // Parse complete response with error handling
      let data;
      try {
        data = await completeResponse.json();
      } catch {
        // Response wasn't valid JSON
        if (completeResponse.status === 413) {
          throw new Error("FILE_TOO_LARGE");
        }
        throw new Error("Failed to complete upload - server error");
      }

      if (!completeResponse.ok) {
        throw new Error(data.error || "Failed to complete upload");
      }
      setUploadProgress(100);

      onUploadComplete(data.url, data.mediaAsset);
      toast.success("Photo uploaded!");

      // Clear preview after successful upload
      setPreview(null);
    } catch (error) {
      let message = error instanceof Error ? error.message : "Upload failed";

      // Show friendly messages for common errors
      if (message.includes("too large") || message.includes("413") || message.includes("FILE_TOO_LARGE")) {
        message = "Oops! This image is a bit too large. Try a smaller file or compress it first!";
      } else if (message.includes("network") || message.includes("fetch")) {
        message = "Connection issue! Check your internet and try again.";
      }

      onError?.(message);
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // Fallback upload through API (for small files or when direct fails)
  const uploadFileViaApi = async (fileOrBlob: File | Blob, fileName?: string) => {
    setPreview(URL.createObjectURL(fileOrBlob));
    setUploading(true);

    try {
      const formData = new FormData();
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

      // Handle 413 (Request Entity Too Large) specifically
      if (response.status === 413) {
        throw new Error("FILE_TOO_LARGE");
      }

      // Try to parse JSON, but handle non-JSON responses gracefully
      let data;
      try {
        data = await response.json();
      } catch {
        // If we can't parse JSON and response isn't ok, it's likely a server error
        if (!response.ok) {
          throw new Error("FILE_TOO_LARGE");
        }
        throw new Error("Something went wrong. Please try again!");
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploadComplete(data.url, data.mediaAsset);
      toast.success("Photo uploaded!");

      setPreview(null);
    } catch (error) {
      let message = error instanceof Error ? error.message : "Upload failed";

      // Show friendly message for file too large errors
      if (message === "FILE_TOO_LARGE") {
        message = "Oops! This image is a bit too large. Try a smaller file or compress it first!";
      }

      onError?.(message);
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // Main upload function - chooses direct or API based on file size
  const uploadFile = async (fileOrBlob: File | Blob, fileName?: string) => {
    const fileSize = fileOrBlob.size;

    // Use direct upload for files > 4MB (Vercel's limit is 4.5MB)
    // For avatar uploads, always use API route since they need profile update
    if (fileSize > 4 * 1024 * 1024 && type !== "avatar") {
      await uploadFileDirect(fileOrBlob, fileName);
    } else {
      await uploadFileViaApi(fileOrBlob, fileName);
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

    // Validate file size (50MB max)
    if (file.size > MAX_FILE_SIZE) {
      const error = "Image must be less than 50MB";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                {uploadProgress > 0 && (
                  <span className="text-white text-sm">{uploadProgress}%</span>
                )}
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
                JPEG, PNG, WebP, or GIF (max 50MB)
              </p>
            </div>
            <Button type="button" variant="outline" disabled={uploading}>
              Choose Photo
            </Button>
          </div>
        )}
      </div>

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
