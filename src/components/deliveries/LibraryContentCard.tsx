"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FolderDown, FileImage, Calendar } from "lucide-react";

interface LibraryContentItem {
  assignmentId: string;
  libraryItemId: string;
  title: string;
  description: string | null;
  notes: string | null;
  assignedAt: string;
  fileCount: number;
  totalSize: number;
}

interface LibraryContentCardProps {
  item: LibraryContentItem;
  onClick: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryContentCard({ item, onClick }: LibraryContentCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-pink-500/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 flex-shrink-0">
            <FolderDown className="h-4 w-4 text-pink-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{item.title}</h3>

            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            )}

            {item.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                Note: {item.notes}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileImage className="h-3.5 w-3.5" />
                {item.fileCount} file{item.fileCount !== 1 ? "s" : ""}
                {item.totalSize > 0 && ` (${formatFileSize(item.totalSize)})`}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(item.assignedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
