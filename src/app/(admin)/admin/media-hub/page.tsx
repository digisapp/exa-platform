"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentLibraryUploadDialog } from "@/components/admin/ContentLibraryUploadDialog";
import { ContentLibraryDetailSheet } from "@/components/admin/ContentLibraryDetailSheet";
import {
  ArrowLeft,
  FolderOpen,
  Plus,
  Search,
  Loader2,
  FileImage,
  Share2,
  Calendar,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  fileCount: number;
  totalSize: number;
  assignmentCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminContentLibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/media-hub?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load library:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCardClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setDetailOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this media and all its files? This cannot be undone.")) return;

    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/admin/media-hub/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Media deleted");
        loadItems();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20">
              <FolderOpen className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Media Hub</h1>
              <p className="text-sm text-muted-foreground">
                Upload media and share with brands & models
              </p>
            </div>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-pink-500 to-violet-500"
          onClick={() => setUploadDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Media
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">
            {searchQuery ? "No media matches your search" : "No media uploaded yet"}
          </p>
          <p className="text-sm mt-1">
            {searchQuery ? "Try a different search term" : "Click \"New Media\" to upload photos and videos"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-pink-500/30 transition-colors group"
              onClick={() => handleCardClick(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm truncate pr-2">{item.title}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileImage className="h-3.5 w-3.5" />
                    {item.fileCount} file{item.fileCount !== 1 ? "s" : ""}
                    {item.totalSize > 0 && ` (${formatFileSize(item.totalSize)})`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                    {item.assignmentCount} assigned
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <ContentLibraryUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onCreated={loadItems}
      />

      {/* Detail Sheet */}
      <ContentLibraryDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        itemId={selectedItemId}
        onUpdated={loadItems}
      />
    </div>
  );
}
