"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function LiveNowTabs({ isLive }: { isLive: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const switchTab = (live: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (live) {
      params.set("live", "1");
      params.delete("page");
    } else {
      params.delete("live");
    }
    router.push(`/models?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => switchTab(false)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-colors",
          !isLive
            ? "bg-pink-500 text-white"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All Models
      </button>
      <button
        onClick={() => switchTab(true)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
          isLive
            ? "bg-green-500 text-white"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            isLive ? "animate-ping bg-white" : "animate-ping bg-green-400"
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isLive ? "bg-white" : "bg-green-400"
          )} />
        </span>
        Live Now
      </button>
    </div>
  );
}
