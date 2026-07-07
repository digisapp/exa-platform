"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

/**
 * Client gate around a quiet Live Wall: shows the teaser card by default,
 * with a button that expands the real wall (input included) so anyone can
 * post and revive it. Both nodes are server-rendered and passed as props.
 */
export function LiveWallQuietGate({
  quietCard,
  wall,
}: {
  quietCard: React.ReactNode;
  wall: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (open) return <>{wall}</>;

  return (
    <div className="space-y-2">
      {quietCard}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-white/60 hover:text-pink-300 hover:border-pink-500/30 hover:bg-white/[0.06] transition-all"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Open the wall & post anyway
      </button>
    </div>
  );
}
