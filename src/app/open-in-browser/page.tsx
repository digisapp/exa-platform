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
      // Android: intent scheme opens in Chrome or default browser
      const intentUrl = `intent://${fullUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
      window.location.href = intentUrl;
      return;
    }

    // iOS + other: try window.open, then fallback to location change
    const w = window.open(fullUrl, "_system");
    if (w) return;
    window.location.href = fullUrl;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      const btn = document.getElementById("copy-btn");
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = "Copy Link";
        }, 2000);
      }
    } catch {
      // Fallback for browsers that don't support clipboard API
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      const btn = document.getElementById("copy-btn");
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = "Copy Link";
        }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0014] via-[#1a0033] to-[#0a0014] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/exa-logo-white.png"
            alt="EXA Models"
            width={100}
            height={40}
            className="h-10 w-auto opacity-90"
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Open in Browser
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            For the best experience with payments, login, and full features, open EXA in your browser instead of {appName}.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary: Open in browser */}
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleOpenBrowser();
            }}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.97] shadow-lg shadow-pink-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            Open in {browserName}
          </a>

          {/* Secondary: Copy link */}
          <button
            id="copy-btn"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
          >
            Copy Link
          </button>

          {/* Tertiary: Continue anyway */}
          <a
            href={destination}
            className="block text-white/40 hover:text-white/60 text-sm transition-colors pt-2"
          >
            Continue in {appName} anyway
          </a>
        </div>

        {/* Help text */}
        <p className="text-white/30 text-xs leading-relaxed">
          {platform === "ios"
            ? `Tap the menu icon (•••) at the bottom right of ${appName} and select "Open in Safari" if the button above doesn't work.`
            : platform === "android"
              ? `Tap the menu icon (⋮) at the top right of ${appName} and select "Open in Chrome" if the button above doesn't work.`
              : `Tap the menu icon in ${appName} and select "Open in Browser" if the button above doesn't work.`
          }
        </p>
      </div>
    </div>
  );
}

export default function OpenInBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#0a0014] via-[#1a0033] to-[#0a0014] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      }
    >
      <OpenInBrowserContent />
    </Suspense>
  );
}
