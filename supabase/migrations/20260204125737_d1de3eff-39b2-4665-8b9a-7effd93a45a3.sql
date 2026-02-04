-- Table pour les types d'actions vidéo personnalisés
CREATE TABLE public.custom_video_action_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  action_category TEXT NOT NULL DEFAULT 'other',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, value)
);

-- Enable RLS
ALTER TABLE public.custom_video_action_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view custom action types for their categories"
ON public.custom_video_action_types FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = custom_video_action_types.category_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create custom action types for their categories"
ON public.custom_video_action_types FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = custom_video_action_types.category_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete custom action types they created"
ON public.custom_video_action_types FOR DELETE
USING (created_by = auth.uid());

-- Index
CREATE INDEX idx_custom_video_action_types_category ON public.custom_video_action_types(category_id);