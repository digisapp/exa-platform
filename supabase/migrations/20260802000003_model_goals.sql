-- Model tip goals: a model sets one public goal ("5,000 coins → backstage
-- set") and every tip to her counts toward it. The async battle-replacement:
-- gives fans a communal target with urgency, no creator-vs-creator combat.
--
-- Conventions honored:
-- - progress_coins is TRIGGER-maintained from coin_transactions (same
--   pattern as fans.lifetime_spend_coins / gigs.spots_filled — never
--   hand-touch). Action whitelist: tip_received + live_wall_tip_received,
--   i.e. every coin a fan tips the model while the goal is active.
-- - The trigger swallows its own errors: goal progress is cosmetic and must
--   never fail a money insert.
-- - Writes are service-role only (no INSERT/UPDATE/DELETE policies); public
--   SELECT so anon profile visitors and realtime subscribers see the meter.
-- - Goal amounts are the model's public target — showing them is fine; fan
--   spend amounts still never surface anywhere.
-- - celebrated: claimed by /api route side-effects exactly once (wall line +
--   model push), same conditional-update pattern as fans.celebrated_vip_tier.

create table model_goals (
  id uuid primary key default gen_random_uuid(),
  model_actor_id uuid not null references actors(id),
  reward_text text not null check (char_length(reward_text) between 3 and 140),
  target_coins int not null check (target_coins between 100 and 100000),
  progress_coins int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  celebrated boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- One active goal per model; history rows keep their own status.
create unique index model_goals_one_active
  on model_goals (model_actor_id) where status = 'active';
create index model_goals_actor_idx on model_goals (model_actor_id, created_at desc);

alter table model_goals enable row level security;

create policy model_goals_public_read on model_goals
  for select using (true);

grant select on model_goals to anon, authenticated;

create or replace function update_model_goal_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount > 0 and new.action in ('tip_received', 'live_wall_tip_received') then
    update model_goals
    set progress_coins = progress_coins + new.amount,
        status = case
          when progress_coins + new.amount >= target_coins then 'completed'
          else status
        end,
        completed_at = case
          when progress_coins + new.amount >= target_coins then now()
          else completed_at
        end
    where model_actor_id = new.actor_id
      and status = 'active';
  end if;
  return new;
exception when others then
  -- Goal progress is cosmetic — never fail the ledger insert over it
  return new;
end;
$$;

drop trigger if exists trg_model_goal_progress on coin_transactions;
create trigger trg_model_goal_progress
  after insert on coin_transactions
  for each row
  execute function update_model_goal_progress();
