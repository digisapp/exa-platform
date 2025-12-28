"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, UserMinus } from "lucide-react";
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
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
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
          body = { subscription_tier: action === "approve" ? "basic" : "inquiry" };
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

  return (
    <div className="flex gap-2">
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
  );
}

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
