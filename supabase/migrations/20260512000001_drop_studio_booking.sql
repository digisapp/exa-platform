-- Drop the physical studio booking feature.
-- Tables, policies, indexes, and triggers are removed via CASCADE on the tables.
-- The helper function is only used by these tables, so drop it too.

DROP TABLE IF EXISTS studio_bookings CASCADE;
DROP TABLE IF EXISTS studio_slots CASCADE;
DROP FUNCTION IF EXISTS update_studio_updated_at();
