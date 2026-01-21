import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://examodels.com"),
  title: {
    default: "EXA Models – Top Models Worldwide",
    template: "%s | EXA Models",
  },
  description: "Join shows, travel experiences, and build your modeling career. The community platform where models grow.",
  keywords: ["models", "fashion", "runway", "modeling agency", "casting", "fashion shows"],
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
    url: "https://examodels.com",
    siteName: "EXA Models",
    title: "EXA Models – Top Models Worldwide",
    description: "Join shows, travel experiences, and build your modeling career. The community platform where models grow.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EXA Models – Top Models Worldwide",
    description: "Join shows, travel experiences, and build your modeling career. The community platform where models grow.",
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
    url: "https://examodels.com",
    logo: "https://examodels.com/exa-logo-white.png",
    description: "Join shows, travel experiences, and build your modeling career. The community platform where models grow.",
    sameAs: [],
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
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
