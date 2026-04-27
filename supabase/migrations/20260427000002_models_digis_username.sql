-- Add digis_username to models table for EXA ↔ Digis affiliate integration
ALTER TABLE models ADD COLUMN IF NOT EXISTS digis_username TEXT;
