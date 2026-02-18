CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation club_invitations%ROWTYPE;
  v_user_id UUID;
  v_cat_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = _token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add as club member with assigned categories (cast to uuid[])
  INSERT INTO club_members (club_id, user_id, role, invited_by, assigned_categories)
  VALUES (v_invitation.club_id, v_user_id, v_invitation.role, v_invitation.invited_by, v_invitation.assigned_categories::uuid[])
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = v_invitation.role, assigned_categories = v_invitation.assigned_categories::uuid[];

  -- Also add as category_member for each assigned category (like athletes)
  IF v_invitation.assigned_categories IS NOT NULL THEN
    FOREACH v_cat_id IN ARRAY v_invitation.assigned_categories::uuid[]
    LOOP
      INSERT INTO category_members (category_id, user_id, role, invited_by)
      VALUES (v_cat_id, v_user_id, v_invitation.role, v_invitation.invited_by)
      ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;
    END LOOP;
  ELSE
    -- No specific categories = add to ALL categories of this club
    INSERT INTO category_members (category_id, user_id, role, invited_by)
    SELECT c.id, v_user_id, v_invitation.role, v_invitation.invited_by
    FROM categories c WHERE c.club_id = v_invitation.club_id
    ON CONFLICT (category_id, user_id) DO UPDATE SET role = v_invitation.role;
  END IF;

  -- Mark invitation as accepted
  UPDATE club_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$function$;