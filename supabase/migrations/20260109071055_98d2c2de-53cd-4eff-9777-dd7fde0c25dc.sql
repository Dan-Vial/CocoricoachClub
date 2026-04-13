-- Create public access tokens table for viewer access without authentication
CREATE TABLE public.public_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  label text, -- Optional label like "Lien pour parents"
  access_type text NOT NULL DEFAULT 'viewer', -- Can extend later
  expires_at timestamp with time zone, -- Optional expiration
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  -- Ensure at least one of club_id or category_id is set
  CONSTRAINT public_access_tokens_target_check CHECK (club_id IS NOT NULL OR category_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.public_access_tokens ENABLE ROW LEVEL SECURITY;

-- Owners and admins can manage public access tokens
CREATE POLICY "Club owners can manage tokens"
ON public.public_access_tokens
FOR ALL
USING (
  club_id IS NOT NULL AND public.can_access_club(auth.uid(), club_id)
)
WITH CHECK (
  club_id IS NOT NULL AND public.can_access_club(auth.uid(), club_id)
);

CREATE POLICY "Category members can manage tokens"
ON public.public_access_tokens
FOR ALL
USING (
  category_id IS NOT NULL AND public.can_access_category(auth.uid(), category_id)
)
WITH CHECK (
  category_id IS NOT NULL AND public.can_access_category(auth.uid(), category_id)
);

-- Create function to validate and get access info from a public token (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.validate_public_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.public_access_tokens%ROWTYPE;
  v_club_name text;
  v_category_name text;
  v_club_id uuid;
BEGIN
  -- Find the token
  SELECT * INTO v_token
  FROM public.public_access_tokens
  WHERE token = _token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien invalide ou expiré');
  END IF;

  -- Update last used timestamp
  UPDATE public.public_access_tokens
  SET last_used_at = now()
  WHERE id = v_token.id;

  -- Get club/category names for display
  IF v_token.club_id IS NOT NULL THEN
    SELECT name INTO v_club_name FROM public.clubs WHERE id = v_token.club_id;
    RETURN json_build_object(
      'success', true,
      'type', 'club',
      'club_id', v_token.club_id,
      'club_name', v_club_name,
      'access_type', v_token.access_type
    );
  ELSIF v_token.category_id IS NOT NULL THEN
    SELECT c.name, c.club_id INTO v_category_name, v_club_id
    FROM public.categories c
    WHERE c.id = v_token.category_id;
    
    SELECT name INTO v_club_name FROM public.clubs WHERE id = v_club_id;
    
    RETURN json_build_object(
      'success', true,
      'type', 'category',
      'category_id', v_token.category_id,
      'category_name', v_category_name,
      'club_id', v_club_id,
      'club_name', v_club_name,
      'access_type', v_token.access_type
    );
  END IF;

  RETURN json_build_object('success', false, 'error', 'Configuration invalide');
END;
$$;

-- Allow anonymous users to call the validation function
GRANT EXECUTE ON FUNCTION public.validate_public_token(text) TO anon;
