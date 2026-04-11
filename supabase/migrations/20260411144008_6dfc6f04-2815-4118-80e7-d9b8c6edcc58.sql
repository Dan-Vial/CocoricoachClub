ALTER TABLE public.periodization_cycles
  ADD COLUMN cycle_type text DEFAULT NULL,
  ADD COLUMN intensity smallint DEFAULT NULL,
  ADD COLUMN volume smallint DEFAULT NULL;