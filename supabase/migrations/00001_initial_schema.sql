-- ============================================
-- EXA PLATFORM - INITIAL SCHEMA
-- ============================================

-- Enable required extensions
create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- ============================================
-- CORE IDENTITY: ACTORS
-- ============================================

create table public.actors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete cascade,
  type text not null check (type in ('model', 'brand', 'admin')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.actors enable row level security;

-- Policies for actors
create policy "Actors are viewable by everyone" on public.actors
  for select using (true);

create policy "Users can insert their own actor" on public.actors
  for insert with check (auth.uid() = user_id);

-- ============================================
-- MODELS
-- ============================================

create table public.models (
  id uuid primary key references public.actors(id) on delete cascade,
  username text unique not null,
  email text,
  name text,
  bio text,

  -- Location
  city text,
  state text,
  country text default 'US',

  -- Physical
  height_inches int,
  measurements jsonb default '{}',
  hair_color text,
  eye_color text,

  -- Social
  instagram_handle text,
  instagram_followers int default 0,
  tiktok_handle text,
  tiktok_followers int default 0,

  -- Gamification (cached from ledger)
  points_cached int default 0,
  level_cached text default 'rising' check (level_cached in ('rising', 'verified', 'pro', 'elite')),

  -- Status
  is_approved boolean default false,
  is_featured boolean default false,
  profile_complete boolean default false,
  availability text default 'available' check (availability in ('available', 'busy', 'not_available')),

  -- Privacy settings
  show_measurements boolean default true,
  show_location boolean default true,
  show_socials boolean default true,
  show_email boolean default false,

  -- Profile photo
  avatar_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.models enable row level security;

-- Policies for models
create policy "Models are viewable by everyone" on public.models
  for select using (is_approved = true or id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can update their own model profile" on public.models
  for update using (id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can insert their own model profile" on public.models
  for insert with check (id = (select id from public.actors where user_id = auth.uid()));

-- Indexes for models
create index idx_models_username on public.models(username);
create index idx_models_location on public.models(state, city);
create index idx_models_height on public.models(height_inches);
create index idx_models_points on public.models(points_cached desc);
create index idx_models_approved on public.models(is_approved) where is_approved = true;
create index idx_models_featured on public.models(is_featured) where is_featured = true;
create index idx_models_username_trgm on public.models using gin(username gin_trgm_ops);
create index idx_models_name_trgm on public.models using gin(name gin_trgm_ops);

-- ============================================
-- BRANDS
-- ============================================

create table public.brands (
  id uuid primary key references public.actors(id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text,
  website text,
  logo_url text,
  bio text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'basic', 'pro', 'enterprise')),
  subscription_ends_at timestamptz,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.brands enable row level security;

create policy "Brands are viewable by everyone" on public.brands
  for select using (true);

create policy "Users can update their own brand" on public.brands
  for update using (id = (select id from public.actors where user_id = auth.uid()));

-- ============================================
-- MEDIA ASSETS
-- ============================================

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.actors(id) on delete cascade,
  type text check (type in ('photo', 'video', 'document')),
  storage_path text not null,
  url text,
  width int,
  height int,
  size_bytes int,
  mime_type text,
  is_primary boolean default false,
  display_order int default 0,
  source text default 'upload', -- 'upload', 'opportunity', 'instagram'
  opportunity_id uuid,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.media_assets enable row level security;

create policy "Media viewable by everyone" on public.media_assets
  for select using (true);

create policy "Users can insert their own media" on public.media_assets
  for insert with check (owner_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can update their own media" on public.media_assets
  for update using (owner_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can delete their own media" on public.media_assets
  for delete using (owner_id = (select id from public.actors where user_id = auth.uid()));

-- Indexes
create index idx_media_owner on public.media_assets(owner_id, display_order);

-- ============================================
-- GAMIFICATION: POINTS LEDGER
-- ============================================

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  action text not null,
  points int not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.point_transactions enable row level security;

create policy "Users can view their own points" on public.point_transactions
  for select using (model_id = (select id from public.actors where user_id = auth.uid()));

-- Indexes
create index idx_points_model on public.point_transactions(model_id, created_at desc);

-- ============================================
-- GAMIFICATION: BADGES
-- ============================================

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  points_required int,
  criteria jsonb default '{}'
);

create table public.model_badges (
  model_id uuid references public.models(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (model_id, badge_id)
);

-- Enable RLS
alter table public.badges enable row level security;
alter table public.model_badges enable row level security;

create policy "Badges viewable by everyone" on public.badges for select using (true);
create policy "Model badges viewable by everyone" on public.model_badges for select using (true);

-- ============================================
-- GAMIFICATION: LOGIN STREAKS
-- ============================================

create table public.login_streaks (
  model_id uuid primary key references public.models(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_login_date date
);

-- Enable RLS
alter table public.login_streaks enable row level security;

create policy "Users can view their own streaks" on public.login_streaks
  for select using (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can update their own streaks" on public.login_streaks
  for update using (model_id = (select id from public.actors where user_id = auth.uid()));

-- ============================================
-- OPPORTUNITIES
-- ============================================

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),

  -- Basic info
  type text not null check (type in ('show', 'travel', 'campaign', 'content', 'hosting', 'other')),
  title text not null,
  slug text unique not null,
  description text,

  -- Media
  cover_image_url text,

  -- Location & Time
  location_name text,
  location_city text,
  location_state text,
  location_country text,
  start_at timestamptz,
  end_at timestamptz,
  application_deadline timestamptz,

  -- Capacity
  spots int,
  spots_filled int default 0,

  -- Compensation
  compensation_type text check (compensation_type in ('paid', 'tfp', 'perks', 'exposure')),
  compensation_amount int, -- cents
  compensation_description text,

  -- Requirements (flexible JSON)
  requirements jsonb default '{}',

  -- Visibility
  visibility text default 'public' check (visibility in ('public', 'invite', 'unlisted')),

  -- Status
  status text default 'draft' check (status in ('draft', 'open', 'closed', 'completed', 'cancelled')),

  -- Points awarded on completion
  points_for_completion int default 200,

  -- Meta
  created_by uuid references public.actors(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.opportunities enable row level security;

create policy "Public opportunities viewable by everyone" on public.opportunities
  for select using (visibility = 'public' or status = 'open');

create policy "Admins can manage opportunities" on public.opportunities
  for all using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

-- Indexes
create index idx_opportunities_status on public.opportunities(status, start_at);
create index idx_opportunities_type on public.opportunities(type);
create index idx_opportunities_deadline on public.opportunities(application_deadline) where status = 'open';

-- ============================================
-- OPPORTUNITY APPLICATIONS
-- ============================================

create table public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,

  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'waitlist')),

  -- Application details
  note text,
  admin_note text,
  reviewed_by uuid references public.actors(id),

  applied_at timestamptz default now(),
  reviewed_at timestamptz,

  unique(opportunity_id, model_id)
);

-- Enable RLS
alter table public.opportunity_applications enable row level security;

create policy "Users can view their own applications" on public.opportunity_applications
  for select using (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can insert their own applications" on public.opportunity_applications
  for insert with check (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can withdraw their own applications" on public.opportunity_applications
  for update using (model_id = (select id from public.actors where user_id = auth.uid()));

create policy "Admins can manage all applications" on public.opportunity_applications
  for all using (
    exists (select 1 from public.actors where user_id = auth.uid() and type = 'admin')
  );

-- Indexes
create index idx_applications_opportunity on public.opportunity_applications(opportunity_id, status);
create index idx_applications_model on public.opportunity_applications(model_id, status);

-- ============================================
-- MESSAGING: CONVERSATIONS
-- ============================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text default 'direct' check (type in ('direct', 'group', 'opportunity')),
  title text,
  opportunity_id uuid references public.opportunities(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.conversations enable row level security;

-- ============================================
-- MESSAGING: PARTICIPANTS
-- ============================================

create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  actor_id uuid references public.actors(id) on delete cascade,
  role text default 'member' check (role in ('member', 'admin', 'owner')),
  joined_at timestamptz default now(),
  last_read_at timestamptz,
  muted boolean default false,
  primary key (conversation_id, actor_id)
);

-- Enable RLS
alter table public.conversation_participants enable row level security;

create policy "Users can view conversations they are in" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = id
      and actor_id = (select id from public.actors where user_id = auth.uid())
    )
  );

create policy "Users can view their participations" on public.conversation_participants
  for select using (actor_id = (select id from public.actors where user_id = auth.uid()));

-- ============================================
-- MESSAGING: MESSAGES
-- ============================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.actors(id),

  content text,
  media_url text,
  media_type text,

  is_system boolean default false,

  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

-- Enable RLS
alter table public.messages enable row level security;

create policy "Users can view messages in their conversations" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and actor_id = (select id from public.actors where user_id = auth.uid())
    )
  );

create policy "Users can send messages to their conversations" on public.messages
  for insert with check (
    sender_id = (select id from public.actors where user_id = auth.uid())
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and actor_id = sender_id
    )
  );

-- Indexes
create index idx_messages_conversation on public.messages(conversation_id, created_at desc);

-- ============================================
-- MESSAGE READS
-- ============================================

create table public.message_reads (
  message_id uuid references public.messages(id) on delete cascade,
  actor_id uuid references public.actors(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, actor_id)
);

-- Enable RLS
alter table public.message_reads enable row level security;

-- ============================================
-- FOLLOWS
-- ============================================

create table public.follows (
  follower_id uuid references public.actors(id) on delete cascade,
  following_id uuid references public.actors(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Enable RLS
alter table public.follows enable row level security;

create policy "Follows viewable by everyone" on public.follows for select using (true);

create policy "Users can follow others" on public.follows
  for insert with check (follower_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can unfollow" on public.follows
  for delete using (follower_id = (select id from public.actors where user_id = auth.uid()));

-- ============================================
-- NOTIFICATIONS
-- ============================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.actors(id) on delete cascade,
  type text not null,
  title text,
  body text,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

create policy "Users can view their own notifications" on public.notifications
  for select using (actor_id = (select id from public.actors where user_id = auth.uid()));

create policy "Users can update their own notifications" on public.notifications
  for update using (actor_id = (select id from public.actors where user_id = auth.uid()));

-- Indexes
create index idx_notifications_actor on public.notifications(actor_id, read, created_at desc);

-- ============================================
-- REFERRALS
-- ============================================

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.models(id),
  referred_id uuid not null references public.models(id),
  status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  points_awarded boolean default false,
  created_at timestamptz default now(),
  verified_at timestamptz
);

-- Enable RLS
alter table public.referrals enable row level security;

-- ============================================
-- FUNCTIONS: Update Model Points Cache
-- ============================================

create or replace function public.update_model_points_cache()
returns trigger as $$
declare
  total_points int;
  new_level text;
begin
  -- Calculate total points
  select coalesce(sum(points), 0) into total_points
  from public.point_transactions
  where model_id = NEW.model_id;

  -- Determine level
  new_level := case
    when total_points >= 5000 then 'elite'
    when total_points >= 2000 then 'pro'
    when total_points >= 500 then 'verified'
    else 'rising'
  end;

  -- Update model
  update public.models
  set
    points_cached = total_points,
    level_cached = new_level,
    updated_at = now()
  where id = NEW.model_id;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger
create trigger trigger_update_points_cache
after insert on public.point_transactions
for each row execute function public.update_model_points_cache();

-- ============================================
-- FUNCTIONS: Helper functions for RLS
-- ============================================

create or replace function public.get_actor_id()
returns uuid as $$
  select id from public.actors where user_id = auth.uid()
$$ language sql security definer stable;

create or replace function public.get_actor_type()
returns text as $$
  select type from public.actors where user_id = auth.uid()
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select exists(select 1 from public.actors where user_id = auth.uid() and type = 'admin')
$$ language sql security definer stable;

-- ============================================
-- FUNCTIONS: Award points helper
-- ============================================

create or replace function public.award_points(
  p_model_id uuid,
  p_action text,
  p_points int,
  p_metadata jsonb default '{}'
)
returns uuid as $$
declare
  transaction_id uuid;
begin
  insert into public.point_transactions (model_id, action, points, metadata)
  values (p_model_id, p_action, p_points, p_metadata)
  returning id into transaction_id;

  return transaction_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTIONS: Update opportunity spots
-- ============================================

create or replace function public.update_opportunity_spots()
returns trigger as $$
begin
  if NEW.status = 'accepted' and (OLD.status is null or OLD.status != 'accepted') then
    update public.opportunities
    set spots_filled = spots_filled + 1
    where id = NEW.opportunity_id;
  elsif OLD.status = 'accepted' and NEW.status != 'accepted' then
    update public.opportunities
    set spots_filled = greatest(spots_filled - 1, 0)
    where id = NEW.opportunity_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_update_opportunity_spots
after insert or update on public.opportunity_applications
for each row execute function public.update_opportunity_spots();

-- ============================================
-- SEED: Default badges
-- ============================================

insert into public.badges (slug, name, description, icon) values
  ('first-show', 'First Show', 'Walked in your first fashion show', '🎭'),
  ('globetrotter', 'Globetrotter', 'Joined 3+ travel experiences', '✈️'),
  ('consistent', 'Consistent', 'Maintained a 30-day login streak', '🔥'),
  ('fan-favorite', 'Fan Favorite', 'Reached 100+ followers on the platform', '⭐'),
  ('veteran', 'Veteran', 'Been on the platform for 1+ year', '🏆'),
  ('portfolio-pro', 'Portfolio Pro', 'Added 10+ portfolio photos', '📸'),
  ('social-star', 'Social Star', 'Connected all social accounts', '🌟'),
  ('early-adopter', 'Early Adopter', 'Joined during the first month', '🚀');

-- ============================================
-- STORAGE: Create buckets
-- ============================================

-- Note: Run these in the Supabase dashboard or via API
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true);
-- insert into storage.buckets (id, name, public) values ('opportunities', 'opportunities', true);
