"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PayoutActionsProps {
  id: string;
  status: string;
  modelName: string;
  coins: number;
  modelId: string;
}

export function PayoutActions({ id, status, modelName, coins, modelId }: PayoutActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<"complete" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const router = useRouter();

  const handleAction = async (action: "processing" | "completed" | "failed") => {
    setLoading(action);

    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          notes: notes || undefined,
          modelId: action === "failed" ? modelId : undefined,
          coins: action === "failed" ? coins : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const actionLabels: Record<string, string> = {
        processing: "Marked as processing",
        completed: "Marked as paid!",
        failed: "Rejected and refunded",
      };

      toast.success(actionLabels[action]);
      setDialogType(null);
      setNotes("");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
            onClick={() => handleAction("processing")}
            disabled={loading !== null}
          >
            {loading === "processing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1" />
                Processing
              </>
            )}
          </Button>
        )}

        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setDialogType("complete")}
          disabled={loading !== null}
        >
          {loading === "completed" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-1" />
              Mark Paid
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-500/50 hover:bg-red-500/10"
          onClick={() => setDialogType("reject")}
          disabled={loading !== null}
        >
          {loading === "failed" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </>
          )}
        </Button>
      </div>

      {/* Complete Dialog */}
      <AlertDialog open={dialogType === "complete"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have sent <strong>${(coins * 0.05).toFixed(2)}</strong> to <strong>{modelName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Transaction ID, payment method, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("completed")}
              disabled={loading !== null}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading === "completed" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={dialogType === "reject"} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the withdrawal and refund <strong>{coins.toLocaleString()} coins</strong> to <strong>{modelName}</strong>&apos;s balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason for rejection *</Label>
            <Textarea
              id="reason"
              placeholder="Why is this withdrawal being rejected?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("failed")}
              disabled={loading !== null || !notes.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading === "failed" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <XCircle className="h-4 w-4 mr-2" />
              Reject & Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
