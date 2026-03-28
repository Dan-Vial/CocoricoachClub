
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS test_reminder_id uuid REFERENCES public.test_reminders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_sessions_test_reminder_id 
ON public.training_sessions(test_reminder_id) WHERE test_reminder_id IS NOT NULL;
