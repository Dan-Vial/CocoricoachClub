
ALTER TABLE public.program_exercises ADD COLUMN IF NOT EXISTS target_force_newton numeric NULL;
ALTER TABLE public.gym_session_exercises ADD COLUMN IF NOT EXISTS target_force_newton numeric NULL;
