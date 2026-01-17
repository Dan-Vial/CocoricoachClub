-- Modifier le trigger d'audit pour gérer le cas où auth.uid() est null
CREATE OR REPLACE FUNCTION public.audit_approval_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (COALESCE(NEW.approved_by, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'approve_user', 'user', NEW.user_id, jsonb_build_object(
      'notes', NEW.notes
    ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'revoke_approval', 'user', OLD.user_id, '{}'::jsonb);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;