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
    const { categoryId } = await req.json();
    console.log("Analyzing injury risks for category:", categoryId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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

    // Fetch recent AWCR data (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const { data: awcrData, error: awcrError } = await supabase
      .from('awcr_tracking')
      .select('player_id, session_date, awcr, training_load, acute_load, chronic_load')
      .eq('category_id', categoryId)
      .gte('session_date', twoWeeksAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: false });

    if (awcrError) throw awcrError;
    console.log(`Found ${awcrData?.length || 0} AWCR records`);

    // Fetch recent wellness data
    const { data: wellnessData, error: wellnessError } = await supabase
      .from('wellness_tracking')
      .select('player_id, tracking_date, sleep_quality, sleep_duration, general_fatigue, stress_level, soreness_upper_body, soreness_lower_body, has_specific_pain, pain_location')
      .eq('category_id', categoryId)
      .gte('tracking_date', twoWeeksAgo.toISOString().split('T')[0])
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

    // Prepare data for AI analysis
    const playerDataSummary = players?.map(player => {
      const playerAwcr = awcrData?.filter(a => a.player_id === player.id) || [];
      const playerWellness = wellnessData?.filter(w => w.player_id === player.id) || [];
      const playerInjuries = injuries?.filter(i => i.player_id === player.id) || [];

      const latestAwcr = playerAwcr[0];
      const latestWellness = playerWellness[0];

      const avgAwcr = playerAwcr.length > 0 
        ? playerAwcr.reduce((sum, a) => sum + (a.awcr || 0), 0) / playerAwcr.length 
        : null;
      const avgTrainingLoad = playerAwcr.length > 0
        ? playerAwcr.reduce((sum, a) => sum + (a.training_load || 0), 0) / playerAwcr.length
        : null;

      return {
        name: player.name,
        id: player.id,
        awcr: {
          latest: latestAwcr?.awcr,
          average: avgAwcr?.toFixed(2),
          acute_load: latestAwcr?.acute_load,
          chronic_load: latestAwcr?.chronic_load,
          training_load_avg: avgTrainingLoad?.toFixed(0)
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
- AWCR > 1.3 ou < 0.8 = risque élevé
- Charge d'entraînement élevée + mauvaise récupération = risque élevé
- Fatigue élevée (>4/5) + douleurs (>3/5) = risque modéré à élevé
- Mauvais sommeil (<6h ou qualité <3/5) = facteur aggravant
- Historique de blessures récentes = facteur aggravant

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
