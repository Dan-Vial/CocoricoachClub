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
        JSON.stringify({ message: "No clubs found", filled: 0 }),
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
          console.log(`[auto-fill-rpe] Club "${club.name}" (${tz}) → 23h local ✓ (date=${clubDateMap[club.id]})`);
        }
      } catch (e) {
        console.error(`[auto-fill-rpe] Invalid timezone for club "${club.name}": ${club.timezone}`, e);
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

    let totalFilled = 0;

    for (const category of categories) {
      const today = clubDateMap[category.club_id];
      if (!today) continue;

      // Get sessions for today in this category
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("id, category_id, planned_intensity, session_start_time, session_end_time, session_date")
        .eq("category_id", category.id)
        .eq("session_date", today);

      if (sessionsError) {
        console.error(`[auto-fill-rpe] Sessions error for category ${category.id}:`, sessionsError);
        continue;
      }
      if (!sessions || sessions.length === 0) continue;

      for (const session of sessions) {
        const defaultRpe = session.planned_intensity || 5;

        let durationMinutes = 60;
        if (session.session_start_time && session.session_end_time) {
          const [sh, sm] = session.session_start_time.split(":").map(Number);
          const [eh, em] = session.session_end_time.split(":").map(Number);
          durationMinutes = Math.max((eh * 60 + em) - (sh * 60 + sm), 15);
        }

        const { data: attendance } = await supabase
          .from("training_attendance")
          .select("player_id")
          .eq("training_session_id", session.id)
          .in("status", ["present", "late"]);

        let participantIds: string[] = [];

        if (attendance && attendance.length > 0) {
          participantIds = attendance.map((a) => a.player_id);
        } else {
          const { data: allPlayers } = await supabase
            .from("players")
            .select("id")
            .eq("category_id", session.category_id);
          if (allPlayers) {
            participantIds = allPlayers.map((p) => p.id);
          }
        }

        if (participantIds.length === 0) continue;

        const { data: existingRpe } = await supabase
          .from("awcr_tracking")
          .select("player_id")
          .eq("training_session_id", session.id)
          .in("player_id", participantIds);

        const submittedIds = new Set(existingRpe?.map((r) => r.player_id) || []);
        const missingIds = participantIds.filter((id) => !submittedIds.has(id));

        if (missingIds.length === 0) continue;

        console.log(
          `[auto-fill-rpe] Session ${session.id} (date=${today}): auto-filling ${missingIds.length} players with RPE=${defaultRpe}`
        );

        const inserts = missingIds.map((playerId) => ({
          player_id: playerId,
          category_id: session.category_id,
          session_date: session.session_date,
          rpe: defaultRpe,
          duration_minutes: durationMinutes,
          training_session_id: session.id,
        }));

        const { error: insertError } = await supabase
          .from("awcr_tracking")
          .insert(inserts);

        if (insertError) {
          console.error(`[auto-fill-rpe] Insert error for session ${session.id}:`, insertError);
        } else {
          totalFilled += missingIds.length;
        }
      }
    }

    console.log(`[auto-fill-rpe] Done. Total auto-filled: ${totalFilled}`);

    return new Response(
      JSON.stringify({ success: true, filled: totalFilled, eligibleClubs: eligibleClubIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[auto-fill-rpe] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
