-- Create mobility tests table
CREATE TABLE public.mobility_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  category_id UUID NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT NOT NULL, -- 'fms', 'hip', 'shoulder', 'ankle'
  score INTEGER, -- For FMS (0-21 total or individual scores 0-3)
  left_score INTEGER, -- For bilateral tests
  right_score INTEGER, -- For bilateral tests
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jump tests table
CREATE TABLE public.jump_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  category_id UUID NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT NOT NULL, -- 'vertical_jump', 'horizontal_jump'
  result_cm NUMERIC NOT NULL, -- Result in centimeters
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create concussion protocols table
CREATE TABLE public.concussion_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  category_id UUID NOT NULL,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_description TEXT,
  symptoms TEXT[], -- Array of symptoms
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'recovery', 'cleared'
  clearance_date DATE,
  medical_notes TEXT,
  return_to_play_phase INTEGER DEFAULT 1, -- Phase 1-6 of return to play protocol
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mobility_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jump_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concussion_protocols ENABLE ROW LEVEL SECURITY;

-- RLS policies for mobility_tests
CREATE POLICY "Club owners can view mobility tests" ON public.mobility_tests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = mobility_tests.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club owners can insert mobility tests" ON public.mobility_tests
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = mobility_tests.category_id AND clubs.user_id = auth.uid()
  ));

CREATE POLICY "Club owners can update mobility tests" ON public.mobility_tests
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = mobility_tests.category_id AND clubs.user_id = auth.uid()
  ));

CREATE POLICY "Club owners can delete mobility tests" ON public.mobility_tests
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = mobility_tests.category_id AND clubs.user_id = auth.uid()
  ));

-- RLS policies for jump_tests
CREATE POLICY "Club owners can view jump tests" ON public.jump_tests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = jump_tests.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club owners can insert jump tests" ON public.jump_tests
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = jump_tests.category_id AND clubs.user_id = auth.uid()
  ));

CREATE POLICY "Club owners can update jump tests" ON public.jump_tests
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = jump_tests.category_id AND clubs.user_id = auth.uid()
  ));

CREATE POLICY "Club owners can delete jump tests" ON public.jump_tests
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = jump_tests.category_id AND clubs.user_id = auth.uid()
  ));

-- RLS policies for concussion_protocols
CREATE POLICY "Club members can view concussion protocols" ON public.concussion_protocols
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = concussion_protocols.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can insert concussion protocols" ON public.concussion_protocols
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = concussion_protocols.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can update concussion protocols" ON public.concussion_protocols
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = concussion_protocols.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

CREATE POLICY "Club members can delete concussion protocols" ON public.concussion_protocols
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM categories JOIN clubs ON clubs.id = categories.club_id
    WHERE categories.id = concussion_protocols.category_id AND (clubs.user_id = auth.uid() OR can_access_club(auth.uid(), clubs.id))
  ));

-- Trigger for updated_at on concussion_protocols
CREATE TRIGGER update_concussion_protocols_updated_at
  BEFORE UPDATE ON public.concussion_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();