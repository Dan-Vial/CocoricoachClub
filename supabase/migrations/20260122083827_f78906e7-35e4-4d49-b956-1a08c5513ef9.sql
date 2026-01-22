-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Athletes can insert their own RPE via token" ON public.awcr_tracking;
DROP POLICY IF EXISTS "Athletes can insert their own stats via token" ON public.player_match_stats;

-- Create a function to check if a player_id has a valid athlete token
CREATE OR REPLACE FUNCTION public.has_valid_athlete_token_for_player(_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_access_tokens
    WHERE player_id = _player_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND last_used_at > now() - interval '1 hour' -- Token must have been validated recently
  )
$$;

-- Grant execute to anon for the check function
GRANT EXECUTE ON FUNCTION public.has_valid_athlete_token_for_player(uuid) TO anon;

-- Secure RLS policy for awcr_tracking - allows insertion if user has access OR valid athlete token
CREATE POLICY "Athletes can insert their own RPE via token"
ON public.awcr_tracking
FOR INSERT
WITH CHECK (
  -- Authenticated users with category access
  (auth.uid() IS NOT NULL AND public.can_access_category(auth.uid(), category_id))
  OR 
  -- Or valid athlete token for this player (validated within last hour)
  public.has_valid_athlete_token_for_player(player_id)
);

-- Secure RLS policy for player_match_stats - allows insertion if user has access OR valid athlete token  
CREATE POLICY "Athletes can insert their own stats via token"
ON public.player_match_stats
FOR INSERT
WITH CHECK (
  -- Authenticated users with category access (check via match -> category -> club)
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.categories c ON c.id = m.category_id
    WHERE m.id = match_id AND public.can_access_category(auth.uid(), c.id)
  ))
  OR 
  -- Or valid athlete token for this player
  public.has_valid_athlete_token_for_player(player_id)
);