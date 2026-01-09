import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const dataType = url.searchParams.get("type"); // players, sessions, matches, etc.

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token and get access info
    const { data: tokenInfo, error: tokenError } = await supabaseAdmin.rpc(
      "validate_public_token",
      { _token: token }
    );

    if (tokenError || !tokenInfo?.success) {
      return new Response(
        JSON.stringify({ error: tokenInfo?.error || "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryId = tokenInfo.category_id;
    const clubId = tokenInfo.club_id;

    let data: any = null;

    // Fetch requested data type
    switch (dataType) {
      case "category":
        const { data: catData } = await supabaseAdmin
          .from("categories")
          .select("*, clubs(name)")
          .eq("id", categoryId)
          .single();
        data = catData;
        break;

      case "players":
        const { data: playersData } = await supabaseAdmin
          .from("players")
          .select("id, name, position, date_of_birth, avatar_url")
          .eq("category_id", categoryId)
          .order("name");
        data = playersData;
        break;

      case "matches":
        const { data: matchesData } = await supabaseAdmin
          .from("matches")
          .select("*")
          .eq("category_id", categoryId)
          .order("match_date", { ascending: false });
        data = matchesData;
        break;

      case "sessions":
        const { data: sessionsData } = await supabaseAdmin
          .from("training_sessions")
          .select("*")
          .eq("category_id", categoryId)
          .order("session_date", { ascending: false })
          .limit(50);
        data = sessionsData;
        break;

      case "overview":
        // Get basic stats for overview
        const [players, sessions, injuries] = await Promise.all([
          supabaseAdmin.from("players").select("id").eq("category_id", categoryId),
          supabaseAdmin.from("training_sessions").select("id").eq("category_id", categoryId),
          supabaseAdmin.from("injuries").select("id, status").eq("category_id", categoryId),
        ]);

        data = {
          totalPlayers: players.data?.length || 0,
          totalSessions: sessions.data?.length || 0,
          activeInjuries: injuries.data?.filter((i) => i.status === "active").length || 0,
          categoryName: tokenInfo.category_name,
          clubName: tokenInfo.club_name,
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Type de données non supporté" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in public-data function:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
