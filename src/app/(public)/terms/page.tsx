import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Service | EXA",
  description:
    "The terms that govern your use of EXA Models — accounts, coins, bookings, bids, content, and payments.",
  alternates: {
    canonical: "https://www.examodels.com/terms",
  },
};

const sections = [
  {
    title: "1. Who we are & accepting these terms",
    body: [
      "EXA Models (\"EXA\", \"we\", \"us\") operates www.examodels.com, a platform where models, fans, and brands connect — bookings, runway shows, live content, virtual interactions, and auctions. By creating an account or using the platform, you agree to these Terms of Service and our Privacy Policy and Community Guidelines.",
      "If you do not agree, do not use EXA.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 18 years old to create an account or use EXA in any capacity. By using the platform you represent that you are 18 or older and legally able to enter into these terms.",
    ],
  },
  {
    title: "3. Accounts",
    body: [
      "EXA supports different account types (models, fans, brands). You agree to provide accurate information when signing up and to keep your account credentials secure. You are responsible for activity that happens under your account.",
      "Model accounts may be subject to identity verification and approval before appearing publicly on the platform. We may decline, suspend, or revoke approval at our discretion.",
    ],
  },
  {
    title: "4. Coins",
    body: [
      "Coins are EXA's virtual currency, used to pay for on-platform features such as messages, calls, tips, gifts, content unlocks, and bids. Coin prices are shown at the time of purchase.",
      "Coins are a limited license to use platform features. They are not money, have no cash value outside the platform, cannot be transferred between accounts except through platform features, and are not redeemable for cash by fans or brands.",
      "Coin purchases are final and non-refundable, except where required by law or where we choose to issue a refund at our discretion.",
    ],
  },
  {
    title: "5. Payments, refunds & chargebacks",
    body: [
      "Payments are processed by third-party payment providers (such as Stripe). We do not store your full card details.",
      "If a payment is refunded, disputed, or charged back, we may reverse the coins and any purchases associated with that payment. This can result in a negative coin balance on your account. Accounts with outstanding negative balances or abusive dispute activity may be suspended.",
    ],
  },
  {
    title: "6. Bookings, gigs & events",
    body: [
      "EXA lets brands and event organizers post gigs, shows, and campaigns, and lets models apply to them. Acceptance into a gig is at the organizer's discretion. Details of compensation, schedule, and requirements for a gig are described in the gig listing.",
      "EXA facilitates the connection; unless expressly stated otherwise in a listing, EXA is not a party to agreements between models and brands and is not responsible for the conduct of either side.",
    ],
  },
  {
    title: "7. EXA Bids (auctions)",
    body: [
      "Models may auction services and content through EXA Bids. Placing a bid is a binding commitment to pay the bid amount in coins if you win. Winning bids are charged automatically at auction close. The specifics of what is being auctioned are described in the auction listing.",
    ],
  },
  {
    title: "8. Model earnings & payouts",
    body: [
      "Models earn coins from on-platform activity and may request payouts as described in their dashboard. Payouts are processed through our payment partners and may require identity and payment-account verification. We may withhold or reverse earnings associated with fraud, refunds, chargebacks, or violations of these terms.",
      "Models are independent users of the platform, not employees, agents, or representatives of EXA. Models are responsible for their own taxes.",
    ],
  },
  {
    title: "9. Your content",
    body: [
      "You keep ownership of the content you upload (photos, videos, messages, profile material). By uploading, you grant EXA a worldwide, non-exclusive, royalty-free license to host, display, reproduce, and promote that content on and in connection with the platform (for example: your profile, homepage features, EXA TV, and EXA's social channels).",
      "You must have the rights to any content you upload. Do not upload content that infringes anyone's rights, depicts anyone without their consent, or violates our Community Guidelines.",
    ],
  },
  {
    title: "10. Prohibited conduct",
    body: [
      "Do not use EXA to break the law, harass or exploit anyone, solicit or arrange off-platform meetings or transactions that circumvent the platform, scrape or misuse platform data, or attempt to manipulate coins, bids, or payouts.",
      "EXA is a virtual-first platform: fan interactions with models happen through on-platform features. See our Community Guidelines for the full standard of conduct.",
    ],
  },
  {
    title: "11. Suspension & termination",
    body: [
      "We may suspend or terminate accounts that violate these terms, our Community Guidelines, or the law, or that create risk for the platform or its users. You may delete your account at any time from your settings. Some records (such as transaction history) are retained after deletion where required for legal, accounting, or fraud-prevention purposes.",
    ],
  },
  {
    title: "12. Disclaimers & limitation of liability",
    body: [
      "EXA is provided \"as is\" and \"as available\". To the fullest extent permitted by law, we disclaim all warranties, and our total liability to you for any claim arising out of the platform is limited to the greater of $100 or the amount you paid to EXA in the 12 months before the claim.",
      "We are not liable for indirect, incidental, special, consequential, or punitive damages, or for the conduct of other users, brands, or event organizers.",
    ],
  },
  {
    title: "13. Governing law",
    body: [
      "These terms are governed by the laws of the State of Florida, without regard to conflict-of-law rules. Disputes will be resolved in the state or federal courts located in Miami-Dade County, Florida.",
    ],
  },
  {
    title: "14. Changes to these terms",
    body: [
      "We may update these terms from time to time. If we make material changes, we will post the updated terms here and update the date below. Continuing to use EXA after changes take effect means you accept the new terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <CoinBalanceProvider initialBalance={0}>
      <Navbar />
      <main className="min-h-dvh bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <header className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
              Terms of Service
            </p>
            <h1 className="mt-3 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              The rules of the runway.
            </h1>
            <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
              These terms govern your use of EXA Models. The short version:
              be 18+, be honest, keep it on-platform, and treat everyone with
              respect.
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
              <h2 className="text-xl font-semibold text-white mb-3">15. Contact</h2>
              <p className="text-zinc-300">
                Questions about these terms? Email{" "}
                <a
                  href="mailto:hello@examodels.com"
                  className="text-pink-400 hover:underline"
                >
                  hello@examodels.com
                </a>
                . See also our{" "}
                <Link href="/privacy" className="text-pink-400 hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/guidelines" className="text-pink-400 hover:underline">
                  Community Guidelines
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
