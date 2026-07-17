import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy | EXA",
  description:
    "How EXA Models collects, uses, and protects your information.",
  alternates: {
    canonical: "https://www.examodels.com/privacy",
  },
};

const sections = [
  {
    title: "1. What we collect",
    body: [
      "Account information — name, email, phone number, username, password, and account type (model, fan, or brand).",
      "Profile information — photos, bio, measurements, rates, social handles, and other details you choose to add to your profile.",
      "Verification information — for models, we may collect identity documents and verification photos to confirm age and identity. These are stored privately and are never shown publicly.",
      "Payment information — payments are processed by our payment partners (such as Stripe). We receive transaction records but do not store your full card number.",
      "Usage information — pages visited, features used, messages and interactions on the platform, device and log data, and approximate location derived from your IP address.",
    ],
  },
  {
    title: "2. How we use it",
    body: [
      "To run the platform: accounts, profiles, bookings, gigs, messaging, calls, auctions, coins, and payouts.",
      "To keep the platform safe: age and identity verification, fraud prevention, enforcing our terms and Community Guidelines.",
      "To communicate with you: transactional emails and SMS (confirmations, payment receipts, application updates) and — where you've agreed — announcements about shows, gigs, and features.",
      "To improve EXA: understanding how features are used so we can make them better.",
    ],
  },
  {
    title: "3. Who we share it with",
    body: [
      "We do not sell your personal information.",
      "We share data with service providers who run parts of the platform for us: payment processing (Stripe, Payoneer), hosting and infrastructure (Vercel, Supabase, Upstash), communications (Twilio for SMS, Resend for email), and live video (LiveKit). Each provider receives only what it needs to do its job.",
      "We may disclose information when required by law, to protect the safety of our users, or as part of a business transaction such as a merger or acquisition.",
      "Content you post publicly (profile photos, bio, live wall posts) is visible to other users and visitors.",
    ],
  },
  {
    title: "4. Cookies",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the platform is used. You can control cookies through your browser settings; disabling them may break sign-in and other features.",
    ],
  },
  {
    title: "5. How long we keep it",
    body: [
      "We keep your information while your account is active. If you delete your account, we remove or de-identify your profile, but we retain records we're required to keep — such as transaction and payout history — for legal, accounting, and fraud-prevention purposes.",
    ],
  },
  {
    title: "6. Your rights",
    body: [
      "You can access and update most of your information from your account settings, and you can delete your account at any time.",
      "Depending on where you live, you may have additional rights — such as requesting a copy of your data, asking us to correct or delete it, or objecting to certain processing. To exercise these rights, email us at the address below and we'll respond as required by applicable law.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We protect your data with encryption in transit, access controls, and sensitive-data encryption at rest for the highest-risk information (such as payout account details). No system is perfectly secure, so please use a strong, unique password.",
    ],
  },
  {
    title: "8. Age requirement",
    body: [
      "EXA is for adults. We do not knowingly collect information from anyone under 18. If we learn an account belongs to someone under 18, we will remove it.",
    ],
  },
  {
    title: "9. Changes to this policy",
    body: [
      "We may update this policy from time to time. If we make material changes, we'll post the updated policy here and update the date below.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <CoinBalanceProvider initialBalance={0}>
      <Navbar />
      <main className="min-h-dvh bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <header className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
              Privacy Policy
            </p>
            <h1 className="mt-3 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Your data, handled with care.
            </h1>
            <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
              This policy explains what information EXA Models collects, how we
              use it, and the choices you have.
            </p>
            <p className="mt-3 text-sm text-zinc-500">Last updated: July 5, 2026</p>
          </header>

          <section className="space-y-8 text-zinc-200 leading-relaxed">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-xl font-semibold text-white mb-3">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mb-3 text-zinc-300">
                    {p}
                  </p>
                ))}
              </div>
            ))}

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
              <p className="text-zinc-300">
                Privacy questions or requests? Email{" "}
                <a
                  href="mailto:hello@examodels.com"
                  className="text-pink-400 hover:underline"
                >
                  hello@examodels.com
                </a>
                . See also our{" "}
                <Link href="/terms" className="text-pink-400 hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
    </CoinBalanceProvider>
  );
}
