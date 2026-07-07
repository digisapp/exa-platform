-- Photo-request flow: admin marks an application as "selected pending photo";
-- when the applicant uploads their photo, the system auto-approves.
-- photo_requested_by doubles as reviewed_by for the auto-approval audit trail.
ALTER TABLE public.model_applications
  ADD COLUMN IF NOT EXISTS photo_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_requested_by uuid REFERENCES public.actors(id);
