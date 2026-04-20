-- Add status to player_categories for acceptance flow
ALTER TABLE public.player_categories 
ADD COLUMN status text NOT NULL DEFAULT 'accepted';

COMMENT ON COLUMN public.player_categories.status IS 'accepted = active link, pending = awaiting athlete approval, declined = rejected by athlete';

-- Create function to notify athlete when added to new category
CREATE OR REPLACE FUNCTION public.notify_athlete_new_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player_user_id uuid;
  v_player_name text;
  v_category_name text;
  v_club_name text;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT user_id, COALESCE(first_name || ' ' || name, name) 
  INTO v_player_user_id, v_player_name
  FROM public.players WHERE id = NEW.player_id;

  IF v_player_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.name, cl.name INTO v_category_name, v_club_name
  FROM public.categories c
  JOIN public.clubs cl ON cl.id = c.club_id
  WHERE c.id = NEW.category_id;

  INSERT INTO public.notifications (
    user_id,
    category_id,
    notification_type,
    notification_subtype,
    title,
    message,
    metadata
  ) VALUES (
    v_player_user_id,
    NEW.category_id,
    'category_link_request',
    'pending',
    'Nouvelle structure',
    format('Tu as été ajouté(e) à la catégorie %s (%s). Accepte pour rejoindre cette structure.', v_category_name, v_club_name),
    jsonb_build_object(
      'player_category_id', NEW.id,
      'player_id', NEW.player_id,
      'category_id', NEW.category_id,
      'club_id', NEW.club_id,
      'category_name', v_category_name,
      'club_name', v_club_name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_player_category_pending
  AFTER INSERT ON public.player_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_athlete_new_category();

-- Create function to accept/decline category link
CREATE OR REPLACE FUNCTION public.respond_to_category_link(_player_category_id uuid, _response text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pc player_categories%ROWTYPE;
  v_user_id uuid;
  v_player_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO v_pc FROM public.player_categories WHERE id = _player_category_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lien introuvable');
  END IF;

  SELECT user_id INTO v_player_user_id FROM public.players WHERE id = v_pc.player_id;
  IF v_player_user_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  IF v_pc.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Demande déjà traitée');
  END IF;

  IF _response = 'accepted' THEN
    UPDATE public.player_categories SET status = 'accepted' WHERE id = _player_category_id;
    
    INSERT INTO public.category_members (category_id, user_id, role)
    VALUES (v_pc.category_id, v_user_id, 'athlete')
    ON CONFLICT (category_id, user_id) DO NOTHING;
    
    RETURN json_build_object('success', true, 'status', 'accepted');
  ELSIF _response = 'declined' THEN
    DELETE FROM public.player_categories WHERE id = _player_category_id;
    RETURN json_build_object('success', true, 'status', 'declined');
  ELSE
    RETURN json_build_object('success', false, 'error', 'Réponse invalide');
  END IF;
END;
$$;