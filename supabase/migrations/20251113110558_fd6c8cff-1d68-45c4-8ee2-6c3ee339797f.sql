-- Create notifications table for injury alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  injury_id UUID,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_injury FOREIGN KEY (injury_id) REFERENCES public.injuries(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = notifications.category_id
    AND clubs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = notifications.category_id
    AND clubs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = notifications.category_id
    AND clubs.user_id = auth.uid()
  )
);

-- Function to create notification for new injury
CREATE OR REPLACE FUNCTION notify_new_injury()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
BEGIN
  -- Get user_id from club
  SELECT clubs.user_id, players.name INTO v_user_id, v_player_name
  FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  JOIN players ON players.id = NEW.player_id
  WHERE categories.id = NEW.category_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify on status change
CREATE OR REPLACE FUNCTION notify_injury_status_change()
RETURNS TRIGGER AS $$
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

    -- Translate status to French
    v_status_label := CASE NEW.status
      WHEN 'active' THEN 'active'
      WHEN 'in_rehab' THEN 'en rééducation'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER trigger_notify_new_injury
  AFTER INSERT ON public.injuries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_injury();

CREATE TRIGGER trigger_notify_injury_status_change
  AFTER UPDATE ON public.injuries
  FOR EACH ROW
  EXECUTE FUNCTION notify_injury_status_change();

-- Create index for better performance
CREATE INDEX idx_notifications_user_category ON public.notifications(user_id, category_id, is_read);