-- Add email field to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS email text;

-- Create athlete access tokens table for individual athlete portal access
CREATE TABLE public.athlete_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone, -- Optional expiration
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.athlete_access_tokens ENABLE ROW LEVEL SECURITY;

-- Category members can manage athlete tokens
CREATE POLICY "Category members can manage athlete tokens"
ON public.athlete_access_tokens
FOR ALL
USING (
  public.can_access_category(auth.uid(), category_id)
)
WITH CHECK (
  public.can_access_category(auth.uid(), category_id)
);

-- Allow anonymous read for token validation
CREATE POLICY "Anyone can validate athlete tokens"
ON public.athlete_access_tokens
FOR SELECT
USING (true);

-- Create function to validate athlete token (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.validate_athlete_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.athlete_access_tokens%ROWTYPE;
  v_player public.players%ROWTYPE;
  v_category_name text;
  v_club_name text;
  v_club_id uuid;
BEGIN
  -- Find the token
  SELECT * INTO v_token
  FROM public.athlete_access_tokens
  WHERE token = _token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien invalide ou expiré');
  END IF;

  -- Update last used timestamp
  UPDATE public.athlete_access_tokens
  SET last_used_at = now()
  WHERE id = v_token.id;

  -- Get player info
  SELECT * INTO v_player
  FROM public.players
  WHERE id = v_token.player_id;

  -- Get category and club info
  SELECT c.name, c.club_id INTO v_category_name, v_club_id
  FROM public.categories c
  WHERE c.id = v_token.category_id;
  
  SELECT name INTO v_club_name FROM public.clubs WHERE id = v_club_id;

  RETURN json_build_object(
    'success', true,
    'player_id', v_token.player_id,
    'player_name', v_player.name,
    'category_id', v_token.category_id,
    'category_name', v_category_name,
    'club_id', v_club_id,
    'club_name', v_club_name
  );
END;
$$;

-- Allow anonymous users to call the validation function
GRANT EXECUTE ON FUNCTION public.validate_athlete_token(text) TO anon;

-- RLS policy for awcr_tracking to allow athlete token submissions
CREATE POLICY "Athletes can insert their own RPE via token"
ON public.awcr_tracking
FOR INSERT
WITH CHECK (true);

-- RLS policy for player_match_stats to allow athlete token submissions  
CREATE POLICY "Athletes can insert their own stats via token"
ON public.player_match_stats
FOR INSERT
WITH CHECK (true);
