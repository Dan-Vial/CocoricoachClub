import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Optimal wellness values (scale 1=best, 5=worst)
const OPTIMAL_WELLNESS = {
  sleep_quality: 1,        // Très bien dormi
  sleep_duration: 1,       // Durée optimale
  general_fatigue: 1,      // Pas de fatigue
  stress_level: 1,         // Pas de stress
  soreness_upper_body: 1,  // Pas de douleur
  soreness_lower_body: 1,  // Pas de douleur
  has_specific_pain: false, // Pas de douleur spécifique
  pain_zone: null,
  pain_location: null,
  notes: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Paris timezone for "today" to avoid midnight UTC issues
    const parisNow = new Date().toLocaleString("en-CA", { timeZone: "Europe/Paris" });
    const today = parisNow.split(",")[0].trim();

    console.log(`[auto-fill-wellness] Processing for ${today}`);

    // Get all active categories (those that have players)
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id");

    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories", filled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalFilled = 0;

    for (const category of categories) {
      // Get all players in this category
      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("category_id", category.id);

      if (!players || players.length === 0) continue;

      const playerIds = players.map((p) => p.id);

      // Check who already submitted wellness today
      const { data: existingWellness } = await supabase
        .from("wellness_tracking")
        .select("player_id")
        .eq("category_id", category.id)
        .eq("tracking_date", today)
        .in("player_id", playerIds);

      const submittedIds = new Set(existingWellness?.map((w) => w.player_id) || []);
      const missingIds = playerIds.filter((id) => !submittedIds.has(id));

      if (missingIds.length === 0) continue;

      console.log(
        `[auto-fill-wellness] Category ${category.id}: auto-filling ${missingIds.length} players`
      );

      // Insert optimal wellness for missing players
      const inserts = missingIds.map((playerId) => ({
        player_id: playerId,
        category_id: category.id,
        tracking_date: today,
        ...OPTIMAL_WELLNESS,
      }));

      const { error: insertError } = await supabase
        .from("wellness_tracking")
        .insert(inserts);

      if (insertError) {
        console.error(`[auto-fill-wellness] Insert error for category ${category.id}:`, insertError);
      } else {
        totalFilled += missingIds.length;
      }
    }

    console.log(`[auto-fill-wellness] Done. Total auto-filled: ${totalFilled}`);

    return new Response(
      JSON.stringify({ success: true, filled: totalFilled }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[auto-fill-wellness] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
