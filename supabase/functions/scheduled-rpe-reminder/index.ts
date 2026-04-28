import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { filterByPreferences } from "../_shared/notification-preferences.ts";

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
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!oneSignalAppId || !oneSignalApiKey) {
      throw new Error("OneSignal credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const baseHeaders = {
      "Content-Type": "application/json",
      Authorization: `Key ${oneSignalApiKey}`,
    };

    // Get current time and check for sessions that ended in the last 30 minutes
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5);
    const thirtyMinAgoTime = thirtyMinutesAgo.toTimeString().split(" ")[0].substring(0, 5);

    console.log(`[rpe] Checking sessions ending between ${thirtyMinAgoTime} and ${currentTime} on ${today}`);

    // Get sessions that ended in the last 30 minutes
    const { data: sessions, error: sessionsError } = await supabase
      .from("training_sessions")
      .select(`
        id,
        session_date,
        session_end_time,
        training_type,
        category_id,
        categories!inner(
          id,
          name,
          club_id,
          clubs!inner(name)
        )
      `)
      .eq("session_date", today)
      .not("session_end_time", "is", null)
      .gte("session_end_time", thirtyMinAgoTime)
      .lte("session_end_time", currentTime);

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No sessions ended in the last 30 minutes" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalEmailsSent = 0;
    let totalPushSent = 0;
    const results: any[] = [];

    for (const session of sessions) {
      // Get players who participated (from attendance or all players if no attendance)
      const { data: attendance } = await supabase
        .from("training_attendance")
        .select("player_id")
        .eq("training_session_id", session.id)
        .eq("status", "present");

      let playerIds: string[] = [];

      if (attendance && attendance.length > 0) {
        playerIds = attendance.map((a) => a.player_id);
      } else {
        // Fallback: get all players from category
        const { data: allPlayers } = await supabase
          .from("players")
          .select("id")
          .eq("category_id", session.category_id);

        if (allPlayers) {
          playerIds = allPlayers.map((p) => p.id);
        }
      }

      if (playerIds.length === 0) continue;

      // Check which players already submitted RPE for this session
      const { data: existingRpe } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("training_session_id", session.id)
        .in("player_id", playerIds);

      const submittedPlayerIds = new Set(existingRpe?.map((r) => r.player_id) || []);
      const pendingPlayerIds = playerIds.filter((pid) => !submittedPlayerIds.has(pid));

      if (pendingPlayerIds.length === 0) {
        console.log(`[rpe] Session ${session.id}: all ${playerIds.length} players already submitted RPE, skipping`);
        continue;
      }

      console.log(
        `[rpe] Session ${session.id}: ${pendingPlayerIds.length}/${playerIds.length} players pending RPE`
      );

      // Get player contact info for pending players
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone, user_id")
        .in("id", pendingPlayerIds);

      if (playersError || !players) continue;

      const category = session.categories as any;
      const trainingTypeLabel = getTrainingTypeLabel(session.training_type);

      // Deep link URL for quick access
      const appBaseUrl = "https://cocoricoachclub.com";
      const rpeDeepLink = `${appBaseUrl}/athlete-space?tab=rpe`;

      // ── EMAIL via OneSignal ──────────────────────────────────────────────
      const emailRecipients = players.filter((p) => p.email).map((p) => p.email!);

      if (emailRecipients.length > 0) {
        try {
          const response = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: baseHeaders,
            body: JSON.stringify({
              app_id: oneSignalAppId,
              include_email_tokens: emailRecipients,
              email_subject: `📊 RPE - Comment as-tu ressenti la séance ?`,
              email_body: `
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">🏉 CocoriCoach</h1>
                      </div>
                      <div style="padding: 24px;">
                        <h2 style="margin: 0 0 12px;">Séance terminée ! 🏋️</h2>
                        <p>La séance de <strong>${trainingTypeLabel}</strong> est terminée.</p>
                        <p><strong>Catégorie:</strong> ${category.name}</p>
                        <p>N'oublie pas de renseigner ton RPE (perception de l'effort) pour aider ton staff à optimiser ta charge d'entraînement.</p>
                        <p style="color: #6b7280;">Échelle RPE : 1 (très facile) à 10 (effort maximal)</p>
                        <div style="text-align: center; margin: 24px 0;">
                          <a href="${rpeDeepLink}" style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">📊 Renseigner mon RPE</a>
                        </div>
                        <p>Bravo pour l'entraînement ! 💪</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            }),
          });

          if (response.ok) {
            totalEmailsSent += emailRecipients.length;
          } else {
            const err = await response.json();
            console.error(`[rpe] Email error for session ${session.id}:`, err);
          }
        } catch (error) {
          console.error("[rpe] Email send error:", error);
        }
      }

      // ── PUSH via OneSignal (external_id targeting) ─────────────────────
      const pushUserIds = players
        .filter((p) => p.user_id)
        .map((p) => p.user_id!);

      if (pushUserIds.length > 0) {
        try {
          const response = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: baseHeaders,
            body: JSON.stringify({
              app_id: oneSignalAppId,
              include_aliases: { external_id: pushUserIds },
              target_channel: "push",
              headings: {
                fr: "Comment s'est passée la séance ? 💪",
                en: "Comment s'est passée la séance ? 💪",
              },
              contents: {
                fr: `"${trainingTypeLabel}" (${category.name}) est terminée. Donne ton RPE en 10 secondes !`,
                en: `"${trainingTypeLabel}" (${category.name}) est terminée. Donne ton RPE en 10 secondes !`,
              },
              url: rpeDeepLink,
              ttl: 7200,
              data: {
                type: "rpe_reminder",
                session_id: session.id,
                category_id: session.category_id,
                url: rpeDeepLink,
              },
            }),
          });

          const json = await response.json();
          if (response.ok) {
            totalPushSent += json.recipients ?? pushUserIds.length;
            console.log(`[rpe] Push sent to ${json.recipients ?? pushUserIds.length} device(s) for session ${session.id}`);
          } else {
            console.error(`[rpe] Push error for session ${session.id}:`, json);
          }
        } catch (error) {
          console.error("[rpe] Push send error:", error);
        }
      }

      results.push({
        session_id: session.id,
        category: category.name,
        training_type: trainingTypeLabel,
        totalPlayers: playerIds.length,
        alreadySubmitted: submittedPlayerIds.size,
        emailsSent: emailRecipients.length,
        pushTargeted: pushUserIds.length,
        type: "rpe_reminder",
      });
    }

    console.log(`[rpe] Total: ${totalEmailsSent} emails, ${totalPushSent} push sent`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalEmailsSent} email(s) + ${totalPushSent} push sent`,
        emailsSent: totalEmailsSent,
        pushSent: totalPushSent,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in scheduled-rpe-reminder:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getTrainingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    physical: "Préparation Physique",
    technical: "Technique",
    tactical: "Tactique",
    collective: "Collectif",
    video: "Analyse Vidéo",
    recovery: "Récupération",
    gym: "Musculation",
    cardio: "Cardio",
    sprint: "Vitesse",
    flexibility: "Souplesse",
    match_prep: "Préparation Match",
    rehab: "Réathlétisation",
    warmup: "Échauffement",
    cooldown: "Retour au calme",
  };
  return labels[type] || type;
}
