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
    const dataType = url.searchParams.get("type");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      console.error("Token validation failed:", tokenError, tokenInfo);
      return new Response(
        JSON.stringify({ error: tokenInfo?.error || "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryId = tokenInfo.category_id;
    const clubId = tokenInfo.club_id;

    console.log(`Public data request: type=${dataType}, categoryId=${categoryId}`);

    let data: any = null;

    switch (dataType) {
      case "category":
        const { data: catData, error: catError } = await supabaseAdmin
          .from("categories")
          .select("*, clubs(name, id)")
          .eq("id", categoryId)
          .single();
        if (catError) console.error("Category fetch error:", catError);
        data = catData;
        break;

      case "players":
        const { data: playersData, error: playersError } = await supabaseAdmin
          .from("players")
          .select("id, name, position, date_of_birth, avatar_url")
          .eq("category_id", categoryId)
          .order("name");
        if (playersError) console.error("Players fetch error:", playersError);
        data = playersData || [];
        break;

      case "matches":
        const { data: matchesData, error: matchesError } = await supabaseAdmin
          .from("matches")
          .select("*")
          .eq("category_id", categoryId)
          .order("match_date", { ascending: false });
        if (matchesError) console.error("Matches fetch error:", matchesError);
        data = matchesData || [];
        break;

      case "sessions":
        const { data: sessionsData, error: sessionsError } = await supabaseAdmin
          .from("training_sessions")
          .select("*")
          .eq("category_id", categoryId)
          .order("session_date", { ascending: false })
          .limit(50);
        if (sessionsError) console.error("Sessions fetch error:", sessionsError);
        data = sessionsData || [];
        break;

      case "injuries":
        const { data: injuriesData, error: injuriesError } = await supabaseAdmin
          .from("injuries")
          .select("*, players(name)")
          .eq("category_id", categoryId);
        if (injuriesError) console.error("Injuries fetch error:", injuriesError);
        data = injuriesData || [];
        break;

      case "wellness":
        const { data: wellnessData, error: wellnessError } = await supabaseAdmin
          .from("player_wellness")
          .select("*, players(name)")
          .eq("category_id", categoryId)
          .order("wellness_date", { ascending: false })
          .limit(100);
        if (wellnessError) console.error("Wellness fetch error:", wellnessError);
        data = wellnessData || [];
        break;

      case "awcr":
        const { data: awcrData, error: awcrError } = await supabaseAdmin
          .from("awcr_tracking")
          .select("*, players(name)")
          .eq("category_id", categoryId)
          .order("session_date", { ascending: false })
          .limit(100);
        if (awcrError) console.error("AWCR fetch error:", awcrError);
        data = awcrData || [];
        break;

      case "overview":
        const [players, sessions, injuries, wellness] = await Promise.all([
          supabaseAdmin.from("players").select("id").eq("category_id", categoryId),
          supabaseAdmin.from("training_sessions").select("id").eq("category_id", categoryId),
          supabaseAdmin.from("injuries").select("id, status").eq("category_id", categoryId),
          supabaseAdmin.from("player_wellness")
            .select("*")
            .eq("category_id", categoryId)
            .gte("wellness_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
            .order("wellness_date", { ascending: false }),
        ]);

        data = {
          totalPlayers: players.data?.length || 0,
          totalSessions: sessions.data?.length || 0,
          activeInjuries: injuries.data?.filter((i) => i.status === "active").length || 0,
          categoryName: tokenInfo.category_name,
          clubName: tokenInfo.club_name,
          recentWellness: wellness.data || [],
        };
        break;

      case "all":
        // Fetch all data at once for efficiency
        const [
          allCategory,
          allPlayers,
          allMatches,
          allSessions,
          allInjuries,
          allWellness,
          allAwcr
        ] = await Promise.all([
          supabaseAdmin.from("categories").select("*, clubs(name, id)").eq("id", categoryId).single(),
          supabaseAdmin.from("players").select("id, name, position, date_of_birth, avatar_url").eq("category_id", categoryId).order("name"),
          supabaseAdmin.from("matches").select("*").eq("category_id", categoryId).order("match_date", { ascending: false }),
          supabaseAdmin.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }).limit(50),
          supabaseAdmin.from("injuries").select("*, players(name)").eq("category_id", categoryId),
          supabaseAdmin.from("player_wellness").select("*, players(name)").eq("category_id", categoryId).order("wellness_date", { ascending: false }).limit(100),
          supabaseAdmin.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false }).limit(100),
        ]);

        data = {
          category: allCategory.data,
          players: allPlayers.data || [],
          matches: allMatches.data || [],
          sessions: allSessions.data || [],
          injuries: allInjuries.data || [],
          wellness: allWellness.data || [],
          awcr: allAwcr.data || [],
          overview: {
            totalPlayers: allPlayers.data?.length || 0,
            totalSessions: allSessions.data?.length || 0,
            activeInjuries: allInjuries.data?.filter((i: any) => i.status === "active").length || 0,
            categoryName: tokenInfo.category_name,
            clubName: tokenInfo.club_name,
          }
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Type de données non supporté" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Public data response: type=${dataType}, hasData=${!!data}`);

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
