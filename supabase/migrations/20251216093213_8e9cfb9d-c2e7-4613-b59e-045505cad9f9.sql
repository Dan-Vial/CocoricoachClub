
-- Fix security definer views by setting security_invoker = true
-- This ensures RLS of underlying tables is respected

ALTER VIEW public.safe_club_invitations SET (security_invoker = true);
ALTER VIEW public.safe_profiles SET (security_invoker = true);
