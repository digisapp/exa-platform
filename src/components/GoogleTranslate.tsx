"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            layout?: number;
            autoDisplay?: boolean;
          },
          elementId: string
        ) => void;
      };
    };
  }
}

export function GoogleTranslate() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    // Prevent duplicate initialization
    if (document.getElementById("google-translate-script")) return;

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,es,pt,fr,it,de,ru,zh-CN,ja,ko,ar,hi",
            layout: 0, // HORIZONTAL layout (compact dropdown)
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  if (isAdmin) return null;

  return (
    <>
      <div
        id="google_translate_element"
        className="fixed bottom-4 right-4 z-50"
      />
      <style jsx global>{`
        /* Hide Google Translate top bar that pushes page down */
        .skiptranslate {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        /* Style the translate widget to match dark theme */
        #google_translate_element .goog-te-gadget {
          font-family: inherit !important;
          font-size: 0 !important;
        }
        #google_translate_element .goog-te-gadget .goog-te-combo {
          background: #1a1a1a;
          color: #e4e4e7;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        #google_translate_element .goog-te-gadget .goog-te-combo:hover {
          border-color: #ec4899;
        }
        /* Hide "Powered by Google" text */
        #google_translate_element .goog-te-gadget > span {
          display: none !important;
        }
        /* Hide the Google Translate attribution logo */
        #google_translate_element .goog-te-gadget .goog-logo-link {
          display: none !important;
        }
        /* Fix: Google injects an iframe banner at top */
        .goog-te-banner-frame {
          display: none !important;
        }
        /* Ensure translate dropdown appears above other elements */
        .goog-te-menu-frame {
          z-index: 9999 !important;
        }
      `}</style>
    </>
  );
}
