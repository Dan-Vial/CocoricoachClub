import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const body = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body.user_ids)
      ? body.user_ids.filter((u: unknown) => typeof u === "string" && u.length > 0)
      : body.user_id
        ? [body.user_id]
        : [];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_id or user_ids[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
    };

    const results: Record<string, { status: number; ok: boolean }> = {};

    // Process sequentially to stay friendly with OneSignal rate limits
    for (const userId of userIds) {
      try {
        const url = `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(userId)}`;
        const response = await fetch(url, { method: "DELETE", headers });
        const text = await response.text();
        // 200 = deleted, 404 = already gone => both considered success
        const ok = response.ok || response.status === 404;
        results[userId] = { status: response.status, ok };
        console.log(`[delete-onesignal-user] ${userId} → ${response.status} ${ok ? "OK" : "FAIL"} ${text.slice(0, 200)}`);
      } catch (err) {
        console.error(`[delete-onesignal-user] error for ${userId}:`, err);
        results[userId] = { status: 0, ok: false };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[delete-onesignal-user] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
