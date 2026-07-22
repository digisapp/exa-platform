import { Navbar } from "@/components/layout/navbar";
import type { Metadata } from "next";
import { ApplyContent } from "./ApplyContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Apply — Become an EXA Model",
  description:
    "Apply to join EXA — the platform where models earn from fashion shows, bookings, exclusive content, and fans. Free to apply, approval within 24 hours.",
  alternates: {
    canonical: "https://www.examodels.com/apply",
  },
  openGraph: {
    title: "Apply — Become an EXA Model",
    description:
      "Apply to join EXA — the platform where models earn from fashion shows, bookings, exclusive content, and fans. Free to apply, approval within 24 hours.",
    url: "https://www.examodels.com/apply",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apply — Become an EXA Model",
    description:
      "Apply to join EXA — the platform where models earn from fashion shows, bookings, exclusive content, and fans. Free to apply, approval within 24 hours.",
  },
};

export default function ApplyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <ApplyContent />
    </div>
  );
}
