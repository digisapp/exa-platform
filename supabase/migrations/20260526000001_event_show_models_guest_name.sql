-- Allow walk-in extras in show lineups: a model_id-less row that carries just a name.
-- Used by admin/shows when a model shows up day-of without an EXA account.

alter table public.event_show_models
  alter column model_id drop not null;

alter table public.event_show_models
  add column guest_name text;

alter table public.event_show_models
  add constraint event_show_models_model_or_guest_check
  check (model_id is not null or guest_name is not null);
