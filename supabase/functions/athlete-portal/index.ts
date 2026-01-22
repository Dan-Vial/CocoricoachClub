import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AthleteTokenInfo {
  success: boolean;
  error?: string;
  player_id?: string;
  player_name?: string;
  category_id?: string;
  category_name?: string;
  club_id?: string;
  club_name?: string;
  sport_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const { data: tokenInfo, error: tokenError } = await supabase.rpc(
      "validate_athlete_token",
      { _token: token }
    );

    if (tokenError || !tokenInfo?.success) {
      return new Response(
        JSON.stringify({ success: false, error: tokenInfo?.error || "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { player_id, category_id, player_name, category_name, club_name } = tokenInfo as AthleteTokenInfo;

    // Get sport type from category -> club
    let sport_type: string | undefined;
    const { data: categoryData } = await supabase
      .from("categories")
      .select("club_id, clubs(sport_type)")
      .eq("id", category_id)
      .single();
    
    if (categoryData?.clubs && typeof categoryData.clubs === 'object' && 'sport_type' in categoryData.clubs) {
      sport_type = (categoryData.clubs as { sport_type?: string }).sport_type;
    }

    // Handle different actions
    if (action === "validate") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          player_id, 
          player_name, 
          category_id, 
          category_name, 
          club_name,
          sport_type
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sessions") {
      // Get recent training sessions (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: sessions, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time")
        .eq("category_id", category_id)
        .gte("session_date", twoWeeksAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false });

      if (error) throw error;

      // Get existing RPE entries for this player
      const { data: existingRpe } = await supabase
        .from("awcr_tracking")
        .select("training_session_id")
        .eq("player_id", player_id);

      const rpeSessionIds = new Set(existingRpe?.map(r => r.training_session_id) || []);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessions,
          completedSessionIds: Array.from(rpeSessionIds)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "matches") {
      // Get recent matches (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: matches, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent, is_home, location, score_home, score_away")
        .eq("category_id", category_id)
        .gte("match_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("match_date", { ascending: false });

      if (error) throw error;

      // Check player lineup for each match
      const matchIds = matches?.map(m => m.id) || [];
      const { data: lineups } = await supabase
        .from("match_lineups")
        .select("match_id")
        .eq("player_id", player_id)
        .in("match_id", matchIds);

      const lineupMatchIds = new Set(lineups?.map(l => l.match_id) || []);

      // Get existing stats
      const { data: existingStats } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .eq("player_id", player_id);

      const statsMatchIds = new Set(existingStats?.map(s => s.match_id) || []);

      return new Response(
        JSON.stringify({ 
          success: true, 
          matches: matches?.filter(m => lineupMatchIds.has(m.id)) || [],
          completedMatchIds: Array.from(statsMatchIds)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "submit-rpe" && req.method === "POST") {
      const body = await req.json();
      const { session_id, rpe, duration } = body;

      if (!session_id || !rpe || !duration) {
        return new Response(
          JSON.stringify({ success: false, error: "Données manquantes" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session date
      const { data: session } = await supabase
        .from("training_sessions")
        .select("session_date")
        .eq("id", session_id)
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Séance introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const trainingLoad = rpe * duration;

      // Calculate AWCR
      const sessionDate = new Date(session.session_date);
      const sevenDaysAgo = new Date(sessionDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const twentyEightDaysAgo = new Date(sessionDate);
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

      const { data: recentSessions } = await supabase
        .from("awcr_tracking")
        .select("training_load")
        .eq("player_id", player_id)
        .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
        .lt("session_date", session.session_date);

      const { data: chronicSessions } = await supabase
        .from("awcr_tracking")
        .select("training_load")
        .eq("player_id", player_id)
        .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
        .lt("session_date", session.session_date);

      const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + trainingLoad;
      const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;
      const acuteAvg = acuteTotal / 7;
      const chronicAvg = chronicTotal / 28;
      const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

      const { error: insertError } = await supabase.from("awcr_tracking").insert({
        player_id,
        category_id,
        training_session_id: session_id,
        session_date: session.session_date,
        rpe,
        duration_minutes: duration,
        training_load: trainingLoad,
        acute_load: acuteAvg,
        chronic_load: chronicAvg,
        awcr,
      });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "submit-stats" && req.method === "POST") {
      const body = await req.json();
      const { match_id, minutes_played, goals, assists, yellow_cards, red_cards } = body;

      if (!match_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Match ID manquant" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await supabase.from("player_match_stats").insert({
        match_id,
        player_id,
        minutes_played: minutes_played || 0,
        goals: goals || 0,
        assists: assists || 0,
        yellow_cards: yellow_cards || 0,
        red_cards: red_cards || 0,
      });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "submit-bowling-stats" && req.method === "POST") {
      const body = await req.json();
      const { match_id, games } = body;

      if (!match_id || !games || !Array.isArray(games) || games.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Données manquantes" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert each game as a competition_round
      for (const game of games) {
        const { error: roundError } = await supabase.from("competition_rounds").insert({
          match_id,
          player_id,
          round_number: game.gameNumber,
          result: "completed",
        });

        if (roundError) throw roundError;

        // Get the inserted round ID
        const { data: insertedRound } = await supabase
          .from("competition_rounds")
          .select("id")
          .eq("match_id", match_id)
          .eq("player_id", player_id)
          .eq("round_number", game.gameNumber)
          .single();

        if (insertedRound) {
          // Insert stats for this round
          const { error: statsError } = await supabase.from("competition_round_stats").insert({
            round_id: insertedRound.id,
            stat_data: {
              gameScore: game.score,
              strikes: game.strikes,
              spares: game.spares,
              splitCount: game.splitCount,
              splitConverted: game.splitConverted,
              splitOnLastThrow: game.splitOnLastThrow,
              singlePinCount: game.singlePinCount,
              singlePinConverted: game.singlePinConverted,
              pocketCount: game.pocketCount,
              strikePercentage: game.strikePercentage,
              sparePercentage: game.sparePercentage,
              splitPercentage: game.splitPercentage,
              singlePinPercentage: game.singlePinPercentage,
              singlePinConversionRate: game.singlePinConversionRate,
              pocketPercentage: game.pocketPercentage,
              openFrames: game.openFrames,
            },
          });

          if (statsError) throw statsError;
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Action non reconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
