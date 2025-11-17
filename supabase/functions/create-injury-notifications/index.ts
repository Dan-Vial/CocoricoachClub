import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date and date 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Get all active injuries with estimated return date in the next 3 days
    const { data: injuries, error: injuriesError } = await supabase
      .from("injuries")
      .select(`
        id,
        player_id,
        category_id,
        injury_type,
        estimated_return_date,
        players (
          id,
          name,
          category_id
        )
      `)
      .eq("status", "active")
      .not("estimated_return_date", "is", null)
      .gte("estimated_return_date", today.toISOString().split("T")[0])
      .lte("estimated_return_date", threeDaysFromNow.toISOString().split("T")[0]);

    if (injuriesError) {
      console.error("Error fetching injuries:", injuriesError);
      throw injuriesError;
    }

    console.log(`Found ${injuries?.length || 0} injuries with upcoming return dates`);

    let notificationsCreated = 0;

    // For each injury, create a notification if one doesn't exist yet
    for (const injury of injuries || []) {
      // Get the club owner user_id
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select(`
          id,
          club_id,
          clubs (
            user_id
          )
        `)
        .eq("id", injury.category_id)
        .single();

      if (categoryError || !category) {
        console.error("Error fetching category:", categoryError);
        continue;
      }

      const userId = (category.clubs as any).user_id;

      // Check if notification already exists for this injury
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("injury_id", injury.id)
        .eq("notification_type", "injury_return_alert")
        .single();

      // Only create notification if it doesn't exist yet
      if (!existingNotification) {
        const daysUntilReturn = Math.ceil(
          (new Date(injury.estimated_return_date).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const playerName = (injury.players as any).name;
        const message =
          daysUntilReturn === 0
            ? `${playerName} devrait revenir aujourd'hui de sa blessure (${injury.injury_type})`
            : daysUntilReturn === 1
            ? `${playerName} devrait revenir demain de sa blessure (${injury.injury_type})`
            : `${playerName} devrait revenir dans ${daysUntilReturn} jours de sa blessure (${injury.injury_type})`;

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            category_id: injury.category_id,
            injury_id: injury.id,
            notification_type: "injury_return_alert",
            title: "Retour de blessure imminent",
            message: message,
          });

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        } else {
          notificationsCreated++;
          console.log(`Created notification for ${playerName}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${notificationsCreated} notification(s) for upcoming injury returns`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-injury-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
