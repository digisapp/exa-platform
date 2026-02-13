"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, FileImage, Video, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface ContentLibraryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentLibraryUploadDialog({
  open,
  onOpenChange,
  onCreated,
}: ContentLibraryUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFiles([]);
    setIsCreating(false);
  };

  const handleClose = (open: boolean) => {
    if (!open && !isCreating) {
      resetForm();
    }
    onOpenChange(open);
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: FileWithProgress[] = [];

    for (const file of fileArray) {
      if (files.length + validFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files per library item`);
        break;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 50MB)`);
        continue;
      }

      validFiles.push({ file, progress: 0, status: "pending" });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [files.length]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const uploadFileViaSigned = async (itemId: string, file: File, index: number) => {
    const signedRes = await fetch(`/api/admin/content-library/${itemId}/upload/signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!signedRes.ok) {
      const err = await signedRes.json();
      throw new Error(err.error || "Failed to get upload URL");
    }

    const { signedUrl, storagePath } = await signedRes.json();

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: 30 } : f));

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file to storage");
    }

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: 70 } : f));

    const completeRes = await fetch(`/api/admin/content-library/${itemId}/upload/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json();
      throw new Error(err.error || "Failed to complete upload");
    }

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: 100, status: "done" } : f));
  };

  const uploadFileDirect = async (itemId: string, file: File, index: number) => {
    const formData = new FormData();
    formData.append("file", file);

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: 50 } : f));

    const res = await fetch(`/api/admin/content-library/${itemId}/upload/direct`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to upload file");
    }

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, progress: 100, status: "done" } : f));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (files.length === 0) {
      toast.error("Please add at least one file");
      return;
    }

    setIsCreating(true);

    try {
      // Step 1: Create library item
      const createRes = await fetch("/api/admin/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create library item");
      }

      const { item } = await createRes.json();

      // Step 2: Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setFiles((prev) => prev.map((pf, pi) => pi === i ? { ...pf, status: "uploading" } : pf));

        try {
          if (f.file.size > DIRECT_UPLOAD_LIMIT) {
            await uploadFileViaSigned(item.id, f.file, i);
          } else {
            await uploadFileDirect(item.id, f.file, i);
          }
        } catch (fileError: any) {
          console.error(`Upload error for ${f.file.name}:`, fileError);
          setFiles((prev) =>
            prev.map((pf, pi) =>
              pi === i ? { ...pf, status: "error", error: fileError.message } : pf
            )
          );
        }
      }

      toast.success("Content uploaded to library!");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (error: any) {
      console.error("Library upload error:", error);
      toast.error(error.message || "Failed to upload content");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>
            Upload photos and videos to the content library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="lib-title">Title *</Label>
            <Input
              id="lib-title"
              placeholder="e.g., Summer Campaign 2026 Photos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lib-desc">Description (optional)</Label>
            <Textarea
              id="lib-desc"
              placeholder="Describe this content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={2}
              disabled={isCreating}
            />
          </div>

          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              isDragOver
                ? "border-pink-500 bg-pink-500/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              isCreating && "opacity-50 pointer-events-none"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP, GIF, MP4, MOV, WebM (max 50MB each, up to {MAX_FILES} files)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
              disabled={isCreating}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {files.map((f, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      {f.file.type.startsWith("video/") ? (
                        <Video className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileImage className="h-4 w-4 text-pink-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{formatFileSize(f.file.size)}</p>
                        {f.status === "uploading" && (
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        )}
                        {f.status === "done" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {f.status === "error" && (
                          <span className="text-xs text-red-500">{f.error || "Failed"}</span>
                        )}
                      </div>
                    </div>
                    {!isCreating && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || files.length === 0 || !title.trim()}
            className="bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to Library
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
