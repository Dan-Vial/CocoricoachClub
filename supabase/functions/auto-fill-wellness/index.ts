import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPTIMAL_WELLNESS = {
  sleep_quality: 1,
  sleep_duration: 1,
  general_fatigue: 1,
  stress_level: 1,
  soreness_upper_body: 1,
  soreness_lower_body: 1,
  has_specific_pain: false,
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

    // Get all clubs with their timezone
    const { data: allClubs, error: clubsError } = await supabase
      .from("clubs")
      .select("id, name, timezone");

    if (clubsError) throw clubsError;
    if (!allClubs || allClubs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clubs found", filled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter clubs where it's currently 23h in their timezone (end of day)
    const eligibleClubIds: string[] = [];
    for (const club of allClubs) {
      try {
        const tz = club.timezone || "Europe/Paris";
        const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
        const localHour = new Date(nowInTz).getHours();
        if (localHour === 23) {
          eligibleClubIds.push(club.id);
          console.log(`[auto-fill-wellness] Club "${club.name}" (${tz}) → 23h local ✓`);
        }
      } catch (e) {
        console.error(`[auto-fill-wellness] Invalid timezone for club "${club.name}": ${club.timezone}`, e);
      }
    }

    if (eligibleClubIds.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No clubs at 23h local", filled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get categories for eligible clubs
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, club_id")
      .in("club_id", eligibleClubIds);

    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories for eligible clubs", filled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a map of club_id -> today's date in that club's timezone
    const clubDateMap: Record<string, string> = {};
    for (const club of allClubs) {
      if (eligibleClubIds.includes(club.id)) {
        const tz = club.timezone || "Europe/Paris";
        const localNow = new Date().toLocaleString("en-CA", { timeZone: tz });
        clubDateMap[club.id] = localNow.split(",")[0].trim();
      }
    }

    let totalFilled = 0;

    for (const category of categories) {
      const today = clubDateMap[category.club_id];
      if (!today) continue;

      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("category_id", category.id);

      if (!players || players.length === 0) continue;

      const playerIds = players.map((p) => p.id);

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
        `[auto-fill-wellness] Category ${category.id} (date=${today}): auto-filling ${missingIds.length} players`
      );

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
      JSON.stringify({ success: true, filled: totalFilled, eligibleClubs: eligibleClubIds.length }),
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
