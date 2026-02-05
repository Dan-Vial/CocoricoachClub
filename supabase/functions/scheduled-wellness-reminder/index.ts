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

    // Get all active categories with their players
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        club_id,
        clubs!inner(name)
      `);

    if (catError) throw catError;

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNotifications = 0;
    const results: any[] = [];

    for (const category of categories) {
      // Get all players with email or phone in this category
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone")
        .eq("category_id", category.id);

      if (playersError) {
        console.error(`Error fetching players for category ${category.id}:`, playersError);
        continue;
      }

      if (!players || players.length === 0) continue;

      const athletesWithContact = players.filter(p => p.email || p.phone);
      if (athletesWithContact.length === 0) continue;

      // Send notification via OneSignal
      if (oneSignalAppId && oneSignalApiKey) {
        const emailRecipients = athletesWithContact
          .filter(a => a.email)
          .map(a => a.email);

        if (emailRecipients.length > 0) {
          try {
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${oneSignalApiKey}`,
              },
              body: JSON.stringify({
                app_id: oneSignalAppId,
                include_email_tokens: emailRecipients,
                email_subject: "🌅 Wellness du jour - Comment te sens-tu ?",
                email_body: `
                  <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2>Bonjour !</h2>
                      <p>N'oublie pas de renseigner ton Wellness du jour pour aider ton staff à suivre ta récupération.</p>
                      <p><strong>Catégorie:</strong> ${category.name}</p>
                      <p>Évalue ton niveau de fatigue, qualité de sommeil, stress et douleurs musculaires.</p>
                      <br>
                      <p>À bientôt sur le terrain ! 💪</p>
                    </body>
                  </html>
                `,
              }),
            });

            if (response.ok) {
              totalNotifications += emailRecipients.length;
              results.push({
                category: category.name,
                sent: emailRecipients.length,
                type: "wellness_reminder",
              });
            }
          } catch (error) {
            console.error("OneSignal error:", error);
          }
        }
      }
    }

    console.log(`Wellness reminders sent: ${totalNotifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalNotifications} wellness reminder(s) sent`,
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
