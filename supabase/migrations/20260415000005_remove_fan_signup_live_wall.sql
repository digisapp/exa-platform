-- Remove fan signup announcements from Live Chat
-- Fans should only appear in chat when they tip big (100+ coins)

DROP TRIGGER IF EXISTS live_wall_fan_signup ON public.fans;
DROP FUNCTION IF EXISTS public.live_wall_on_fan_signup();
