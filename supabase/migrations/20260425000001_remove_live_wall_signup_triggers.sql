-- Remove auto-announcement triggers that posted to the live wall on model/fan signup.
-- These announced new members by real first name before they had set up a profile,
-- and added noise to a wall meant for model-posted content.

DROP TRIGGER IF EXISTS live_wall_model_signup ON public.models;
DROP TRIGGER IF EXISTS live_wall_fan_signup ON public.fans;

DROP FUNCTION IF EXISTS public.live_wall_on_model_signup();
DROP FUNCTION IF EXISTS public.live_wall_on_fan_signup();
