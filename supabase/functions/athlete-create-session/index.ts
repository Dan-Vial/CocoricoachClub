import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return json({ success: false, error: "Méthode non autorisée" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: "Configuration backend manquante" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

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
      exercises,
    } = body ?? {};

    if (!category_id || !player_id || !session_date || !training_type) {
      return json({ success: false, error: "Données manquantes" }, 400);
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", player_id)
      .eq("category_id", category_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) {
      return json({ success: false, error: "Accès refusé pour ce joueur" }, 403);
    }

    const parsedIntensity =
      typeof intensity === "number"
        ? intensity
        : typeof intensity === "string" && intensity.trim() !== ""
          ? Number(intensity)
          : null;

    const { data: session, error: sessionError } = await supabase
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

    if (sessionError) throw sessionError;

    // Insert session blocks
    const blockRecords = Array.isArray(session_blocks)
      ? session_blocks
          .filter((block) => block?.training_type)
          .map((block, idx) => ({
            training_session_id: session.id,
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

      if (blocksError) {
        await supabase.from("training_sessions").delete().eq("id", session.id);
        throw blocksError;
      }
    }

    // Insert exercises
    const exerciseRecords = Array.isArray(exercises)
      ? exercises
          .filter((ex) => ex?.exercise_name?.trim())
          .map((ex, idx) => ({
            training_session_id: session.id,
            player_id,
            category_id,
            exercise_name: ex.exercise_name,
            exercise_category: ex.exercise_category || "autre",
            sets: ex.sets ?? 3,
            reps: ex.reps ?? null,
            weight_kg: ex.weight_kg ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            notes: ex.notes || null,
            order_index: idx,
            library_exercise_id: ex.library_exercise_id || null,
          }))
      : [];

    if (exerciseRecords.length > 0) {
      const { error: exercisesError } = await supabase
        .from("gym_session_exercises")
        .insert(exerciseRecords);

      if (exercisesError) {
        // Cleanup on failure
        await supabase.from("training_session_blocks").delete().eq("training_session_id", session.id);
        await supabase.from("training_sessions").delete().eq("id", session.id);
        throw exercisesError;
      }
    }

    return json({ success: true, session_id: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return json({ success: false, error: message }, 500);
  }
});
