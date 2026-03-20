"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Globe } from "lucide-react";

/**
 * Auto-detect Spanish-speaking visitors on English pages
 * and show a banner suggesting the Spanish version.
 */
export function SpanishBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on English model-facing pages (homepage, /for-models)
    const targetPaths = ["/", "/for-models"];
    if (!targetPaths.includes(pathname)) return;

    // Don't show if already dismissed
    if (sessionStorage.getItem("es-banner-dismissed")) return;

    // Check browser language
    const lang = navigator.language || "";
    if (lang.startsWith("es")) {
      setShow(true);
    }
  }, [pathname]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-pink-500 to-violet-500 text-white py-3 px-4 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-3">
        <Globe className="h-4 w-4 flex-shrink-0" />
        <span>
          ¿Hablas español?{" "}
          <Link
            href="/modelo"
            className="underline font-bold hover:text-white/90"
          >
            Ver la página en español
          </Link>
        </span>
        <button
          onClick={() => {
            setShow(false);
            sessionStorage.setItem("es-banner-dismissed", "1");
          }}
          className="ml-2 hover:text-white/70 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
