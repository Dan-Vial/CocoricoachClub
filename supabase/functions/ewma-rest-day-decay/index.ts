import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Paris timezone for "today"
    const parisNow = new Date().toLocaleString("en-CA", { timeZone: "Europe/Paris" });
    const today = parisNow.split(",")[0].trim();

    console.log(`[ewma-rest-decay] Processing rest day decay for ${today}`);

    // Get all categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id");

    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories", inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalInserted = 0;

    for (const category of categories) {
      // Get all players in this category
      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("category_id", category.id);

      if (!players || players.length === 0) continue;

      const playerIds = players.map((p) => p.id);

      // Find players who already have an EWMA entry today (from a real session or already decayed)
      const { data: existingToday } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("category_id", category.id)
        .eq("session_date", today)
        .in("player_id", playerIds);

      const alreadyHasEntry = new Set(existingToday?.map((e) => e.player_id) || []);

      // Find players who have at least one previous EWMA entry (active in the system)
      // We only want to decay players who are being tracked
      const { data: activePlayers } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("category_id", category.id)
        .lt("session_date", today)
        .in("player_id", playerIds)
        .not("acute_load", "is", null);

      const activePlayerIds = new Set(activePlayers?.map((a) => a.player_id) || []);

      // Players who are actively tracked but have no entry today = rest day
      const restDayPlayerIds = playerIds.filter(
        (id) => activePlayerIds.has(id) && !alreadyHasEntry.has(id)
      );

      if (restDayPlayerIds.length === 0) continue;

      console.log(
        `[ewma-rest-decay] Category ${category.id}: ${restDayPlayerIds.length} players on rest day`
      );

      // Insert zero-load entries — the compute_ewma_loads trigger will handle decay
      const inserts = restDayPlayerIds.map((playerId) => ({
        player_id: playerId,
        category_id: category.id,
        session_date: today,
        rpe: 0,
        duration_minutes: 0,
        training_session_id: null,
      }));

      const { error: insertError } = await supabase
        .from("awcr_tracking")
        .insert(inserts);

      if (insertError) {
        console.error(
          `[ewma-rest-decay] Insert error for category ${category.id}:`,
          insertError
        );
      } else {
        totalInserted += restDayPlayerIds.length;
      }
    }

    console.log(`[ewma-rest-decay] Done. Total rest-day entries: ${totalInserted}`);

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ewma-rest-decay] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
