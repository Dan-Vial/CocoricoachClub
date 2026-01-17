-- Mettre à jour les politiques pour players
DROP POLICY IF EXISTS "Club owners can insert players" ON public.players;
DROP POLICY IF EXISTS "Club owners can update players" ON public.players;
DROP POLICY IF EXISTS "Club owners can delete players" ON public.players;

CREATE POLICY "Club members with access can insert players" ON public.players
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update players" ON public.players
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete players" ON public.players
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = players.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour training_sessions
DROP POLICY IF EXISTS "Club owners can insert training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Club owners can update training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Club owners can delete training sessions" ON public.training_sessions;

CREATE POLICY "Club members with access can insert training_sessions" ON public.training_sessions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = training_sessions.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update training_sessions" ON public.training_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = training_sessions.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete training_sessions" ON public.training_sessions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = training_sessions.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

-- Mettre à jour les politiques pour matches
DROP POLICY IF EXISTS "Club owners can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Club owners can update matches" ON public.matches;
DROP POLICY IF EXISTS "Club owners can delete matches" ON public.matches;

CREATE POLICY "Club members with access can insert matches" ON public.matches
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = matches.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can update matches" ON public.matches
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = matches.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE POLICY "Club members with access can delete matches" ON public.matches
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = matches.category_id
    AND can_modify_club_data(auth.uid(), cl.id)
  )
);