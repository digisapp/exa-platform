import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fan Sign Up | EXA Models",
  description:
    "Create a free fan account on EXA Models. Chat with models, send tips, unlock exclusive content, and support your favorites.",
  openGraph: {
    title: "Fan Sign Up | EXA Models",
    description:
      "Create a free fan account on EXA Models. Chat with models, send tips, unlock exclusive content, and support your favorites.",
    url: "https://www.examodels.com/fan/signup",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fan Sign Up | EXA Models",
    description:
      "Create a free fan account on EXA Models. Chat with models, send tips, and unlock exclusive content.",
  },
};

export default function FanSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
