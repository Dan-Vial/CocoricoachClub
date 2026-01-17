-- Supprimer les policies existantes qui causent la récursion
DROP POLICY IF EXISTS "Super admins can delete super admin users" ON super_admin_users;
DROP POLICY IF EXISTS "Super admins can insert super admin users" ON super_admin_users;
DROP POLICY IF EXISTS "Super admins can view super admin users" ON super_admin_users;

-- Créer des nouvelles policies qui utilisent la fonction is_super_admin (security definer)
CREATE POLICY "Super admins can view super admin users" 
ON super_admin_users 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert super admin users" 
ON super_admin_users 
FOR INSERT 
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete super admin users" 
ON super_admin_users 
FOR DELETE 
USING (public.is_super_admin(auth.uid()));

-- Supprimer les policies sur conversation_participants qui causent récursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON conversation_participants;

-- Créer une fonction helper pour vérifier si l'utilisateur participe à une conversation
CREATE OR REPLACE FUNCTION public.user_participates_in_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Créer une fonction helper pour vérifier si l'utilisateur est admin d'une conversation
CREATE OR REPLACE FUNCTION public.user_is_conversation_admin(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id AND is_admin = true
  )
$$;

-- Recréer les policies sans récursion
CREATE POLICY "Users can view participants of their conversations" 
ON conversation_participants 
FOR SELECT 
USING (public.user_participates_in_conversation(auth.uid(), conversation_id));

CREATE POLICY "Users can manage their own participation" 
ON conversation_participants 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Conversation admins can manage participants" 
ON conversation_participants 
FOR ALL 
USING (public.user_is_conversation_admin(auth.uid(), conversation_id));