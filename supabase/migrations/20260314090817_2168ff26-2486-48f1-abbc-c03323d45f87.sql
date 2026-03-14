CREATE OR REPLACE FUNCTION public.create_category_with_members(
  _club_id uuid,
  _name text,
  _rugby_type text,
  _gender text,
  _member_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_category_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.can_modify_club_data(v_user_id, _club_id) OR public.is_super_admin(v_user_id)) THEN
    RAISE EXCEPTION 'Insufficient permissions to create category in this club';
  END IF;

  INSERT INTO public.categories (club_id, name, rugby_type, gender)
  VALUES (_club_id, _name, _rugby_type, _gender)
  RETURNING id INTO v_category_id;

  IF COALESCE(array_length(_member_ids, 1), 0) > 0 THEN
    UPDATE public.club_members cm
    SET assigned_categories = CASE
      WHEN cm.assigned_categories IS NULL THEN ARRAY[v_category_id]
      WHEN NOT (v_category_id = ANY(cm.assigned_categories)) THEN array_append(cm.assigned_categories, v_category_id)
      ELSE cm.assigned_categories
    END
    WHERE cm.club_id = _club_id
      AND cm.id = ANY(_member_ids);
  END IF;

  RETURN v_category_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_category_with_members(uuid, text, text, text, uuid[]) TO authenticated;