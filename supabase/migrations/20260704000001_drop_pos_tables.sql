-- Remove the Point-of-Sale (POS) system
-- ------------------------------------------------------------------
-- The POS feature (in-store register, cash drawer, staff login, inventory
-- import) was experimental, decoupled from the core platform, and already
-- disabled at the edge (middleware blocked it unless POS_ENABLED=true, since
-- its only auth was an unauthenticated x-pos-staff-id header). All POS
-- application code is removed in the same change; these are its dedicated
-- tables.
--
-- DESTRUCTIVE: this drops POS data permanently. Apply only after confirming
-- no in-store sales records need to be retained.
--
-- Intentionally left in place (shared with the surviving Shop feature, and
-- unused by any remaining code, so harmless):
--   * shop_orders.is_pos_sale column
--   * decrement_stock(uuid, int) function

DROP TABLE IF EXISTS public.pos_staff_logs CASCADE;
DROP TABLE IF EXISTS public.pos_transactions CASCADE;
DROP TABLE IF EXISTS public.pos_drawer_sessions CASCADE;
DROP TABLE IF EXISTS public.pos_staff CASCADE;
