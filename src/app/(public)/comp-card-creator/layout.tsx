import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Comp Card Maker | EXA Models",
  description:
    "Create a professional model comp card for free. No account required. Upload your photos, enter your measurements, and download a print-ready PDF or JPEG comp card instantly.",
  keywords: ["comp card maker", "model comp card", "free comp card", "model portfolio card", "model zed card", "composite card maker"],
  alternates: {
    canonical: "https://www.examodels.com/comp-card-creator",
  },
  openGraph: {
    title: "Free Comp Card Maker | EXA Models",
    description:
      "Create a professional model comp card for free. No sign-up required. Download a print-ready PDF or JPEG.",
    url: "https://www.examodels.com/comp-card-creator",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Comp Card Maker | EXA Models",
    description: "Create a professional model comp card for free. No sign-up required. Download a print-ready PDF or JPEG.",
  },
  robots: { index: true, follow: true },
};

export default function FreeCompCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
