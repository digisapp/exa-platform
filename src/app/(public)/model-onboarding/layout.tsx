import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Model Onboarding | EXA Models",
  description:
    "Get show-ready with EXA. Complete your onboarding: Runway Workshop + Swimwear Digitals — $550. Required for all new models joining EXA shows.",
  openGraph: {
    title: "Model Onboarding | EXA Models",
    description:
      "Get show-ready with EXA. Runway Workshop + Swimwear Digitals — $550.",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Onboarding | EXA Models",
    description:
      "Get show-ready with EXA. Runway Workshop + Swimwear Digitals — $550.",
  },
};

export default function ModelOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
