-- Age 18+ enforcement (2026-07-15)
--
-- Context: a 2025-11 import batch landed under-18 and garbage birthdates in
-- models.dob, and until now nothing at the storage layer prevented an
-- under-18 DOB from being written by any code path (signup API bypass,
-- import scripts, admin edits).
--
-- PREREQUISITE: run `npx tsx scripts/cleanup-underage-dobs.ts --apply` BEFORE
-- applying this migration — ADD CONSTRAINT validates existing rows and will
-- fail while under-18 rows remain.

-- fans: timestamp of the "I am at least 18" attestation collected at signup.
-- NULL for accounts created before this shipped.
alter table public.fans add column if not exists age_attested_at timestamptz;
comment on column public.fans.age_attested_at is
  'When the user confirmed being 18+ at signup/claim. NULL = predates attestation checkbox (2026-07-15).';

-- 18+ (or NULL) checks on every DOB column. NULL stays allowed: ~2.2k
-- imported model rows legitimately have no DOB and are audited at claim time
-- instead. models.dob exists in prod but not in the migration history
-- (schema drift from the import tooling), so every constraint is guarded on
-- column existence to keep this migration runnable in any environment.
do $$
declare
  t text;
  c text;
  cname text;
begin
  for t, c in
    select * from (values
      ('models', 'dob'),
      ('models', 'date_of_birth'),
      ('models', 'verified_dob'),
      ('model_applications', 'date_of_birth')
    ) as v(tbl, col)
  loop
    cname := t || '_' || c || '_18_plus';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = c
    ) and not exists (
      select 1 from pg_constraint where conname = cname
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or %I <= current_date - interval ''18 years'')',
        t, cname, c, c
      );
    end if;
  end loop;
end $$;
