"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { StickyNote, X, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Suggested tags for quick selection
const SUGGESTED_TAGS = [
  "reliable",
  "professional",
  "great-energy",
  "punctual",
  "top-performer",
  "vip",
  "evening-preferred",
  "weekend-only",
  "last-minute-ok",
  "new",
];

interface ModelNotesDialogProps {
  modelId: string;
  modelName: string;
  trigger?: React.ReactNode;
  onNotesChange?: (hasNotes: boolean, tags: string[]) => void;
}

export function ModelNotesDialog({
  modelId,
  modelName,
  trigger,
  onNotesChange,
}: ModelNotesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/model-notes/${modelId}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      setNotes(data.notes || "");
      setTags(data.tags || []);
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  const fetchExistingTags = useCallback(async () => {
    try {
      const res = await fetch("/api/brands/tags");
      if (res.ok) {
        const data = await res.json();
        setExistingTags(data.tags?.map((t: { tag: string }) => t.tag) || []);
      }
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  }, []);

  // Fetch notes when dialog opens
  useEffect(() => {
    if (open) {
      fetchNotes();
      fetchExistingTags();
    }
  }, [open, fetchNotes, fetchExistingTags]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/brands/model-notes/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, tags }),
      });

      if (!res.ok) throw new Error("Failed to save notes");

      toast.success("Notes saved");
      onNotesChange?.(notes.length > 0 || tags.length > 0, tags);
      setOpen(false);
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
      setTags([...tags, cleanTag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const hasNotes = notes.length > 0 || tags.length > 0;

  // Combine suggested and existing tags, remove duplicates and already-selected
  const availableTags = [...new Set([...SUGGESTED_TAGS, ...existingTags])]
    .filter((t) => !tags.includes(t))
    .slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            className={cn(
              "p-2 rounded-full transition-all",
              hasNotes
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            )}
            aria-label="Model notes"
          >
            <StickyNote className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notes for {modelName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Private Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this model... (only visible to you)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Current Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags yet</span>
                )}
              </div>
            </div>

            {/* Add New Tag */}
            <div className="space-y-2">
              <Label htmlFor="new-tag">Add Tag</Label>
              <div className="flex gap-2">
                <Input
                  id="new-tag"
                  placeholder="Type a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim() || tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Tag Suggestions */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Quick Add</Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      disabled={tags.length >= 10}
                      className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
