"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Image from "next/image";

function getDevicePlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function OpenInBrowserContent() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("to") || "/";
  const appName = searchParams.get("app") || "this app";

  const fullUrl = `https://www.examodels.com${destination}`;

  const platform = useMemo(() => getDevicePlatform(), []);
  const browserName = platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : "Browser";

  const handleOpenBrowser = () => {
    if (platform === "android") {
      const intentUrl = `intent://${fullUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
      window.location.href = intentUrl;
      return;
    }

    const w = window.open(fullUrl, "_system");
    if (w) return;
    window.location.href = fullUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-4 pb-8">
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

        {/* Open in browser button */}
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            handleOpenBrowser();
          }}
          className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold text-lg transition-all active:scale-[0.97] shadow-lg shadow-pink-500/25"
        >
          Open in {browserName}
        </a>

        {/* Continue anyway */}
        <a
          href={destination}
          className="block text-center text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Continue in {appName}
        </a>
      </div>
    </div>
  );
}

export default function OpenInBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-4 pb-8">
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
