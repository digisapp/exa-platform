"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

interface SuccessActionsProps {
  votingUrl: string;
}

export function SuccessActions({ votingUrl }: SuccessActionsProps) {
  const handleShare = async () => {
    const shareData = {
      title: "Vote for me on SwimCrown!",
      text: "I just entered the SwimCrown competition on EXA. Vote for me!",
      url: votingUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — fall back to copy
        await copyLink();
      }
    } else {
      await copyLink();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(votingUrl);
      toast.success("Voting link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Button
      onClick={handleShare}
      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-5"
      size="lg"
    >
      <Share2 className="mr-2 h-5 w-5" />
      Share Your Voting Link
    </Button>
  );
}
