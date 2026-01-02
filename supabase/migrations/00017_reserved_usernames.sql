-- Reserved Usernames System
-- Prevents certain usernames from being claimed by regular users

CREATE TABLE IF NOT EXISTS public.reserved_usernames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL CHECK (reason IN ('vip', 'brand', 'celebrity', 'inappropriate', 'system', 'held')),
    reserved_for TEXT, -- Optional: email or note about who this is held for
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.actors(id)
);

-- Index for fast lookups
CREATE INDEX idx_reserved_usernames_username ON public.reserved_usernames(username);
CREATE INDEX idx_reserved_usernames_reason ON public.reserved_usernames(reason);

-- RLS
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a username is reserved (for validation)
CREATE POLICY "Anyone can view reserved usernames"
    ON public.reserved_usernames
    FOR SELECT
    USING (true);

-- Only admins can manage reserved usernames
CREATE POLICY "Admins can insert reserved usernames"
    ON public.reserved_usernames
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.actors
            WHERE actors.user_id = auth.uid()
            AND actors.type = 'admin'
        )
    );

CREATE POLICY "Admins can update reserved usernames"
    ON public.reserved_usernames
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.actors
            WHERE actors.user_id = auth.uid()
            AND actors.type = 'admin'
        )
    );

CREATE POLICY "Admins can delete reserved usernames"
    ON public.reserved_usernames
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.actors
            WHERE actors.user_id = auth.uid()
            AND actors.type = 'admin'
        )
    );

-- ==============================================
-- SEED INITIAL RESERVED USERNAMES
-- ==============================================

-- VIP / Desirable short names
INSERT INTO public.reserved_usernames (username, reason, notes) VALUES
    ('admin', 'system', 'System reserved'),
    ('exa', 'brand', 'Platform brand'),
    ('examodels', 'brand', 'Platform brand'),
    ('support', 'system', 'Support account'),
    ('help', 'system', 'Help account'),
    ('official', 'system', 'Official accounts'),
    ('verified', 'system', 'System reserved'),
    ('model', 'system', 'System reserved'),
    ('models', 'system', 'System reserved'),
    ('fan', 'system', 'System reserved'),
    ('fans', 'system', 'System reserved'),
    ('brand', 'system', 'System reserved'),
    ('brands', 'system', 'System reserved'),

    -- Short desirable names (VIP)
    ('kim', 'vip', 'Premium short name'),
    ('jen', 'vip', 'Premium short name'),
    ('sam', 'vip', 'Premium short name'),
    ('alex', 'vip', 'Premium short name'),
    ('max', 'vip', 'Premium short name'),
    ('kate', 'vip', 'Premium short name'),
    ('emma', 'vip', 'Premium short name'),
    ('lily', 'vip', 'Premium short name'),
    ('rose', 'vip', 'Premium short name'),
    ('jade', 'vip', 'Premium short name'),
    ('ruby', 'vip', 'Premium short name'),
    ('luna', 'vip', 'Premium short name'),
    ('bella', 'vip', 'Premium short name'),
    ('mia', 'vip', 'Premium short name'),
    ('ava', 'vip', 'Premium short name'),
    ('zoe', 'vip', 'Premium short name'),
    ('chloe', 'vip', 'Premium short name'),
    ('grace', 'vip', 'Premium short name'),
    ('sofia', 'vip', 'Premium short name'),
    ('maya', 'vip', 'Premium short name'),
    ('noelle', 'vip', 'Premium short name'),
    ('angel', 'vip', 'Premium short name'),
    ('queen', 'vip', 'Premium short name'),
    ('king', 'vip', 'Premium short name'),
    ('prince', 'vip', 'Premium short name'),
    ('princess', 'vip', 'Premium short name'),

    -- Celebrities (protect from impersonation)
    ('kendall', 'celebrity', 'Celebrity name protection'),
    ('kylie', 'celebrity', 'Celebrity name protection'),
    ('rihanna', 'celebrity', 'Celebrity name protection'),
    ('beyonce', 'celebrity', 'Celebrity name protection'),
    ('selenagomez', 'celebrity', 'Celebrity name protection'),
    ('arianagrande', 'celebrity', 'Celebrity name protection'),
    ('taylorswift', 'celebrity', 'Celebrity name protection'),
    ('kimkardashian', 'celebrity', 'Celebrity name protection'),
    ('kyliejenner', 'celebrity', 'Celebrity name protection'),
    ('kendalljenner', 'celebrity', 'Celebrity name protection'),
    ('gigihadid', 'celebrity', 'Celebrity name protection'),
    ('bellahadid', 'celebrity', 'Celebrity name protection'),
    ('haileybieber', 'celebrity', 'Celebrity name protection'),

    -- Major brands
    ('nike', 'brand', 'Brand protection'),
    ('adidas', 'brand', 'Brand protection'),
    ('gucci', 'brand', 'Brand protection'),
    ('prada', 'brand', 'Brand protection'),
    ('chanel', 'brand', 'Brand protection'),
    ('louisvuitton', 'brand', 'Brand protection'),
    ('versace', 'brand', 'Brand protection'),
    ('dior', 'brand', 'Brand protection'),
    ('fendi', 'brand', 'Brand protection'),
    ('balenciaga', 'brand', 'Brand protection'),
    ('fashionnova', 'brand', 'Brand protection'),
    ('prettylittlething', 'brand', 'Brand protection'),
    ('revolve', 'brand', 'Brand protection'),
    ('skims', 'brand', 'Brand protection'),
    ('savage', 'brand', 'Brand protection'),
    ('savagexfenty', 'brand', 'Brand protection'),

    -- Inappropriate words to block
    ('sex', 'inappropriate', 'Blocked word'),
    ('xxx', 'inappropriate', 'Blocked word'),
    ('porn', 'inappropriate', 'Blocked word'),
    ('nude', 'inappropriate', 'Blocked word'),
    ('nudes', 'inappropriate', 'Blocked word'),
    ('onlyfans', 'inappropriate', 'Blocked word'),
    ('escort', 'inappropriate', 'Blocked word'),
    ('hooker', 'inappropriate', 'Blocked word'),
    ('prostitute', 'inappropriate', 'Blocked word'),
    ('fuck', 'inappropriate', 'Blocked word'),
    ('shit', 'inappropriate', 'Blocked word'),
    ('ass', 'inappropriate', 'Blocked word'),
    ('bitch', 'inappropriate', 'Blocked word'),
    ('cock', 'inappropriate', 'Blocked word'),
    ('dick', 'inappropriate', 'Blocked word'),
    ('pussy', 'inappropriate', 'Blocked word')
ON CONFLICT (username) DO NOTHING;
