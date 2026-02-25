import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swimwear Content Creation | EXA Models",
  description: "Join EXA's swimwear content program. Professional photo and video shoots in Miami Beach — create stunning content for your portfolio and social media.",
  alternates: {
    canonical: "https://www.examodels.com/swimwear-content",
  },
  openGraph: {
    title: "Swimwear Content Creation | EXA Models",
    description: "Join EXA's swimwear content program. Professional photo and video shoots in Miami Beach — create stunning content for your portfolio and social media.",
    url: "https://www.examodels.com/swimwear-content",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swimwear Content Creation | EXA Models",
    description: "Join EXA's swimwear content program. Professional photo and video shoots in Miami Beach.",
  },
};

export default function SwimwearContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
