import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Free Comp Card Maker | EXA Models",
  description:
    "Create a professional model comp card for free. No account required. Upload your photos, enter your measurements, and download a print-ready PDF or JPEG comp card instantly.",
  keywords: ["comp card maker", "model comp card", "free comp card", "model portfolio card", "model zed card", "composite card maker"],
  alternates: {
    canonical: "https://www.examodels.com/comp-card-creator",
  },
  openGraph: {
    title: "Free Comp Card Maker | EXA Models",
    description:
      "Create a professional model comp card for free. No sign-up required. Download a print-ready PDF or JPEG.",
    url: "https://www.examodels.com/comp-card-creator",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Comp Card Maker | EXA Models",
    description: "Create a professional model comp card for free. No sign-up required. Download a print-ready PDF or JPEG.",
  },
  robots: { index: true, follow: true },
};

export default function FreeCompCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Scrolling Digis Banner */}
      <a
        href="https://digis.cc"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600 bg-[length:200%_100%] animate-gradient py-3.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        <div className="overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee">
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              ✨ Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats ✨
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              🎁 Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats 🎁
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              ✨ Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats ✨
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              🎁 Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats 🎁
            </span>
          </div>
        </div>
      </a>
      {children}
    </>
  );
}
