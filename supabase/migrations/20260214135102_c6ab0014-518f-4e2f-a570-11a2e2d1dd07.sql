-- Add block columns to program_weeks
ALTER TABLE public.program_weeks ADD COLUMN block_name TEXT;
ALTER TABLE public.program_weeks ADD COLUMN block_order INTEGER DEFAULT 0;