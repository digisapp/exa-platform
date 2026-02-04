import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.examodels.com"),
  title: {
    default: "EXA Models – Book Professional Models for Photoshoots & Events",
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
    title: "EXA Models – Book Professional Models for Photoshoots & Events",
    description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide. The premier model booking platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EXA Models – Book Professional Models",
    description: "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide.",
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
  const jsonLd = {
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
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ServiceWorkerRegistration />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
