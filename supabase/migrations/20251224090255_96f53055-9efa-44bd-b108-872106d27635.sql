
-- =====================================================
-- 1. PROTOCOLE RETOUR DE BLESSURE (Return to Play Protocol)
-- =====================================================
CREATE TABLE public.return_to_play_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
  -- Protocol status
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'suspended')),
  current_phase INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phases du protocole
CREATE TABLE public.rtp_phase_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.return_to_play_protocols(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Validation
  validated_by TEXT,
  validation_notes TEXT,
  
  -- Checklist items completed (stored as JSONB)
  checklist_completed JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(protocol_id, phase_number)
);

-- =====================================================
-- 2. SUIVI VACCINATIONS/EXAMENS MEDICAUX
-- =====================================================
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
  -- Type
  record_type TEXT NOT NULL CHECK (record_type IN ('vaccination', 'medical_exam', 'certificate', 'blood_test', 'imaging', 'other')),
  name TEXT NOT NULL,
  
  -- Dates
  record_date DATE NOT NULL,
  expiry_date DATE,
  next_due_date DATE,
  
  -- Details
  provider TEXT,
  location TEXT,
  result TEXT,
  notes TEXT,
  
  -- File attachment
  document_url TEXT,
  
  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 30,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. JOURNAL DE RECUPERATION
-- =====================================================
CREATE TABLE public.recovery_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Sleep tracking
  sleep_duration_hours NUMERIC(3,1),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  bed_time TIME,
  wake_time TIME,
  sleep_notes TEXT,
  
  -- Recovery modalities (booleans and durations)
  ice_bath BOOLEAN DEFAULT false,
  ice_bath_duration_min INTEGER,
  ice_bath_temperature INTEGER,
  
  contrast_bath BOOLEAN DEFAULT false,
  contrast_bath_duration_min INTEGER,
  
  massage BOOLEAN DEFAULT false,
  massage_duration_min INTEGER,
  massage_type TEXT,
  
  foam_rolling BOOLEAN DEFAULT false,
  foam_rolling_duration_min INTEGER,
  
  stretching BOOLEAN DEFAULT false,
  stretching_duration_min INTEGER,
  stretching_type TEXT CHECK (stretching_type IN ('static', 'dynamic', 'pnf', 'yoga', 'mixed')),
  
  compression BOOLEAN DEFAULT false,
  compression_type TEXT,
  compression_duration_min INTEGER,
  
  sauna BOOLEAN DEFAULT false,
  sauna_duration_min INTEGER,
  
  cryotherapy BOOLEAN DEFAULT false,
  cryotherapy_duration_min INTEGER,
  
  active_recovery BOOLEAN DEFAULT false,
  active_recovery_type TEXT,
  active_recovery_duration_min INTEGER,
  
  -- Hydration and nutrition
  water_intake_liters NUMERIC(3,1),
  protein_shake BOOLEAN DEFAULT false,
  supplements_taken TEXT[],
  
  -- Overall feeling
  overall_recovery_score INTEGER CHECK (overall_recovery_score >= 1 AND overall_recovery_score <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  muscle_readiness INTEGER CHECK (muscle_readiness >= 1 AND muscle_readiness <= 5),
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(player_id, entry_date)
);

-- =====================================================
-- 4. NOTIFICATIONS PUSH AMELIOREES
-- =====================================================
-- Extend existing notifications table with more types
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS notification_subtype TEXT,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Table for notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  
  -- Notification types enabled
  injury_alerts BOOLEAN DEFAULT true,
  test_reminders BOOLEAN DEFAULT true,
  birthday_alerts BOOLEAN DEFAULT true,
  medical_reminders BOOLEAN DEFAULT true,
  protocol_updates BOOLEAN DEFAULT true,
  wellness_alerts BOOLEAN DEFAULT true,
  
  -- Frequency preferences
  daily_digest BOOLEAN DEFAULT false,
  digest_time TIME DEFAULT '08:00',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, category_id)
);

-- Table for birthdays (add to players)
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_rtp_protocols_injury ON public.return_to_play_protocols(injury_id);
CREATE INDEX idx_rtp_protocols_player ON public.return_to_play_protocols(player_id);
CREATE INDEX idx_rtp_protocols_status ON public.return_to_play_protocols(status);
CREATE INDEX idx_rtp_phases_protocol ON public.rtp_phase_completions(protocol_id);

CREATE INDEX idx_medical_records_player ON public.medical_records(player_id);
CREATE INDEX idx_medical_records_category ON public.medical_records(category_id);
CREATE INDEX idx_medical_records_next_due ON public.medical_records(next_due_date);
CREATE INDEX idx_medical_records_type ON public.medical_records(record_type);

CREATE INDEX idx_recovery_journal_player ON public.recovery_journal(player_id);
CREATE INDEX idx_recovery_journal_date ON public.recovery_journal(entry_date);
CREATE INDEX idx_recovery_journal_category ON public.recovery_journal(category_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.return_to_play_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rtp_phase_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Return to Play Protocols
CREATE POLICY "Users can view RTP protocols for their categories"
ON public.return_to_play_protocols FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can manage RTP protocols for their categories"
ON public.return_to_play_protocols FOR ALL
USING (can_access_category(auth.uid(), category_id));

-- RTP Phase Completions
CREATE POLICY "Users can view RTP phases via protocol"
ON public.rtp_phase_completions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.return_to_play_protocols rtp
  WHERE rtp.id = protocol_id AND can_access_category(auth.uid(), rtp.category_id)
));

CREATE POLICY "Users can manage RTP phases via protocol"
ON public.rtp_phase_completions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.return_to_play_protocols rtp
  WHERE rtp.id = protocol_id AND can_access_category(auth.uid(), rtp.category_id)
));

-- Medical Records
CREATE POLICY "Users can view medical records for their categories"
ON public.medical_records FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can manage medical records for their categories"
ON public.medical_records FOR ALL
USING (can_access_category(auth.uid(), category_id));

-- Recovery Journal
CREATE POLICY "Users can view recovery journal for their categories"
ON public.recovery_journal FOR SELECT
USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can manage recovery journal for their categories"
ON public.recovery_journal FOR ALL
USING (can_access_category(auth.uid(), category_id));

-- Notification Preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences FOR ALL
USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_rtp_protocols_updated_at
BEFORE UPDATE ON public.return_to_play_protocols
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recovery_journal_updated_at
BEFORE UPDATE ON public.recovery_journal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
