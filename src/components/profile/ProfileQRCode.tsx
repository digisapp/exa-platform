"use client";

import { useState } from "react";

interface ProfileQRCodeProps {
  qrDataUrl: string;
  username: string;
}

export function ProfileQRCode({ qrDataUrl, username }: ProfileQRCodeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="hidden lg:block fixed bottom-6 left-6 z-40"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className={`
          relative rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl
          shadow-2xl shadow-black/50 overflow-hidden origin-bottom-left
          transition-all duration-300 ease-out
          ${expanded ? "p-4 scale-100" : "p-2.5 scale-100"}
        `}
      >
        {/* Subtle gradient border glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/10 via-transparent to-violet-500/10 pointer-events-none" />

        <div className="relative flex flex-col items-center">
          <div
            className="transition-all duration-300 ease-out overflow-hidden"
            style={{
              width: expanded ? 140 : 80,
              height: expanded ? 140 : 80,
            }}
          >
            <img
              src={qrDataUrl}
              alt={`Scan to open @${username}`}
              width={200}
              height={200}
              className="w-full h-full rounded-xl"
            />
          </div>
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${expanded ? "max-h-12 opacity-100 mt-2.5" : "max-h-0 opacity-0 mt-0"}
            `}
          >
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest text-center">
              Scan to open
            </p>
            <p className="text-xs font-semibold text-pink-400 mt-0.5 text-center">
              examodels.com/{username}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
