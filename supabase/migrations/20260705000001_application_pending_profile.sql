-- Let applicants build their profile (photo + bio) while their application is
-- pending review. Values are copied onto the models row at approval so a new
-- model can be visible on /models the moment she's approved, instead of the
-- historical 50% who never came back to add a photo.
ALTER TABLE model_applications
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS profile_photo_width integer,
  ADD COLUMN IF NOT EXISTS profile_photo_height integer;

COMMENT ON COLUMN model_applications.bio IS 'Applicant-written bio, copied to models.bio at approval';
COMMENT ON COLUMN model_applications.profile_photo_url IS 'Uploaded while pending (avatars bucket), copied to models.profile_photo_url at approval';
