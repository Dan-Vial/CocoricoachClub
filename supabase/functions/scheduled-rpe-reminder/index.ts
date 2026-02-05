import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and check for sessions that ended in the last 30 minutes
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5);
    const thirtyMinAgoTime = thirtyMinutesAgo.toTimeString().split(" ")[0].substring(0, 5);

    console.log(`Checking for sessions ending between ${thirtyMinAgoTime} and ${currentTime} on ${today}`);

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

    let totalNotifications = 0;
    const results: any[] = [];

    for (const session of sessions) {
      // Check if we already sent notifications for this session
      // by checking if there's already RPE data for most players
      const { data: existingRpe, error: rpeError } = await supabase
        .from("awcr_tracking")
        .select("id")
        .eq("training_session_id", session.id)
        .limit(1);

      // If RPE already exists, skip (we assume notification was sent)
      if (existingRpe && existingRpe.length > 0) {
        console.log(`Session ${session.id} already has RPE data, skipping`);
        continue;
      }

      // Get players who participated (from attendance or all players if no attendance)
      const { data: attendance } = await supabase
        .from("training_attendance")
        .select("player_id")
        .eq("training_session_id", session.id)
        .eq("status", "present");

      let playerIds: string[] = [];
      
      if (attendance && attendance.length > 0) {
        playerIds = attendance.map(a => a.player_id);
      } else {
        // Fallback: get all players from category
        const { data: allPlayers } = await supabase
          .from("players")
          .select("id")
          .eq("category_id", session.category_id);
        
        if (allPlayers) {
          playerIds = allPlayers.map(p => p.id);
        }
      }

      if (playerIds.length === 0) continue;

      // Get player contact info
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone")
        .in("id", playerIds);

      if (playersError || !players) continue;

      const athletesWithContact = players.filter(p => p.email || p.phone);
      if (athletesWithContact.length === 0) continue;

      // Send notification via OneSignal
      if (oneSignalAppId && oneSignalApiKey) {
        const emailRecipients = athletesWithContact
          .filter(a => a.email)
          .map(a => a.email);

        if (emailRecipients.length > 0) {
          try {
            const category = session.categories as any;
            const trainingTypeLabel = getTrainingTypeLabel(session.training_type);
            
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${oneSignalApiKey}`,
              },
              body: JSON.stringify({
                app_id: oneSignalAppId,
                include_email_tokens: emailRecipients,
                email_subject: `📊 RPE - Comment as-tu ressenti la séance ?`,
                email_body: `
                  <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2>Séance terminée ! 🏋️</h2>
                      <p>La séance de <strong>${trainingTypeLabel}</strong> est terminée.</p>
                      <p><strong>Catégorie:</strong> ${category.name}</p>
                      <p>N'oublie pas de renseigner ton RPE (perception de l'effort) pour aider ton staff à optimiser ta charge d'entraînement.</p>
                      <br>
                      <p>Échelle RPE : 1 (très facile) à 10 (effort maximal)</p>
                      <br>
                      <p>Bravo pour l'entraînement ! 💪</p>
                    </body>
                  </html>
                `,
              }),
            });

            if (response.ok) {
              totalNotifications += emailRecipients.length;
              results.push({
                session_id: session.id,
                category: category.name,
                training_type: trainingTypeLabel,
                sent: emailRecipients.length,
                type: "rpe_reminder",
              });
            }
          } catch (error) {
            console.error("OneSignal error:", error);
          }
        }
      }
    }

    console.log(`RPE reminders sent: ${totalNotifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalNotifications} RPE reminder(s) sent`,
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
