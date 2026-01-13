-- Make system exercise templates visible in the exercise library
-- (existing policy only allows auth.uid() = user_id, but system rows have a sentinel user_id)

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System exercises are viewable"
ON public.exercise_library
FOR SELECT
TO authenticated
USING (is_system IS TRUE);
