"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface OfferResponseButtonsProps {
  offerId: string;
  currentStatus: string;
  offerTitle: string;
}

export function OfferResponseButtons({
  offerId,
  currentStatus,
  offerTitle,
}: OfferResponseButtonsProps) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const router = useRouter();

  async function handleResponse(status: "accepted" | "declined") {
    setLoading(status === "accepted" ? "accept" : "decline");

    try {
      const response = await fetch(`/api/offers/${offerId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to respond to offer");
        return;
      }

      if (status === "accepted") {
        toast.success(`You accepted "${offerTitle}"! The brand will be in touch.`);
      } else {
        toast.success(`You declined "${offerTitle}".`);
      }

      router.refresh();
    } catch (error) {
      console.error("Error responding to offer:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // Already responded
  if (currentStatus === "accepted") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Accepted
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => handleResponse("declined")}
          disabled={loading !== null}
        >
          {loading === "decline" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Change to Decline"
          )}
        </Button>
      </div>
    );
  }

  if (currentStatus === "declined") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-500/20 text-gray-400 text-sm font-medium">
          <XCircle className="h-4 w-4" />
          Declined
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => handleResponse("accepted")}
          disabled={loading !== null}
        >
          {loading === "accept" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Change to Accept"
          )}
        </Button>
      </div>
    );
  }

  // Pending - show both buttons
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        onClick={() => handleResponse("declined")}
        disabled={loading !== null}
      >
        {loading === "decline" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <XCircle className="h-4 w-4 mr-1" />
            Decline
          </>
        )}
      </Button>
      <Button
        size="sm"
        className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
        onClick={() => handleResponse("accepted")}
        disabled={loading !== null}
      >
        {loading === "accept" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-1" />
            Accept
          </>
        )}
      </Button>
    </div>
  );
}
