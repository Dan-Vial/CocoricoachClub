/**
 * tag-session-participants
 *
 * Tags each participant of a training session in OneSignal so they can be
 * targeted precisely per-session, regardless of shared URLs or category.
 *
 * Tag written per player:
 *   participates_training_<session_id> = "true"
 *
 * Usage:
 *   POST /tag-session-participants
 *   { "session_id": "<uuid>", "player_ids": ["<uuid>", ...], "action": "add" | "remove" }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TagRequest {
  session_id: string;
  player_ids: string[];
  action?: "add" | "remove"; // default: add
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: TagRequest = await req.json();
    const { session_id, player_ids, action = "add" } = body;

    if (!session_id) throw new Error("session_id is required");
    if (!player_ids || player_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tagged: 0, message: "No player_ids provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve player_ids → user_ids (only players with an active account)
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, user_id")
      .in("id", player_ids)
      .not("user_id", "is", null);

    if (playersError) throw playersError;

    const tagKey = `participates_training_${session_id}`;
    const results = { tagged: 0, skipped: 0, errors: [] as string[] };

    console.log(
      `[tag-session-participants] Session ${session_id} — action=${action}, ` +
      `${player_ids.length} player_ids → ${players?.length ?? 0} with user accounts`
    );

    for (const player of players ?? []) {
      if (!player.user_id) {
        results.skipped++;
        console.warn(`[tag-session-participants] Player ${player.id} has no user_id — skipping`);
        continue;
      }

      // PATCH tags via OneSignal REST API (external_id = user_id)
      const tagValue = action === "add" ? "true" : ""; // empty string removes the tag in OneSignal
      const url = `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${player.user_id}`;

      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            tags: {
              [tagKey]: tagValue,
              // Keep training_id for backwards compatibility
              training_id: action === "add" ? session_id : "",
            },
          }),
        });

        const json = await res.json();

        if (res.ok) {
          results.tagged++;
          console.log(
            `[tag-session-participants] ✅ ${action} tag "${tagKey}" for user ${player.user_id}:`,
            json
          );
        } else {
          results.errors.push(`user ${player.user_id}: ${JSON.stringify(json)}`);
          console.error(
            `[tag-session-participants] ❌ Failed for user ${player.user_id}:`,
            JSON.stringify(json)
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`user ${player.user_id}: ${msg}`);
        console.error(`[tag-session-participants] Exception for user ${player.user_id}:`, msg);
      }
    }

    console.log(`[tag-session-participants] Done — tagged: ${results.tagged}, skipped: ${results.skipped}, errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({ success: true, session_id, tagKey, action, ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[tag-session-participants] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
