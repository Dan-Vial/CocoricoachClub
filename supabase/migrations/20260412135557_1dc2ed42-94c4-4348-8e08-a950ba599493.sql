-- Allow athlete token-based access to player_objectives
CREATE POLICY "Athletes can view their own objectives via token"
ON public.player_objectives
FOR SELECT
USING (
  has_valid_athlete_token_for_player(player_id)
);

-- Also allow for season_goals (team objectives) via token
CREATE POLICY "Athletes can view team goals via token"
ON public.season_goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.athlete_access_tokens aat
    WHERE aat.category_id = season_goals.category_id
      AND aat.is_active = true
      AND (aat.expires_at IS NULL OR aat.expires_at > now())
      AND aat.last_used_at > now() - interval '2 minutes'
  )
);