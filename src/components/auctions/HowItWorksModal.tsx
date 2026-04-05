"use client";

import { useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HowItWorksModalProps {
  isModel?: boolean;
  variant?: "link" | "icon";
}

export function HowItWorksModal({ isModel, variant = "link" }: HowItWorksModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="How EXA Bids works"
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <Info className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-400"
        >
          How it works
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">How EXA Bids Works</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* For Fans */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-semibold text-white mb-2">For Fans</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Browse live listings, place a bid, or buy now instantly. Win and connect directly with the model for custom content, video calls, and exclusive experiences.
              </p>
            </div>

            {/* For Models */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-semibold text-white mb-2">Are you a model?</p>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                List your services — custom content, video calls, meet &amp; greets — and let fans bid or buy now.
              </p>
              {isModel ? (
                <div className="flex gap-2">
                  <Link
                    href="/dashboard/bids/new"
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    + Create a Listing
                  </Link>
                  <Link
                    href="/dashboard/bids/manage"
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    Manage Listings →
                  </Link>
                </div>
              ) : (
                <Link
                  href="/dashboard/bids/new"
                  onClick={() => setOpen(false)}
                  className="inline-block text-xs font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create a Listing →
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
