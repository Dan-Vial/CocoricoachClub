const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function buildAthletePortalFunctionUrl(action: string, token: string) {
  const safeToken = encodeURIComponent(token);
  const safeAction = encodeURIComponent(action);
  return `${SUPABASE_URL}/functions/v1/athlete-portal?token=${safeToken}&action=${safeAction}`;
}

export function athletePortalHeaders(extra?: Record<string, string>) {
  // For Lovable Cloud functions endpoint, providing BOTH headers improves compatibility.
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...(extra ?? {}),
  };
}
