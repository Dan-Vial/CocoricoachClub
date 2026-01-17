-- Créer une fonction pour vérifier si l'utilisateur a un rôle qui permet de modifier les données
CREATE OR REPLACE FUNCTION public.can_modify_club_data(_user_id uuid, _club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- Club owner
    SELECT 1 FROM public.clubs WHERE id = _club_id AND user_id = _user_id
  ) OR EXISTS (
    -- Club members with admin or coach role
    SELECT 1 FROM public.club_members 
    WHERE user_id = _user_id 
    AND club_id = _club_id 
    AND role IN ('admin', 'coach')
  )
$function$;