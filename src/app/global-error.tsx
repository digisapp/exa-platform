"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "#080010",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#a78bfa", marginBottom: "1.5rem", maxWidth: "32rem" }}>
            We&apos;ve been notified and are looking into it. Try reloading.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.25rem",
              background: "linear-gradient(90deg, #ec4899, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "0.625rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
