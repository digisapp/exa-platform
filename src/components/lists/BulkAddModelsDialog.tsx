"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Model {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
  city?: string;
  state?: string;
}

interface BulkAddModelsDialogProps {
  listId: string;
  listName: string;
  existingModelIds: string[];
}

export function BulkAddModelsDialog({ listId, listName, existingModelIds }: BulkAddModelsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Search models when query changes
  useEffect(() => {
    if (!open) return;

    const searchModels = async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/models/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          // Filter out models already in the list
          const filtered = (data.models || []).filter(
            (m: Model) => !existingModelIds.includes(m.id)
          );
          setModels(filtered);
        }
      } catch (error) {
        // Silent fail for search
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchModels, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, existingModelIds]);

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
    } else {
      newSelected.add(modelId);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    setAdding(true);
    try {
      // Add each selected model to the list
      const promises = Array.from(selectedIds).map((modelId) =>
        fetch(`/api/lists/${listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId }),
        })
      );

      await Promise.all(promises);

      toast.success(`Added ${selectedIds.size} model${selectedIds.size > 1 ? "s" : ""} to ${listName}`);
      setOpen(false);
      setSelectedIds(new Set());
      setSearchQuery("");
      router.refresh();
    } catch (error) {
      toast.error("Failed to add models to list");
    } finally {
      setAdding(false);
    }
  };

  const getModelName = (model: Model) => {
    return model.first_name
      ? `${model.first_name} ${model.last_name || ""}`.trim()
      : model.username;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Models
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Models to {listName}</DialogTitle>
          <DialogDescription>
            Search and select models to add to this list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-2 py-1 bg-violet-500/10 rounded-lg">
              <span className="text-sm font-medium text-violet-500">
                {selectedIds.size} model{selectedIds.size > 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Models List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {searching ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : models.length > 0 ? (
              models.map((model) => {
                const isSelected = selectedIds.has(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-border hover:border-violet-500/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex-shrink-0">
                      {model.profile_photo_url ? (
                        <Image
                          src={model.profile_photo_url}
                          alt={getModelName(model)}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                          {getModelName(model).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{getModelName(model)}</p>
                      <p className="text-xs text-muted-foreground">@{model.username}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-violet-500 bg-violet-500 text-white"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })
            ) : searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                No models found
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Type to search for models
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={adding}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || adding}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Add ${selectedIds.size || ""} Model${selectedIds.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
