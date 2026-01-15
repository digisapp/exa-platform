-- ============================================
-- TICKET SALES SYSTEM
-- Adds ticket tiers and purchases for events
-- ============================================

-- Add tickets_enabled flag to events
alter table public.events
  add column if not exists tickets_enabled boolean default false;

-- ============================================
-- TICKET TIERS TABLE
-- ============================================

create table if not exists public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,                    -- 'General Admission', 'VIP', etc.
  slug text not null,                    -- 'ga', 'vip'
  description text,
  price_cents int not null,              -- Price in cents
  quantity_available int,                -- null = unlimited
  quantity_sold int default 0,
  sort_order int default 0,
  is_active boolean default true,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, slug)
);

alter table public.ticket_tiers enable row level security;

-- Everyone can view active ticket tiers
create policy "Ticket tiers viewable by everyone" on public.ticket_tiers
  for select using (true);

-- Admins can manage ticket tiers
create policy "Admins can insert ticket tiers" on public.ticket_tiers
  for insert with check (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create policy "Admins can update ticket tiers" on public.ticket_tiers
  for update using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create policy "Admins can delete ticket tiers" on public.ticket_tiers
  for delete using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create index if not exists idx_ticket_tiers_event on public.ticket_tiers(event_id);

-- ============================================
-- TICKET PURCHASES TABLE
-- ============================================

create table if not exists public.ticket_purchases (
  id uuid primary key default gen_random_uuid(),
  ticket_tier_id uuid not null references public.ticket_tiers(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,

  -- Buyer info
  buyer_email text not null,
  buyer_name text,
  buyer_phone text,

  -- Stripe info
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,

  -- Affiliate tracking
  affiliate_model_id uuid references public.models(id) on delete set null,
  affiliate_click_id uuid references public.affiliate_clicks(id) on delete set null,
  affiliate_commission_id uuid references public.affiliate_commissions(id) on delete set null,

  -- Pricing
  quantity int not null default 1,
  unit_price_cents int not null,
  total_price_cents int not null,

  -- Status
  status text default 'pending' check (status in ('pending', 'completed', 'refunded', 'cancelled')),

  -- Timestamps
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ticket_purchases enable row level security;

-- Admins can manage ticket purchases
create policy "Admins can view all ticket purchases" on public.ticket_purchases
  for select using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create policy "Admins can insert ticket purchases" on public.ticket_purchases
  for insert with check (true);  -- Allow inserts from webhook (uses service role)

create policy "Admins can update ticket purchases" on public.ticket_purchases
  for update using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

create index if not exists idx_ticket_purchases_event on public.ticket_purchases(event_id);
create index if not exists idx_ticket_purchases_tier on public.ticket_purchases(ticket_tier_id);
create index if not exists idx_ticket_purchases_stripe on public.ticket_purchases(stripe_checkout_session_id);
create index if not exists idx_ticket_purchases_affiliate on public.ticket_purchases(affiliate_model_id);
create index if not exists idx_ticket_purchases_status on public.ticket_purchases(status);

-- ============================================
-- UPDATE QUANTITY SOLD TRIGGER
-- ============================================

create or replace function public.update_ticket_quantity_sold()
returns trigger as $$
begin
  -- When purchase status changes to completed, increment quantity_sold
  if NEW.status = 'completed' and (OLD is null or OLD.status != 'completed') then
    update public.ticket_tiers
    set quantity_sold = quantity_sold + NEW.quantity,
        updated_at = now()
    where id = NEW.ticket_tier_id;
  end if;

  -- When purchase is refunded/cancelled after being completed, decrement quantity_sold
  if OLD is not null and OLD.status = 'completed' and NEW.status in ('refunded', 'cancelled') then
    update public.ticket_tiers
    set quantity_sold = greatest(0, quantity_sold - NEW.quantity),
        updated_at = now()
    where id = NEW.ticket_tier_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_update_ticket_quantity on public.ticket_purchases;
create trigger trigger_update_ticket_quantity
after insert or update on public.ticket_purchases
for each row execute function public.update_ticket_quantity_sold();

-- ============================================
-- HELPER FUNCTION: Get available quantity
-- ============================================

create or replace function public.get_ticket_availability(tier_id uuid)
returns int as $$
declare
  tier_record record;
begin
  select quantity_available, quantity_sold into tier_record
  from public.ticket_tiers
  where id = tier_id;

  if tier_record.quantity_available is null then
    return 999999;  -- Unlimited
  end if;

  return greatest(0, tier_record.quantity_available - tier_record.quantity_sold);
end;
$$ language plpgsql security definer;
