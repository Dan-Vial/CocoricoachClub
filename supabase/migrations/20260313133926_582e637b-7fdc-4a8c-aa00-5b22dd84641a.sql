
ALTER TABLE public.generic_tests 
ADD COLUMN IF NOT EXISTS secondary_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS secondary_unit text DEFAULT NULL;

COMMENT ON COLUMN public.generic_tests.secondary_value IS 'Optional secondary measurement (e.g., bar speed for strength tests)';
COMMENT ON COLUMN public.generic_tests.secondary_unit IS 'Unit for secondary value (e.g., m/s for bar speed)';
