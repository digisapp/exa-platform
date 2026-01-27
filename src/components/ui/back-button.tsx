"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4 text-white" />
    </button>
  );
}
