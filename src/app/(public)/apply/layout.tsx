import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to Become a Model",
  description: "Apply to join EXA Models. Share your social media profiles and get verified to access gigs, events, and bookings.",
  openGraph: {
    title: "Apply to Become a Model",
    description: "Apply to join EXA Models. Share your social media profiles and get verified to access gigs, events, and bookings.",
  },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
