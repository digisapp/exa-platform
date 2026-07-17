"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ConfirmSpotButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirmSpot() {
    setLoading(true);
    try {
      const res = await fetch("/api/trips/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to confirm");
        return;
      }
      toast.success("You're confirmed — see you there! ✈️");
      router.refresh();
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={confirmSpot}
      disabled={loading}
      size="sm"
      className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl shadow-lg shadow-emerald-500/25"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
      ) : (
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
      )}
      Confirm My Spot
    </Button>
  );
}
