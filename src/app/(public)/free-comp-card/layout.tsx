import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Comp Card Maker | EXA Models",
  description:
    "Create a professional model comp card for free. No account required. Upload your photos, enter your measurements, and download a print-ready PDF or JPEG comp card instantly.",
  openGraph: {
    title: "Free Comp Card Maker | EXA Models",
    description:
      "Create a professional model comp card for free. No sign-up required. Download a print-ready PDF or JPEG.",
    url: "https://www.examodels.com/free-comp-card",
    type: "website",
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
