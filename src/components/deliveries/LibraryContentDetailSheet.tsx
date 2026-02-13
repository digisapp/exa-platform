"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeliveryFileGrid } from "./DeliveryFileGrid";
import {
  Loader2,
  Download,
  Calendar,
  FileImage,
  FolderDown,
} from "lucide-react";
import { toast } from "sonner";

interface LibraryItemDetail {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  assignedAt: string;
  created_at: string;
  files: any[];
}

interface LibraryContentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryItemId: string | null;
}

export function LibraryContentDetailSheet({
  open,
  onOpenChange,
  libraryItemId,
}: LibraryContentDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<LibraryItemDetail | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && libraryItemId) {
      loadItem();
    } else {
      setItem(null);
    }
  }, [open, libraryItemId]);

  const loadItem = async () => {
    if (!libraryItemId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content-library/assigned/${libraryItemId}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
      }
    } catch (error) {
      console.error("Failed to load item:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!libraryItemId) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/content-library/assigned/${libraryItemId}/download`, {
        method: "POST",
      });

      if (!res.ok) {
        toast.error("Failed to generate download links");
        return;
      }

      const { downloads } = await res.json();

      for (const dl of downloads) {
        if (dl.downloadUrl) {
          const a = document.createElement("a");
          a.href = dl.downloadUrl;
          a.download = dl.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(`Downloading ${downloads.length} file${downloads.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to download files");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingle = async (file: any) => {
    if (!libraryItemId) return;
    try {
      const res = await fetch(`/api/content-library/assigned/${libraryItemId}/download`, {
        method: "POST",
      });
      if (!res.ok) return;
      const { downloads } = await res.json();
      const dl = downloads.find((d: any) => d.fileId === file.id);
      if (dl?.downloadUrl) {
        const a = document.createElement("a");
        a.href = dl.downloadUrl;
        a.download = dl.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      toast.error("Failed to download file");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !item ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Content not found</p>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FolderDown className="h-5 w-5 text-pink-500" />
                {item.title}
              </SheetTitle>
              {item.description && (
                <SheetDescription>{item.description}</SheetDescription>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Date info */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Shared {new Date(item.assignedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>

              {/* Admin notes */}
              {item.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{item.notes}</p>
                </div>
              )}

              {/* Files */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Files ({item.files.length})
                  </p>
                  {item.files.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadAll}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      Download All
                    </Button>
                  )}
                </div>

                <DeliveryFileGrid
                  files={item.files}
                  canDelete={false}
                  onDownload={handleDownloadSingle}
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
