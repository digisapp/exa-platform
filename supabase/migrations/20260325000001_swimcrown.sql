-- SwimCrown: Global swim model competition system
-- Tables for competitions, contestants, and coin-based voting

-- ============================================================
-- 1. COMPETITIONS (one per year)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.swimcrown_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'SwimCrown',
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'accepting_entries', 'voting', 'finale', 'completed')),
  entry_start_date TIMESTAMPTZ,
  entry_end_date TIMESTAMPTZ,
  voting_start_date TIMESTAMPTZ,
  voting_end_date TIMESTAMPTZ,
  finale_date TIMESTAMPTZ,
  prizes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. CONTESTANTS (models who enter)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.swimcrown_contestants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.swimcrown_competitions(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'crown', 'elite')),
  stripe_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  amount_cents INT NOT NULL DEFAULT 0,
  tagline TEXT,
  vote_count INT NOT NULL DEFAULT 0,
  placement INT,
  title TEXT, -- 'SwimCrown 2026', 'First Runner-Up', etc.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, model_id)
);

-- ============================================================
-- 3. VOTES (coin-based fan voting)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.swimcrown_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.swimcrown_competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES public.swimcrown_contestants(id) ON DELETE CASCADE,
  voter_actor_id UUID NOT NULL,
  coins_spent INT NOT NULL DEFAULT 1 CHECK (coins_spent > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX idx_swimcrown_contestants_comp ON public.swimcrown_contestants(competition_id);
CREATE INDEX idx_swimcrown_contestants_votes ON public.swimcrown_contestants(competition_id, vote_count DESC);
CREATE INDEX idx_swimcrown_contestants_model ON public.swimcrown_contestants(model_id);
CREATE INDEX idx_swimcrown_contestants_status ON public.swimcrown_contestants(status);
CREATE INDEX idx_swimcrown_votes_contestant ON public.swimcrown_votes(contestant_id);
CREATE INDEX idx_swimcrown_votes_voter ON public.swimcrown_votes(voter_actor_id);
CREATE INDEX idx_swimcrown_votes_comp ON public.swimcrown_votes(competition_id);

-- ============================================================
-- 5. RPC: CAST VOTE (atomic coin deduction + vote + count)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_swimcrown_vote(
  p_voter_actor_id UUID,
  p_contestant_id UUID,
  p_competition_id UUID,
  p_coins INT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_contestant RECORD;
  v_new_count INT;
BEGIN
  -- Validate contestant
  SELECT id, status INTO v_contestant
  FROM public.swimcrown_contestants
  WHERE id = p_contestant_id
    AND competition_id = p_competition_id
    AND status = 'approved'
    AND payment_status = 'paid';

  IF v_contestant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contestant not found or not eligible');
  END IF;

  -- Deduct coins (reuse existing function)
  IF NOT public.deduct_coins(p_voter_actor_id, p_coins) THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_coins');
  END IF;

  -- Record vote
  INSERT INTO public.swimcrown_votes (competition_id, contestant_id, voter_actor_id, coins_spent)
  VALUES (p_competition_id, p_contestant_id, p_voter_actor_id, p_coins);

  -- Increment vote count
  UPDATE public.swimcrown_contestants
  SET vote_count = vote_count + p_coins, updated_at = now()
  WHERE id = p_contestant_id
  RETURNING vote_count INTO v_new_count;

  -- Record coin transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_voter_actor_id, -p_coins, 'swimcrown_vote',
    jsonb_build_object('contestant_id', p_contestant_id, 'competition_id', p_competition_id));

  RETURN jsonb_build_object('success', true, 'votes_cast', p_coins, 'new_vote_count', v_new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.swimcrown_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimcrown_contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimcrown_votes ENABLE ROW LEVEL SECURITY;

-- Competitions: public read
CREATE POLICY "Anyone can read competitions"
  ON public.swimcrown_competitions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role manages competitions"
  ON public.swimcrown_competitions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Contestants: public read for approved/paid, auth insert
CREATE POLICY "Anyone can read paid contestants"
  ON public.swimcrown_contestants FOR SELECT TO anon, authenticated
  USING (payment_status = 'paid' AND status = 'approved');

CREATE POLICY "Models read own contestant entry"
  ON public.swimcrown_contestants FOR SELECT TO authenticated
  USING (model_id IN (SELECT id FROM public.models WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages contestants"
  ON public.swimcrown_contestants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Votes: public read, auth insert
CREATE POLICY "Anyone can read votes"
  ON public.swimcrown_votes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Auth users can insert votes"
  ON public.swimcrown_votes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service role manages votes"
  ON public.swimcrown_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER swimcrown_competitions_updated_at
  BEFORE UPDATE ON public.swimcrown_competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_content_updated_at();

CREATE TRIGGER swimcrown_contestants_updated_at
  BEFORE UPDATE ON public.swimcrown_contestants
  FOR EACH ROW EXECUTE FUNCTION public.update_content_updated_at();

-- ============================================================
-- 8. SEED FIRST COMPETITION
-- ============================================================
INSERT INTO public.swimcrown_competitions (year, title, status, prizes)
VALUES (2026, 'SwimCrown 2026', 'accepting_entries', '[
  {"place": 1, "title": "SwimCrown 2026", "amount": 5000, "description": "Grand prize + crown + sash + destination photoshoot + magazine feature"},
  {"place": 2, "title": "First Runner-Up", "amount": 1500, "description": "Sash + professional photoshoot package"},
  {"place": 3, "title": "Second Runner-Up", "amount": 750, "description": "Sash + professional photoshoot package"},
  {"place": null, "title": "Fan Favorite", "amount": 500, "description": "Most online votes + special sash + EXA featured placement"},
  {"place": null, "title": "Miss Photogenic", "amount": 0, "description": "Selected by photographers + portfolio feature"}
]');
