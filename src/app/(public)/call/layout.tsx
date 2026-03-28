import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Call | EXA Models",
  description:
    "Book a video or phone call with your favorite model on EXA. Schedule a private one-on-one call at a time that works for you.",
  openGraph: {
    title: "Request a Call | EXA Models",
    description:
      "Book a video or phone call with your favorite model on EXA. Schedule a private one-on-one call.",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Call | EXA Models",
    description:
      "Book a video or phone call with your favorite model on EXA.",
  },
};

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
