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
    console.log(`Public data request: type=${dataType}, categoryId=${categoryId}`);

    let data: any = null;

    switch (dataType) {
      case "category":
        const { data: catData } = await supabaseAdmin
          .from("categories")
          .select("*, clubs(name, id)")
          .eq("id", categoryId)
          .single();
        data = catData;
        break;

      case "players":
        const { data: playersData } = await supabaseAdmin
          .from("players")
          .select("id, name, position, date_of_birth, avatar_url, jersey_number, created_at")
          .eq("category_id", categoryId)
          .order("name");
        data = playersData || [];
        break;

      case "matches":
        const { data: matchesData } = await supabaseAdmin
          .from("matches")
          .select("*")
          .eq("category_id", categoryId)
          .order("match_date", { ascending: false });
        data = matchesData || [];
        break;

      case "sessions":
        const { data: sessionsData } = await supabaseAdmin
          .from("training_sessions")
          .select("*")
          .eq("category_id", categoryId)
          .order("session_date", { ascending: false })
          .limit(100);
        data = sessionsData || [];
        break;

      case "injuries":
        const { data: injuriesData } = await supabaseAdmin
          .from("injuries")
          .select("*, players(name)")
          .eq("category_id", categoryId);
        data = injuriesData || [];
        break;

      case "wellness":
        const { data: wellnessData } = await supabaseAdmin
          .from("wellness_tracking")
          .select("*, players(name)")
          .eq("category_id", categoryId)
          .order("wellness_date", { ascending: false })
          .limit(200);
        data = wellnessData || [];
        break;

      case "awcr":
        const { data: awcrData } = await supabaseAdmin
          .from("awcr_tracking")
          .select("*, players(name)")
          .eq("category_id", categoryId)
          .order("session_date", { ascending: false })
          .limit(200);
        data = awcrData || [];
        break;

      case "attendance":
        const { data: attendanceData } = await supabaseAdmin
          .from("training_attendance")
          .select("*, players(name), training_sessions(session_date, training_type)")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: false })
          .limit(500);
        data = attendanceData || [];
        break;

      case "programs":
        const { data: programsData } = await supabaseAdmin
          .from("training_programs")
          .select("*")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: false });
        data = programsData || [];
        break;

      case "overview":
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

      case "all":
        // Fetch all data at once for efficiency
        const today = new Date().toISOString().split("T")[0];
        
        // First fetch matches to get IDs
        const matchesResult = await supabaseAdmin.from("matches").select("*").eq("category_id", categoryId).order("match_date", { ascending: false });
        const matchIds = (matchesResult.data || []).map((m: any) => m.id);

        const [
          allCategory,
          allPlayers,
          allSessions,
          allInjuries,
          allWellness,
          allAwcr,
          allAttendance,
          allPrograms,
          allMatchLineups
        ] = await Promise.all([
          supabaseAdmin.from("categories").select("*, clubs(name, id)").eq("id", categoryId).single(),
          supabaseAdmin.from("players").select("id, name, position, date_of_birth, avatar_url, jersey_number, created_at").eq("category_id", categoryId).order("name"),
          supabaseAdmin.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }).limit(100),
          supabaseAdmin.from("injuries").select("*, players(name)").eq("category_id", categoryId),
          supabaseAdmin.from("wellness_tracking").select("*, players(name)").eq("category_id", categoryId).order("wellness_date", { ascending: false }).limit(200),
          supabaseAdmin.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false }).limit(200),
          supabaseAdmin.from("training_attendance").select("*, players(name), training_sessions(session_date, training_type)").eq("category_id", categoryId).order("created_at", { ascending: false }).limit(500),
          supabaseAdmin.from("training_programs").select("*").eq("category_id", categoryId).order("created_at", { ascending: false }),
          matchIds.length > 0 
            ? supabaseAdmin.from("match_lineups").select("*, players(name), matches(opponent, match_date)").in("match_id", matchIds)
            : Promise.resolve({ data: [] }),
        ]);

        // Calculate today's sessions
        const todaySessions = (allSessions.data || []).filter((s: any) => s.session_date === today);

        data = {
          category: allCategory.data,
          players: allPlayers.data || [],
          matches: matchesResult.data || [],
          sessions: allSessions.data || [],
          todaySessions,
          injuries: allInjuries.data || [],
          wellness: allWellness.data || [],
          awcr: allAwcr.data || [],
          attendance: allAttendance.data || [],
          programs: allPrograms.data || [],
          matchLineups: allMatchLineups?.data || [],
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
