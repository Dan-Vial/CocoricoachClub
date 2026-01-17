-- Fix RLS policies to allow viewers (club members and category members) to see data

-- Drop and recreate training_sessions SELECT policy to include club members
DROP POLICY IF EXISTS "Users can view own training sessions" ON public.training_sessions;
CREATE POLICY "Users can view training sessions in accessible categories"
ON public.training_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = training_sessions.category_id
    AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
  )
);

-- Drop and recreate awcr_tracking SELECT policy to include club members
DROP POLICY IF EXISTS "Users can view own awcr tracking" ON public.awcr_tracking;
CREATE POLICY "Users can view awcr tracking in accessible categories"
ON public.awcr_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = awcr_tracking.category_id
    AND (cl.user_id = auth.uid() OR can_access_club(auth.uid(), cl.id))
  )
);

-- Check and fix other tables that might have the same issue

-- Fix speed_tests SELECT policy
DROP POLICY IF EXISTS "Users can view own speed tests" ON public.speed_tests;
CREATE POLICY "Users can view speed tests in accessible categories"
ON public.speed_tests
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix jump_tests SELECT policy
DROP POLICY IF EXISTS "Users can view own jump tests" ON public.jump_tests;
CREATE POLICY "Users can view jump tests in accessible categories"
ON public.jump_tests
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix strength_tests SELECT policy
DROP POLICY IF EXISTS "Users can view own strength tests" ON public.strength_tests;
CREATE POLICY "Users can view strength tests in accessible categories"
ON public.strength_tests
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix generic_tests SELECT policy
DROP POLICY IF EXISTS "Users can view own generic tests" ON public.generic_tests;
CREATE POLICY "Users can view generic tests in accessible categories"
ON public.generic_tests
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix mobility_tests SELECT policy
DROP POLICY IF EXISTS "Users can view own mobility tests" ON public.mobility_tests;
CREATE POLICY "Users can view mobility tests in accessible categories"
ON public.mobility_tests
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix training_periods SELECT policy
DROP POLICY IF EXISTS "Users can view own training periods" ON public.training_periods;
CREATE POLICY "Users can view training periods in accessible categories"
ON public.training_periods
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix training_cycles SELECT policy
DROP POLICY IF EXISTS "Users can view own training cycles" ON public.training_cycles;
CREATE POLICY "Users can view training cycles in accessible categories"
ON public.training_cycles
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix training_programs SELECT policy
DROP POLICY IF EXISTS "Users can view own programs" ON public.training_programs;
CREATE POLICY "Users can view programs in accessible categories"
ON public.training_programs
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix training_attendance SELECT policy
DROP POLICY IF EXISTS "Users can view own training attendance" ON public.training_attendance;
CREATE POLICY "Users can view training attendance in accessible categories"
ON public.training_attendance
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix session_templates SELECT policy
DROP POLICY IF EXISTS "Users can view own session templates" ON public.session_templates;
CREATE POLICY "Users can view session templates in accessible categories"
ON public.session_templates
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix weekly_planning SELECT policy
DROP POLICY IF EXISTS "Users can view own weekly planning" ON public.weekly_planning;
CREATE POLICY "Users can view weekly planning in accessible categories"
ON public.weekly_planning
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix gym_session_exercises SELECT policy
DROP POLICY IF EXISTS "Users can view own gym session exercises" ON public.gym_session_exercises;
CREATE POLICY "Users can view gym session exercises in accessible categories"
ON public.gym_session_exercises
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix gps_sessions SELECT policy
DROP POLICY IF EXISTS "Users can view own gps sessions" ON public.gps_sessions;
CREATE POLICY "Users can view gps sessions in accessible categories"
ON public.gps_sessions
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix body_composition SELECT policy
DROP POLICY IF EXISTS "Users can view own body composition" ON public.body_composition;
CREATE POLICY "Users can view body composition in accessible categories"
ON public.body_composition
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix concussion_protocols SELECT policy
DROP POLICY IF EXISTS "Users can view own concussion protocols" ON public.concussion_protocols;
CREATE POLICY "Users can view concussion protocols in accessible categories"
ON public.concussion_protocols
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);

-- Fix nutrition_entries SELECT policy
DROP POLICY IF EXISTS "Users can view own nutrition entries" ON public.nutrition_entries;
CREATE POLICY "Users can view nutrition entries in accessible categories"
ON public.nutrition_entries
FOR SELECT
USING (
  can_access_category(auth.uid(), category_id)
);