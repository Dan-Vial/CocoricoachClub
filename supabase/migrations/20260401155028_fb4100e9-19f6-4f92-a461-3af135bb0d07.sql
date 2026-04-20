
CREATE TABLE public.ski_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  snow_type TEXT,
  snow_quality INTEGER,
  snow_temperature_celsius NUMERIC,
  visibility TEXT,
  weather TEXT,
  wind_speed_kmh NUMERIC,
  wind_direction TEXT,
  air_temperature_celsius NUMERIC,
  altitude_m INTEGER,
  slope_name TEXT,
  slope_difficulty TEXT,
  avalanche_risk INTEGER,
  piste_condition TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ski_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ski conditions for their categories" ON public.ski_conditions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.category_members cm WHERE cm.category_id = ski_conditions.category_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage ski conditions" ON public.ski_conditions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.category_members cm 
      WHERE cm.category_id = ski_conditions.category_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'coach', 'prepa_physique')
    )
  );
