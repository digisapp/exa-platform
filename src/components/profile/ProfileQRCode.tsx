"use client";

import { useState } from "react";
import Image from "next/image";

interface ProfileQRCodeProps {
  qrDataUrl: string;
  username: string;
}

export function ProfileQRCode({ qrDataUrl, username }: ProfileQRCodeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Desktop only — bottom-left floating QR */}
      <div
        className="hidden lg:block fixed bottom-6 left-6 z-40"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div
          className={`
            relative rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl
            shadow-2xl shadow-black/50 transition-all duration-300 ease-out overflow-hidden
            ${expanded ? "p-4" : "p-2.5"}
          `}
        >
          {/* Subtle gradient border glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/10 via-transparent to-violet-500/10 pointer-events-none" />

          <div className="relative">
            <Image
              src={qrDataUrl}
              alt={`Scan to open @${username}`}
              width={expanded ? 140 : 80}
              height={expanded ? 140 : 80}
              className="rounded-xl transition-all duration-300"
              unoptimized
            />
            {expanded && (
              <div className="mt-2.5 text-center animate-in fade-in duration-200">
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
                  Scan to open
                </p>
                <p className="text-xs font-semibold text-pink-400 mt-0.5">
                  examodels.com/{username}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
