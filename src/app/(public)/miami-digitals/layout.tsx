import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EXA Digitals — Miami Beach | May 24th",
  description:
    "Get fresh digitals taken by an EXA photographer for Miami Swim Week + 20 printed comp cards. Sunday, May 24th in Miami Beach. $125 or FREE for Digis.cc Creators.",
  openGraph: {
    title: "EXA Digitals — Miami Beach",
    description:
      "Professional digitals + 20 printed comp cards for Miami Swim Week castings. Sunday, May 24th.",
    type: "website",
  },
};

export default function MiamiDigitalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
