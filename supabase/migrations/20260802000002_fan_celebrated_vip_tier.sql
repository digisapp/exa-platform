-- VIP tier-up celebrations: track the highest tier a fan has been publicly
-- celebrated for, so the announcement fires exactly once per tier.
--
-- Written ONLY by /api/vip/celebrate (service role) after verifying the
-- fan's real tier from fans.lifetime_spend_coins — the client merely pings
-- the route, it never supplies a tier. Values mirror src/lib/vip-config.ts
-- keys. Never celebrate downgrades: the route only announces when the
-- current tier outranks this stored one.

alter table fans
  add column if not exists celebrated_vip_tier text
  check (celebrated_vip_tier is null or celebrated_vip_tier in ('vip', 'star', 'diamond'));
