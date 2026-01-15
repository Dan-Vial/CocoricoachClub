-- =====================================================
-- SÉCURISATION DES TABLES SENSIBLES
-- Mise à jour des policies pour exiger l'authentification
-- =====================================================

-- 1. PLAYERS - Supprimer les anciennes policies et créer des nouvelles avec TO authenticated
DROP POLICY IF EXISTS "Staff can view players in their categories" ON public.players;
DROP POLICY IF EXISTS "Users can view players of accessible clubs" ON public.players;
DROP POLICY IF EXISTS "Club owners can delete players" ON public.players;
DROP POLICY IF EXISTS "Club owners can insert players" ON public.players;
DROP POLICY IF EXISTS "Club owners can update players" ON public.players;
DROP POLICY IF EXISTS "Owners and admins can delete players" ON public.players;
DROP POLICY IF EXISTS "Owners and admins can insert players" ON public.players;
DROP POLICY IF EXISTS "Owners and admins can update players" ON public.players;

CREATE POLICY "Authenticated users can view players in accessible categories" 
ON public.players FOR SELECT TO authenticated
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Club owners and admins can insert players" 
ON public.players FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = players.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

CREATE POLICY "Club owners and admins can update players" 
ON public.players FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = players.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

CREATE POLICY "Club owners and admins can delete players" 
ON public.players FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = players.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

-- 2. WELLNESS_TRACKING - Sécuriser avec authentification
DROP POLICY IF EXISTS "Club owners can view wellness tracking" ON public.wellness_tracking;
DROP POLICY IF EXISTS "Club owners can insert wellness tracking" ON public.wellness_tracking;
DROP POLICY IF EXISTS "Club owners can update wellness tracking" ON public.wellness_tracking;
DROP POLICY IF EXISTS "Club owners can delete wellness tracking" ON public.wellness_tracking;

CREATE POLICY "Authenticated staff can view wellness tracking" 
ON public.wellness_tracking FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = wellness_tracking.category_id 
  AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated staff can insert wellness tracking" 
ON public.wellness_tracking FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = wellness_tracking.category_id 
  AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated staff can update wellness tracking" 
ON public.wellness_tracking FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = wellness_tracking.category_id 
  AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated staff can delete wellness tracking" 
ON public.wellness_tracking FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = wellness_tracking.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

-- 3. BODY_COMPOSITION - Sécuriser avec authentification
DROP POLICY IF EXISTS "Medical staff can view body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Medical staff can insert body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Medical staff can update body composition" ON public.body_composition;
DROP POLICY IF EXISTS "Medical staff can delete body composition" ON public.body_composition;

CREATE POLICY "Authenticated medical staff can view body composition" 
ON public.body_composition FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = body_composition.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_or_coaching_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can insert body composition" 
ON public.body_composition FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = body_composition.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can update body composition" 
ON public.body_composition FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = body_composition.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can delete body composition" 
ON public.body_composition FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = body_composition.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

-- 4. INJURIES - Sécuriser avec authentification
DROP POLICY IF EXISTS "Medical and coaching staff can view injuries" ON public.injuries;
DROP POLICY IF EXISTS "Medical and coaching staff can insert injuries" ON public.injuries;
DROP POLICY IF EXISTS "Medical and coaching staff can update injuries" ON public.injuries;
DROP POLICY IF EXISTS "Medical and coaching staff can delete injuries" ON public.injuries;
DROP POLICY IF EXISTS "Users can view injuries of accessible clubs" ON public.injuries;

CREATE POLICY "Authenticated staff can view injuries" 
ON public.injuries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = injuries.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_or_coaching_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can insert injuries" 
ON public.injuries FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = injuries.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_or_coaching_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can update injuries" 
ON public.injuries FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = injuries.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_or_coaching_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can delete injuries" 
ON public.injuries FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = injuries.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_or_coaching_access(auth.uid(), cl.id))
));

-- 5. MEDICAL_RECORDS - Sécuriser avec authentification
DROP POLICY IF EXISTS "Medical staff can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical staff can insert medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical staff can update medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical staff can delete medical records" ON public.medical_records;

CREATE POLICY "Authenticated medical staff can view medical records" 
ON public.medical_records FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = medical_records.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can insert medical records" 
ON public.medical_records FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = medical_records.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can update medical records" 
ON public.medical_records FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = medical_records.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can delete medical records" 
ON public.medical_records FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = medical_records.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

-- 6. MENSTRUAL_CYCLES - Sécuriser avec authentification (données très sensibles)
DROP POLICY IF EXISTS "Medical staff can view menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Medical staff can insert menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Medical staff can update menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Medical staff can delete menstrual cycles" ON public.menstrual_cycles;

CREATE POLICY "Authenticated medical staff can view menstrual cycles" 
ON public.menstrual_cycles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_cycles.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can insert menstrual cycles" 
ON public.menstrual_cycles FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_cycles.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can update menstrual cycles" 
ON public.menstrual_cycles FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_cycles.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can delete menstrual cycles" 
ON public.menstrual_cycles FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_cycles.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

-- 7. MENSTRUAL_SYMPTOMS - Sécuriser avec authentification
DROP POLICY IF EXISTS "Medical staff can view menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Medical staff can insert menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Medical staff can update menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Medical staff can delete menstrual symptoms" ON public.menstrual_symptoms;

CREATE POLICY "Authenticated medical staff can view menstrual symptoms" 
ON public.menstrual_symptoms FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_symptoms.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can insert menstrual symptoms" 
ON public.menstrual_symptoms FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_symptoms.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can update menstrual symptoms" 
ON public.menstrual_symptoms FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_symptoms.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated medical staff can delete menstrual symptoms" 
ON public.menstrual_symptoms FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = menstrual_symptoms.category_id 
  AND (cl.user_id = auth.uid() OR has_medical_access(auth.uid(), cl.id))
));

-- 8. PLAYER_ACADEMIC_TRACKING - Sécuriser avec authentification
DROP POLICY IF EXISTS "Admins can view academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Admins can insert academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Admins can update academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Admins can delete academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club owners can delete academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club owners can insert academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club owners can update academic tracking" ON public.player_academic_tracking;

CREATE POLICY "Authenticated admins can view academic tracking" 
ON public.player_academic_tracking FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = player_academic_tracking.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

CREATE POLICY "Authenticated admins can insert academic tracking" 
ON public.player_academic_tracking FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = player_academic_tracking.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

CREATE POLICY "Authenticated admins can update academic tracking" 
ON public.player_academic_tracking FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = player_academic_tracking.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

CREATE POLICY "Authenticated admins can delete academic tracking" 
ON public.player_academic_tracking FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = player_academic_tracking.category_id 
  AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
));

-- 9. STAFF_NOTES - Sécuriser avec authentification
DROP POLICY IF EXISTS "Staff can view own and non-confidential notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Staff can insert notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Staff can update own notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Staff can delete own notes or admins" ON public.staff_notes;

CREATE POLICY "Authenticated staff can view notes" 
ON public.staff_notes FOR SELECT TO authenticated
USING (
  created_by = auth.uid() 
  OR (
    NOT COALESCE(is_confidential, false) 
    AND EXISTS (
      SELECT 1 FROM categories c
      JOIN clubs cl ON cl.id = c.club_id
      WHERE c.id = staff_notes.category_id 
      AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
    )
  )
  OR (
    COALESCE(is_confidential, false) 
    AND EXISTS (
      SELECT 1 FROM categories c
      JOIN clubs cl ON cl.id = c.club_id
      WHERE c.id = staff_notes.category_id 
      AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
    )
  )
);

CREATE POLICY "Authenticated staff can insert notes" 
ON public.staff_notes FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM categories c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.id = staff_notes.category_id 
  AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
));

CREATE POLICY "Authenticated staff can update own notes" 
ON public.staff_notes FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Authenticated staff can delete own notes or admins" 
ON public.staff_notes FOR DELETE TO authenticated
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = staff_notes.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);