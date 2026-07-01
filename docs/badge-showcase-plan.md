# Badge Showcase — Build Plan

_Status: Phase 1 SHIPPED (2026-07-01). Phase 2 still planned. Awarding engine already existed; this plan covers the showcase + the architectural split needed to support it._

## Phase 1 — implemented
- `src/components/profile/BadgeWall.tsx` — trophy wall of all earned event badges.
- `src/app/[username]/page.tsx` — badge query no longer filters `is_active` (wall shows every earned badge); promo "Get Tickets" ticker now gated on a new `promoBadge` (event status upcoming/active + badge active) instead of `eventBadges[0]`; `<BadgeWall />` rendered in the shared content section (both hero + circle layouts).
- Net effect: MSW 2026 (completed, is_active=false) shows as a "Walked" trophy but no longer promotes tickets; upcoming shows render a "Walking soon" chip + the ticker.
- Decision taken: wall lives on the PUBLIC profile (open question #1). Chips are static (non-clickable) to avoid 404s on completed-event show pages.

## Goal
Every model collects a badge for every show they're confirmed for, and shows them off in a
gamified "trophy wall" on their profile — not just the single promo ticker we render today.

## What already exists (do NOT rebuild)
- **Auto-awarding.** DB trigger `manage_event_badge()` inserts into `model_badges` when a
  `gig_applications` row flips to `accepted`, and revokes it when un-accepted. Fires for any
  event with a seeded badge + gigs linked via `event_id`. (`00050_events_badges_complete.sql`,
  updated `00052`.)
- **Badge-per-event seeding.** Every `events` row auto-seeds a `badges` row (`badge_type='event'`,
  emoji icon per event). MSW 🏖️ / NYFW 🗽 / MAW 🎨.
- **Admin backfill.** `POST /api/admin/sync-badges` awards badges to all accepted models for a gig.
- **Relationship chain.** `gig_applications → gigs.event_id → events → badges.event_id → model_badges`.

## The core problem to fix first: `is_active` is overloaded
Today `badges.is_active` means two different things at once:
1. "Show the **Get Tickets** promo ticker for this event" (should be **upcoming/active events only**).
2. "This badge is real / models earned it" (should be **permanent** — an ended show is still a trophy).

We flipped MSW's `is_active=false` to end it, which correctly killed the promo ticker AND the model
rosters. But for a showcase, a completed show's badge must **stay on the wall**. So we split the two:

| Concern | Gate on | Behavior when event ends |
|---|---|---|
| Promo ticker ("Get Tickets →") | `events.status IN ('upcoming','active')` | disappears automatically |
| Trophy showcase ("Walked MSW 2026") | model simply **has the `model_badges` row** | stays forever |
| Live roster on `/shows`, `/sponsors` | `events.status IN ('upcoming','active')` | drops off automatically |

**Consequence:** once the showcase gates on "has the badge" (not `is_active`), we no longer need to
flip `is_active=false` to end an event — setting `events.status='completed'` becomes the single
"the show is over" switch. `is_active` reverts to meaning only "this badge is valid / not retired."

## Phase 1 — Showcase MVP (the visible win)
**Effort: ~S–M. Mostly one query + one component. No new tables.**

1. **Query change** in `src/app/[username]/page.tsx` (currently lines ~190–228):
   - Drop the `.eq("badges.is_active", true)` filter for the *showcase* query so ALL earned event
     badges return (order by `earned_at desc`).
   - Join event `status` so we can decide promo vs. trophy per badge.
2. **Split the render** (currently lines ~646–661 hero ticker, ~757–792 circle arc):
   - **Promo ticker** (keep, but gate): only render for badges whose event `status` is
     `upcoming`/`active`. Pick the soonest upcoming event, not just `eventBadges[0]`.
   - **New `<BadgeWall />` component**: a grid/row of ALL earned badges (emoji + short_name + year),
     synthwave styling (glow, gradient chips — matches EXA's neon direction). Completed events render
     as earned trophies; upcoming ones can carry a subtle "walking soon" accent.
3. **Empty state**: hide the wall entirely if the model has zero badges (most models).

## Phase 2 — Gamification layer (defer until Phase 1 ships)
The schema already has `points_required` (badges), `points_awarded` (events, default 500), and a
points pipeline (`00052_points_on_event_completion.sql`). Layer on top later:
- **Counts & tiers.** "3 shows walked" header; bronze/silver/gold rings by badge count.
- **Rarity.** Compute holder counts per badge; render rare badges with a distinct treatment.
- **Non-event badges.** `badge_type='achievement'` already exists but nothing awards them — add
  milestones (first booking, first payout, verified, 5 shows) with their own award hooks.
- **Public discovery.** Optional `/badges` gallery or leaderboard ("most decorated models").
- **Seasons.** Year-scoped walls ("2026 season") once there are multiple years of events.

## Migration / data notes
- No destructive migration needed for Phase 1. MSW's `model_badges` rows are intact (121 models);
  once the showcase gates on "has the badge," they reappear as **trophies** even though the badge is
  `is_active=false`. Decide: either (a) re-`is_active=true` MSW and rely on `events.status` gating,
  or (b) make the showcase ignore `is_active` for `badge_type='event'`. **(b) is cleaner** — keeps
  `is_active` free as a hard "retire this badge" kill switch.
- Backfill: any past accepted models missing a row → `POST /api/admin/sync-badges` per gig.

## Open product decisions (for Nathan)
1. Trophy wall on the **public** profile, or only in the model's own dashboard first?
2. Show badges for **completed** events by default, or only current-season until we have history?
3. Keep hardcoded MSW landing pages as evergreen, or 301 them to a generic "past shows" archive?
