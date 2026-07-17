import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { StaleBuildRecovery } from "@/components/system/StaleBuildRecovery";
import { GoogleTranslate } from "@/components/GoogleTranslate";
import { SpanishBanner } from "@/components/SpanishBanner";
import { I18nProvider } from "@/i18n";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FF69B4",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.examodels.com"),
  title: {
    default: "EXA Models – Global Model Community",
    template: "%s | EXA Models",
  },
  description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide. The premier model booking platform.",
  keywords: ["book models", "hire models", "model booking", "photoshoot models", "event models", "fashion models", "commercial models", "brand ambassadors", "Miami models", "professional models"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EXA Models",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.examodels.com",
    siteName: "EXA Models",
    title: "EXA Models – Global Model Community",
    description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide. The premier model booking platform.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "EXA Models – Global Model Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EXA Models – Book Professional Models",
    description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "EXA Models",
      url: "https://www.examodels.com",
      logo: "https://www.examodels.com/exa-logo-white.png",
      description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide.",
      sameAs: [
        "https://www.instagram.com/examodels"
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://www.examodels.com"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "EXA Models",
      url: "https://www.examodels.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.examodels.com/models?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }}
        />
        {/* Google Translate (our widget or iOS Safari translate) rewraps text
            nodes in <font> tags behind React's back; React's next re-render
            then throws NotFoundError on removeChild/insertBefore and the
            nearest error boundary swallows the whole page ("Something went
            wrong" after a successful tip/unlock). Delegate the operation to
            the node's REAL parent instead of no-oping — a plain no-op leaves
            Google's injected text nodes behind as visible ghost fragments
            ("AND"/"or" floating next to chat messages and avatars). Must run
            before hydration, hence inline. */}
        {/* iOS Safari only applies :active pseudo-classes (button press
            feedback) when at least one touch listener exists on the page.
            Register a passive no-op so pressed states fire everywhere. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('touchstart',function(){},{passive:true});`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof Node!=='function'||!Node.prototype)return;var rc=Node.prototype.removeChild;Node.prototype.removeChild=function(child){if(child&&child.parentNode!==this){if(child.parentNode)rc.call(child.parentNode,child);return child;}return rc.apply(this,arguments);};var ib=Node.prototype.insertBefore;Node.prototype.insertBefore=function(newNode,ref){if(ref&&ref.parentNode!==this){if(ref.parentNode)return ib.call(ref.parentNode,newNode,ref);return this.appendChild(newNode);}return ib.apply(this,arguments);};})();`,
          }}
        />
      </head>
      <body className={`${poppins.className} ${poppins.variable} bg-background text-foreground antialiased min-h-dvh`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
        >
          Skip to content
        </a>
        <AuthProvider>
          <I18nProvider>
            <div id="main-content" tabIndex={-1} className="outline-none">{children}</div>
          </I18nProvider>
        </AuthProvider>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ServiceWorkerRegistration />
        <StaleBuildRecovery />
        <Toaster position="top-center" />
        <GoogleTranslate />
        <SpanishBanner />
      </body>
    </html>
  );
}
