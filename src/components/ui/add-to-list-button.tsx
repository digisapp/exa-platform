"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ListPlus, Plus, Check, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface List {
  id: string;
  name: string;
  color: string;
  inList: boolean;
  itemCount: number;
}

interface AddToListButtonProps {
  modelId: string;
  modelName: string;
  size?: "sm" | "md" | "lg";
}

export function AddToListButton({
  modelId,
  modelName,
  size = "md",
}: AddToListButtonProps) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Fetch lists when popover opens
  useEffect(() => {
    if (open) {
      fetchLists();
    }
  }, [open]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/model/${modelId}`);
      if (!res.ok) throw new Error("Failed to fetch lists");
      const data = await res.json();
      setLists(data.lists || []);
    } catch (error) {
      console.error("Error fetching lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleList = async (listId: string, currentlyInList: boolean) => {
    setToggling(listId);
    try {
      const res = await fetch(`/api/lists/model/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, add: !currentlyInList }),
      });

      if (!res.ok) throw new Error("Failed to update list");

      // Update local state
      setLists(lists.map(list =>
        list.id === listId
          ? { ...list, inList: !currentlyInList, itemCount: list.itemCount + (currentlyInList ? -1 : 1) }
          : list
      ));

      const listName = lists.find(l => l.id === listId)?.name;
      toast.success(
        currentlyInList
          ? `Removed ${modelName} from ${listName}`
          : `Added ${modelName} to ${listName}`
      );
    } catch (error) {
      toast.error("Failed to update list");
    } finally {
      setToggling(null);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create list");
      }

      const data = await res.json();

      // Add to list immediately
      await fetch(`/api/lists/model/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: data.list.id, add: true }),
      });

      // Refresh lists
      await fetchLists();
      setNewListName("");
      toast.success(`Created "${newListName}" and added ${modelName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const listsWithModel = lists.filter(l => l.inList).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            sizeClasses[size],
            "rounded-full flex items-center justify-center transition-all",
            listsWithModel > 0
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:text-violet-400"
          )}
          aria-label="Add to list"
        >
          <ListPlus className={iconSizes[size]} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium px-2 py-1">Add to List</p>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-2">
              No lists yet. Create one below.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => toggleList(list.id, list.inList)}
                  disabled={toggling === list.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-muted",
                    toggling === list.id && "opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      list.inList
                        ? "bg-violet-500 border-violet-500"
                        : "border-muted-foreground"
                    )}
                  >
                    {list.inList && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                  <span className="flex-1 text-left truncate">{list.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {list.itemCount}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Create new list */}
          <div className="border-t pt-2 mt-2">
            <div className="flex gap-2">
              <Input
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={createList}
                disabled={!newListName.trim() || creating}
                className="h-8 px-2"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
