-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'physio';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mental_coach';

-- Create smart alerts table for tracking fatigue and injury risk alerts
CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('fatigue', 'injury_risk', 'overtraining', 'recovery_needed', 'awcr_high', 'awcr_low')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for smart_alerts
CREATE POLICY "Users can view alerts for their clubs" ON public.smart_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      JOIN public.clubs cl ON cl.id = c.club_id
      WHERE c.id = category_id AND (
        cl.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update alerts for their clubs" ON public.smart_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      JOIN public.clubs cl ON cl.id = c.club_id
      WHERE c.id = category_id AND (
        cl.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = cl.id AND cm.user_id = auth.uid())
      )
    )
  );

-- Index for better query performance
CREATE INDEX idx_smart_alerts_category ON public.smart_alerts(category_id);
CREATE INDEX idx_smart_alerts_player ON public.smart_alerts(player_id);
CREATE INDEX idx_smart_alerts_unread ON public.smart_alerts(category_id, is_read, is_dismissed) WHERE NOT is_read AND NOT is_dismissed;