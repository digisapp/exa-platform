-- Allow multiple models (up to 3) to book the same studio slot

-- Add max_bookings column to studio_slots (default 3)
ALTER TABLE studio_slots ADD COLUMN max_bookings INTEGER NOT NULL DEFAULT 3;

-- Drop the single-booking unique constraint
ALTER TABLE studio_bookings DROP CONSTRAINT studio_bookings_slot_id_key;

-- Add constraint to prevent the same model booking the same slot twice
ALTER TABLE studio_bookings ADD CONSTRAINT studio_bookings_slot_model_unique UNIQUE(slot_id, model_id);
