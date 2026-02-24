"use client";

import { useState } from "react";

export function BioExpand({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 120;
  const isLong = bio.length > limit;

  return (
    <p className="text-white/70 text-sm leading-relaxed text-center mb-3 max-w-sm mx-auto">
      {isLong && !expanded ? (
        <>
          {bio.slice(0, limit).trimEnd()}…{" "}
          <button
            onClick={() => setExpanded(true)}
            className="text-white/90 underline underline-offset-2 hover:text-white"
          >
            more
          </button>
        </>
      ) : (
        <>
          {bio}
          {isLong && (
            <>
              {" "}
              <button
                onClick={() => setExpanded(false)}
                className="text-white/90 underline underline-offset-2 hover:text-white"
              >
                less
              </button>
            </>
          )}
        </>
      )}
    </p>
  );
}
