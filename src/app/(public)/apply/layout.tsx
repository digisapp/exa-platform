import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to Join EXA Models",
  description: "Apply to become a verified model on EXA — book photoshoots, runway shows, brand collaborations, and more. Join the premier model community in Miami and beyond.",
  alternates: {
    canonical: "https://www.examodels.com/apply",
  },
  openGraph: {
    title: "Apply to Join EXA Models",
    description: "Apply to become a verified model on EXA — book photoshoots, runway shows, brand collaborations, and more. Join the premier model community in Miami and beyond.",
    url: "https://www.examodels.com/apply",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary",
    title: "Apply to Join EXA Models",
    description: "Apply to become a verified model on EXA — book photoshoots, runway shows, brand collaborations, and more.",
  },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
