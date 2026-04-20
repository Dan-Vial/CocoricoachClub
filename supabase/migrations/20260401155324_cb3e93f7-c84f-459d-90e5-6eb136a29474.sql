
-- Ski/Snow equipment table
CREATE TABLE public.player_ski_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL DEFAULT 'ski',
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Ski/Snowboard fields
  ski_brand TEXT,
  ski_model TEXT,
  ski_length_cm NUMERIC,
  ski_radius_m NUMERIC,
  ski_stiffness TEXT,
  sole_structure TEXT,
  camber_type TEXT,
  -- Wax fields
  wax_brand TEXT,
  wax_type TEXT,
  wax_temp_range TEXT,
  wax_humidity_range TEXT,
  -- Boot fields
  boot_brand TEXT,
  boot_model TEXT,
  boot_flex INTEGER,
  -- Generic
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.player_ski_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ski equipment for their categories" ON public.player_ski_equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.category_members cm WHERE cm.category_id = player_ski_equipment.category_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Staff can manage ski equipment" ON public.player_ski_equipment
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.category_members cm 
      WHERE cm.category_id = player_ski_equipment.category_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach', 'prepa_physique')
    )
  );

-- Ski session equipment link table
CREATE TABLE public.ski_session_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.player_ski_equipment(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ski_session_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ski session equipment" ON public.ski_session_equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.player_ski_equipment pse 
      JOIN public.category_members cm ON cm.category_id = pse.category_id 
      WHERE pse.id = ski_session_equipment.equipment_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage ski session equipment" ON public.ski_session_equipment
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.player_ski_equipment pse 
      JOIN public.category_members cm ON cm.category_id = pse.category_id 
      WHERE pse.id = ski_session_equipment.equipment_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach', 'prepa_physique')
    )
  );

-- Add detailed fields to ski_conditions
ALTER TABLE public.ski_conditions 
  ADD COLUMN IF NOT EXISTS snow_humidity TEXT,
  ADD COLUMN IF NOT EXISTS snow_granulometry TEXT,
  ADD COLUMN IF NOT EXISTS snow_evolution TEXT,
  ADD COLUMN IF NOT EXISTS sunshine TEXT,
  ADD COLUMN IF NOT EXISTS precipitation TEXT,
  ADD COLUMN IF NOT EXISTS slope_hardness TEXT,
  ADD COLUMN IF NOT EXISTS gate_setup TEXT,
  ADD COLUMN IF NOT EXISTS piste_evolution TEXT;
