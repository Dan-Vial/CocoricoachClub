-- Table pour les analyses vidéo principales (liées à un match)
CREATE TABLE public.video_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- URL de la vidéo complète du match (VEO, Hudl, YouTube, etc.)
  video_source TEXT DEFAULT 'veo', -- veo, hudl, youtube, local
  match_start_timestamp TIMESTAMPTZ, -- Horodatage de référence du début du match
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les clips vidéo individuels
CREATE TABLE public.video_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_analysis_id UUID NOT NULL REFERENCES public.video_analyses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  clip_url TEXT NOT NULL, -- URL du clip (pré-découpé externement)
  start_time_seconds INTEGER NOT NULL DEFAULT 0, -- Timecode début dans le match
  end_time_seconds INTEGER, -- Timecode fin dans le match
  duration_seconds INTEGER,
  action_type TEXT NOT NULL, -- sprint, acceleration, duel, shot, tackle, pass, try, etc.
  action_category TEXT, -- offensive, defensive, transition
  notes TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table de liaison clips <-> joueurs (plusieurs joueurs par clip possible)
CREATE TABLE public.clip_player_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id UUID NOT NULL REFERENCES public.video_clips(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'main', -- main, secondary, opponent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clip_id, player_id)
);

-- Index pour les performances
CREATE INDEX idx_video_analyses_category ON public.video_analyses(category_id);
CREATE INDEX idx_video_analyses_match ON public.video_analyses(match_id);
CREATE INDEX idx_video_clips_analysis ON public.video_clips(video_analysis_id);
CREATE INDEX idx_video_clips_match ON public.video_clips(match_id);
CREATE INDEX idx_video_clips_action ON public.video_clips(action_type);
CREATE INDEX idx_clip_player_player ON public.clip_player_associations(player_id);

-- Trigger pour updated_at
CREATE TRIGGER update_video_analyses_updated_at
  BEFORE UPDATE ON public.video_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_clips_updated_at
  BEFORE UPDATE ON public.video_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_player_associations ENABLE ROW LEVEL SECURITY;

-- Policies pour video_analyses
CREATE POLICY "Users can view video analyses for accessible categories"
  ON public.video_analyses FOR SELECT
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can create video analyses for accessible categories"
  ON public.video_analyses FOR INSERT
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update video analyses for accessible categories"
  ON public.video_analyses FOR UPDATE
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete video analyses for accessible categories"
  ON public.video_analyses FOR DELETE
  USING (public.can_access_category(auth.uid(), category_id));

-- Policies pour video_clips
CREATE POLICY "Users can view video clips for accessible categories"
  ON public.video_clips FOR SELECT
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can create video clips for accessible categories"
  ON public.video_clips FOR INSERT
  WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update video clips for accessible categories"
  ON public.video_clips FOR UPDATE
  USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete video clips for accessible categories"
  ON public.video_clips FOR DELETE
  USING (public.can_access_category(auth.uid(), category_id));

-- Policies pour clip_player_associations
CREATE POLICY "Users can view clip associations for accessible clips"
  ON public.clip_player_associations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.video_clips vc
    WHERE vc.id = clip_id AND public.can_access_category(auth.uid(), vc.category_id)
  ));

CREATE POLICY "Users can create clip associations for accessible clips"
  ON public.clip_player_associations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_clips vc
    WHERE vc.id = clip_id AND public.can_access_category(auth.uid(), vc.category_id)
  ));

CREATE POLICY "Users can delete clip associations for accessible clips"
  ON public.clip_player_associations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.video_clips vc
    WHERE vc.id = clip_id AND public.can_access_category(auth.uid(), vc.category_id)
  ));