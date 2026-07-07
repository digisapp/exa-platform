import type { Metadata } from "next";
import { PRINT_PICKUP_EVENT, isPrintPickupWindowOpen } from "@/lib/comp-card-event";

export async function generateMetadata(): Promise<Metadata> {
  if (!isPrintPickupWindowOpen()) {
    const endedDescription =
      "This EXA Digitals shoot has ended. Follow @examodels for the next one, or create a free digital comp card anytime.";
    return {
      title: "EXA Digitals — Miami Beach",
      description: endedDescription,
      openGraph: {
        title: "EXA Digitals — Miami Beach",
        description: endedDescription,
        type: "website",
        siteName: "EXA Models",
      },
      twitter: {
        card: "summary_large_image",
        title: "EXA Digitals — Miami Beach",
        description: endedDescription,
      },
    };
  }

  const title = `EXA Digitals — Miami Beach | ${PRINT_PICKUP_EVENT.digitalsDateLabel}`;
  const description = `Professional digitals + 20 printed comp cards for ${PRINT_PICKUP_EVENT.name} castings. ${PRINT_PICKUP_EVENT.digitalsDateLongLabel}.`;
  return {
    title,
    description: `Get fresh digitals taken by an EXA photographer for ${PRINT_PICKUP_EVENT.name} + 20 printed comp cards. ${PRINT_PICKUP_EVENT.digitalsDateLongLabel} in Miami Beach. $125 or FREE for Digis.cc Creators.`,
    openGraph: {
      title: "EXA Digitals — Miami Beach",
      description,
      type: "website",
      siteName: "EXA Models",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function MiamiDigitalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
