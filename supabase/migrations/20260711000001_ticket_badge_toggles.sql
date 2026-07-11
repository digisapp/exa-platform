-- Admin-controlled "Tickets" and "Badges" toggles for a show, plus a move of
-- badge awarding from gig ACCEPTANCE to event COMPLETION.
--
-- Product model after this migration:
--   * 🎟️ Tickets toggle  -> events.promote_tickets_on_profiles. When ON, a model
--       who is APPROVED for the show (accepted gig application) gets the show's
--       "Get Tickets" affiliate link on their public profile while the show is
--       still upcoming/active. The profile reads accepted gig_applications for
--       this — NOT badges — so the link can appear before the show happens.
--   * 🏅 Badges toggle    -> badges.is_active (existing column, now surfaced in
--       the admin event form). When ON, accepted models earn the show badge when
--       the event is marked 'completed' (award_event_completion_points below).
--
-- Timing change: badges used to be granted on acceptance (manage_event_badge +
-- the accept route). They are now granted at event completion, matching the
-- product language "complete the show → get a badge". The pre-show "approved"
-- signal that drives the ticket link is the accepted gig_application itself.

-- 1) Tickets toggle column ---------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS promote_tickets_on_profiles boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.promote_tickets_on_profiles IS
  'When true, models approved for this show promote its ticket affiliate link on their profile while the show is upcoming/active.';

-- Preserve current behaviour: any show that already has a ticket link / ticketing
-- configured was effectively promoting to approved models, so keep it on.
UPDATE public.events
SET promote_tickets_on_profiles = true
WHERE COALESCE(promote_tickets_on_profiles, false) = false
  AND (
    ticket_url IS NOT NULL
    OR COALESCE(use_external_ticketing, false) = true
    OR COALESCE(tickets_enabled, false) = true
  );

-- 2) Stop awarding badges on acceptance -------------------------------------
-- manage_event_badge() no longer grants a badge when a gig application is
-- accepted (that now happens at event completion). The revoke path is kept so
-- that un-accepting a model who already earned the badge (i.e. after the show
-- completed) cleans it up, as long as they hold no other accepted gig for the
-- same event.
CREATE OR REPLACE FUNCTION public.manage_event_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id uuid;
  v_badge_id uuid;
BEGIN
  SELECT event_id INTO v_event_id
  FROM public.gigs
  WHERE id = NEW.gig_id;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_badge_id
  FROM public.badges
  WHERE event_id = v_event_id AND badge_type = 'event'
  LIMIT 1;

  IF v_badge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Badges are awarded at EVENT COMPLETION now, not on acceptance. Only the
  -- revoke-on-un-accept path remains here.
  IF OLD IS NOT NULL AND OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
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

-- 3) Award badges (and existing points) when the event completes -------------
-- Extends the existing completion trigger (00052) to also grant the event badge
-- to every accepted model, gated on the badge being active (the 🏅 toggle).
CREATE OR REPLACE FUNCTION public.award_event_completion_points()
RETURNS TRIGGER AS $$
DECLARE
  v_model RECORD;
  v_points int;
  v_badge_id uuid;
  v_badge_active boolean;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_points := COALESCE(NEW.points_awarded, 0);

    -- This event's badge (if any) and whether the 🏅 toggle leaves it active.
    SELECT id, is_active INTO v_badge_id, v_badge_active
    FROM public.badges
    WHERE event_id = NEW.id AND badge_type = 'event'
    LIMIT 1;

    IF v_points > 0 OR (v_badge_id IS NOT NULL AND COALESCE(v_badge_active, false)) THEN
      FOR v_model IN
        SELECT DISTINCT ga.model_id
        FROM public.gig_applications ga
        JOIN public.gigs g ON g.id = ga.gig_id
        WHERE g.event_id = NEW.id
          AND ga.status = 'accepted'
      LOOP
        IF v_points > 0 THEN
          PERFORM public.award_points(
            v_model.model_id,
            'event_completed',
            v_points,
            jsonb_build_object('event_id', NEW.id, 'event_name', NEW.name)
          );
        END IF;

        IF v_badge_id IS NOT NULL AND COALESCE(v_badge_active, false) THEN
          INSERT INTO public.model_badges (model_id, badge_id, earned_at)
          VALUES (v_model.model_id, v_badge_id, now())
          ON CONFLICT (model_id, badge_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger trigger_award_event_completion_points is already bound to this
-- function (00052); CREATE OR REPLACE above is sufficient.
