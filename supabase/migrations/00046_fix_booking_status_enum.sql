-- Fix booking_status enum to include all required values
-- The enum may be missing: declined, counter, confirmed, completed, cancelled, no_show

-- Add missing values to the booking_status enum if they don't exist
DO $$
BEGIN
  -- Check if booking_status enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    -- Add each missing value
    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'accepted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'declined';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'counter';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'confirmed';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;
