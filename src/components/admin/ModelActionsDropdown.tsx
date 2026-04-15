"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, UserMinus, ChevronDown, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModelApprovalButton({ id, isApproved }: { id: string; isApproved: boolean }) {
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(isApproved);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_approved: !approved }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setApproved(!approved);
      toast.success(approved ? "Model unapproved" : "Model approved!");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={approved ? "outline" : "default"}
      className={approved ? "" : "bg-green-500 hover:bg-green-600"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : approved ? (
        "Unapprove"
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </>
      )}
    </Button>
  );
}

export function ConvertToFanButton({ id, modelName }: { id: string; modelName: string }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleConvert = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/models/${id}/convert-to-fan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert");
      }

      toast.success("Model moved to Fans");
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-500">
          <UserMinus className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Fans?</AlertDialogTitle>
          <AlertDialogDescription>
            This will convert <strong>{modelName}</strong> from a Model to a Fan account.
            Their model profile will be deleted and they will no longer appear in the models directory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConvert}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            Move to Fans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ModelActionsDropdown({ id, modelName, isApproved, onAction }: {
  id: string;
  modelName: string;
  isApproved: boolean;
  onAction?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<"fan" | "delete" | null>(null);
  const router = useRouter();

  const handleSetApproval = async (approved: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_approved: approved }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(approved ? "Model is now VISIBLE" : "Model is now HIDDEN");
      onAction?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToFan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${id}/convert-to-fan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert");
      }

      toast.success("Converted to Fan");
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
      const res = await fetch(`/api/admin/models/${id}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Model deleted");
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
            className={`gap-1 ${isApproved ? "text-green-500 border-green-500/50" : "text-muted-foreground border-muted-foreground/50"}`}
          >
            {isApproved ? (
              <>
                <Eye className="h-3 w-3" />
                VISIBLE
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                HIDDEN
              </>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/models/${id}`}>
              <FileText className="h-4 w-4 mr-2" />
              VIEW DETAILS
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isApproved ? (
            <DropdownMenuItem disabled className="text-green-500 opacity-100">
              <Eye className="h-4 w-4 mr-2" />
              VISIBLE
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleSetApproval(true)} disabled={loading}>
              <Eye className="h-4 w-4 mr-2" />
              VISIBLE
            </DropdownMenuItem>
          )}
          {!isApproved ? (
            <DropdownMenuItem disabled className="text-muted-foreground opacity-100">
              <EyeOff className="h-4 w-4 mr-2" />
              HIDDEN
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleSetApproval(false)} disabled={loading}>
              <EyeOff className="h-4 w-4 mr-2" />
              HIDDEN
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogType("fan")}>
            <UserMinus className="h-4 w-4 mr-2" />
            FAN
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

      <AlertDialog open={dialogType === "fan"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Fan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert <strong>{modelName}</strong> from a Model to a Fan account.
              Their model profile will be deleted and they will no longer appear in the models directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToFan}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Convert to Fan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === "delete"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{modelName}</strong> and their profile.
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
    </>
  );
}
