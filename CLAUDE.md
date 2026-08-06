# EXA Platform

Model/creator marketplace (examodels.com): fans buy coins and spend them on chat, calls, tips, and exclusive content; models cash out earnings. Next.js 15 App Router + React 18 + TypeScript, Supabase (Postgres/Auth/RLS/Storage), Stripe **LIVE**, LiveKit, Resend, Upstash. Deployed on Vercel.

## Commands

- `npm run build` — production build, includes type-check (~40s). No separate typecheck script; use `npx tsc --noEmit` for types only.
- `npm run lint` / `npm test` (vitest)

## Money — real Stripe, real payouts

- Stripe is in LIVE mode. Every coin/payment path is production money.
- 1 coin = $0.10 is the MODEL CASHOUT rate only (`src/lib/coin-config.ts`); fans pay $0.13–$0.20/coin depending on pack (`src/lib/stripe-config.ts`). Never conflate the two.
- Money RPCs are service-role-only: authenticate in the API route, then call the RPC via the service client. New money functions must ship with REVOKE from anon/authenticated.
- Trigger-maintained columns (`gigs.spots_filled`, `like_count`, fan VIP tiers, tip-goal progress) are never written by hand.

## Privacy / leak guardrails

- Real names are admin-only: never select `first_name`/`last_name` in non-admin queries. `display_name` is the only public name (opt-in, never auto-filled from legal names).
- Never return `media_url` for exclusive content from fan-facing APIs — fans get server-side blurred previews until they unlock.
- Social handles and contact emails are the signup gate: never emit them in logged-out HTML or JSON-LD.
- Never expose `rating_tier` / admin ratings in fan- or model-facing payloads.

## Supabase

- One client per context: `src/lib/supabase/client.ts` (browser), `server.ts` (server), `service.ts` (service role). Gotcha: when RLS filters out every row, an UPDATE "succeeds" silently with 0 rows.
- PostgREST silently caps responses at 1000 rows; `.in()` with >~300 UUIDs overflows the URL. Batch ≤200, page in 1000s, never swallow per-batch errors.
- Migrations live in `supabase/migrations/`.

## Copy & UI conventions

- Never write "PPV" in user-facing copy: "Pay to Unlock"/"Paid" on the model side, "Exclusive" on the fan side (the DB value stays `exclusive`).
- Design language is futuristic/synthwave/neon — no serif fonts, no editorial styling.
- SMS is a silent no-op (Twilio not configured) — never build anything that depends on it.

## Git

- IMPORTANT: never `git add -A` or `git add .` — other sessions leave unrelated WIP in this checkout. Stage only the files you authored.
- Ship via PR to `main`.
