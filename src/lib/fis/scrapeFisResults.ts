import { supabase } from "@/integrations/supabase/client";

interface FisResult {
  date: string;
  place: string;
  nation: string;
  category: string;
  categoryFull: string;
  discipline: string;
  position: number | null;
  fisPoints: number | null;
  cupPoints: number | null;
}

interface FisAthleteData {
  name: string;
  fisCode: string;
  nation: string;
  birthDate: string | null;
  results: FisResult[];
}

function mapCategoryToLevel(cat: string): string {
  const map: Record<string, string> = {
    WC: "world_cup",
    OWG: "olympic",
    WSC: "world_championships",
    EC: "european_cup",
    ECP: "european_cup",
    ANC: "continental_cup",
    FIS: "fis",
    JUN: "junior",
    NC: "national",
    QUA: "fis",
  };
  return map[cat] || "fis";
}

function mapDisciplineToCode(disc: string): string {
  const map: Record<string, string> = {
    Slopestyle: "slopestyle",
    "Big Air": "big_air",
    Halfpipe: "halfpipe",
    "Snowboard Cross": "snowboardcross",
    "Parallel Giant Slalom": "parallel_gs",
    "Parallel Slalom": "parallel_slalom",
    Slalom: "slalom",
    "Giant Slalom": "giant_slalom",
    "Super G": "super_g",
    Downhill: "downhill",
    Moguls: "moguls",
    Aerials: "aerials",
    "Ski Cross": "skicross",
  };
  return map[disc] || disc.toLowerCase().replace(/\s+/g, "_");
}

export async function scrapeFisResults(
  competitorId: string,
  sectorCode = "SB"
): Promise<FisAthleteData | null> {
  const { data, error } = await supabase.functions.invoke("scrape-fis-results", {
    body: { competitorId, sectorCode },
  });

  if (error || !data?.success) {
    console.error("FIS scrape error:", error || data?.error);
    return null;
  }

  return data.data as FisAthleteData;
}

export async function importFisResultsForPlayer(
  playerId: string,
  categoryId: string,
  fisData: FisAthleteData
): Promise<number> {
  // Filter only results with FIS points (skip qualifications without points)
  const resultsWithPoints = fisData.results.filter(
    (r) => r.fisPoints != null && r.position != null && r.category !== "QUA"
  );

  let importedCount = 0;

  for (const result of resultsWithPoints) {
    const compName = `${result.categoryFull} - ${result.place}`;
    const compDate = result.date;
    const discipline = mapDisciplineToCode(result.discipline);
    const level = mapCategoryToLevel(result.category);

    // Find or create competition
    const { data: existingComp } = await supabase
      .from("fis_competitions")
      .select("id")
      .eq("category_id", categoryId)
      .eq("competition_date", compDate)
      .eq("name", compName)
      .eq("discipline", discipline)
      .maybeSingle();

    let compId: string;
    if (existingComp) {
      compId = existingComp.id;
    } else {
      const { data: newComp } = await supabase
        .from("fis_competitions")
        .insert({
          category_id: categoryId,
          name: compName,
          competition_date: compDate,
          discipline,
          level,
          location: result.place,
          country: result.nation,
          total_participants: null,
        })
        .select("id")
        .single();
      if (!newComp) continue;
      compId = newComp.id;
    }

    // Upsert result
    const { error } = await supabase.from("fis_results").upsert(
      {
        competition_id: compId,
        player_id: playerId,
        category_id: categoryId,
        ranking: result.position,
        fis_points: result.fisPoints!,
      },
      { onConflict: "competition_id,player_id" }
    );

    if (!error) importedCount++;
  }

  // Update player's best FIS points
  if (resultsWithPoints.length > 0) {
    const bestResult = resultsWithPoints.reduce((best, r) =>
      (r.fisPoints || 0) > (best.fisPoints || 0) ? r : best
    );
    await supabase
      .from("players")
      .update({
        fis_points: bestResult.fisPoints,
        fis_ranking: bestResult.position,
      })
      .eq("id", playerId);
  }

  return importedCount;
}
