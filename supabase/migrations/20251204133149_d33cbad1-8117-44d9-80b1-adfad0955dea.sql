-- Table pour le suivi scolaire des joueurs
CREATE TABLE public.player_academic_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  school_absence_hours NUMERIC DEFAULT 0,
  absence_reason TEXT,
  academic_grade NUMERIC,
  subject TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les notes du staff (médecin, kiné, préparateur, tuteur)
CREATE TABLE public.staff_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL, -- 'medecin', 'kine', 'preparateur', 'tuteur', 'coach'
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note_content TEXT NOT NULL,
  is_confidential BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les plans de développement individuels
CREATE TABLE public.player_development_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  physical_objectives TEXT,
  technical_objectives TEXT,
  tactical_objectives TEXT,
  mental_objectives TEXT,
  academic_objectives TEXT,
  semester1_review TEXT,
  semester2_review TEXT,
  annual_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_academic_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_academic_tracking
CREATE POLICY "Club members can view academic tracking"
ON public.player_academic_tracking FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_academic_tracking.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can insert academic tracking"
ON public.player_academic_tracking FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_academic_tracking.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can update academic tracking"
ON public.player_academic_tracking FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_academic_tracking.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can delete academic tracking"
ON public.player_academic_tracking FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_academic_tracking.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- RLS Policies for staff_notes
CREATE POLICY "Club members can view staff notes"
ON public.staff_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = staff_notes.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can insert staff notes"
ON public.staff_notes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = staff_notes.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can update staff notes"
ON public.staff_notes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = staff_notes.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club members can delete staff notes"
ON public.staff_notes FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = staff_notes.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- RLS Policies for player_development_plans
CREATE POLICY "Club members can view development plans"
ON public.player_development_plans FOR SELECT
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_development_plans.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can insert development plans"
ON public.player_development_plans FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_development_plans.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can update development plans"
ON public.player_development_plans FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_development_plans.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

CREATE POLICY "Club owners can delete development plans"
ON public.player_development_plans FOR DELETE
USING (EXISTS (
  SELECT 1 FROM categories
  JOIN clubs ON clubs.id = categories.club_id
  WHERE categories.id = player_development_plans.category_id
  AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
));

-- Trigger for updated_at on development plans
CREATE TRIGGER update_player_development_plans_updated_at
BEFORE UPDATE ON public.player_development_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();