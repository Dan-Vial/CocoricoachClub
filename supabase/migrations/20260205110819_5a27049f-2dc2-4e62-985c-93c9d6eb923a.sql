-- Add first_name and user_id columns to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.players.first_name IS 'Athlete first name';
COMMENT ON COLUMN public.players.user_id IS 'Link to auth.users for athlete account';

-- Create athlete_invitations table for tracking invitation status
CREATE TABLE IF NOT EXISTS public.athlete_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.athlete_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view invitations for their categories
CREATE POLICY "Staff can view category invitations"
ON public.athlete_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = athlete_invitations.category_id
    AND cm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.club_members clm
    WHERE clm.club_id = athlete_invitations.club_id
    AND clm.user_id = auth.uid()
  )
);

-- Policy: Staff can create invitations
CREATE POLICY "Staff can create invitations"
ON public.athlete_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = athlete_invitations.category_id
    AND cm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.club_members clm
    WHERE clm.club_id = athlete_invitations.club_id
    AND clm.user_id = auth.uid()
  )
);

-- Policy: Staff can update invitation status
CREATE POLICY "Staff can update invitations"
ON public.athlete_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = athlete_invitations.category_id
    AND cm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.club_members clm
    WHERE clm.club_id = athlete_invitations.club_id
    AND clm.user_id = auth.uid()
  )
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_athlete_invitations_token ON public.athlete_invitations(token);
CREATE INDEX IF NOT EXISTS idx_athlete_invitations_player ON public.athlete_invitations(player_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);

-- Add pwa_install_dismissed flag to track PWA installation preference
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS pwa_install_dismissed BOOLEAN DEFAULT false;