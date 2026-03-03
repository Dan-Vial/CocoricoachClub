import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract authorization header and verify user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT to check permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { categoryId } = await req.json();
    
    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: "categoryId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing injury risks for category:", categoryId, "user:", user.id);

    // Verify user has access to this category using user's RLS permissions
    const { data: category, error: categoryError } = await userClient
      .from("categories")
      .select("id, club_id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      console.error("Category access denied:", categoryError);
      return new Response(
        JSON.stringify({ error: "Access denied to this category" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} authorized for category ${categoryId}`);

    // Use service role for data queries (now that authorization is confirmed)
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .eq('category_id', categoryId);

    if (playersError) throw playersError;
    console.log(`Found ${players?.length || 0} players`);

    // Fetch recent AWCR data (last 28 days for EWMA calculation)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const { data: awcrData, error: awcrError } = await supabase
      .from('awcr_tracking')
      .select('player_id, session_date, awcr, training_load, acute_load, chronic_load, rpe, duration_minutes')
      .eq('category_id', categoryId)
      .gte('session_date', fourWeeksAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: true });

    if (awcrError) throw awcrError;
    console.log(`Found ${awcrData?.length || 0} AWCR records`);

    // Fetch recent wellness data
    const { data: wellnessData, error: wellnessError } = await supabase
      .from('wellness_tracking')
      .select('player_id, tracking_date, sleep_quality, sleep_duration, general_fatigue, stress_level, soreness_upper_body, soreness_lower_body, has_specific_pain, pain_location')
      .eq('category_id', categoryId)
      .gte('tracking_date', fourWeeksAgo.toISOString().split('T')[0])
      .order('tracking_date', { ascending: false });

    if (wellnessError) throw wellnessError;
    console.log(`Found ${wellnessData?.length || 0} wellness records`);

    // Fetch injury history
    const { data: injuries, error: injuriesError } = await supabase
      .from('injuries')
      .select('player_id, injury_type, severity, injury_date, status')
      .eq('category_id', categoryId);

    if (injuriesError) throw injuriesError;
    console.log(`Found ${injuries?.length || 0} injury records`);

    // Fetch training session blocks (session_type, objective, intensity, volume, contact)
    const sessionIds = (awcrData || []).map(a => a.training_session_id).filter(Boolean);
    let blocksData: any[] = [];
    if (sessionIds.length > 0) {
      const { data: blocks, error: blocksError } = await supabase
        .from('training_session_blocks')
        .select('training_session_id, session_type, objective, target_intensity, volume, contact_charge, intensity')
        .in('training_session_id', sessionIds);
      if (!blocksError && blocks) blocksData = blocks;
    }
    console.log(`Found ${blocksData.length} block records`);

    // Calculate EWMA for each player
    const LAMBDA_ACUTE = 2 / (7 + 1);
    const LAMBDA_CHRONIC = 2 / (28 + 1);

    function calculatePlayerEWMA(playerEntries: any[]) {
      if (playerEntries.length === 0) return null;
      const sorted = [...playerEntries].sort((a, b) => a.session_date.localeCompare(b.session_date));
      let ewmaAcute = 0;
      let ewmaChronic = 0;
      sorted.forEach((entry, i) => {
        const load = entry.training_load || (entry.rpe * entry.duration_minutes) || 0;
        if (i === 0) {
          ewmaAcute = load;
          ewmaChronic = load;
        } else {
          ewmaAcute = LAMBDA_ACUTE * load + (1 - LAMBDA_ACUTE) * ewmaAcute;
          ewmaChronic = LAMBDA_CHRONIC * load + (1 - LAMBDA_CHRONIC) * ewmaChronic;
        }
      });
      const ratio = ewmaChronic > 0 ? ewmaAcute / ewmaChronic : 0;
      return { acute: Math.round(ewmaAcute * 100) / 100, chronic: Math.round(ewmaChronic * 100) / 100, ratio: Math.round(ratio * 100) / 100 };
    }

    // Prepare data for AI analysis
    const playerDataSummary = players?.map(player => {
      const playerAwcr = awcrData?.filter(a => a.player_id === player.id) || [];
      const playerWellness = wellnessData?.filter(w => w.player_id === player.id) || [];
      const playerInjuries = injuries?.filter(i => i.player_id === player.id) || [];

      // Get blocks for this player's sessions
      const playerSessionIds = playerAwcr.map(a => a.training_session_id).filter(Boolean);
      const playerBlocks = blocksData.filter(b => playerSessionIds.includes(b.training_session_id));

      const latestAwcr = playerAwcr.length > 0 ? playerAwcr[playerAwcr.length - 1] : null;
      const latestWellness = playerWellness[0];

      const avgAwcr = playerAwcr.length > 0 
        ? playerAwcr.reduce((sum, a) => sum + (a.awcr || 0), 0) / playerAwcr.length 
        : null;
      const avgTrainingLoad = playerAwcr.length > 0
        ? playerAwcr.reduce((sum, a) => sum + (a.training_load || 0), 0) / playerAwcr.length
        : null;

      const ewma = calculatePlayerEWMA(playerAwcr);

      // Aggregate block metrics
      const intensityMap: Record<string, number> = { faible: 1, moderee: 2, elevee: 3, tres_elevee: 4 };
      const contactMap: Record<string, number> = { aucun: 0, faible: 1, modere: 2, eleve: 3 };
      const volumeMap: Record<string, number> = { court: 1, moyen: 2, long: 3 };

      const blockIntensities = playerBlocks.filter(b => b.target_intensity).map(b => intensityMap[b.target_intensity] || 0);
      const blockContacts = playerBlocks.filter(b => b.contact_charge).map(b => contactMap[b.contact_charge] || 0);
      const blockVolumes = playerBlocks.filter(b => b.volume).map(b => volumeMap[b.volume] || 0);

      const sessionTypeCounts: Record<string, number> = {};
      const objectiveCounts: Record<string, number> = {};
      playerBlocks.forEach(b => {
        if (b.session_type) sessionTypeCounts[b.session_type] = (sessionTypeCounts[b.session_type] || 0) + 1;
        if (b.objective) objectiveCounts[b.objective] = (objectiveCounts[b.objective] || 0) + 1;
      });

      return {
        name: player.name,
        id: player.id,
        ewma: ewma ? {
          acute: ewma.acute,
          chronic: ewma.chronic,
          ratio: ewma.ratio,
          risk: ewma.ratio > 1.5 || ewma.ratio < 0.8 ? "danger" : ewma.ratio > 1.3 || ewma.ratio < 0.85 ? "warning" : "optimal"
        } : null,
        awcr: {
          latest: latestAwcr?.awcr,
          average: avgAwcr?.toFixed(2),
          acute_load: latestAwcr?.acute_load,
          chronic_load: latestAwcr?.chronic_load,
          training_load_avg: avgTrainingLoad?.toFixed(0)
        },
        training_profile: {
          avg_intensity: blockIntensities.length > 0 ? (blockIntensities.reduce((a,b) => a+b, 0) / blockIntensities.length).toFixed(1) : null,
          avg_contact_charge: blockContacts.length > 0 ? (blockContacts.reduce((a,b) => a+b, 0) / blockContacts.length).toFixed(1) : null,
          avg_volume: blockVolumes.length > 0 ? (blockVolumes.reduce((a,b) => a+b, 0) / blockVolumes.length).toFixed(1) : null,
          dominant_session_types: Object.entries(sessionTypeCounts).sort((a,b) => b[1]-a[1]).map(([t]) => t),
          dominant_objectives: Object.entries(objectiveCounts).sort((a,b) => b[1]-a[1]).map(([o]) => o),
          total_blocks: playerBlocks.length,
          high_contact_sessions: blockContacts.filter(c => c >= 2).length,
          high_intensity_sessions: blockIntensities.filter(i => i >= 3).length,
        },
        wellness: latestWellness ? {
          sleep_quality: latestWellness.sleep_quality,
          sleep_duration: latestWellness.sleep_duration,
          fatigue: latestWellness.general_fatigue,
          stress: latestWellness.stress_level,
          soreness_upper: latestWellness.soreness_upper_body,
          soreness_lower: latestWellness.soreness_lower_body,
          has_pain: latestWellness.has_specific_pain,
          pain_location: latestWellness.pain_location
        } : null,
        injury_history: playerInjuries.map(i => ({
          type: i.injury_type,
          severity: i.severity,
          date: i.injury_date,
          status: i.status
        }))
      };
    });

    console.log("Calling Lovable AI for prediction...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en science du sport et en prévention des blessures pour le rugby. 
Analyse les données des joueurs et évalue leur risque de blessure.

Pour chaque joueur, fournis:
1. Un niveau de risque: "critique" (>80%), "élevé" (60-80%), "modéré" (30-60%), ou "faible" (<30%)
2. Un score de risque en pourcentage (0-100)
3. Les facteurs de risque identifiés
4. Des recommandations personnalisées

Critères d'évaluation:
- EWMA ratio > 1.3 ou < 0.85 = vigilance, > 1.5 ou < 0.8 = danger
- AWCR > 1.3 ou < 0.8 = risque élevé
- Charge d'entraînement élevée + mauvaise récupération = risque élevé
- Fatigue élevée (>4/5) + douleurs (>3/5) = risque modéré à élevé
- Mauvais sommeil (<6h ou qualité <3/5) = facteur aggravant
- Historique de blessures récentes = facteur aggravant
- PROFIL D'ENTRAÎNEMENT (training_profile):
  - Intensité moyenne élevée (>3/4) combinée à charge aiguë élevée = risque accru
  - Charge contact élevée (>2/3) + douleurs musculaires = risque de blessure de contact
  - Volume moyen élevé (>2/3) + fatigue élevée = surcharge potentielle
  - Nombreuses séances haute intensité (high_intensity_sessions) = usure progressive
  - Nombreuses séances contact (high_contact_sessions) + blessure récente = risque de rechute

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "predictions": [
    {
      "player_id": "uuid",
      "player_name": "string",
      "risk_level": "critique|élevé|modéré|faible",
      "risk_score": number,
      "risk_factors": ["string"],
      "recommendations": ["string"]
    }
  ],
  "global_insights": {
    "high_risk_count": number,
    "main_concerns": ["string"],
    "team_recommendations": ["string"]
  }
}`
          },
          {
            role: "user",
            content: `Analyse les données suivantes pour prédire les risques de blessure:\n\n${JSON.stringify(playerDataSummary, null, 2)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques minutes." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants, veuillez recharger votre compte." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;
    console.log("AI response received");

    // Parse the JSON response
    let predictions;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw AI content:", aiContent);
      throw new Error("Failed to parse AI predictions");
    }

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predict-injuries function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
