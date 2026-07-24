-- Fan VIP status: trigger-maintained lifetime-spend counter.
--
-- fans.lifetime_spend_coins = coins actually SPENT by the fan (never coins
-- purchased). Tier thresholds live in src/lib/vip-config.ts (VIP 100 /
-- Star 500 / Diamond 5000) — badges only, no amounts ever shown publicly.
--
-- Action whitelist mirrors the fan-spend actions documented in
-- src/lib/coin-config.ts. auction_escrow_refund is included so outbid
-- refunds (positive amounts) net escrow back out — only auctions a fan
-- actually wins count toward status. Dispute clawbacks use other actions
-- ('refund', dispute metadata) and deliberately do NOT reduce status:
-- charged-back fans get suspended, not demoted.
--
-- ppv_unlock / video_call / voice_call / ticket_purchase have no prod rows
-- yet but are whitelisted so future spends count without another migration.

alter table fans add column if not exists lifetime_spend_coins bigint not null default 0;

create or replace function update_fan_lifetime_spend()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount <> 0 and new.action in (
    'tip_sent',
    'message_sent',
    'live_wall_tip_sent',
    'content_unlock',
    'ppv_unlock',
    'video_call',
    'voice_call',
    'auction_escrow',
    'auction_escrow_refund',
    'ticket_purchase'
  ) then
    -- Spends are negative in the ledger, so -amount adds; refunds are
    -- positive, so -amount subtracts. Clamp at 0 against orphan refunds.
    update fans
    set lifetime_spend_coins = greatest(0, lifetime_spend_coins - new.amount)
    where id = new.actor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fan_lifetime_spend on coin_transactions;
create trigger trg_fan_lifetime_spend
  after insert on coin_transactions
  for each row
  execute function update_fan_lifetime_spend();

-- Backfill from the full ledger history.
update fans f
set lifetime_spend_coins = s.spent
from (
  select actor_id, greatest(0, sum(-amount)) as spent
  from coin_transactions
  where action in (
    'tip_sent',
    'message_sent',
    'live_wall_tip_sent',
    'content_unlock',
    'ppv_unlock',
    'video_call',
    'voice_call',
    'auction_escrow',
    'auction_escrow_refund',
    'ticket_purchase'
  )
  group by actor_id
) s
where f.id = s.actor_id;
