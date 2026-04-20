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

    // Get all clubs with their timezone
    const { data: allClubs, error: clubsError } = await supabase
      .from("clubs")
      .select("id, name, timezone");

    if (clubsError) throw clubsError;
    if (!allClubs || allClubs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clubs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter clubs where it's currently 8h in their timezone
    const eligibleClubIds: string[] = [];
    for (const club of allClubs) {
      try {
        const tz = club.timezone || "Europe/Paris";
        const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
        const localHour = new Date(nowInTz).getHours();
        if (localHour === 8) {
          eligibleClubIds.push(club.id);
          console.log(`[wellness] Club "${club.name}" (${tz}) → 8h local ✓`);
        } else {
          console.log(`[wellness] Club "${club.name}" (${tz}) → ${localHour}h local, skipping`);
        }
      } catch (e) {
        console.error(`[wellness] Invalid timezone for club "${club.name}": ${club.timezone}`, e);
      }
    }

    if (eligibleClubIds.length === 0) {
      console.log("[wellness] No clubs at 8h local right now");
      return new Response(
        JSON.stringify({ skipped: true, reason: "No clubs at 8h local" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get categories for eligible clubs only
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, club_id, clubs!inner(name)")
      .in("club_id", eligibleClubIds);

    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories for eligible clubs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalEmailsSent = 0;
    let totalPushSent = 0;
    const results: any[] = [];

    // Deep link URL for quick access
    const appBaseUrl = Deno.env.get("VITE_WEBSITE_URL");
    const wellnessDeepLink = `${appBaseUrl}/athlete-space?tab=wellness`;

    for (const category of categories) {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone, user_id")
        .eq("category_id", category.id);

      if (playersError) {
        console.error(`Error fetching players for category ${category.id}:`, playersError);
        continue;
      }

      if (!players || players.length === 0) continue;

      // ── EMAIL via OneSignal ────────────────────────────────────────────────
      const emailRecipients = players.filter((p) => p.email).map((p) => p.email!);

      if (emailRecipients.length > 0) {
        try {
          const response = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: baseHeaders,
            body: JSON.stringify({
              app_id: oneSignalAppId,
              include_email_tokens: emailRecipients,
              email_subject: "🌅 Wellness du jour - Comment te sens-tu ?",
              email_body: `
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">🏉 CocoriCoach</h1>
                      </div>
                      <div style="padding: 24px;">
                        <h2 style="margin: 0 0 12px;">Bonjour ! 🌅</h2>
                        <p>N'oublie pas de renseigner ton <strong>Wellness du jour</strong> pour aider ton staff à suivre ta récupération.</p>
                        <p><strong>Catégorie:</strong> ${category.name}</p>
                        <p>Évalue ton niveau de fatigue, qualité de sommeil, stress et douleurs musculaires.</p>
                        <div style="text-align: center; margin: 24px 0;">
                          <a href="${wellnessDeepLink}" style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">❤️ Remplir mon Wellness</a>
                        </div>
                        <p>À bientôt sur le terrain ! 💪</p>
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
            console.error(`[wellness] Email error for ${category.name}:`, err);
          }
        } catch (error) {
          console.error("[wellness] Email send error:", error);
        }
      }

      // ── PUSH via OneSignal ─────────────────────────────────────────────
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
              headings: { fr: "Comment tu te sens ce matin ? 🌅", en: "Comment tu te sens ce matin ? 🌅" },
              contents: {
                fr: `Prends 30 secondes pour remplir ton Wellness du jour (${category.name}).`,
                en: `Prends 30 secondes pour remplir ton Wellness du jour (${category.name}).`,
              },
              url: wellnessDeepLink,
              ttl: 3600,
              data: {
                type: "wellness_reminder",
                category_id: category.id,
                url: wellnessDeepLink,
              },
            }),
          });

          const json = await response.json();
          if (response.ok) {
            totalPushSent += json.recipients ?? pushUserIds.length;
            console.log(`[wellness] Push sent to ${json.recipients ?? pushUserIds.length} device(s) for ${category.name}`);
          } else {
            console.error(`[wellness] Push error for ${category.name}:`, json);
          }
        } catch (error) {
          console.error("[wellness] Push send error:", error);
        }
      }

      results.push({
        category: category.name,
        emailsSent: emailRecipients.length,
        pushTargeted: pushUserIds.length,
        type: "wellness_reminder",
      });
    }

    console.log(`[wellness] Total: ${totalEmailsSent} emails, ${totalPushSent} push sent`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalEmailsSent} email(s) + ${totalPushSent} push sent`,
        emailsSent: totalEmailsSent,
        pushSent: totalPushSent,
        eligibleClubs: eligibleClubIds.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in scheduled-wellness-reminder:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
