-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_notify_injury_status_change ON injuries;
DROP TRIGGER IF EXISTS trigger_notify_new_injury ON injuries;

-- Add temporary column to store current status values
ALTER TABLE injuries ADD COLUMN status_temp TEXT;

-- Copy current status values
UPDATE injuries SET status_temp = status::text;

-- Drop the old status column
ALTER TABLE injuries DROP COLUMN status;

-- Drop and recreate the enum type
DROP TYPE IF EXISTS injury_status CASCADE;
CREATE TYPE injury_status AS ENUM ('active', 'recovering', 'healed');

-- Add new status column with the new enum
ALTER TABLE injuries ADD COLUMN status injury_status DEFAULT 'active'::injury_status;

-- Migrate data from temp column
UPDATE injuries 
SET status = CASE 
  WHEN status_temp = 'active' THEN 'active'::injury_status
  WHEN status_temp = 'en_réathlétisation' THEN 'recovering'::injury_status
  WHEN status_temp = 'guérie' THEN 'healed'::injury_status
  ELSE 'active'::injury_status
END;

-- Drop temporary column
ALTER TABLE injuries DROP COLUMN status_temp;

-- Make status NOT NULL
ALTER TABLE injuries ALTER COLUMN status SET NOT NULL;

-- Recreate notification functions
CREATE OR REPLACE FUNCTION public.notify_injury_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
  v_status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT clubs.user_id, players.name INTO v_user_id, v_player_name
    FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    JOIN players ON players.id = NEW.player_id
    WHERE categories.id = NEW.category_id;

    v_status_label := CASE NEW.status::text
      WHEN 'active' THEN 'Active'
      WHEN 'recovering' THEN 'En Réathlétisation'
      WHEN 'healed' THEN 'Guérie'
      ELSE NEW.status::text
    END;

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
$$;

CREATE OR REPLACE FUNCTION public.notify_new_injury()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
BEGIN
  SELECT clubs.user_id, players.name INTO v_user_id, v_player_name
  FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  JOIN players ON players.id = NEW.player_id
  WHERE categories.id = NEW.category_id;

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
    'new_injury',
    'Nouvelle blessure enregistrée',
    format('Le joueur %s s''est blessé (%s). Retour estimé: %s', 
      v_player_name, 
      NEW.injury_type,
      COALESCE(TO_CHAR(NEW.estimated_return_date, 'DD/MM/YYYY'), 'Non défini')
    )
  );

  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_notify_injury_status_change
  AFTER UPDATE ON injuries
  FOR EACH ROW
  EXECUTE FUNCTION notify_injury_status_change();

CREATE TRIGGER trigger_notify_new_injury
  AFTER INSERT ON injuries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_injury();