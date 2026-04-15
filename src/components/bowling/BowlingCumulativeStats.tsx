import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { BarChart3, Trophy, Target, TrendingUp, Calendar, FileDown, FileSpreadsheet, Users, User, Droplets } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { BowlingFrameAnalysis } from "./BowlingFrameAnalysis";
import { BowlingGameHistory } from "./BowlingGameHistory";
import { getStatColor } from "@/lib/bowling/statColors";
import { exportBowlingPdf, exportBowlingTeamPdf } from "@/lib/bowling/bowlingPdfExport";
import { resolveBallCatalogImages } from "@/lib/bowling/bowlingBallImageResolver";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingCumulativeStatsProps {
  categoryId: string;
  playerId?: string;
}

interface BowlingGameData {
  roundId: string;
  matchId: string;
  playerId: string;
  playerName: string;
  playerAvatarUrl?: string | null;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  bowlingCategory?: string;
  score: number;
  strikes: number;
  spares: number;
  strikePercentage: number;
  sparePercentage: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
  pocketCount: number;
  pocketPercentage: number;
  singlePinCount: number;
  singlePinConverted: number;
  singlePinConversionRate: number;
  frames?: FrameData[];
  blockDebriefing?: string;
  blockId?: string;
  roundDate?: string;
  trackPockets?: boolean;
}

function ColoredStatRow({ label, value, statType, percentage }: { label: string; value: string; statType?: "pocket" | "strike" | "spare" | "singlePin" | "firstBallGte8"; percentage?: number }) {
  if (statType && percentage !== undefined) {
    const color = getStatColor(statType, percentage);
    const isNoire2 = color.text.includes("text-red");
    const textClass = isNoire2 ? "text-red-600 font-extrabold" : "text-white";
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`font-bold px-2.5 py-0.5 rounded ${color.bg} ${textClass} text-sm`}>{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

export function BowlingCumulativeStats({ categoryId, playerId: fixedPlayerId }: BowlingCumulativeStatsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const { data: allGames, isLoading } = useQuery({
    queryKey: ["bowling_cumulative_stats", categoryId],
    queryFn: async () => {
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("id, match_date, opponent, location, age_category, competition")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (matchError) throw matchError;
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map(m => m.id);
      const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));

      const { data: rounds, error: roundError } = await supabase
        .from("competition_rounds")
        .select("*, competition_round_stats(*), players(id, name, first_name, avatar_url)")
        .in("match_id", matchIds)
        .order("round_number");
      if (roundError) throw roundError;
      if (!rounds) return [];

      const games: BowlingGameData[] = [];
      for (const round of rounds) {
        const match = matchMap[round.match_id];
        const player = round.players as { id: string; name: string; first_name?: string; avatar_url?: string | null } | null;
        const statData = (round.competition_round_stats as any[])?.[0]?.stat_data as Record<string, any> || {};
        const bowlingFrames = statData.bowlingFrames as FrameData[] | undefined;

        if (statData.gameScore !== undefined || bowlingFrames) {
          games.push({
            roundId: round.id,
            matchId: round.match_id,
            playerId: round.player_id,
            playerName: player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Athlète",
            playerAvatarUrl: player?.avatar_url,
            roundNumber: round.round_number,
            matchDate: match?.match_date || "",
            matchOpponent: match?.opponent || "",
            phase: round.phase || "",
            score: statData.gameScore || 0,
            strikes: statData.strikes || 0,
            spares: statData.spares || 0,
            strikePercentage: statData.strikePercentage || 0,
            sparePercentage: statData.sparePercentage || 0,
            openFrames: statData.openFrames || 0,
            splitCount: statData.splitCount || 0,
            splitConverted: statData.splitConverted || 0,
            pocketCount: statData.pocketCount || 0,
            pocketPercentage: statData.pocketPercentage || 0,
            singlePinCount: statData.singlePinCount || 0,
            singlePinConverted: statData.singlePinConverted || 0,
            singlePinConversionRate: statData.singlePinConversionRate || 0,
            frames: bowlingFrames,
            bowlingCategory: statData.bowlingCategory as string | undefined,
            blockDebriefing: statData.blockDebriefing as string | undefined,
            blockId: statData.blockId as string | undefined,
            roundDate: statData.roundDate as string | undefined,
            trackPockets: statData.trackPockets !== false,
          });
        }
      }

      return games;
    },
  });

  const players = useMemo(() => {
    if (!allGames) return [];
    const map = new Map<string, string>();
    allGames.forEach(g => map.set(g.playerId, g.playerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allGames]);

  const activePlayerId = fixedPlayerId || selectedPlayerId || players[0]?.id;
  const playerGames = useMemo(() => {
    if (!allGames || !activePlayerId) return [];
    return allGames.filter(g => g.playerId === activePlayerId);
  }, [allGames, activePlayerId]);

  const cumulativeStats = useMemo(() => {
    if (playerGames.length === 0) return null;
    const totalGames = playerGames.length;
    const totalScore = playerGames.reduce((s, g) => s + g.score, 0);
    const totalStrikes = playerGames.reduce((s, g) => s + g.strikes, 0);
    const totalSpares = playerGames.reduce((s, g) => s + g.spares, 0);
    const totalOpenFrames = playerGames.reduce((s, g) => s + g.openFrames, 0);
    const totalSplits = playerGames.reduce((s, g) => s + g.splitCount, 0);
    const totalSplitsConverted = playerGames.reduce((s, g) => s + g.splitConverted, 0);
    const pocketGames = playerGames.filter(g => g.trackPockets !== false);
    const totalPocket = pocketGames.reduce((s, g) => s + g.pocketCount, 0);
    const hasPocketData = pocketGames.length > 0;
    const totalSinglePin = playerGames.reduce((s, g) => s + g.singlePinCount, 0);
    const totalSinglePinConverted = playerGames.reduce((s, g) => s + g.singlePinConverted, 0);
    const highGame = Math.max(...playerGames.map(g => g.score));
    const lowGame = Math.min(...playerGames.map(g => g.score));
    const avgScore = totalScore / totalGames;
    const avgStrikeRate = playerGames.reduce((s, g) => s + g.strikePercentage, 0) / totalGames;
    const avgSpareRate = playerGames.reduce((s, g) => s + g.sparePercentage, 0) / totalGames;
    const avgPocketRate = hasPocketData
      ? pocketGames.reduce((s, g) => s + g.pocketPercentage, 0) / pocketGames.length
      : 0;
    const totalFrames = totalGames * 10;
    const openFramePercentage = totalFrames > 0 ? (totalOpenFrames / totalFrames) * 100 : 0;

    // firstBallGte8 - compute from frames data if available
    let totalFBGte8 = 0;
    let totalFBGte8Opp = 0;
    playerGames.forEach(g => {
      if (g.frames) {
        g.frames.forEach((frame, fi) => {
          const isTenth = fi === 9;
          frame.throws.forEach((t, ti) => {
            if (t.value === "") return;
            // First throw contexts
            const isFirst = ti === 0 || (isTenth && (
              (ti === 1 && frame.throws[0]?.value === "X") ||
              (ti === 2 && (frame.throws[1]?.value === "X" || frame.throws[1]?.value === "/"))
            ));
            if (!isFirst) return;
            // Exclude last throw with no conversion
            const isLast = isTenth && ti === 2 && (
              (frame.throws[0]?.value === "X" && frame.throws[1]?.value === "X") ||
              (frame.throws[0]?.value !== "X" && frame.throws[1]?.value === "/")
            );
            if (isLast) return;
            totalFBGte8Opp++;
            if (t.pins >= 8) totalFBGte8++;
          });
        });
      }
    });
    const firstBallGte8Percentage = totalFBGte8Opp > 0 ? (totalFBGte8 / totalFBGte8Opp) * 100 : 0;

    return {
      totalGames, totalScore, highGame, lowGame, avgScore,
      totalStrikes, totalSpares, totalOpenFrames,
      totalSplits, totalSplitsConverted,
      totalPocket, totalSinglePin, totalSinglePinConverted,
      avgStrikeRate, avgSpareRate, avgPocketRate, hasPocketData,
      openFramePercentage,
      splitConversionRate: totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0,
      singlePinConversionRate: totalSinglePin > 0 ? (totalSinglePinConverted / totalSinglePin) * 100 : 0,
      firstBallGte8Percentage,
    };
  }, [playerGames]);

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement des statistiques bowling...</p>;
  }

  const handleExportExcel = async () => {
    if (!cumulativeStats || playerGames.length === 0) return;
    try {
      const branding = await getExcelBranding(categoryId);
      const wb = new ExcelJS.Workbook();
      const playerName = players.find(p => p.id === activePlayerId)?.name || "Athlète";

      // Sheet 1: Summary
      const ws1 = wb.addWorksheet("Résumé");
      ws1.columns = [
        { header: "Statistique", key: "stat", width: 30 },
        { header: "Valeur", key: "value", width: 18 },
      ];
      const startRow1 = addBrandedHeader(ws1, `Stats compétition bowling - ${playerName}`, branding, [
        ["Parties", String(cumulativeStats.totalGames)],
      ]);
      styleDataHeaderRow(ws1, startRow1, 2, branding.headerColor);
      ws1.getRow(startRow1).values = ["Statistique", "Valeur"];
      const summaryRows = [
        ["Parties jouées", cumulativeStats.totalGames],
        ["Moyenne", cumulativeStats.avgScore.toFixed(1)],
        ["Partie haute", cumulativeStats.highGame],
        ["Partie basse", cumulativeStats.lowGame],
        ["% Strikes", `${cumulativeStats.avgStrikeRate.toFixed(1)}%`],
        ["% Spares", `${cumulativeStats.avgSpareRate.toFixed(1)}%`],
        ...(cumulativeStats.hasPocketData ? [["% Poches", `${cumulativeStats.avgPocketRate.toFixed(1)}%`]] : []),
        ["% Quilles seules", `${cumulativeStats.singlePinConversionRate.toFixed(1)}%`],
        ["% Conversion splits", `${cumulativeStats.splitConversionRate.toFixed(1)}%`],
        ["% Boules ≥8", `${cumulativeStats.firstBallGte8Percentage.toFixed(1)}%`],
        ["% Frames non fermées", `${cumulativeStats.openFramePercentage.toFixed(1)}%`],
        ["Nombre de strikes", cumulativeStats.totalStrikes],
        ["Nombre de spares", cumulativeStats.totalSpares],
        ["Nombre de splits", cumulativeStats.totalSplits],
        ["Nombre de frames non fermées", cumulativeStats.totalOpenFrames],
      ];
      summaryRows.forEach((r, i) => {
        ws1.getRow(startRow1 + 1 + i).values = [r[0], r[1]];
      });
      addZebraRows(ws1, startRow1 + 1, startRow1 + summaryRows.length, 2);
      addFooter(ws1, startRow1 + summaryRows.length + 1, 2, branding.footerText);

      // Sheet 2: Game details
      const ws2 = wb.addWorksheet("Détail parties");
      ws2.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Compétition", key: "comp", width: 25 },
        { header: "Score", key: "score", width: 10 },
        { header: "Strikes", key: "strikes", width: 10 },
        { header: "Spares", key: "spares", width: 10 },
        { header: "% Strike", key: "strikeP", width: 12 },
        { header: "% Spare", key: "spareP", width: 12 },
        { header: "Open", key: "open", width: 10 },
      ];
      const startRow2 = addBrandedHeader(ws2, `Détail des parties - ${playerName}`, branding);
      styleDataHeaderRow(ws2, startRow2, 8, branding.headerColor);
      ws2.getRow(startRow2).values = ["Date", "Compétition", "Score", "Strikes", "Spares", "% Strike", "% Spare", "Open"];
      const sortedGames = [...playerGames].sort((a, b) => a.matchDate.localeCompare(b.matchDate));
      sortedGames.forEach((g, i) => {
        const row = ws2.getRow(startRow2 + 1 + i);
        row.values = [
          format(new Date(g.matchDate), "dd/MM/yyyy"),
          g.matchOpponent,
          g.score,
          g.strikes,
          g.spares,
          `${g.strikePercentage.toFixed(1)}%`,
          `${g.sparePercentage.toFixed(1)}%`,
          g.openFrames,
        ];
      });
      addZebraRows(ws2, startRow2 + 1, startRow2 + sortedGames.length, 8);

      await downloadWorkbook(wb, `stats-bowling-competition-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  if (!allGames || allGames.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune partie de bowling enregistrée.</p>
            <p className="text-sm mt-2">Les statistiques apparaîtront ici une fois des parties saisies dans les compétitions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player selector + Export button */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {!fixedPlayerId && players.length > 1 && players.map(p => (
            <Button
              key={p.id}
              variant={activePlayerId === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlayerId(p.id)}
            >
              {p.name}
              <Badge variant="secondary" className="ml-2 text-xs">
                {allGames.filter(g => g.playerId === p.id).length}
              </Badge>
            </Button>
          ))}
        </div>
        {playerGames.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exporter en PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={async () => {
                    try {
                      toast.info("Génération du PDF joueur...");
                      const avatarUrl = playerGames[0]?.playerAvatarUrl || null;
                      const matchIds = [...new Set(playerGames.map(g => g.matchId))];
                      const [matchResult, catResult, oilResult, oilAssignResult, arsenalResult, catalogResult] = await Promise.all([
                        supabase.from("matches").select("opponent, location, age_category, competition, match_date").eq("id", matchIds[0]).single(),
                        supabase.from("categories").select("name").eq("id", categoryId).single(),
                        supabase.from("bowling_oil_patterns").select("id, name, image_url_male, image_url_female").in("match_id", matchIds),
                        supabase.from("bowling_oil_pattern_players" as any).select("oil_pattern_id, player_id"),
                        supabase.from("player_bowling_arsenal" as any).select("*").eq("player_id", activePlayerId).eq("category_id", categoryId),
                        supabase.from("bowling_ball_catalog" as any).select("*"),
                      ]);
                      const matchRow = matchResult.data;
                      const catData = catResult.data;
                      const allOilPatterns = (oilResult.data || []) as any[];
                      const allAssignments = (oilAssignResult.data || []) as any[];
                      // Find assigned pattern for this player, fallback to first pattern
                      const playerAssignment = allAssignments.find((a: any) => a.player_id === activePlayerId);
                      const assignedPattern = playerAssignment
                        ? allOilPatterns.find((op: any) => op.id === playerAssignment.oil_pattern_id)
                        : allOilPatterns[0] || null;
                      let oilPatternImageUrl: string | null = null;
                      let oilPatternName: string | null = null;
                      if (assignedPattern) {
                        oilPatternName = assignedPattern.name;
                        oilPatternImageUrl = assignedPattern.image_url_male || assignedPattern.image_url_female || null;
                      }
                      const catalogBalls = (catalogResult.data as any[] || []);
                      const catalogMap = new Map(catalogBalls.map((b: any) => [b.id, b]));
                      const imageMap = await resolveBallCatalogImages(catalogBalls);
                      const arsenalBalls = ((arsenalResult.data as any[]) || []).map((item: any) => {
                        const cat = item.ball_catalog_id ? catalogMap.get(item.ball_catalog_id) : null;
                        const name = cat ? `${cat.brand} ${cat.model}` : `${item.custom_ball_brand || ""} ${item.custom_ball_name || "Custom"}`.trim();
                        return {
                          name,
                          drillingLayout: item.drilling_layout || item.balance_type || null,
                          imageUrl: (item.ball_catalog_id ? imageMap.get(item.ball_catalog_id) : null) || cat?.image_url || null,
                          weightLbs: item.weight_lbs || null,
                          coverType: cat?.cover_type || null,
                          coreType: cat?.core_type || null,
                          rg: item.custom_rg || cat?.rg || null,
                          differential: item.custom_differential || cat?.differential || null,
                          intermediateDiff: item.custom_intermediate_diff || cat?.intermediate_diff || null,
                          currentSurface: item.current_surface || null,
                        };
                      });
                      await exportBowlingPdf(
                        players.find(p => p.id === activePlayerId)?.name || "Athlète",
                        playerGames,
                        {
                          playerAvatarUrl: avatarUrl,
                          oilPatternImageUrl,
                          oilPatternName,
                          competitionName: matchRow?.opponent || matchRow?.competition || null,
                          ageCategory: catData?.name || matchRow?.age_category || null,
                          location: matchRow?.location || null,
                          competitionDate: matchRow?.match_date || null,
                          arsenalBalls,
                        }
                      );
                      toast.success("PDF joueur exporté !");
                    } catch (e) {
                      toast.error("Erreur lors de l'export PDF");
                    }
                  }}
                >
                  <User className="h-4 w-4" />
                  Exporter pour le joueur
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={async () => {
                    try {
                      toast.info("Génération du PDF équipe...");
                      const allMatchIds = [...new Set((allGames || []).map(g => g.matchId))];
                      const [matchResult, catResult, oilResult, oilAssignResult, arsenalResult, catalogResult] = await Promise.all([
                        supabase.from("matches").select("opponent, location, age_category, competition, match_date").eq("id", allMatchIds[0]).single(),
                        supabase.from("categories").select("name").eq("id", categoryId).single(),
                        supabase.from("bowling_oil_patterns").select("id, name, image_url_male, image_url_female").in("match_id", allMatchIds),
                        supabase.from("bowling_oil_pattern_players" as any).select("oil_pattern_id, player_id"),
                        supabase.from("player_bowling_arsenal" as any).select("*").eq("category_id", categoryId),
                        supabase.from("bowling_ball_catalog" as any).select("*"),
                      ]);
                      const matchRow = matchResult.data;
                      const catData = catResult.data;
                      const allOilPatterns = (oilResult.data || []) as any[];
                      const allOilAssignments = (oilAssignResult.data || []) as any[];
                      // Default oil pattern (first one, for players without assignment)
                      const defaultOil = allOilPatterns[0] || null;
                      let defaultOilName: string | null = defaultOil?.name || null;
                      let defaultOilImage: string | null = defaultOil ? (defaultOil.image_url_male || defaultOil.image_url_female || null) : null;
                      const catalogBalls2 = (catalogResult.data as any[] || []);
                      const catalogMap = new Map(catalogBalls2.map((b: any) => [b.id, b]));
                      const imageMap = await resolveBallCatalogImages(catalogBalls2);
                      const allArsenal = (arsenalResult.data as any[]) || [];
                      const teamPlayers = players.map(p => {
                        const playerArsenal = allArsenal.filter((a: any) => a.player_id === p.id);
                        // Find per-player oil pattern assignment
                        const playerOilAssign = allOilAssignments.find((a: any) => a.player_id === p.id);
                        const playerOil = playerOilAssign
                          ? allOilPatterns.find((op: any) => op.id === playerOilAssign.oil_pattern_id)
                          : null;
                        return {
                          playerId: p.id,
                          playerName: p.name,
                          avatarUrl: (allGames || []).find(g => g.playerId === p.id)?.playerAvatarUrl || null,
                          games: (allGames || []).filter(g => g.playerId === p.id),
                          oilPatternName: playerOil ? playerOil.name : null,
                          oilPatternImageUrl: playerOil ? (playerOil.image_url_male || playerOil.image_url_female || null) : null,
                          arsenalBalls: playerArsenal.map((item: any) => {
                            const cat = item.ball_catalog_id ? catalogMap.get(item.ball_catalog_id) : null;
                            const name = cat ? `${cat.brand} ${cat.model}` : `${item.custom_ball_brand || ""} ${item.custom_ball_name || "Custom"}`.trim();
                            return {
                              name,
                              drillingLayout: item.drilling_layout || item.balance_type || null,
                              imageUrl: (item.ball_catalog_id ? imageMap.get(item.ball_catalog_id) : null) || cat?.image_url || null,
                              weightLbs: item.weight_lbs || null,
                              coverType: cat?.cover_type || null,
                              coreType: cat?.core_type || null,
                              rg: item.custom_rg || cat?.rg || null,
                              differential: item.custom_differential || cat?.differential || null,
                              intermediateDiff: item.custom_intermediate_diff || cat?.intermediate_diff || null,
                              currentSurface: item.current_surface || null,
                            };
                          }),
                        };
                      });
                      await exportBowlingTeamPdf(teamPlayers, {
                        oilPatternImageUrl: defaultOilImage,
                        oilPatternName: defaultOilName,
                        competitionName: matchRow?.opponent || matchRow?.competition || null,
                        ageCategory: catData?.name || matchRow?.age_category || null,
                        location: matchRow?.location || null,
                        competitionDate: matchRow?.match_date || null,
                      });
                      toast.success("PDF équipe exporté !");
                    } catch (e) {
                      toast.error("Erreur lors de l'export PDF équipe");
                    }
                  }}
                >
                  <Users className="h-4 w-4" />
                  Exporter pour l'équipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="competition" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="overview" colorKey="competition" icon={<BarChart3 className="h-4 w-4" />}>
              Vue d'ensemble
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="frames" colorKey="competition" icon={<Target className="h-4 w-4" />}>
              Analyse par frame
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="history" colorKey="competition" icon={<Calendar className="h-4 w-4" />}>
              Historique
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="overview">
          {cumulativeStats && (
            <div className="space-y-4">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.totalGames}</p>
                      <p className="text-xs text-muted-foreground">Parties</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.avgScore.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{cumulativeStats.highGame}</p>
                      <p className="text-xs text-muted-foreground">Partie la plus haute</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-destructive">{cumulativeStats.lowGame}</p>
                      <p className="text-xs text-muted-foreground">Partie la plus basse</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats détaillées + Référentiel côte à côte */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Stats détaillées - colonne gauche */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Statistiques détaillées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ColoredStatRow label="% Strikes" value={`${cumulativeStats.avgStrikeRate.toFixed(1)}%`} statType="strike" percentage={cumulativeStats.avgStrikeRate} />
                    <ColoredStatRow label="% Spares" value={`${cumulativeStats.avgSpareRate.toFixed(1)}%`} statType="spare" percentage={cumulativeStats.avgSpareRate} />
                    {cumulativeStats.hasPocketData && <ColoredStatRow label="% Poches" value={`${cumulativeStats.avgPocketRate.toFixed(1)}%`} statType="pocket" percentage={cumulativeStats.avgPocketRate} />}
                    <ColoredStatRow label="% Quilles seules" value={`${cumulativeStats.singlePinConversionRate.toFixed(1)}%`} statType="singlePin" percentage={cumulativeStats.singlePinConversionRate} />
                    <ColoredStatRow label="% Conversion splits" value={`${cumulativeStats.splitConversionRate.toFixed(1)}%`} />
                    <ColoredStatRow label="% Boules ≥8" value={`${cumulativeStats.firstBallGte8Percentage.toFixed(1)}%`} statType="firstBallGte8" percentage={cumulativeStats.firstBallGte8Percentage} />
                    <div>
                      <ColoredStatRow label="% Frames non fermées" value={`${cumulativeStats.openFramePercentage.toFixed(1)}%`} />
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                        Frames où ni strike ni spare n'a été réalisé.
                      </p>
                    </div>
                    <div className="border-t pt-2 mt-2" />
                    <ColoredStatRow label="Strikes total" value={String(cumulativeStats.totalStrikes)} />
                    <ColoredStatRow label="Spares total" value={String(cumulativeStats.totalSpares)} />
                    <ColoredStatRow label="Splits" value={String(cumulativeStats.totalSplits)} />
                    <ColoredStatRow label="Frames non fermées" value={String(cumulativeStats.totalOpenFrames)} />
                  </CardContent>
                </Card>

                {/* Référentiel - colonne droite */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Référentiel de performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr>
                          <th className="p-1.5 border font-semibold text-muted-foreground">Niveau</th>
                          <th className="p-1.5 border font-semibold text-muted-foreground">Poches</th>
                          <th className="p-1.5 border font-semibold text-muted-foreground">Strikes</th>
                          <th className="p-1.5 border font-semibold text-muted-foreground">Spares</th>
                          <th className="p-1.5 border font-semibold text-muted-foreground">9/</th>
                          <th className="p-1.5 border font-semibold text-muted-foreground">≥8</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Orange", bg: "bg-orange-700", text: "text-white", pocket: "<50%", strike: "<20%", spare: "<50%", single: "<70%", fb8: "<50%" },
                          { label: "Verte 1", bg: "bg-green-400", text: "text-green-950", pocket: "50-60%", strike: "20-30%", spare: "50-60%", single: "70-75%", fb8: "50-65%" },
                          { label: "Verte 2", bg: "bg-green-600", text: "text-white", pocket: "60-65%", strike: "30-35%", spare: "60-70%", single: "75-80%", fb8: "65-75%" },
                          { label: "Verte 3", bg: "bg-green-900", text: "text-white", pocket: "65-70%", strike: "35-40%", spare: "70-80%", single: "80-85%", fb8: "75-85%" },
                          { label: "Bleue 1", bg: "bg-blue-700", text: "text-white", pocket: "70-75%", strike: "40-45%", spare: "80-85%", single: "85-90%", fb8: "85-88%" },
                          { label: "Bleue 2", bg: "bg-blue-800", text: "text-white", pocket: "75-80%", strike: "45-50%", spare: "85-90%", single: "90-95%", fb8: "85-88%" },
                          { label: "Noire 1", bg: "bg-gray-900", text: "text-white", pocket: "80-85%", strike: "50-55%", spare: "90-95%", single: "95-99%", fb8: "88-92%" },
                          { label: "Noire 2", bg: "bg-black", text: "text-red-600", pocket: "≥85%", strike: "≥55%", spare: "≥95%", single: "100%", fb8: "≥92%" },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className={`p-1.5 border ${row.bg} ${row.text} font-bold`}>{row.label}</td>
                            <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.pocket}</td>
                            <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.strike}</td>
                            <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.spare}</td>
                            <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.single}</td>
                            <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.fb8}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Evolution chart - en dessous */}
              {playerGames.length >= 2 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Évolution des scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-center gap-[3px] h-40">
                      {playerGames.map((game) => {
                        const minBase = 100;
                        const maxScore = Math.max(...playerGames.map(g => g.score), 300);
                        const range = maxScore - minBase;
                        const clampedScore = Math.max(game.score, minBase);
                        const height = range > 0 ? ((clampedScore - minBase) / range) * 100 : 50;
                        
                        const getBarColor = (score: number) => {
                          if (score >= 240) return "bg-yellow-400";
                          if (score >= 210) return "bg-green-600";
                          if (score >= 180) return "bg-green-400";
                          if (score >= 151) return "bg-orange-500";
                          return "bg-red-500";
                        };
                        
                        return (
                          <div
                            key={game.roundId}
                            className={`${getBarColor(game.score)} rounded-t hover:opacity-80 transition-colors relative group`}
                            style={{ height: `${Math.max(height, 5)}%`, width: "12px", maxWidth: "20px" }}
                            title={`${game.matchOpponent} - Partie ${game.roundNumber}: ${game.score}`}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {game.score}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 border-t pt-2 flex items-center justify-center gap-3 flex-wrap text-[9px] text-muted-foreground">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" />&lt;150</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-500" />151-179</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-400" />180-209</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-600" />210-239</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-400" />240+</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      {playerGames.length} parties • Survol pour détails
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="frames">
          <BowlingFrameAnalysis games={playerGames} />
        </TabsContent>

        <TabsContent value="history">
          <BowlingGameHistory games={playerGames} categoryId={categoryId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
