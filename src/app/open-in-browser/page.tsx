"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Image from "next/image";

function OpenInBrowserContent() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("to") || "/";
  const appName = searchParams.get("app") || "this app";
  const [copied, setCopied] = useState(false);

  const fullUrl = `https://www.examodels.com${destination}`;

  const handleOpenInBrowser = async () => {
    // Method 1: navigator.share() — opens native share sheet
    // User can tap "Open in Safari" / "Open in Chrome" from there
    if (navigator.share) {
      try {
        await navigator.share({ url: fullUrl });
        return;
      } catch {
        // User cancelled or share failed, fall through to copy
      }
    }

    // Method 2: Copy to clipboard as fallback
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Last resort fallback
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e]/95 border border-white/10 p-6 space-y-5 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={80}
            height={32}
            className="h-8 w-auto opacity-90"
          />
        </div>

        {/* Subtitle */}
        <p className="text-center text-white/60 text-sm">
          Open in Web Browser for Full Experience
        </p>

        {/* Open in browser button */}
        <button
          onClick={handleOpenInBrowser}
          className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold text-lg transition-all active:scale-[0.97] shadow-lg shadow-pink-500/25"
        >
          {copied ? "Link Copied! Paste in Browser" : "Open in Web"}
        </button>

        {/* Continue anyway */}
        <a
          href={destination}
          className="block text-center text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Continue anyway
        </a>
      </div>
    </div>
  );
}

export default function OpenInBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e]/95 border border-white/10 p-6 flex justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <OpenInBrowserContent />
    </Suspense>
  );
}
