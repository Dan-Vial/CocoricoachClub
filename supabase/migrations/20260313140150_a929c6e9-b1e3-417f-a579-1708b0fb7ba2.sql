
CREATE TABLE public.user_activity_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer NOT NULL DEFAULT 0,
  user_type text NOT NULL DEFAULT 'staff',
  last_heartbeat timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_date, user_type)
);

ALTER TABLE public.user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own activity
CREATE POLICY "Users can upsert own activity"
  ON public.user_activity_tracking
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins can read all activity
CREATE POLICY "Super admins can read all activity"
  ON public.user_activity_tracking
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Create index for efficient querying
CREATE INDEX idx_user_activity_date ON public.user_activity_tracking(activity_date);
CREATE INDEX idx_user_activity_user ON public.user_activity_tracking(user_id);
