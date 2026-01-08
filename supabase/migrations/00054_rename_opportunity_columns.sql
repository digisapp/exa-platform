-- Rename opportunity_id columns to gig_id for consistency
-- The tables were renamed from opportunities to gigs

-- Rename in conversations table (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE public.conversations RENAME COLUMN opportunity_id TO gig_id;
  END IF;
END $$;

-- Rename in media_assets table (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_assets' AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE public.media_assets RENAME COLUMN opportunity_id TO gig_id;
  END IF;
END $$;

-- Add gig_id foreign key constraint on conversations if not exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'gig_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'conversations'
    AND tc.constraint_type = 'FOREIGN KEY' AND ccu.column_name = 'gig_id'
  ) THEN
    -- Drop old constraint if exists
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_opportunity_id_fkey;
    -- Add new constraint
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_gig_id_fkey
      FOREIGN KEY (gig_id) REFERENCES public.gigs(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if gigs table doesn't exist yet
  NULL;
END $$;
