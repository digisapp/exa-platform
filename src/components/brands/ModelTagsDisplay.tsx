"use client";

import { useState, useEffect, useCallback } from "react";
import { StickyNote } from "lucide-react";
import { ModelNotesDialog } from "./ModelNotesDialog";
import { cn } from "@/lib/utils";

interface ModelTagsDisplayProps {
  modelId: string;
  modelName: string;
}

export function ModelTagsDisplay({ modelId, modelName }: ModelTagsDisplayProps) {
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/model-notes/${modelId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || "");
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setLoaded(true);
    }
  }, [modelId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const hasNotes = notes.length > 0 || tags.length > 0;

  const handleNotesChange = (hasNotes: boolean, newTags: string[]) => {
    setTags(newTags);
    if (!hasNotes) {
      setNotes("");
    }
  };

  if (!loaded) return null;

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
      {/* Notes Button */}
      <ModelNotesDialog
        modelId={modelId}
        modelName={modelName}
        onNotesChange={handleNotesChange}
        trigger={
          <button
            className={cn(
              "p-1.5 rounded-full transition-all",
              hasNotes
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-black/50 backdrop-blur-sm text-white/70 hover:bg-black/70 hover:text-white"
            )}
            aria-label="Model notes"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-violet-500/80 text-white truncate max-w-[60px]"
              title={tag}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-700 text-white">
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
