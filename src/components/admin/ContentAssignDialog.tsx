"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Recipient {
  actorId: string;
  name: string;
  imageUrl: string | null;
}

interface ContentAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryItemId: string;
  libraryItemTitle: string;
  existingRecipientIds?: string[];
  onAssigned?: () => void;
}

export function ContentAssignDialog({
  open,
  onOpenChange,
  libraryItemId,
  libraryItemTitle,
  existingRecipientIds = [],
  onAssigned,
}: ContentAssignDialogProps) {
  const [recipientType, setRecipientType] = useState<"brands" | "models">("brands");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setNotes("");
      setSearch("");
      setRecipientType("brands");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadRecipients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipientType]);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      if (recipientType === "brands") {
        const { data } = await (supabase.from("brands") as any)
          .select("id, company_name, logo_url")
          .order("company_name", { ascending: true }) as { data: any };

        setRecipients(
          (data || []).map((b: any) => ({
            actorId: b.id,
            name: b.company_name,
            imageUrl: b.logo_url,
          }))
        );
      } else {
        // Fetch model actors and their model info
        const { data: actors } = await supabase
          .from("actors")
          .select("id, user_id")
          .eq("type", "model") as { data: any };

        if (actors && actors.length > 0) {
          const userIds = actors.map((a: any) => a.user_id).filter(Boolean);
          const { data: models } = await supabase
            .from("models")
            .select("user_id, first_name, last_name, username, profile_photo_url")
            .in("user_id", userIds);

          const modelMap: Record<string, any> = {};
          (models || []).forEach((m: any) => { modelMap[m.user_id] = m; });

          setRecipients(
            actors
              .filter((a: any) => modelMap[a.user_id])
              .map((a: any) => {
                const m = modelMap[a.user_id];
                const name = m.first_name
                  ? `${m.first_name}${m.last_name ? ` ${m.last_name}` : ""}`
                  : m.username || "Unknown";
                return {
                  actorId: a.id,
                  name,
                  imageUrl: m.profile_photo_url,
                };
              })
              .sort((a: Recipient, b: Recipient) => a.name.localeCompare(b.name))
          );
        } else {
          setRecipients([]);
        }
      }
    } catch (error) {
      console.error("Failed to load recipients:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = recipients.filter((r) => {
    if (search) {
      return r.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const available = filtered.filter((r) => !existingRecipientIds.includes(r.actorId));

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      toast.error(`Select at least one ${recipientType === "brands" ? "brand" : "model"}`);
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/media-hub/${libraryItemId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: Array.from(selectedIds),
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign");
      }

      const label = recipientType === "brands" ? "brand" : "model";
      toast.success(`Media shared with ${selectedIds.size} ${label}${selectedIds.size !== 1 ? "s" : ""}`);
      onOpenChange(false);
      onAssigned?.();
    } catch (error: any) {
      console.error("Assign error:", error);
      toast.error(error.message || "Failed to share media");
    } finally {
      setAssigning(false);
    }
  };

  const label = recipientType === "brands" ? "brand" : "model";
  const Icon = recipientType === "brands" ? Building2 : User;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Media</DialogTitle>
          <DialogDescription>
            Share &quot;{libraryItemTitle}&quot; with brands or models
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type toggle */}
          <Tabs
            value={recipientType}
            onValueChange={(v) => {
              setRecipientType(v as "brands" | "models");
              setSelectedIds(new Set());
              setSearch("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="brands" className="flex-1">Brands</TabsTrigger>
              <TabsTrigger value="models" className="flex-1">Models</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${recipientType}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Recipient list */}
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : available.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search
                    ? `No ${recipientType} match your search`
                    : `All ${recipientType} already assigned`}
                </p>
              </div>
            ) : (
              available.map((r) => (
                <label
                  key={r.actorId}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(r.actorId)}
                    onCheckedChange={() => toggleRecipient(r.actorId)}
                  />
                  <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {r.imageUrl ? (
                      <Image
                        src={r.imageUrl}
                        alt={r.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{r.name}</span>
                </label>
              ))
            )}
          </div>

          {selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} {label}{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="assign-notes">Notes (optional)</Label>
            <Textarea
              id="assign-notes"
              placeholder="e.g., Final approved photos from the June shoot"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedIds.size === 0}
            className="bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedIds.size || ""} ${label}${selectedIds.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
