-- Drop unused game tables that were never integrated into the UI
-- These features only had database schemas with no corresponding API routes or components

DROP TABLE IF EXISTS runway_rush_scores CASCADE;
DROP TABLE IF EXISTS catwalk_scores CASCADE;
DROP TABLE IF EXISTS catwalk_unlocks CASCADE;
DROP TABLE IF EXISTS mystery_box_history CASCADE;
DROP TABLE IF EXISTS lifestyle_activities CASCADE;
DROP TABLE IF EXISTS lifestyle_stats CASCADE;
