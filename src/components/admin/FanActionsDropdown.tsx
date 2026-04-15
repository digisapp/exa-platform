"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, UserPlus, ChevronDown, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FanActionsDropdown({ id, fanName, fanUsername = null, isSuspended, onAction }: {
  id: string;
  fanName: string;
  fanUsername?: string | null;
  isSuspended: boolean;
  onAction?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<"model" | "delete" | "edit" | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const router = useRouter();

  const handleSetSuspended = async (suspended: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_suspended: suspended }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(suspended ? "Fan suspended" : "Fan activated");
      onAction?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fans/${id}/convert-to-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert");
      }

      toast.success("Converted to Model");
      setDialogType(null);
      onAction?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fans/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Fan deleted");
      setDialogType(null);
      onAction?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = () => {
    setEditDisplayName(fanName || "");
    setEditUsername(fanUsername || "");
    setDialogType("edit");
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      const updates: Record<string, string> = {};
      if (editDisplayName.trim() && editDisplayName.trim() !== fanName) {
        updates.display_name = editDisplayName.trim();
      }
      const cleanUsername = editUsername.trim().toLowerCase();
      if (cleanUsername && cleanUsername !== (fanUsername || "")) {
        updates.username = cleanUsername;
      }

      if (Object.keys(updates).length === 0) {
        setDialogType(null);
        return;
      }

      const res = await fetch(`/api/admin/fans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success("Fan name updated");
      setDialogType(null);
      onAction?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={`gap-1 ${!isSuspended ? "text-green-500 border-green-500/50" : "text-red-500 border-red-500/50"}`}
          >
            {!isSuspended ? (
              <>
                <Eye className="h-3 w-3" />
                ACTIVE
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                SUSPENDED
              </>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isSuspended ? (
            <DropdownMenuItem disabled className="text-green-500 opacity-100">
              <Eye className="h-4 w-4 mr-2" />
              ACTIVE
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleSetSuspended(false)} disabled={loading}>
              <Eye className="h-4 w-4 mr-2" />
              ACTIVE
            </DropdownMenuItem>
          )}
          {isSuspended ? (
            <DropdownMenuItem disabled className="text-red-500 opacity-100">
              <EyeOff className="h-4 w-4 mr-2" />
              SUSPENDED
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleSetSuspended(true)} disabled={loading}>
              <EyeOff className="h-4 w-4 mr-2" />
              SUSPENDED
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            EDIT NAME
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialogType("model")}>
            <UserPlus className="h-4 w-4 mr-2" />
            MODEL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDialogType("delete")}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            DELETE
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialogType === "model"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Model?</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert <strong>{fanName}</strong> from a Fan to a Model account.
              They will appear in the models directory and can create a model profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToModel}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Convert to Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === "delete"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{fanName}</strong> and their account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogType === "edit"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fan Name</DialogTitle>
            <DialogDescription>
              Change the display name or username for this fan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                maxLength={30}
                placeholder="username"
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={loading || !editDisplayName.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
