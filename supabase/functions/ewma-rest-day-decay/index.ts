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

    // Get all clubs with their timezone
    const { data: allClubs, error: clubsError } = await supabase
      .from("clubs")
      .select("id, name, timezone");

    if (clubsError) throw clubsError;
    if (!allClubs || allClubs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clubs found", inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter clubs where it's currently 23h in their timezone
    const eligibleClubIds: string[] = [];
    const clubDateMap: Record<string, string> = {};
    for (const club of allClubs) {
      try {
        const tz = club.timezone || "Europe/Paris";
        const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
        const localHour = new Date(nowInTz).getHours();
        if (localHour === 23) {
          eligibleClubIds.push(club.id);
          const localDate = new Date().toLocaleString("en-CA", { timeZone: tz });
          clubDateMap[club.id] = localDate.split(",")[0].trim();
          console.log(`[ewma-rest-decay] Club "${club.name}" (${tz}) → 23h local ✓`);
        }
      } catch (e) {
        console.error(`[ewma-rest-decay] Invalid timezone for club "${club.name}": ${club.timezone}`, e);
      }
    }

    if (eligibleClubIds.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No clubs at 23h local", inserted: 0 }),
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
        JSON.stringify({ message: "No categories for eligible clubs", inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalInserted = 0;

    for (const category of categories) {
      const today = clubDateMap[category.club_id];
      if (!today) continue;

      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("category_id", category.id);

      if (!players || players.length === 0) continue;

      const playerIds = players.map((p) => p.id);

      const { data: existingToday } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("category_id", category.id)
        .eq("session_date", today)
        .in("player_id", playerIds);

      const alreadyHasEntry = new Set(existingToday?.map((e) => e.player_id) || []);

      const { data: activePlayers } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("category_id", category.id)
        .lt("session_date", today)
        .in("player_id", playerIds)
        .not("acute_load", "is", null);

      const activePlayerIds = new Set(activePlayers?.map((a) => a.player_id) || []);

      const restDayPlayerIds = playerIds.filter(
        (id) => activePlayerIds.has(id) && !alreadyHasEntry.has(id)
      );

      if (restDayPlayerIds.length === 0) continue;

      console.log(
        `[ewma-rest-decay] Category ${category.id} (date=${today}): ${restDayPlayerIds.length} players on rest day`
      );

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
      JSON.stringify({ success: true, inserted: totalInserted, eligibleClubs: eligibleClubIds.length }),
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
