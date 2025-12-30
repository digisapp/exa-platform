import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EXA Models - The Model Community Platform",
  description: "Join shows, travel experiences, and build your modeling career. The community platform where models grow.",
  keywords: ["models", "fashion", "runway", "modeling agency", "casting", "fashion shows"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
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
