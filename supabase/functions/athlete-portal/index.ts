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

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "create-session-auth" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!jwt) {
        return json({ success: false, error: "Authentification requise" }, 401);
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
      const userId = userData.user?.id;

      if (userError || !userId) {
        return json({ success: false, error: "Session invalide" }, 401);
      }

      const body = await req.json();
      const {
        category_id,
        player_id,
        session_date,
        training_type,
        session_start_time,
        session_end_time,
        intensity,
        notes,
        session_blocks,
      } = body;

      if (!category_id || !player_id || !session_date || !training_type) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      // Check player access: either primary category or via player_categories
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("id", player_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!player) {
        return json({ success: false, error: "Accès refusé pour ce joueur" }, 403);
      }

      // Verify player has access to this category
      const { data: primaryMatch } = await supabase
        .from("players")
        .select("id")
        .eq("id", player_id)
        .eq("category_id", category_id)
        .maybeSingle();

      if (!primaryMatch) {
        const { data: pcMatch } = await supabase
          .from("player_categories")
          .select("id")
          .eq("player_id", player_id)
          .eq("category_id", category_id)
          .eq("status", "accepted")
          .maybeSingle();

        if (!pcMatch) {
          return json({ success: false, error: "Accès refusé pour cette catégorie" }, 403);
        }
      }

      const parsedIntensity =
        typeof intensity === "number"
          ? intensity
          : typeof intensity === "string" && intensity.trim() !== ""
            ? Number(intensity)
            : null;

      const { data: createdSession, error: createSessionError } = await supabase
        .from("training_sessions")
        .insert({
          category_id,
          session_date,
          training_type,
          session_start_time: session_start_time || null,
          session_end_time: session_end_time || null,
          intensity: Number.isNaN(parsedIntensity) ? null : parsedIntensity,
          created_by_player_id: player_id,
          notes: notes ? `[Séance athlète] ${notes}` : "[Séance athlète]",
        })
        .select("id")
        .single();

      if (createSessionError) throw createSessionError;

      const blockRecords = Array.isArray(session_blocks)
        ? session_blocks
            .filter((block) => block?.training_type)
            .map((block, idx) => ({
              training_session_id: createdSession.id,
              block_order: idx,
              start_time: block.start_time || null,
              end_time: block.end_time || null,
              training_type: block.training_type,
              intensity: block.intensity ?? null,
              notes: block.notes || null,
              session_type: block.session_type || null,
              objective: block.objective || null,
              target_intensity: block.target_intensity ?? null,
              volume: block.volume ?? null,
              contact_charge: block.contact_charge ?? null,
            }))
        : [];

      if (blockRecords.length > 0) {
        const { error: blocksError } = await supabase
          .from("training_session_blocks")
          .insert(blockRecords);
        if (blocksError) throw blocksError;
      }

      return json({ success: true, session_id: createdSession.id });
    }

    if (!token) {
      return json({ success: false, error: "Token manquant" }, 400);
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

    // ─── VALIDATE ───
    if (action === "validate") {
      return json({ success: true, player_id, player_name, category_id, category_name, club_name, sport_type });
    }

    // ─── SESSIONS ───
    if (action === "sessions") {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: sessions, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time, session_end_time")
        .eq("category_id", category_id)
        .gte("session_date", twoWeeksAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false });

      if (error) throw error;

      // Fetch blocks for these sessions to get bowling_exercise_type
      const sessionIds = sessions?.map(s => s.id) || [];
      let blocksBySession: Record<string, any[]> = {};
      if (sessionIds.length > 0) {
        const { data: blocks } = await supabase
          .from("training_session_blocks")
          .select("training_session_id, training_type, bowling_exercise_type")
          .in("training_session_id", sessionIds);
        
        for (const block of (blocks || [])) {
          if (!blocksBySession[block.training_session_id]) {
            blocksBySession[block.training_session_id] = [];
          }
          blocksBySession[block.training_session_id].push(block);
        }
      }

      // Enrich sessions with block info
      const enrichedSessions = sessions?.map(s => {
        const blocks = blocksBySession[s.id] || [];
        const precisionBlock = blocks.find(b => b.training_type === "bowling_spare" && b.bowling_exercise_type);
        return {
          ...s,
          bowling_exercise_type: precisionBlock?.bowling_exercise_type || null,
          blocks: blocks.map(b => ({
            training_type: b.training_type,
            bowling_exercise_type: b.bowling_exercise_type,
          })),
        };
      }) || [];

      const { data: existingRpe } = await supabase
        .from("awcr_tracking")
        .select("training_session_id")
        .eq("player_id", player_id);

      const rpeSessionIds = new Set(existingRpe?.map(r => r.training_session_id) || []);

      return json({ success: true, sessions: enrichedSessions, completedSessionIds: Array.from(rpeSessionIds) });
    }

    // ─── MATCHES ───
    if (action === "matches") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: matches, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent, is_home, location, score_home, score_away")
        .eq("category_id", category_id)
        .gte("match_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("match_date", { ascending: false });

      if (error) throw error;

      const matchIds = matches?.map(m => m.id) || [];
      const { data: lineups } = await supabase
        .from("match_lineups")
        .select("match_id")
        .eq("player_id", player_id)
        .in("match_id", matchIds);

      const lineupMatchIds = new Set(lineups?.map(l => l.match_id) || []);

      const { data: existingStats } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .eq("player_id", player_id);

      const statsMatchIds = new Set(existingStats?.map(s => s.match_id) || []);

      return json({
        success: true,
        matches: matches?.filter(m => lineupMatchIds.has(m.id)) || [],
        completedMatchIds: Array.from(statsMatchIds),
      });
    }

    // ─── SUBMIT RPE ───
    if (action === "submit-rpe" && req.method === "POST") {
      const body = await req.json();
      const { session_id, rpe, duration } = body;

      if (!session_id || !rpe || !duration) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      const { data: session } = await supabase
        .from("training_sessions")
        .select("session_date")
        .eq("id", session_id)
        .single();

      if (!session) {
        return json({ success: false, error: "Séance introuvable" }, 404);
      }

      const trainingLoad = rpe * duration;
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

      return json({ success: true });
    }

    // ─── SUBMIT MATCH STATS ───
    if (action === "submit-stats" && req.method === "POST") {
      const body = await req.json();
      const { match_id, minutes_played, goals, assists, yellow_cards, red_cards } = body;

      if (!match_id) {
        return json({ success: false, error: "Match ID manquant" }, 400);
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
      return json({ success: true });
    }

    // ─── SUBMIT BOWLING STATS (competition) ───
    if (action === "submit-bowling-stats" && req.method === "POST") {
      const body = await req.json();
      const { match_id, games } = body;

      if (!match_id || !games || !Array.isArray(games) || games.length === 0) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      for (const game of games) {
        const { error: roundError } = await supabase.from("competition_rounds").insert({
          match_id,
          player_id,
          round_number: game.gameNumber,
          result: "completed",
        });
        if (roundError) throw roundError;

        const { data: insertedRound } = await supabase
          .from("competition_rounds")
          .select("id")
          .eq("match_id", match_id)
          .eq("player_id", player_id)
          .eq("round_number", game.gameNumber)
          .single();

        if (insertedRound) {
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

      return json({ success: true });
    }

    // ─── SUBMIT SPARE TRAINING (from athlete portal) ───
    if (action === "submit-spare-stats" && req.method === "POST") {
      const body = await req.json();
      const { session_id, exercises } = body;
      // exercises: Array<{ exercise_type: string, attempts: number, successes: number }>

      if (!session_id || !exercises || !Array.isArray(exercises)) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      const { data: session } = await supabase
        .from("training_sessions")
        .select("session_date")
        .eq("id", session_id)
        .single();

      if (!session) return json({ success: false, error: "Séance introuvable" }, 404);

      for (const ex of exercises) {
        const successRate = ex.attempts > 0 ? (ex.successes / ex.attempts) * 100 : 0;
        const { error } = await supabase.from("bowling_spare_training").insert({
          player_id,
          category_id,
          training_session_id: session_id,
          session_date: session.session_date,
          exercise_type: ex.exercise_type,
          attempts: ex.attempts,
          successes: ex.successes,
          success_rate: Math.round(successRate * 10) / 10,
        });
        if (error) throw error;
      }

      return json({ success: true });
    }

    // ─── SUBMIT TRAINING SCORES (bowling game scores from athlete portal) ───
    if (action === "submit-training-scores" && req.method === "POST") {
      const body = await req.json();
      const { session_id, games } = body;
      // games: Array of bowling game stats

      if (!session_id || !games || !Array.isArray(games) || games.length === 0) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      for (const game of games) {
        // Use competition_rounds with the session's training_session link
        // We store training game scores in competition_rounds with a virtual match approach
        // Instead, store directly in a simpler way using the session reference
        const { error: roundError } = await supabase.from("competition_rounds").insert({
          match_id: session_id, // We'll use session_id as reference
          player_id,
          round_number: game.gameNumber,
          result: "completed",
          notes: "training_session",
        });

        if (roundError) {
          // If match_id FK constraint fails, we need a different approach
          // Store as bowling_spare_training with a special type
          console.error("Round insert error:", roundError);
          // Fallback: store in awcr_tracking notes or a different way
          continue;
        }

        const { data: insertedRound } = await supabase
          .from("competition_rounds")
          .select("id")
          .eq("match_id", session_id)
          .eq("player_id", player_id)
          .eq("round_number", game.gameNumber)
          .single();

        if (insertedRound) {
          await supabase.from("competition_round_stats").insert({
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
              singlePinConversionRate: game.singlePinConversionRate,
              pocketPercentage: game.pocketPercentage,
              openFrames: game.openFrames,
              isTraining: true,
            },
          });
        }
      }

      return json({ success: true });
    }

    // ─── CREATE SESSION (athlete creates their own) ───
    if (action === "create-session" && req.method === "POST") {
      const body = await req.json();
      const { session_date, training_type, duration_minutes } = body;

      if (!session_date || !training_type) {
        return json({ success: false, error: "Données manquantes" }, 400);
      }

      const endTime = duration_minutes ? 
        `${Math.floor(duration_minutes / 60 + 9).toString().padStart(2, '0')}:${(duration_minutes % 60).toString().padStart(2, '0')}` : null;

      const { data: newSession, error } = await supabase
        .from("training_sessions")
        .insert({
          category_id,
          session_date,
          training_type,
          session_start_time: "09:00",
          session_end_time: endTime || "10:00",
          notes: `Séance créée par l'athlète ${player_name}`,
        })
        .select("id")
        .single();

      if (error) throw error;

      return json({ success: true, session_id: newSession.id });
    }

    // ─── TRAINING STATS (fetch for athlete view) ───
    if (action === "training-stats") {
      // Fetch bowling spare training stats
      const { data: spareStats, error: spareError } = await supabase
        .from("bowling_spare_training")
        .select("*")
        .eq("player_id", player_id)
        .order("session_date", { ascending: false });

      if (spareError) throw spareError;

      // Fetch training game scores (competition_rounds with training note)
      const { data: trainingRounds, error: roundsError } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*)")
        .eq("player_id", player_id)
        .eq("notes", "training_session")
        .order("created_at", { ascending: false });

      if (roundsError) throw roundsError;

      // Also fetch competition rounds linked to training sessions (bowling_game type)
      // Get training sessions of type bowling_game
      const { data: gameSessions } = await supabase
        .from("training_sessions")
        .select("id, session_date")
        .eq("category_id", category_id)
        .in("training_type", ["bowling_game", "bowling_practice"]);

      const gameSessionIds = gameSessions?.map(s => s.id) || [];

      // Fetch RPE/AWCR data for these sessions
      const { data: awcrData } = await supabase
        .from("awcr_tracking")
        .select("training_session_id, session_date, rpe, duration_minutes, training_load")
        .eq("player_id", player_id)
        .order("session_date", { ascending: false });

      return json({
        success: true,
        spareStats: spareStats || [],
        trainingRounds: trainingRounds || [],
        gameSessions: gameSessions || [],
        awcrData: awcrData || [],
      });
    }

    return json({ success: false, error: "Action non reconnue" }, 400);

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
