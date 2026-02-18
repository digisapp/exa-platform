-- Create missing actor records for models that don't have one
-- 4,577 models are missing actor records which breaks PPV, coins, messaging, etc.
-- Note: actors table has UNIQUE(user_id), so we must exclude users who already
-- have ANY actor record (fan, brand, etc.), not just model type.

-- Step 1: Create actor records for models with NO existing actor at all
INSERT INTO actors (id, user_id, type, created_at)
SELECT gen_random_uuid(), m.user_id, 'model', m.created_at
FROM models m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM actors a WHERE a.user_id = m.user_id
  );

-- Step 2: For models whose user_id already has an actor of a different type (fan/brand),
-- update that existing actor record to type 'model' since they are approved models.
-- This ensures the model identity takes precedence for PPV, coins, etc.
UPDATE actors
SET type = 'model'
WHERE user_id IN (
  SELECT m.user_id
  FROM models m
  WHERE m.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM actors a WHERE a.user_id = m.user_id AND a.type = 'model'
    )
    AND EXISTS (
      SELECT 1 FROM actors a WHERE a.user_id = m.user_id
    )
);
