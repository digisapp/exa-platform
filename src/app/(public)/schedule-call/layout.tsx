import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule a Call | EXA Models",
  description:
    "Schedule a private video or phone call with a model on EXA. Pick a date and time that works for you.",
  openGraph: {
    title: "Schedule a Call | EXA Models",
    description:
      "Schedule a private video or phone call with a model on EXA. Pick a date and time that works for you.",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule a Call | EXA Models",
    description:
      "Schedule a private video or phone call with a model on EXA.",
  },
};

export default function ScheduleCallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
