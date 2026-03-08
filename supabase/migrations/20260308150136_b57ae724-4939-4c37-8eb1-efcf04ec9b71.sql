
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_sessions BOOLEAN NOT NULL DEFAULT true,
  push_matches BOOLEAN NOT NULL DEFAULT true,
  push_wellness_reminder BOOLEAN NOT NULL DEFAULT true,
  push_rpe_reminder BOOLEAN NOT NULL DEFAULT true,
  push_injuries BOOLEAN NOT NULL DEFAULT true,
  push_messages BOOLEAN NOT NULL DEFAULT true,
  push_convocations BOOLEAN NOT NULL DEFAULT true,
  email_sessions BOOLEAN NOT NULL DEFAULT true,
  email_matches BOOLEAN NOT NULL DEFAULT true,
  email_wellness_reminder BOOLEAN NOT NULL DEFAULT true,
  email_rpe_reminder BOOLEAN NOT NULL DEFAULT true,
  email_convocations BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
CREATE POLICY "Users can read own notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
