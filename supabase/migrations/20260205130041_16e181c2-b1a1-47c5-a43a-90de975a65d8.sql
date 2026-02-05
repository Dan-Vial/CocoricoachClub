-- Allow video_clips to be created without a match (for free video analysis)
ALTER TABLE public.video_clips ALTER COLUMN match_id DROP NOT NULL;