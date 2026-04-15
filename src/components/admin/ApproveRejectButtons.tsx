"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Trash2 } from "lucide-react";
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

interface AdminActionProps {
  id: string;
  type: "application" | "model" | "brand" | "designer" | "media" | "model_application";
  onSuccess?: () => void;
}

export function ApproveRejectButtons({ id, type, onSuccess }: AdminActionProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject") => {
    setLoading(action);

    try {
      let endpoint = "";
      let body = {};

      switch (type) {
        case "application":
          endpoint = `/api/admin/applications/${id}`;
          body = { status: action === "approve" ? "accepted" : "rejected" };
          break;
        case "model_application":
          endpoint = `/api/admin/model-applications/${id}`;
          body = { status: action === "approve" ? "approved" : "rejected" };
          break;
        case "model":
          endpoint = `/api/admin/models/${id}`;
          body = { is_approved: action === "approve" };
          break;
        case "brand":
          endpoint = `/api/admin/brands/${id}`;
          body = { is_verified: action === "approve" };
          break;
        case "designer":
          endpoint = `/api/admin/designers/${id}`;
          body = { status: action === "approve" ? "approved" : "rejected" };
          break;
        case "media":
          endpoint = `/api/admin/media/${id}`;
          body = { status: action === "approve" ? "approved" : "rejected" };
          break;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(action === "approve" ? "Approved!" : "Rejected");
      onSuccess?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");

    try {
      let endpoint = "";

      switch (type) {
        case "model_application":
          endpoint = `/api/admin/model-applications/${id}`;
          break;
        default:
          throw new Error("Delete not supported for this type");
      }

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Deleted!");
      setShowDeleteDialog(false);
      onSuccess?.();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {type === "model_application" && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                disabled={loading !== null}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this application. Use this for spam submissions.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading === "delete"}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={loading === "delete"}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {loading === "delete" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
        >
          {loading === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600"
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </>
          )}
        </Button>
      </div>
    </>
  );
}
