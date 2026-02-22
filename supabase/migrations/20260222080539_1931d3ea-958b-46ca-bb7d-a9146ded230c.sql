
-- Trigger to auto-add athletes to "Staff + Joueurs" conversation when they join a category
CREATE OR REPLACE FUNCTION public.auto_add_athlete_to_group_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Only for athlete role
  IF NEW.role != 'athlete' THEN
    RETURN NEW;
  END IF;

  -- Find "Staff + Joueurs" conversation for this category
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE category_id = NEW.category_id
    AND name = 'Staff + Joueurs'
    AND conversation_type = 'group'
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, is_admin)
    VALUES (v_conv_id, NEW.user_id, false)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_athlete_to_group_conversation
AFTER INSERT ON public.category_members
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_athlete_to_group_conversation();
