"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Video, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryFile {
  id: string;
  file_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  file_type: string;
  width?: number;
  height?: number;
}

interface DeliveryFileGridProps {
  files: DeliveryFile[];
  canDelete?: boolean;
  onDelete?: (fileId: string) => void;
  onDownload?: (file: DeliveryFile) => void;
  deleting?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeliveryFileGrid({
  files,
  canDelete = false,
  onDelete,
  onDownload,
  deleting,
}: DeliveryFileGridProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {files.map((file) => {
        const isImage = file.file_type === "image";

        return (
          <div
            key={file.id}
            className="group relative rounded-lg border overflow-hidden bg-muted/30"
          >
            {/* Preview */}
            <div className="aspect-square relative">
              {isImage ? (
                <Image
                  src={file.url}
                  alt={file.file_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted">
                  <Video className="h-10 w-10 text-muted-foreground" />
                </div>
              )}

              {/* Overlay actions on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onDownload && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => onDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => onDelete(file.id)}
                    disabled={deleting === file.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* File info */}
            <div className="p-2">
              <p className="text-xs font-medium truncate">{file.file_name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size_bytes)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
