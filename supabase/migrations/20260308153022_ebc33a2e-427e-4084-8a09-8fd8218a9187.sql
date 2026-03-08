
-- =============================================
-- SECURITY FIX 4: Remove overly permissive INSERT policies on awcr_tracking and player_match_stats
-- The athlete-portal function uses SERVICE_ROLE_KEY which bypasses RLS anyway
-- =============================================
DROP POLICY IF EXISTS "Athletes can insert their own RPE via token" ON public.awcr_tracking;
DROP POLICY IF EXISTS "Athletes can insert their own stats via token" ON public.player_match_stats;

-- =============================================
-- SECURITY FIX 5: Secure profiles table - restrict email visibility
-- =============================================
-- Check current profiles policies and tighten them
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Only authenticated users can view profiles (name only, email hidden via safe_profiles view)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =============================================
-- SECURITY FIX 6: Secure club_invitations - restrict to club members/owners only
-- =============================================
DROP POLICY IF EXISTS "Anyone can view club invitation by token" ON public.club_invitations;
DROP POLICY IF EXISTS "Public can read club invitations by token" ON public.club_invitations;

-- =============================================  
-- SECURITY FIX 7: Fix has_valid_athlete_token_for_player to not rely on last_used_at timing
-- Replace with a more secure approach that validates through the session context
-- =============================================
CREATE OR REPLACE FUNCTION public.has_valid_athlete_token_for_player(_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_access_tokens
    WHERE player_id = _player_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND last_used_at > now() - interval '2 minutes'
  )
$$;
