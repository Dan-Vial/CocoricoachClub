-- ============================================
-- COMPREHENSIVE SECURITY FIX FOR SENSITIVE DATA
-- Restrict medical/health data to medical staff only
-- ============================================

-- First, let's check which tables need wellness_tracking policies
-- And update existing tables with proper restrictions

-- ============================================
-- 1. MENSTRUAL DATA - Restrict to medical staff only (physio, doctor)
-- ============================================

-- Drop existing menstrual_cycles policies if they exist
DROP POLICY IF EXISTS "Users can view menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Users can insert menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Users can update menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Users can delete menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Club members can view menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Club members can insert menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Club members can update menstrual cycles" ON public.menstrual_cycles;
DROP POLICY IF EXISTS "Club members can delete menstrual cycles" ON public.menstrual_cycles;

CREATE POLICY "Medical staff can view menstrual cycles"
ON public.menstrual_cycles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_cycles.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can insert menstrual cycles"
ON public.menstrual_cycles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_cycles.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can update menstrual cycles"
ON public.menstrual_cycles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_cycles.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can delete menstrual cycles"
ON public.menstrual_cycles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_cycles.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- ============================================
-- 2. MENSTRUAL SYMPTOMS - Restrict to medical staff only
-- ============================================

DROP POLICY IF EXISTS "Club members can view menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Club members can insert menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Club members can update menstrual symptoms" ON public.menstrual_symptoms;
DROP POLICY IF EXISTS "Club members can delete menstrual symptoms" ON public.menstrual_symptoms;

CREATE POLICY "Medical staff can view menstrual symptoms"
ON public.menstrual_symptoms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_symptoms.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can insert menstrual symptoms"
ON public.menstrual_symptoms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_symptoms.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can update menstrual symptoms"
ON public.menstrual_symptoms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_symptoms.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can delete menstrual symptoms"
ON public.menstrual_symptoms FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = menstrual_symptoms.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- ============================================
-- 3. CONCUSSION PROTOCOLS - Restrict to medical staff only
-- ============================================

DROP POLICY IF EXISTS "Club members can view concussion protocols" ON public.concussion_protocols;
DROP POLICY IF EXISTS "Club members can insert concussion protocols" ON public.concussion_protocols;
DROP POLICY IF EXISTS "Club members can update concussion protocols" ON public.concussion_protocols;
DROP POLICY IF EXISTS "Club members can delete concussion protocols" ON public.concussion_protocols;

CREATE POLICY "Medical staff can view concussion protocols"
ON public.concussion_protocols FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = concussion_protocols.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can insert concussion protocols"
ON public.concussion_protocols FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = concussion_protocols.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can update concussion protocols"
ON public.concussion_protocols FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = concussion_protocols.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical staff can delete concussion protocols"
ON public.concussion_protocols FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = concussion_protocols.category_id 
    AND has_medical_access(auth.uid(), cl.id)
  )
);

-- ============================================
-- 4. INJURIES - Restrict to medical staff and coaches
-- ============================================

-- Create helper for medical + coaching access
CREATE OR REPLACE FUNCTION public.has_medical_or_coaching_access(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = _club_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE user_id = _user_id 
    AND club_id = _club_id 
    AND role IN ('admin', 'physio', 'doctor', 'coach')
  )
$$;

DROP POLICY IF EXISTS "Club members can view injuries" ON public.injuries;
DROP POLICY IF EXISTS "Club members can insert injuries" ON public.injuries;
DROP POLICY IF EXISTS "Club members can update injuries" ON public.injuries;
DROP POLICY IF EXISTS "Club members can delete injuries" ON public.injuries;

CREATE POLICY "Medical and coaching staff can view injuries"
ON public.injuries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = injuries.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical and coaching staff can insert injuries"
ON public.injuries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = injuries.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical and coaching staff can update injuries"
ON public.injuries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = injuries.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Medical and coaching staff can delete injuries"
ON public.injuries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = injuries.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

-- ============================================
-- 5. ACADEMIC TRACKING - Restrict to owners and admins only
-- ============================================

DROP POLICY IF EXISTS "Club members can view academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club members can insert academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club members can update academic tracking" ON public.player_academic_tracking;
DROP POLICY IF EXISTS "Club members can delete academic tracking" ON public.player_academic_tracking;

CREATE POLICY "Admins can view academic tracking"
ON public.player_academic_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_academic_tracking.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

CREATE POLICY "Admins can insert academic tracking"
ON public.player_academic_tracking FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_academic_tracking.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

CREATE POLICY "Admins can update academic tracking"
ON public.player_academic_tracking FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_academic_tracking.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

CREATE POLICY "Admins can delete academic tracking"
ON public.player_academic_tracking FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_academic_tracking.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- ============================================
-- 6. STAFF NOTES - Only creator and admins for confidential notes
-- ============================================

DROP POLICY IF EXISTS "Club members can view staff notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Club members can insert staff notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Club members can update staff notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Club members can delete staff notes" ON public.staff_notes;

CREATE POLICY "Staff can view own and non-confidential notes"
ON public.staff_notes FOR SELECT
USING (
  -- Creator can always see their notes
  created_by = auth.uid()
  OR
  -- Non-confidential notes visible to club members
  (
    NOT COALESCE(is_confidential, false)
    AND EXISTS (
      SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
      WHERE c.id = staff_notes.category_id 
      AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
    )
  )
  OR
  -- Confidential notes visible only to owners/admins
  (
    COALESCE(is_confidential, false)
    AND EXISTS (
      SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
      WHERE c.id = staff_notes.category_id 
      AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
    )
  )
);

CREATE POLICY "Staff can insert notes"
ON public.staff_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = staff_notes.category_id 
    AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
  )
);

CREATE POLICY "Staff can update own notes"
ON public.staff_notes FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Staff can delete own notes or admins"
ON public.staff_notes FOR DELETE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = staff_notes.category_id 
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- ============================================
-- 7. PLAYER EVALUATIONS - Restrict to coaches and admins
-- ============================================

DROP POLICY IF EXISTS "Club members can view evaluations" ON public.player_evaluations;
DROP POLICY IF EXISTS "Club members can insert evaluations" ON public.player_evaluations;
DROP POLICY IF EXISTS "Club members can update evaluations" ON public.player_evaluations;
DROP POLICY IF EXISTS "Club members can delete evaluations" ON public.player_evaluations;

CREATE POLICY "Coaching staff can view evaluations"
ON public.player_evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_evaluations.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Coaching staff can insert evaluations"
ON public.player_evaluations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_evaluations.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Coaching staff can update evaluations"
ON public.player_evaluations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_evaluations.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);

CREATE POLICY "Coaching staff can delete evaluations"
ON public.player_evaluations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = player_evaluations.category_id 
    AND has_medical_or_coaching_access(auth.uid(), cl.id)
  )
);