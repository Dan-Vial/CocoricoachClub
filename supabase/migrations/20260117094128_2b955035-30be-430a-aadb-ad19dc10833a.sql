-- Modifier la colonne expires_at pour qu'elle puisse être NULL (pas d'expiration)
ALTER TABLE public.club_invitations ALTER COLUMN expires_at DROP NOT NULL;

-- Modifier la valeur par défaut pour ne pas avoir d'expiration
ALTER TABLE public.club_invitations ALTER COLUMN expires_at SET DEFAULT NULL;

-- Faire la même chose pour category_invitations
ALTER TABLE public.category_invitations ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.category_invitations ALTER COLUMN expires_at SET DEFAULT NULL;

-- Mettre à jour les invitations existantes pour qu'elles n'expirent pas
UPDATE public.club_invitations SET expires_at = NULL WHERE status = 'pending';
UPDATE public.category_invitations SET expires_at = NULL WHERE status = 'pending';

-- Mettre à jour la fonction d'acceptation des invitations club pour gérer expires_at NULL
CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
  v_attempt_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check rate limiting: max 5 attempts per token in last 15 minutes
  SELECT COUNT(*) INTO v_attempt_count
  FROM invitation_attempts
  WHERE token = _token
    AND attempted_at > now() - interval '15 minutes';
  
  IF v_attempt_count >= 5 THEN
    INSERT INTO invitation_attempts (token, success)
    VALUES (_token, false);
    
    RETURN json_build_object('success', false, 'error', 'Too many attempts. Please try again later.');
  END IF;

  -- Get invitation - expires_at can now be NULL (no expiration)
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
    AND email = auth.email();

  IF NOT FOUND THEN
    INSERT INTO invitation_attempts (token, success)
    VALUES (_token, false);
    
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to club_members
  INSERT INTO club_members (club_id, user_id, role, invited_by)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  -- Log successful attempt
  INSERT INTO invitation_attempts (token, success)
  VALUES (_token, true);

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$function$;

-- Mettre à jour la fonction d'acceptation des invitations catégorie pour gérer expires_at NULL
CREATE OR REPLACE FUNCTION public.accept_category_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation category_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM category_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
    AND email = auth.email();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to category_members
  INSERT INTO category_members (category_id, user_id, role, invited_by)
  VALUES (v_invitation.category_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (category_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE category_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'category_id', v_invitation.category_id);
END;
$function$;