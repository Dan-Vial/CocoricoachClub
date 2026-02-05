-- Allow video analyses to be created without a match (free videos)
ALTER TABLE public.video_analyses 
ALTER COLUMN match_id DROP NOT NULL;