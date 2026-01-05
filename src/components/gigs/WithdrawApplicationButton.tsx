"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface WithdrawApplicationButtonProps {
  applicationId: string;
  gigTitle: string;
}

export function WithdrawApplicationButton({
  applicationId,
  gigTitle,
}: WithdrawApplicationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gigs/apply", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to withdraw application");
      }

      toast.success("Application withdrawn");
      // Hard reload to ensure server component refetches data
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500"
        >
          <X className="h-4 w-4 mr-1" />
          Withdraw
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to withdraw your application for &ldquo;{gigTitle}&rdquo;? You can apply again later if spots are still available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleWithdraw}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
