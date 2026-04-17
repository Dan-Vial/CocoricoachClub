import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Deterministic injury risk scoring (NO AI)
// ----------------------------------------------------------------------------
// Weighted multi-factor model based on sports science literature:
//  - EWMA Acute:Chronic Workload Ratio (ACWR): danger zone <0.8 or >1.5
//  - Wellness (sleep, fatigue, stress, soreness, specific pain)
//  - Recent injury history (recency + severity recurrence risk)
//  - Training profile (intensity, contact, volume)
// Total score 0-100 → risk_level mapping
// ============================================================================

type Wellness = {
  sleep_quality: number | null;
  sleep_duration: number | null;
  general_fatigue: number | null;
  stress_level: number | null;
  soreness_upper_body: number | null;
  soreness_lower_body: number | null;
  has_specific_pain: boolean | null;
  pain_location: string | null;
};

type Awcr = {
  player_id: string;
  session_date: string;
  awcr: number | null;
  training_load: number | null;
  acute_load: number | null;
  chronic_load: number | null;
  rpe: number | null;
  duration_minutes: number | null;
  training_session_id: string | null;
};

type Injury = {
  player_id: string;
  injury_type: string;
  severity: string | null;
  injury_date: string;
  status: string | null;
};

type Block = {
  training_session_id: string;
  session_type: string | null;
  objective: string | null;
  target_intensity: string | null;
  volume: string | null;
  contact_charge: string | null;
  intensity: string | null;
};

const LAMBDA_ACUTE = 2 / (7 + 1);
const LAMBDA_CHRONIC = 2 / (28 + 1);

function calculatePlayerEWMA(entries: Awcr[]) {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.session_date.localeCompare(b.session_date));
  let acute = 0;
  let chronic = 0;
  sorted.forEach((entry, i) => {
    const load = entry.training_load || ((entry.rpe ?? 0) * (entry.duration_minutes ?? 0)) || 0;
    if (i === 0) {
      acute = load;
      chronic = load;
    } else {
      acute = LAMBDA_ACUTE * load + (1 - LAMBDA_ACUTE) * acute;
      chronic = LAMBDA_CHRONIC * load + (1 - LAMBDA_CHRONIC) * chronic;
    }
  });
  const ratio = chronic > 0 ? acute / chronic : 0;
  return {
    acute: Math.round(acute * 100) / 100,
    chronic: Math.round(chronic * 100) / 100,
    ratio: Math.round(ratio * 100) / 100,
  };
}

/** Score the EWMA ratio (0-30 points) */
function scoreEwmaRatio(ratio: number | null): { score: number; factor?: string } {
  if (ratio === null || ratio === 0) return { score: 0 };
  if (ratio >= 1.5) return { score: 30, factor: `Charge aiguë très excessive (ratio ${ratio.toFixed(2)} ≥ 1.5)` };
  if (ratio >= 1.3) return { score: 20, factor: `Charge aiguë élevée (ratio ${ratio.toFixed(2)})` };
  if (ratio < 0.8) return { score: 25, factor: `Sous-charge marquée (ratio ${ratio.toFixed(2)} < 0.8) — risque de désentraînement` };
  if (ratio < 0.85) return { score: 12, factor: `Sous-charge légère (ratio ${ratio.toFixed(2)})` };
  return { score: 0 };
}

/** Score wellness factors (0-30 points) */
function scoreWellness(w: Wellness | null): { score: number; factors: string[] } {
  if (!w) return { score: 0, factors: [] };
  let score = 0;
  const factors: string[] = [];

  // Fatigue (1=excellent, 5=très fatigué)
  if (w.general_fatigue !== null) {
    if (w.general_fatigue >= 5) { score += 8; factors.push("Fatigue très élevée (5/5)"); }
    else if (w.general_fatigue >= 4) { score += 5; factors.push("Fatigue élevée (4/5)"); }
  }

  // Sleep quality (1=très mauvais, 5=excellent)
  if (w.sleep_quality !== null && w.sleep_quality <= 2) {
    score += 6;
    factors.push(`Qualité de sommeil insuffisante (${w.sleep_quality}/5)`);
  }
  if (w.sleep_duration !== null && w.sleep_duration < 6) {
    score += 4;
    factors.push(`Durée de sommeil insuffisante (${w.sleep_duration}h)`);
  }

  // Stress (1=zen, 5=stressé)
  if (w.stress_level !== null && w.stress_level >= 4) {
    score += 4;
    factors.push(`Stress élevé (${w.stress_level}/5)`);
  }

  // Soreness
  const soreUpper = w.soreness_upper_body ?? 0;
  const soreLower = w.soreness_lower_body ?? 0;
  if (soreUpper >= 4 || soreLower >= 4) {
    score += 6;
    factors.push(`Courbatures importantes (haut: ${soreUpper}/5, bas: ${soreLower}/5)`);
  } else if (soreUpper >= 3 || soreLower >= 3) {
    score += 3;
    factors.push("Courbatures modérées");
  }

  // Specific pain = strong signal
  if (w.has_specific_pain) {
    score += 8;
    factors.push(`Douleur localisée signalée${w.pain_location ? ` (${w.pain_location})` : ""}`);
  }

  return { score: Math.min(score, 30), factors };
}

/** Score injury history (0-25 points) */
function scoreInjuryHistory(injuries: Injury[]): { score: number; factors: string[] } {
  if (injuries.length === 0) return { score: 0, factors: [] };
  let score = 0;
  const factors: string[] = [];
  const now = Date.now();

  const active = injuries.filter(i => i.status === "active");
  const recovering = injuries.filter(i => i.status === "recovering");

  if (active.length > 0) {
    score += 20;
    factors.push(`${active.length} blessure(s) active(s) en cours`);
  }
  if (recovering.length > 0) {
    score += 12;
    factors.push(`${recovering.length} blessure(s) en réathlétisation`);
  }

  // Recent healed injuries (recurrence risk)
  const recentHealed = injuries.filter(i => {
    if (i.status !== "healed") return false;
    const daysAgo = (now - new Date(i.injury_date).getTime()) / (1000 * 60 * 60 * 86400 * 0 + 1000 * 60 * 60 * 24);
    return daysAgo <= 90;
  });
  if (recentHealed.length > 0) {
    score += Math.min(recentHealed.length * 4, 10);
    factors.push(`${recentHealed.length} blessure(s) récente(s) guérie(s) (< 90 jours)`);
  }

  // Severe injuries history
  const severe = injuries.filter(i => i.severity === "severe" || i.severity === "grave");
  if (severe.length > 0) {
    score += 5;
    factors.push(`Antécédent(s) de blessure grave (${severe.length})`);
  }

  return { score: Math.min(score, 25), factors };
}

/** Score training profile (0-15 points) */
function scoreTrainingProfile(blocks: Block[]): { score: number; factors: string[] } {
  if (blocks.length === 0) return { score: 0, factors: [] };
  let score = 0;
  const factors: string[] = [];

  const intensityMap: Record<string, number> = { faible: 1, moderee: 2, elevee: 3, tres_elevee: 4 };
  const contactMap: Record<string, number> = { aucun: 0, faible: 1, modere: 2, eleve: 3 };

  const highIntensity = blocks.filter(b => (intensityMap[b.target_intensity || ""] || 0) >= 3).length;
  const highContact = blocks.filter(b => (contactMap[b.contact_charge || ""] || 0) >= 2).length;

  if (highIntensity >= 6) {
    score += 8;
    factors.push(`${highIntensity} séances haute intensité sur 28 jours (usure élevée)`);
  } else if (highIntensity >= 4) {
    score += 4;
    factors.push(`${highIntensity} séances haute intensité (vigilance)`);
  }

  if (highContact >= 5) {
    score += 7;
    factors.push(`${highContact} séances à fort contact (risque de blessure traumatique)`);
  } else if (highContact >= 3) {
    score += 3;
    factors.push(`${highContact} séances à charge contact modérée`);
  }

  return { score: Math.min(score, 15), factors };
}

function levelFromScore(score: number): "critique" | "élevé" | "modéré" | "faible" {
  if (score >= 70) return "critique";
  if (score >= 50) return "élevé";
  if (score >= 25) return "modéré";
  return "faible";
}

function buildRecommendations(opts: {
  ewmaRatio: number | null;
  wellness: Wellness | null;
  hasActiveInjury: boolean;
  level: "critique" | "élevé" | "modéré" | "faible";
}): string[] {
  const recs: string[] = [];
  const { ewmaRatio, wellness, hasActiveInjury, level } = opts;

  if (level === "critique") {
    recs.push("Réduire immédiatement la charge d'entraînement (-30 à -50% sur 7 jours)");
    recs.push("Consultation médicale recommandée avant la prochaine séance intense");
  } else if (level === "élevé") {
    recs.push("Réduire la charge d'entraînement de 15-25% sur 5-7 jours");
    recs.push("Privilégier la récupération active et le travail technique");
  }

  if (ewmaRatio !== null) {
    if (ewmaRatio >= 1.5) recs.push("Pic de charge aiguë détecté — éviter toute séance haute intensité ou contact 48-72h");
    else if (ewmaRatio >= 1.3) recs.push("Surveiller la progression de charge — éviter de cumuler intensité et volume");
    else if (ewmaRatio < 0.8) recs.push("Reprendre progressivement la charge pour éviter la déconditioning");
  }

  if (wellness) {
    if ((wellness.general_fatigue ?? 0) >= 4) recs.push("Programmer une journée de récupération complète");
    if ((wellness.sleep_quality ?? 5) <= 2 || (wellness.sleep_duration ?? 8) < 6) {
      recs.push("Prioriser l'hygiène de sommeil (objectif 8h+, sommeil de qualité)");
    }
    if (wellness.has_specific_pain) {
      recs.push(`Évaluation médicale ciblée${wellness.pain_location ? ` sur ${wellness.pain_location}` : ""} avant retour`);
    }
    if ((wellness.soreness_lower_body ?? 0) >= 4 || (wellness.soreness_upper_body ?? 0) >= 4) {
      recs.push("Travail de récupération musculaire (massage, étirements, contraste chaud/froid)");
    }
  }

  if (hasActiveInjury) {
    recs.push("Suivre rigoureusement le protocole de réathlétisation en cours");
  }

  if (recs.length === 0) {
    recs.push("Maintenir la charge actuelle et continuer le suivi quotidien");
  }
  return recs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { categoryId } = await req.json();
    if (!categoryId) {
      return new Response(JSON.stringify({ error: "categoryId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access via RLS
    const { data: category, error: categoryError } = await userClient
      .from("categories")
      .select("id, club_id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return new Response(JSON.stringify({ error: "Access denied to this category" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role for data queries (authorization confirmed)
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name")
      .eq("category_id", categoryId);
    if (playersError) throw playersError;

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const sinceDate = fourWeeksAgo.toISOString().split("T")[0];

    const { data: awcrData } = await supabase
      .from("awcr_tracking")
      .select("player_id, session_date, awcr, training_load, acute_load, chronic_load, rpe, duration_minutes, training_session_id")
      .eq("category_id", categoryId)
      .gte("session_date", sinceDate)
      .order("session_date", { ascending: true });

    const { data: wellnessData } = await supabase
      .from("wellness_tracking")
      .select("player_id, tracking_date, sleep_quality, sleep_duration, general_fatigue, stress_level, soreness_upper_body, soreness_lower_body, has_specific_pain, pain_location")
      .eq("category_id", categoryId)
      .gte("tracking_date", sinceDate)
      .order("tracking_date", { ascending: false });

    const { data: injuries } = await supabase
      .from("injuries")
      .select("player_id, injury_type, severity, injury_date, status")
      .eq("category_id", categoryId);

    const sessionIds = (awcrData || []).map(a => a.training_session_id).filter(Boolean) as string[];
    let blocksData: Block[] = [];
    if (sessionIds.length > 0) {
      const { data: blocks } = await supabase
        .from("training_session_blocks")
        .select("training_session_id, session_type, objective, target_intensity, volume, contact_charge, intensity")
        .in("training_session_id", sessionIds);
      if (blocks) blocksData = blocks as Block[];
    }

    // ===== Compute predictions for each player (deterministic) =====
    const predictions = (players || []).map(player => {
      const playerAwcr = (awcrData || []).filter(a => a.player_id === player.id) as Awcr[];
      const playerWellness = (wellnessData || []).filter(w => w.player_id === player.id);
      const playerInjuries = (injuries || []).filter(i => i.player_id === player.id) as Injury[];
      const playerSessionIds = playerAwcr.map(a => a.training_session_id).filter(Boolean) as string[];
      const playerBlocks = blocksData.filter(b => playerSessionIds.includes(b.training_session_id));

      const ewma = calculatePlayerEWMA(playerAwcr);
      const latestWellness = (playerWellness[0] as Wellness | undefined) ?? null;

      const ewmaScore = scoreEwmaRatio(ewma?.ratio ?? null);
      const wellnessScore = scoreWellness(latestWellness);
      const historyScore = scoreInjuryHistory(playerInjuries);
      const profileScore = scoreTrainingProfile(playerBlocks);

      const totalRaw = ewmaScore.score + wellnessScore.score + historyScore.score + profileScore.score;
      const risk_score = Math.min(100, Math.round(totalRaw));
      const risk_level = levelFromScore(risk_score);

      const risk_factors: string[] = [];
      if (ewmaScore.factor) risk_factors.push(ewmaScore.factor);
      risk_factors.push(...wellnessScore.factors);
      risk_factors.push(...historyScore.factors);
      risk_factors.push(...profileScore.factors);

      const hasActiveInjury = playerInjuries.some(i => i.status === "active");
      const recommendations = buildRecommendations({
        ewmaRatio: ewma?.ratio ?? null,
        wellness: latestWellness,
        hasActiveInjury,
        level: risk_level,
      });

      return {
        player_id: player.id,
        player_name: player.name,
        risk_level,
        risk_score,
        risk_factors,
        recommendations,
      };
    });

    // ===== Global insights =====
    const high_risk_count = predictions.filter(p => p.risk_level === "critique" || p.risk_level === "élevé").length;
    const main_concerns: string[] = [];
    const factorCounts: Record<string, number> = {};
    predictions.forEach(p => p.risk_factors.forEach(f => {
      // Group factors by their key part (first few words)
      const key = f.split(" ").slice(0, 4).join(" ");
      factorCounts[key] = (factorCounts[key] || 0) + 1;
    }));
    Object.entries(factorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([k, n]) => main_concerns.push(`${k} (${n} joueur${n > 1 ? "s" : ""})`));

    const team_recommendations: string[] = [];
    if (high_risk_count >= Math.max(2, Math.floor(predictions.length * 0.3))) {
      team_recommendations.push("Nombre élevé de joueurs à risque — revoir la planification de charge collective");
    }
    if (high_risk_count > 0) {
      team_recommendations.push("Renforcer les routines de récupération (sommeil, nutrition, soins)");
    } else {
      team_recommendations.push("Maintenir la stratégie de planification actuelle");
    }

    return new Response(
      JSON.stringify({
        predictions,
        global_insights: {
          high_risk_count,
          main_concerns,
          team_recommendations,
        },
        engine: "deterministic-v1",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("predict-injuries error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
