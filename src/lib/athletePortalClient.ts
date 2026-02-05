const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function buildAthletePortalFunctionUrl(action: string, token?: string) {
  const safeAction = encodeURIComponent(action);
  if (token) {
    const safeToken = encodeURIComponent(token);
    return `${SUPABASE_URL}/functions/v1/athlete-portal?token=${safeToken}&action=${safeAction}`;
  }
  // For logged-in athletes, the auth token will be passed via headers
  return `${SUPABASE_URL}/functions/v1/athlete-portal?action=${safeAction}`;
}

export function athletePortalHeaders(extra?: Record<string, string>, authToken?: string) {
  // For Lovable Cloud functions endpoint, providing BOTH headers improves compatibility.
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_KEY}`,
    ...(extra ?? {}),
  };
  return headers;
}
