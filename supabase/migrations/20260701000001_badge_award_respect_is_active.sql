-- Make the event-badge trigger respect badges.is_active.
--
-- Background: manage_event_badge() (00050, updated 00052) awarded a model the
-- event badge on acceptance by looking the badge up purely by
-- (event_id, badge_type='event') -- with NO is_active check. The application-
-- layer accept route (/api/admin/gig-applications/[id]) DOES filter
-- is_active=true. The two paths therefore disagreed: deactivating a badge to
-- "close out" a show (e.g. MSW 2026) stopped the route from awarding it but the
-- trigger would still silently re-create the model_badges row on any new accept.
--
-- Semantics after this migration:
--   * is_active = false  -> the badge is RETIRED. Never award it to anyone new.
--                           (This makes is_active a reliable off-switch and the
--                            single lever for "this badge no longer exists".)
--   * "the show is over"  -> events.status = 'completed' (a DISPLAY concern,
--                            handled in the UI). Ending a show should NOT rely on
--                            flipping is_active, so that already-earned badges can
--                            still be shown on a model's trophy wall later.
--
-- Un-accept / revoke behaviour is intentionally UNCHANGED and is NOT gated on
-- is_active: if a model is un-accepted they are no longer confirmed, so their
-- badge row is removed regardless of whether the badge is active -- but only when
-- they hold no OTHER accepted gig for the same event (existing multi-gig logic).

CREATE OR REPLACE FUNCTION public.manage_event_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id uuid;
  v_badge_id uuid;
  v_badge_active boolean;
BEGIN
  -- Get event_id from the gig
  SELECT event_id INTO v_event_id
  FROM public.gigs
  WHERE id = NEW.gig_id;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the badge for this event (fetch is_active so we can gate awarding on it)
  SELECT id, is_active INTO v_badge_id, v_badge_active
  FROM public.badges
  WHERE event_id = v_event_id AND badge_type = 'event'
  LIMIT 1;

  IF v_badge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant badge when accepted -- ONLY if the badge is still active.
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    IF v_badge_active THEN
      INSERT INTO public.model_badges (model_id, badge_id, earned_at)
      VALUES (NEW.model_id, v_badge_id, now())
      ON CONFLICT (model_id, badge_id) DO NOTHING;
    END IF;

  -- Revoke badge when un-accepted (regardless of is_active), but only if the
  -- model has no OTHER accepted gig for the same event.
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

-- Note: the existing trigger binding on gig_applications already points at this
-- function by name, so CREATE OR REPLACE is sufficient -- no CREATE TRIGGER needed.
