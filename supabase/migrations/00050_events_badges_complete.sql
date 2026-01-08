-- ============================================
-- EVENTS, EVENT BADGES & AFFILIATE SYSTEM
-- ============================================

-- Drop tables first (respecting foreign keys)
drop table if exists public.affiliate_commissions cascade;
drop table if exists public.affiliate_clicks cascade;
drop table if exists public.events cascade;

-- Drop functions (triggers will be dropped automatically with their functions)
drop function if exists public.manage_event_badge() cascade;
drop function if exists public.set_model_affiliate_code() cascade;
drop function if exists public.generate_affiliate_code(text) cascade;

-- Clean up any event-type badges that might exist (only if badge_type column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'badges' and column_name = 'badge_type'
  ) then
    execute 'delete from public.model_badges where badge_id in (select id from public.badges where badge_type = ''event'')';
    execute 'delete from public.badges where badge_type = ''event''';
  end if;
end $$;

-- ============================================
-- EVENTS TABLE
-- ============================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text not null,
  description text,
  cover_image_url text,
  logo_url text,
  badge_image_url text,
  location_name text,
  location_city text,
  location_state text,
  location_country text default 'US',
  start_date date,
  end_date date,
  year int not null,
  ticket_url text,
  ticket_price_cents int,
  points_awarded int default 500,
  status text default 'upcoming' check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  meta_title text,
  meta_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "Events viewable by everyone" on public.events
  for select using (true);

create policy "Admins can manage events" on public.events
  for all using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create index idx_events_slug on public.events(slug);
create index idx_events_year on public.events(year);
create index idx_events_status on public.events(status);

-- ============================================
-- ADD EVENT_ID TO OPPORTUNITIES
-- ============================================

alter table public.gigs
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists idx_gigs_event on public.gigs(event_id);

-- ============================================
-- ADD COLUMNS TO BADGES TABLE
-- ============================================

alter table public.badges
  add column if not exists event_id uuid references public.events(id) on delete cascade;

alter table public.badges
  add column if not exists badge_type text default 'achievement';

alter table public.badges
  add column if not exists is_active boolean default true;

-- ============================================
-- ADD AFFILIATE_CODE TO MODELS
-- ============================================

alter table public.models
  add column if not exists affiliate_code text unique;

-- ============================================
-- AFFILIATE CODE FUNCTIONS
-- ============================================

create or replace function public.generate_affiliate_code(p_username text)
returns text as $$
declare
  code text;
  base_code text;
  suffix text;
begin
  base_code := upper(left(regexp_replace(coalesce(p_username, 'USER'), '[^a-zA-Z0-9]', '', 'g'), 4));
  if length(base_code) < 4 then
    base_code := base_code || repeat('X', 4 - length(base_code));
  end if;
  suffix := upper(substring(md5(random()::text) from 1 for 4));
  code := base_code || suffix;
  while exists (select 1 from public.models where affiliate_code = code) loop
    suffix := upper(substring(md5(random()::text) from 1 for 4));
    code := base_code || suffix;
  end loop;
  return code;
end;
$$ language plpgsql;

-- Generate codes for existing models
update public.models
set affiliate_code = public.generate_affiliate_code(username)
where affiliate_code is null;

-- Trigger for new models
create or replace function public.set_model_affiliate_code()
returns trigger as $$
begin
  if NEW.affiliate_code is null then
    NEW.affiliate_code := public.generate_affiliate_code(NEW.username);
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_affiliate_code on public.models;
create trigger trigger_set_affiliate_code
before insert on public.models
for each row execute function public.set_model_affiliate_code();

-- ============================================
-- AFFILIATE CLICKS TABLE
-- ============================================

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  visitor_id text,
  ip_hash text,
  user_agent text,
  referrer text,
  source text,
  created_at timestamptz default now()
);

alter table public.affiliate_clicks enable row level security;

create policy "Models can view own clicks" on public.affiliate_clicks
  for select using (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Insert allowed" on public.affiliate_clicks
  for insert with check (true);

create policy "Admins can view all clicks" on public.affiliate_clicks
  for select using (exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin'));

create index idx_affiliate_clicks_model on public.affiliate_clicks(model_id, created_at desc);

-- ============================================
-- AFFILIATE COMMISSIONS TABLE
-- ============================================

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  click_id uuid references public.affiliate_clicks(id) on delete set null,
  order_id text,
  sale_amount_cents int not null,
  commission_rate numeric(5,4) default 0.20,
  commission_amount_cents int not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.affiliate_commissions enable row level security;

create policy "Models can view own commissions" on public.affiliate_commissions
  for select using (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Admins can manage commissions" on public.affiliate_commissions
  for all using (exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin'));

create index idx_affiliate_commissions_model on public.affiliate_commissions(model_id, status);

-- ============================================
-- EVENT BADGE AUTO-GRANT TRIGGER
-- ============================================

create or replace function public.manage_event_badge()
returns trigger as $$
declare
  v_event_id uuid;
  v_badge_id uuid;
  v_points int;
begin
  -- Get event_id from the opportunity
  select event_id into v_event_id
  from public.gigs
  where id = NEW.gig_id;

  if v_event_id is null then
    return NEW;
  end if;

  -- Get the badge for this event
  select id into v_badge_id
  from public.badges
  where event_id = v_event_id and badge_type = 'event'
  limit 1;

  if v_badge_id is null then
    return NEW;
  end if;

  -- Get points for this event
  select points_awarded into v_points from public.events where id = v_event_id;

  -- Grant badge when accepted
  if NEW.status = 'accepted' and (OLD is null or OLD.status != 'accepted') then
    insert into public.model_badges (model_id, badge_id, earned_at)
    values (NEW.model_id, v_badge_id, now())
    on conflict (model_id, badge_id) do nothing;

    -- Award points
    if v_points > 0 then
      perform public.award_points(
        NEW.model_id,
        'event_confirmed',
        v_points,
        jsonb_build_object('event_id', v_event_id)
      );
    end if;

  -- Revoke badge when un-accepted
  elsif OLD is not null and OLD.status = 'accepted' and NEW.status != 'accepted' then
    if not exists (
      select 1 from public.gig_applications oa
      join public.gigs o on o.id = oa.gig_id
      where oa.model_id = NEW.model_id
      and o.event_id = v_event_id
      and oa.status = 'accepted'
      and oa.id != NEW.id
    ) then
      delete from public.model_badges
      where model_id = NEW.model_id and badge_id = v_badge_id;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_manage_event_badge on public.gig_applications;
create trigger trigger_manage_event_badge
after insert or update on public.gig_applications
for each row execute function public.manage_event_badge();

-- ============================================
-- MODEL BADGES POLICIES FOR TRIGGER
-- ============================================

drop policy if exists "System can insert model badges" on public.model_badges;
create policy "System can insert model badges" on public.model_badges
  for insert with check (true);

drop policy if exists "System can delete model badges" on public.model_badges;
create policy "System can delete model badges" on public.model_badges
  for delete using (true);

-- ============================================
-- SEED EVENTS
-- ============================================

insert into public.events (slug, name, short_name, description, location_city, location_state, start_date, end_date, year, points_awarded)
values
  ('miami-swim-week-2026', 'Miami Swim Week 2026', 'MSW', 'The premier swimwear fashion event featuring the hottest designers and models.', 'Miami', 'FL', '2026-05-29', '2026-06-01', 2026, 500),
  ('nyfw-fall-2026', 'New York Fashion Week Fall 2026', 'NYFW', 'The iconic New York Fashion Week showcasing fall collections from top designers.', 'New York', 'NY', '2026-09-11', '2026-09-16', 2026, 750),
  ('miami-art-week-2026', 'Miami Art Week 2026', 'MAW', 'Experience the fusion of art, fashion, and culture during Miami Art Week.', 'Miami', 'FL', '2026-12-01', '2026-12-06', 2026, 500);

-- ============================================
-- SEED EVENT BADGES
-- ============================================

insert into public.badges (slug, name, description, icon, badge_type, event_id, is_active)
select
  e.slug,
  e.short_name || ' ' || e.year::text,
  'Confirmed to walk in ' || e.name,
  case e.short_name when 'MSW' then '🏖️' when 'NYFW' then '🗽' when 'MAW' then '🎨' else '⭐' end,
  'event',
  e.id,
  true
from public.events e;
