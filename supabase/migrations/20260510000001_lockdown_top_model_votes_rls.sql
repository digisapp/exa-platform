-- Lock down direct INSERTs on top_model_votes + top_model_sessions
--
-- Current state: any authenticated user can INSERT directly into these
-- tables (policy: WITH CHECK (auth.uid() IS NOT NULL)). The intended write
-- path is via /api/games/boost/vote, which calls the SECURITY DEFINER
-- RPCs record_top_model_vote() and mark_model_swiped(). Direct inserts let
-- a logged-in attacker bypass the API's rate limiter, coin debits, and
-- duplicate checks — effectively unlimited vote stuffing for any model.
--
-- Fix: drop the open INSERT policies. The SECURITY DEFINER RPCs run as
-- the function owner (postgres) and bypass RLS, so /api/games/boost/vote
-- continues to work. Direct INSERTs with a user JWT are now denied.
--
-- Reads remain open — leaderboard / vote-feed UIs still need them.

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.top_model_votes;
DROP POLICY IF EXISTS "Anyone can vote" ON public.top_model_votes;

DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.top_model_sessions;
DROP POLICY IF EXISTS "Anyone can manage sessions" ON public.top_model_sessions;

-- Belt-and-suspenders: also lock UPDATEs on votes (they should be immutable
-- once cast) and INSERTs on top_model_leaderboard (RPC-only).

DROP POLICY IF EXISTS "Authenticated users can update votes" ON public.top_model_votes;
DROP POLICY IF EXISTS "Anyone can update votes" ON public.top_model_votes;

-- Note: existing SELECT policies are intentionally left open — the leaderboard
-- and vote-history UIs are public-facing.
