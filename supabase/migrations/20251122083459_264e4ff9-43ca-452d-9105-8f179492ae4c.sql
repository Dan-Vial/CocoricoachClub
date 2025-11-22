-- Fix the notify_injury_status_change function to use correct enum values
CREATE OR REPLACE FUNCTION public.notify_injury_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
  v_status_label TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get user_id and player name
    SELECT clubs.user_id, players.name INTO v_user_id, v_player_name
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    JOIN players ON players.id = NEW.player_id
    WHERE categories.id = NEW.category_id;

    -- Translate status to French - FIX: use correct enum values
    v_status_label := CASE NEW.status
      WHEN 'active' THEN 'active'
      WHEN 'en_réathlétisation' THEN 'en réathlétisation'
      WHEN 'guérie' THEN 'guérie'
      ELSE NEW.status
    END;

    -- Create notification
    INSERT INTO public.notifications (
      user_id,
      category_id,
      injury_id,
      notification_type,
      title,
      message
    ) VALUES (
      v_user_id,
      NEW.category_id,
      NEW.id,
      'status_change',
      'Changement de statut de blessure',
      format('Le statut de la blessure de %s (%s) est maintenant: %s', 
        v_player_name,
        NEW.injury_type,
        v_status_label
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-enable RLS on injuries table
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;