
CREATE OR REPLACE FUNCTION public.accept_ambassador_invitation(invitation_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  inv_record RECORD;
  current_user_id UUID;
  v_client_id UUID;
  v_club RECORD;
  v_cat RECORD;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT * INTO inv_record
  FROM ambassador_invitations
  WHERE token = invitation_token
    AND status = 'pending';

  IF inv_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  UPDATE ambassador_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = current_user_id
  WHERE id = inv_record.id;

  INSERT INTO approved_users (user_id, approved_by, is_free_user, notes)
  VALUES (current_user_id, inv_record.invited_by, true, 'Ambassador invitation accepted')
  ON CONFLICT (user_id) DO UPDATE SET is_free_user = true;

  INSERT INTO user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Find client matching the invitation email
  SELECT id INTO v_client_id
  FROM clients
  WHERE email = inv_record.email
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    FOR v_club IN SELECT id FROM clubs WHERE client_id = v_client_id LOOP
      -- Transfer club ownership
      UPDATE clubs SET user_id = current_user_id WHERE id = v_club.id;
      
      -- Add as club admin member
      INSERT INTO club_members (club_id, user_id, role, invited_by)
      VALUES (v_club.id, current_user_id, 'admin', inv_record.invited_by)
      ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'admin';

      -- Add as admin of all categories in this club
      FOR v_cat IN SELECT id FROM categories WHERE club_id = v_club.id LOOP
        INSERT INTO category_members (category_id, user_id, role, invited_by)
        VALUES (v_cat.id, current_user_id, 'admin', inv_record.invited_by)
        ON CONFLICT (category_id, user_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;
