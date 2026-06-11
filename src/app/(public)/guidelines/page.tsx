import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Community Guidelines | EXA",
  description:
    "EXA is a virtual-first platform. Fans connect with creators through on-platform chat, live streams, video calls, gifts, and content unlocks.",
  alternates: {
    canonical: "https://www.examodels.com/guidelines",
  },
  openGraph: {
    title: "Community Guidelines | EXA",
    description:
      "EXA is a virtual-first platform. Fans connect with creators through on-platform chat, live streams, video calls, gifts, and content unlocks.",
    url: "https://www.examodels.com/guidelines",
    type: "website",
    siteName: "EXA Models",
  },
};

export default function GuidelinesPage() {
  return (
    <CoinBalanceProvider initialBalance={0}>
      <Navbar />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <header className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
              Community Guidelines
            </p>
            <h1 className="mt-3 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Virtual-first, on-platform only.
            </h1>
            <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
              EXA is a virtual-first platform. Fans connect with creators through
              on-platform features &mdash; chat, live streams, video calls, gifts,
              and content unlocks. Everything that makes EXA special happens
              right here.
            </p>
          </header>

          <section className="space-y-8 text-zinc-200 leading-relaxed">
            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-violet-500/5 p-6 shadow-[0_0_40px_rgba(236,72,153,0.08)]">
              <h2 className="text-xl font-semibold text-white">
                How to connect on EXA
              </h2>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>&bull; Chat with creators in DMs</li>
                <li>&bull; Join their live streams</li>
                <li>&bull; Book a video call</li>
                <li>&bull; Send gifts and tips</li>
                <li>&bull; Unlock content and bid on exclusive experiences</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                What&rsquo;s not permitted
              </h2>
              <p className="mt-3 text-zinc-300">
                To keep our community safe, the following are not allowed on EXA:
              </p>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>&bull; Requests to arrange in-person meetups</li>
                <li>&bull; Travel, flights, or hotel visits</li>
                <li>&bull; Private off-platform events</li>
                <li>&bull; Off-platform contact (phone numbers, other apps, social handles for direct contact)</li>
              </ul>
              <p className="mt-4 text-zinc-300">
                These rules exist to protect both fans and creators. Repeated
                violations may result in your account being flagged for review or
                suspended.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                For creators
              </h2>
              <p className="mt-3 text-zinc-300">
                If a fan asks to meet in person, fly you out, or move
                off-platform, please decline and report the message. EXA&rsquo;s
                trust &amp; safety team reviews flagged conversations.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                For fans
              </h2>
              <p className="mt-3 text-zinc-300">
                The best way to connect with a creator on EXA is to support them
                here &mdash; tip a live stream, book a video call, unlock their
                content, or send a gift. That&rsquo;s how access works on EXA.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">
                Reporting and review
              </h2>
              <p className="mt-3 text-zinc-300">
                Messages that appear to request in-person contact are
                automatically flagged for review. You can also report any message
                or conversation from within the chat interface. If you believe
                your account has been flagged in error, contact{" "}
                <Link
                  href="mailto:support@examodels.com"
                  className="text-pink-300 underline-offset-4 hover:text-pink-200 hover:underline"
                >
                  support@examodels.com
                </Link>
                .
              </p>
            </div>
          </section>

          <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-zinc-500">
            Last updated: May 17, 2026
          </footer>
        </div>
      </main>
    </CoinBalanceProvider>
  );
}
