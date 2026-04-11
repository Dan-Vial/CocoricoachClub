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

  const respond = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return respond({ success: false, error: "Méthode non autorisée" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return respond({ success: false, error: "Configuration backend manquante" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!jwt) {
      return respond({ success: false, error: "Authentification requise" });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    const userId = userData.user?.id;

    if (userError || !userId) {
      return respond({ success: false, error: "Session invalide" });
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
      return respond({ success: false, error: "Données manquantes" });
    }

    // Check player access: athlete owns the player OR staff/admin has category access
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, user_id")
      .eq("id", player_id)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) {
      return respond({ success: false, error: "Joueur introuvable" });
    }

    // If the logged-in user is NOT the player owner, check if they have staff access
    if (player.user_id !== userId) {
      const { data: hasAccess } = await supabase.rpc("can_access_category", {
        _user_id: userId,
        _category_id: category_id,
      });
      const { data: isSA } = await supabase.rpc("is_super_admin", {
        _user_id: userId,
      });
      if (!hasAccess && !isSA) {
        return respond({ success: false, error: "Accès refusé pour ce joueur" });
      }
    }

    // Verify player has access to this category (primary or via player_categories)
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
        return respond({ success: false, error: "Accès refusé pour cette catégorie" });
      }
    }

    const rawIntensity =
      typeof intensity === "number"
        ? intensity
        : typeof intensity === "string" && intensity.trim() !== ""
          ? Number(intensity)
          : null;
    const parsedIntensity = rawIntensity !== null && !Number.isNaN(rawIntensity) && rawIntensity >= 1 && rawIntensity <= 10 ? rawIntensity : null;

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
            bowling_exercise_type: block.bowling_exercise_type || null,
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
            sets: typeof ex.sets === "number" ? ex.sets : (parseInt(ex.sets) || 3),
            reps: ex.reps != null ? (typeof ex.reps === "number" ? ex.reps : (parseInt(ex.reps) || null)) : null,
            weight_kg: ex.weight_kg != null ? Number(ex.weight_kg) || null : null,
            rest_seconds: ex.rest_seconds != null ? (typeof ex.rest_seconds === "number" ? ex.rest_seconds : (parseInt(ex.rest_seconds) || null)) : null,
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

    return respond({ success: true, session_id: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[athlete-create-session] Error:", message);
    return respond({ success: false, error: message });
  }
});
