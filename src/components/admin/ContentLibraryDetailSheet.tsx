"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeliveryFileGrid } from "@/components/deliveries/DeliveryFileGrid";
import { ContentAssignDialog } from "./ContentAssignDialog";
import {
  Loader2,
  Download,
  Share2,
  Trash2,
  Pencil,
  Building2,
  User,
  Calendar,
  FileImage,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface LibraryItemDetail {
  id: string;
  title: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  files: any[];
  assignments: {
    id: string;
    recipient_actor_id: string;
    notes: string | null;
    assigned_at: string;
    recipientType: "brand" | "model" | "unknown";
    brand: {
      id: string;
      company_name: string;
      logo_url: string | null;
    } | null;
    model: {
      id: string;
      name: string;
      imageUrl: string | null;
    } | null;
  }[];
}

interface ContentLibraryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  onUpdated?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentLibraryDetailSheet({
  open,
  onOpenChange,
  itemId,
  onUpdated,
}: ContentLibraryDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<LibraryItemDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && itemId) {
      loadItem();
    } else {
      setItem(null);
      setEditing(false);
    }
  }, [open, itemId]);

  const loadItem = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media-hub/${itemId}`);
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

  const handleSaveEdit = async () => {
    if (!itemId || !editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media-hub/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Updated");
        setEditing(false);
        loadItem();
        onUpdated?.();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!itemId) return;
    setDeleting(fileId);
    try {
      const res = await fetch(`/api/admin/media-hub/${itemId}/files/${fileId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("File deleted");
        loadItem();
        onUpdated?.();
      } else {
        toast.error("Failed to delete file");
      }
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!itemId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/media-hub/assigned/${itemId}/download`, {
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
    if (!itemId) return;
    try {
      const res = await fetch(`/api/media-hub/assigned/${itemId}/download`, {
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

  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!itemId) return;
    setRevokingId(assignmentId);
    try {
      const res = await fetch(
        `/api/admin/media-hub/${itemId}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("Assignment revoked");
        loadItem();
        onUpdated?.();
      } else {
        toast.error("Failed to revoke");
      }
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setRevokingId(null);
    }
  };

  const startEditing = () => {
    if (!item) return;
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditing(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !item ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Item not found</p>
            </div>
          ) : (
            <>
              <SheetHeader>
                {editing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        maxLength={2000}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving || !editTitle.trim()}
                      >
                        {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <SheetTitle className="pr-8">{item.title}</SheetTitle>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startEditing}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {item.description && (
                      <SheetDescription>{item.description}</SheetDescription>
                    )}
                  </>
                )}
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Date */}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>

                {/* Files */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Files ({item.files.length})
                    </p>
                    {item.files.length > 0 && (
                      <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={downloading}>
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
                    canDelete
                    onDelete={handleDeleteFile}
                    onDownload={handleDownloadSingle}
                    deleting={deleting}
                  />
                </div>

                {/* Assignments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Assigned ({item.assignments.length})
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>

                  {item.assignments.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg">
                      <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Not assigned to anyone yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.assignments.map((assignment) => {
                        const isBrand = assignment.recipientType === "brand";
                        const name = isBrand
                          ? (assignment.brand?.company_name || "Unknown Brand")
                          : (assignment.model?.name || "Unknown Model");
                        const imageUrl = isBrand
                          ? assignment.brand?.logo_url
                          : assignment.model?.imageUrl;
                        const Icon = isBrand ? Building2 : User;
                        const typeLabel = isBrand ? "Brand" : "Model";

                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {typeLabel} &middot; {new Date(assignment.assigned_at).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              onClick={() => handleRevokeAssignment(assignment.id)}
                              disabled={revokingId === assignment.id}
                            >
                              {revokingId === assignment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {item && (
        <ContentAssignDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          libraryItemId={item.id}
          libraryItemTitle={item.title}
          existingRecipientIds={item.assignments.map((a) => a.recipient_actor_id)}
          onAssigned={loadItem}
        />
      )}
    </>
  );
}
