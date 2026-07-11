-- Badge/points award gaps left by 20260711000001 (badges at event completion).
--
-- Three fixes, all trigger-level and idempotent:
--
-- 1) LATE ACCEPTANCE: manage_event_badge() stopped awarding on acceptance, and
--    award_event_completion_points() only fires on the status -> 'completed'
--    transition. An application accepted AFTER the event completed therefore
--    never earned the badge. Fix: when an application flips to accepted and the
--    linked event is ALREADY completed (and the badge is active), award the
--    badge immediately. Badge only — points are handled by the completion
--    trigger and are intentionally NOT paid here.
--
-- 2) DOUBLE-AWARD OF POINTS: award_points() blindly inserts into
--    point_transactions, so flipping an event back to 'upcoming' and
--    re-completing it paid every model twice. Fix: guard each award on no
--    existing point_transactions row with (model_id, action='event_completed',
--    metadata->>'event_id' = event id). The completion trigger has recorded
--    event_id in metadata since 00052, so this key is reliable for rows already
--    written. award_points() itself is unchanged (other actions unaffected).
--
-- 3) TOGGLE-AFTER-COMPLETION: if badges.is_active was OFF when the event
--    completed, turning it ON later did nothing. Fix: when an event badge flips
--    is_active false -> true and its event is already completed, backfill the
--    badge to all accepted applications' models. Badges only — the points guard
--    from (2) already protects the re-complete path.

-- 1) manage_event_badge: award on late acceptance into a completed event ------
-- Identical to the 20260711000001 definition except for the new accepted-branch.
CREATE OR REPLACE FUNCTION public.manage_event_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id uuid;
  v_event_status text;
  v_badge_id uuid;
  v_badge_active boolean;
BEGIN
  SELECT event_id INTO v_event_id
  FROM public.gigs
  WHERE id = NEW.gig_id;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, is_active INTO v_badge_id, v_badge_active
  FROM public.badges
  WHERE event_id = v_event_id AND badge_type = 'event'
  LIMIT 1;

  IF v_badge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Badges are awarded at EVENT COMPLETION. But if this acceptance lands AFTER
  -- the event already completed, the completion trigger has fired and will not
  -- fire again — award the badge now (badge only, never points; gated on the
  -- 🏅 is_active toggle exactly like the completion path).
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    SELECT status INTO v_event_status
    FROM public.events
    WHERE id = v_event_id;

    IF v_event_status = 'completed' AND COALESCE(v_badge_active, false) THEN
      INSERT INTO public.model_badges (model_id, badge_id, earned_at)
      VALUES (NEW.model_id, v_badge_id, now())
      ON CONFLICT (model_id, badge_id) DO NOTHING;
    END IF;

  -- Revoke on un-accept (unchanged from 20260711000001): remove the badge as
  -- long as the model holds no other accepted gig for the same event.
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

-- 2) award_event_completion_points: idempotent per (model, event) -------------
-- Identical to the 20260711000001 definition except the NOT EXISTS points guard.
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
        -- Idempotency guard: award_points() records action='event_completed'
        -- with metadata.event_id (since 00052), so a model who was already paid
        -- for this event — e.g. it was flipped back to upcoming and completed
        -- again — is never paid twice.
        IF v_points > 0 AND NOT EXISTS (
          SELECT 1 FROM public.point_transactions pt
          WHERE pt.model_id = v_model.model_id
            AND pt.action = 'event_completed'
            AND pt.metadata->>'event_id' = NEW.id::text
        ) THEN
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

-- 3) Backfill badges when the 🏅 toggle flips ON after completion --------------
CREATE OR REPLACE FUNCTION public.backfill_event_badge_on_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_event_status text;
BEGIN
  IF NEW.badge_type = 'event'
     AND NEW.event_id IS NOT NULL
     AND NEW.is_active = true
     AND COALESCE(OLD.is_active, false) = false THEN

    SELECT status INTO v_event_status
    FROM public.events
    WHERE id = NEW.event_id;

    IF v_event_status = 'completed' THEN
      -- Badges only; points idempotency in award_event_completion_points
      -- protects the re-complete path, and activation never pays points.
      INSERT INTO public.model_badges (model_id, badge_id, earned_at)
      SELECT DISTINCT ga.model_id, NEW.id, now()
      FROM public.gig_applications ga
      JOIN public.gigs g ON g.id = ga.gig_id
      WHERE g.event_id = NEW.event_id
        AND ga.status = 'accepted'
      ON CONFLICT (model_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_backfill_event_badge_on_activation ON public.badges;

CREATE TRIGGER trigger_backfill_event_badge_on_activation
AFTER UPDATE ON public.badges
FOR EACH ROW EXECUTE FUNCTION public.backfill_event_badge_on_activation();
