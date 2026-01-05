-- Function to increment gig spots_filled
create or replace function public.increment_gig_spots_filled(gig_id uuid)
returns void as $$
begin
  update public.gigs
  set spots_filled = coalesce(spots_filled, 0) + 1
  where id = gig_id;
end;
$$ language plpgsql security definer;

-- Function to decrement gig spots_filled
create or replace function public.decrement_gig_spots_filled(gig_id uuid)
returns void as $$
begin
  update public.gigs
  set spots_filled = greatest(coalesce(spots_filled, 0) - 1, 0)
  where id = gig_id;
end;
$$ language plpgsql security definer;
