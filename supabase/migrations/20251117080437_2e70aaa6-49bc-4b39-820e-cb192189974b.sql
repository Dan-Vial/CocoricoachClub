-- Modifier la policy RLS pour permettre la création de notifications par le système
DROP POLICY IF EXISTS "System can create injury notifications" ON public.notifications;

CREATE POLICY "System can create injury notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Permet l'insertion si l'utilisateur est propriétaire du club associé à la catégorie
  EXISTS (
    SELECT 1 FROM categories
    JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = notifications.category_id
    AND clubs.user_id = notifications.user_id
  )
);