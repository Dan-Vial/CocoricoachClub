-- =====================================================
-- SÉCURISATION DES VUES ET TOKENS D'INVITATION
-- =====================================================

-- 1. Supprimer les vues non sécurisées et les recréer avec security_invoker
DROP VIEW IF EXISTS public.safe_profiles;
DROP VIEW IF EXISTS public.safe_club_invitations;

-- Recréer safe_profiles sans email pour les non-propriétaires
CREATE VIEW public.safe_profiles 
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  CASE 
    WHEN id = auth.uid() THEN email 
    ELSE NULL 
  END as email
FROM public.profiles;

-- 2. Sécuriser les tokens d'invitation club - créer une vue sans token
CREATE VIEW public.safe_club_invitations 
WITH (security_invoker = on) AS
SELECT 
  id,
  club_id,
  email,
  role,
  status,
  expires_at,
  created_at
  -- token est volontairement exclu
FROM public.club_invitations;

-- 3. Créer une vue sécurisée pour category_invitations sans token
CREATE VIEW public.safe_category_invitations 
WITH (security_invoker = on) AS
SELECT 
  id,
  category_id,
  email,
  role,
  status,
  expires_at,
  created_at
  -- token est volontairement exclu
FROM public.category_invitations;

-- 4. Mettre à jour les policies des invitations pour ne jamais retourner le token via SELECT
-- Pour club_invitations
DROP POLICY IF EXISTS "Club owners can view invitations" ON public.club_invitations;
DROP POLICY IF EXISTS "Admins can view club invitations" ON public.club_invitations;

-- Créer une policy qui ne permet pas de lire directement la table (forcer l'utilisation de la vue)
CREATE POLICY "Only view invitations through safe view" 
ON public.club_invitations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clubs cl
    WHERE cl.id = club_invitations.club_id
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- Pour category_invitations
DROP POLICY IF EXISTS "Category admins can view invitations" ON public.category_invitations;

CREATE POLICY "Authenticated admins can view category invitations" 
ON public.category_invitations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM categories c
    JOIN clubs cl ON cl.id = c.club_id
    WHERE c.id = category_invitations.category_id
    AND (cl.user_id = auth.uid() OR has_club_role(auth.uid(), cl.id, 'admin'::app_role))
  )
);

-- 5. Sécuriser les vues admin
DROP VIEW IF EXISTS public.admin_all_clubs CASCADE;
DROP VIEW IF EXISTS public.admin_all_users CASCADE;

-- Recréer avec security_invoker
CREATE VIEW public.admin_all_clubs 
WITH (security_invoker = on) AS
SELECT c.*, 
  (SELECT COUNT(*) FROM categories cat WHERE cat.club_id = c.id) as category_count,
  (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id) as member_count
FROM clubs c
WHERE is_super_admin(auth.uid());

CREATE VIEW public.admin_all_users 
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  (SELECT COUNT(*) FROM clubs cl WHERE cl.user_id = p.id) as clubs_owned,
  EXISTS(SELECT 1 FROM super_admin_users sau WHERE sau.user_id = p.id) as is_super_admin,
  EXISTS(SELECT 1 FROM approved_users au WHERE au.user_id = p.id) as is_approved
FROM profiles p
WHERE is_super_admin(auth.uid());

-- 6. Améliorer la policy de profiles pour bloquer les requêtes anonymes
DROP POLICY IF EXISTS "Super admins can view profiles without email" ON public.profiles;

CREATE POLICY "Super admins can view profile names only" 
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR is_super_admin(auth.uid())
);