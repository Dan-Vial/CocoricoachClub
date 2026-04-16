-- Function to auto-expire trial clients whose trial has ended without an active subscription
CREATE OR REPLACE FUNCTION public.expire_trial_clients()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.clients c
  SET status = 'suspended',
      updated_at = now()
  WHERE c.status = 'trial'
    AND c.trial_ends_at IS NOT NULL
    AND c.trial_ends_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.client_subscriptions cs
      WHERE cs.client_id = c.id AND cs.status = 'active'
    );
END;
$function$;