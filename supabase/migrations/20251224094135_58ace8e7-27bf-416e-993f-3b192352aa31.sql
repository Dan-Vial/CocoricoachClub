-- Create exercise library table
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('stretching_mobility', 'musculation', 'terrain')),
  youtube_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

-- Users can view their own exercises
CREATE POLICY "Users can view their own exercises"
ON public.exercise_library
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own exercises
CREATE POLICY "Users can create their own exercises"
ON public.exercise_library
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own exercises
CREATE POLICY "Users can update their own exercises"
ON public.exercise_library
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own exercises
CREATE POLICY "Users can delete their own exercises"
ON public.exercise_library
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_exercise_library_user_id ON public.exercise_library(user_id);
CREATE INDEX idx_exercise_library_category ON public.exercise_library(category);