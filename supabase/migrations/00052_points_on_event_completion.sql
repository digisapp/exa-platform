-- Move points awarding from acceptance to event completion
-- Badge is still granted on acceptance, but points only when event completes

-- 1. Update the manage_event_badge trigger to NOT award points on acceptance
CREATE OR REPLACE FUNCTION public.manage_event_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id uuid;
  v_badge_id uuid;
BEGIN
  -- Get event_id from the gig
  SELECT event_id INTO v_event_id
  FROM public.gigs
  WHERE id = NEW.gig_id;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the badge for this event
  SELECT id INTO v_badge_id
  FROM public.badges
  WHERE event_id = v_event_id AND badge_type = 'event'
  LIMIT 1;

  IF v_badge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant badge when accepted (but NO points yet - points come when event completes)
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO public.model_badges (model_id, badge_id, earned_at)
    VALUES (NEW.model_id, v_badge_id, now())
    ON CONFLICT (model_id, badge_id) DO NOTHING;

  -- Revoke badge when un-accepted
  ELSIF OLD IS NOT NULL AND OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.gig_applications ga
      JOIN public.gigs g ON g.id = ga.gig_id
      WHERE ga.model_id = NEW.model_id
      AND g.event_id = v_event_id
      AND ga.status = 'accepted'
      AND ga.id != NEW.id
    ) THEN
      DELETE FROM public.model_badges
      WHERE model_id = NEW.model_id AND badge_id = v_badge_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to award points when event is marked as completed
CREATE OR REPLACE FUNCTION public.award_event_completion_points()
RETURNS TRIGGER AS $$
DECLARE
  v_model RECORD;
  v_points int;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_points := COALESCE(NEW.points_awarded, 0);

    IF v_points > 0 THEN
      -- Find all models who were accepted for gigs linked to this event
      FOR v_model IN
        SELECT DISTINCT ga.model_id
        FROM public.gig_applications ga
        JOIN public.gigs g ON g.id = ga.gig_id
        WHERE g.event_id = NEW.id
        AND ga.status = 'accepted'
      LOOP
        -- Award points to each model
        PERFORM public.award_points(
          v_model.model_id,
          'event_completed',
          v_points,
          jsonb_build_object('event_id', NEW.id, 'event_name', NEW.name)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_award_event_completion_points ON public.events;

-- Create the trigger
CREATE TRIGGER trigger_award_event_completion_points
AFTER UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.award_event_completion_points();
