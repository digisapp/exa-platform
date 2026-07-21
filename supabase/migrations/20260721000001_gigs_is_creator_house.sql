-- Creator House gigs were detected by matching "creator house" in the gig title,
-- which silently broke payment flows on rename. Replace with an explicit flag.
alter table public.gigs
  add column if not exists is_creator_house boolean not null default false;

update public.gigs
  set is_creator_house = true
  where title ilike '%creator house%';

comment on column public.gigs.is_creator_house is
  'Paid-spot gig: accepted models must pay via Stripe checkout (Creator House flow). Set in /admin/gigs; drives payment email + checkout button instead of title matching.';
