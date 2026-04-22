import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Trophy, Target, Percent, Circle, Swords, Ship, Printer, FileDown, Timer, Medal } from "lucide-react";
import { getAggregatedStatsForSport, getAthletismeStatsForDiscipline, ATHLETISME_PHASES, type StatField } from "@/lib/constants/sportStats";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { isAthletismeCategory } from "@/lib/constants/sportTypes";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AthleticsDeltaBadge } from "@/components/category/athletics/AthleticsDeltaBadge";
import { findMatchingReference, type AthleticsMinima, type AthleticsRecord } from "@/lib/athletics/recordsHelpers";
import { getMinimaLevel } from "@/lib/athletics/minimaLevels";

interface AggregatedRoundStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  sportType: string;
  competitionName: string;
  competitionDate?: string;
}

interface PlayerAggregatedStats {
  playerId: string;
  playerName: string;
  discipline?: string;
  specialty?: string;
  roundCount: number;
  wins: number;
  losses: number;
  draws: number;
  bestTime?: number;
  avgRanking?: number;
  bestRanking?: number;
  qualifications: number;
  stats: Record<string, number>;
  rounds: Array<{ phase?: string; ranking?: number; result?: string; stats: Record<string, number> }>;
  // Judo specific computed stats
  judoComputed?: {
    winPercentage: number;
    ipponPerCombat: number;
    wazaariPerCombat: number;
    avgCombatDuration: number;
    avgShidoPerCombat: number;
    goldenScorePercent: number;
    goldenScoreWins: number;
    goldenScoreLosses: number;
    nageWazaPercent: number;
    neWazaPercent: number;
    winsBeforeLimit: number;
    lostByPenaltyPercent: number;
    dominantSide: string;
  };
}

export function AggregatedRoundStatsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
  sportType,
  competitionName,
  competitionDate,
}: AggregatedRoundStatsDialogProps) {
  const isJudo = sportType.toLowerCase().includes("judo");
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isAthletics = isAthletismeCategory(sportType);

  const roundLabel = isJudo ? "Combats" : isAviron ? "Courses" : isBowling ? "Parties" : isAthletics ? "Épreuves" : "Rounds";
  const allAggregatedStats = getAggregatedStatsForSport(sportType);
  const { enabledStatKeys, hasCustomPreferences } = useStatPreferences({ categoryId, sportType });
  
  // Filter aggregated stats: only show those whose base key is enabled in preferences
  const aggregatedStats = hasCustomPreferences
    ? allAggregatedStats.filter(stat => enabledStatKeys.includes(stat.key))
    : allAggregatedStats;

  // Fetch all rounds with their stats for this match
  const { data: roundsData, isLoading } = useQuery({
    queryKey: ["aggregated_round_stats", matchId],
    queryFn: async () => {
      // Get rounds with player info
      const { data: rounds, error } = await supabase
        .from("competition_rounds")
        .select(`
          *,
          competition_round_stats(*),
          players(id, name, discipline, specialty)
        `)
        .eq("match_id", matchId)
        .order("round_number");

      if (error) throw error;
      return rounds;
    },
    enabled: open && !!matchId,
  });

  // Calculate aggregated stats per player
  const playerStats: PlayerAggregatedStats[] = [];

  if (roundsData) {
    const playerMap = new Map<string, PlayerAggregatedStats>();

    roundsData.forEach((round) => {
      const player = round.players as { id: string; name: string; discipline?: string; specialty?: string } | null;
      if (!player) return;

      if (!playerMap.has(round.player_id)) {
        playerMap.set(round.player_id, {
          playerId: round.player_id,
          playerName: player.name,
          discipline: player.discipline || undefined,
          specialty: player.specialty || undefined,
          roundCount: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          qualifications: 0,
          stats: {},
          rounds: [],
        });
      }

      const pStats = playerMap.get(round.player_id)!;
      pStats.roundCount++;

      // Count wins/losses/draws + athletics qualifications
      if (round.result === "win") pStats.wins++;
      else if (round.result === "loss") pStats.losses++;
      else if (round.result === "draw") pStats.draws++;
      else if (round.result === "qualified") pStats.qualifications++;

      // Track best ranking
      if (round.ranking) {
        if (!pStats.bestRanking || round.ranking < pStats.bestRanking) {
          pStats.bestRanking = round.ranking;
        }
      }

      // Track best time for Aviron
      if (round.final_time_seconds) {
        if (!pStats.bestTime || round.final_time_seconds < pStats.bestTime) {
          pStats.bestTime = round.final_time_seconds;
        }
      }

      // Aggregate stats from competition_round_stats
      const statData = round.competition_round_stats?.[0]?.stat_data as Record<string, any> || {};
      
      // Remove non-numeric fields like bowlingFrames
      Object.entries(statData).forEach(([key, value]) => {
        if (typeof value === "number") {
          pStats.stats[key] = (pStats.stats[key] || 0) + value;
        }
      });

      // Track individual rounds for athletics detail
      pStats.rounds.push({
        phase: round.phase || undefined,
        ranking: round.ranking || undefined,
        result: round.result || undefined,
        stats: Object.fromEntries(
          Object.entries(statData).filter(([, v]) => typeof v === "number")
        ) as Record<string, number>,
      });
    });

    // Compute Judo-specific aggregated stats
    playerMap.forEach((pStats) => {
      if (isJudo && pStats.roundCount > 0) {
        const totalCombats = pStats.roundCount;
        const wins = pStats.wins;
        const losses = pStats.losses;
        
        // Calculate computed stats
        const totalIppon = pStats.stats.victoryModeIppon || 0;
        const totalWazaari = pStats.stats.victoryModeWazaari || 0;
        const totalDuration = pStats.stats.combatDuration || 0;
        const totalShido = pStats.stats.shidoReceived || 0;
        const totalGoldenScore = pStats.stats.goldenScore || 0;
        const totalNageWaza = pStats.stats.techniqueNageWaza || 0;
        const totalNeWaza = pStats.stats.techniqueNeWaza || 0;
        const totalDominantRight = pStats.stats.dominantSideRight || 0;
        const totalDominantLeft = pStats.stats.dominantSideLeft || 0;
        const totalHansoku = pStats.stats.hansokuMake || 0;
        
        // Wins in golden score - estimate from combats with GS that are wins
        // For now, assume GS wins = combats with goldenScore=1 that are also wins
        const gsWins = Math.min(totalGoldenScore, wins);
        const gsLosses = Math.max(0, totalGoldenScore - gsWins);
        
        // Wins before limit = wins by ippon or waza-ari (not decision)
        const winsBeforeLimit = totalIppon + totalWazaari;
        const winsBeforeLimitPercent = wins > 0 ? (winsBeforeLimit / wins) * 100 : 0;
        
        // Lost by penalty = losses where hansoku-make happened
        const lostByPenalty = totalHansoku;
        const lostByPenaltyPercent = losses > 0 ? (lostByPenalty / losses) * 100 : 0;
        
        pStats.judoComputed = {
          winPercentage: totalCombats > 0 ? (wins / totalCombats) * 100 : 0,
          ipponPerCombat: totalCombats > 0 ? totalIppon / totalCombats : 0,
          wazaariPerCombat: totalCombats > 0 ? totalWazaari / totalCombats : 0,
          avgCombatDuration: totalCombats > 0 ? totalDuration / totalCombats : 0,
          avgShidoPerCombat: totalCombats > 0 ? totalShido / totalCombats : 0,
          goldenScorePercent: totalCombats > 0 ? (totalGoldenScore / totalCombats) * 100 : 0,
          goldenScoreWins: gsWins,
          goldenScoreLosses: gsLosses,
          nageWazaPercent: (totalNageWaza + totalNeWaza) > 0 
            ? (totalNageWaza / (totalNageWaza + totalNeWaza)) * 100 : 50,
          neWazaPercent: (totalNageWaza + totalNeWaza) > 0 
            ? (totalNeWaza / (totalNageWaza + totalNeWaza)) * 100 : 50,
          winsBeforeLimit: winsBeforeLimitPercent,
          lostByPenaltyPercent,
          dominantSide: totalDominantRight >= totalDominantLeft ? "Droite" : "Gauche",
        };
      }
    });

    playerStats.push(...playerMap.values());
  }

  // Format time from seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // Format duration in min:sec
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}''`;
  };

  // Get the stat label and format value
  const formatStatValue = (key: string, value: number, roundCount: number): string => {
    // For percentages, calculate average
    if (key.toLowerCase().includes("percentage") || key.toLowerCase().includes("rate") || key.toLowerCase().includes("percent")) {
      return `${(value / Math.max(1, roundCount)).toFixed(1)}%`;
    }
    // For scores, show total if bowling
    if (key === "gameScore" && isBowling) {
      return `${value} (moy: ${Math.round(value / Math.max(1, roundCount))})`;
    }
    return value.toString();
  };

  // Get stat display name
  const getStatLabel = (key: string): string => {
    const labels: Record<string, string> = {
      // Bowling
      gameScore: "Score total",
      strikes: "Strikes",
      strikePercentage: "% Strikes",
      spares: "Spares",
      sparePercentage: "% Spares",
      openFrames: "Open Frames",
      splitCount: "Splits",
      splitConverted: "Splits convertis",
      splitConversionRate: "% Conversion splits",
      pocketCount: "Boules en poche",
      pocketPercentage: "% Boules en poche",
      singlePinCount: "Quilles seules",
      singlePinConverted: "Q. seules converties",
      singlePinConversionRate: "% Conv. Q. seules",
      // Judo - Per combat
      combatResult: "Résultat",
      victoryModeIppon: "Victoires par Ippon",
      victoryModeWazaari: "Victoires par Waza-ari",
      victoryModeDecision: "Victoires par Décision",
      victoryModeHansoku: "Victoires par Hansoku",
      finalScore: "Score total",
      combatDuration: "Durée totale (sec)",
      attackAttempts: "Attaques tentées",
      attackEffective: "Attaques efficaces",
      techniqueNageWaza: "Techniques Nage-waza",
      techniqueNeWaza: "Techniques Ne-waza",
      shidoReceived: "Shido reçus",
      shidoProvoked: "Shido provoqués",
      hansokuMake: "Hansoku-make",
      groundTimeSeconds: "Temps au sol (sec)",
      immobilizationAttempts: "Tent. immobilisation",
      armLockAttempts: "Tent. clé de bras",
      chokeAttempts: "Tent. étranglement",
      neWazaSuccess: "Réussites ne-waza",
      effectiveEngagementTime: "Temps engagement (sec)",
      passivityPhases: "Phases passivité",
      goldenScore: "Combats en Golden Score",
      goldenScoreDuration: "Durée Golden Score (sec)",
      attacksReceived: "Attaques subies",
      scoresConceded: "Scores concédés",
      attacksNeutralized: "Attaques neutralisées",
      // Aviron
      strokeRate: "Coups/minute",
      heartRate: "FC moyenne",
    };
    return labels[key] || key;
  };

  // Get important stats to highlight based on sport
  const getHighlightedStats = (stats: Record<string, number>, roundCount: number) => {
    if (isBowling) {
      return [
        { label: "High Game", value: stats.gameScore ? Math.round(stats.gameScore / roundCount) : 0, suffix: "" },
        { label: "Total Pins", value: stats.gameScore || 0, suffix: "" },
        { label: "% Strikes", value: stats.strikePercentage ? (stats.strikePercentage / roundCount).toFixed(1) : "0", suffix: "%" },
        { label: "% Spares", value: stats.sparePercentage ? (stats.sparePercentage / roundCount).toFixed(1) : "0", suffix: "%" },
      ];
    }
    if (isJudo) {
      return [
        { label: "Ippon", value: stats.victoryModeIppon || 0, suffix: "" },
        { label: "Waza-ari", value: stats.victoryModeWazaari || 0, suffix: "" },
        { label: "Shido reçus", value: stats.shidoReceived || 0, suffix: "" },
      ];
    }
    return [];
  };

  // PDF Export function
  const exportToPDF = () => {
    if (playerStats.length === 0) {
      toast.error("Aucune statistique à exporter");
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Statistiques - ${competitionName}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      // Date
      if (competitionDate) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        const formattedDate = format(new Date(competitionDate), "d MMMM yyyy", { locale: fr });
        pdf.text(formattedDate, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
      }

      pdf.setFontSize(10);
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // For each player
      playerStats.forEach((player, playerIndex) => {
        // Check if we need a new page
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        // Player header
        pdf.setFillColor(59, 130, 246); // Blue
        pdf.rect(10, yPos - 5, pageWidth - 20, 10, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(player.playerName, 15, yPos + 2);
        pdf.text(`${player.roundCount} ${roundLabel}`, pageWidth - 15, yPos + 2, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        yPos += 15;

        // Win/Loss record
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Victoires: ${player.wins} | Défaites: ${player.losses}${player.draws > 0 ? ` | Nuls: ${player.draws}` : ""}`, 15, yPos);
        yPos += 8;

        // Judo specific computed stats
        if (isJudo && player.judoComputed) {
          const jc = player.judoComputed;

          // Section: Résultats
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("RÉSULTATS DE LA COMPÉTITION", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");
          pdf.text(`% de victoires: ${jc.winPercentage.toFixed(1)}%`, 15, yPos);
          yPos += 6;

          // Section: Scoring
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("SCORING", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");
          pdf.text(`Ippon/combat: ${jc.ipponPerCombat.toFixed(2)} | Waza-ari/combat: ${jc.wazaariPerCombat.toFixed(2)}`, 15, yPos);
          yPos += 6;
          pdf.text(`% victoires avant limite: ${jc.winsBeforeLimit.toFixed(1)}%`, 15, yPos);
          yPos += 8;

          // Section: Attaque & Style
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("ATTAQUE & STYLE", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");
          pdf.text(`% Nage-waza: ${jc.nageWazaPercent.toFixed(1)}% | % Ne-waza: ${jc.neWazaPercent.toFixed(1)}%`, 15, yPos);
          yPos += 6;
          pdf.text(`Côté dominant: ${jc.dominantSide}`, 15, yPos);
          yPos += 8;

          // Section: Discipline
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("DISCIPLINE", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");
          pdf.text(`Moyenne Shido/combat: ${jc.avgShidoPerCombat.toFixed(2)}`, 15, yPos);
          yPos += 6;
          pdf.text(`% combats perdus par pénalités: ${jc.lostByPenaltyPercent.toFixed(1)}%`, 15, yPos);
          yPos += 8;

          // Section: Physique & Endurance
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("PHYSIQUE & ENDURANCE", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");
          pdf.text(`Temps moyen combats: ${formatDuration(jc.avgCombatDuration)}`, 15, yPos);
          yPos += 6;
          pdf.text(`% combats en Golden Score: ${jc.goldenScorePercent.toFixed(1)}%`, 15, yPos);
          yPos += 6;
          pdf.text(`Performance GS: ${jc.goldenScoreWins}V / ${jc.goldenScoreLosses}D`, 15, yPos);
          yPos += 10;
        }

        // Generic stats display
        if (!isJudo && Object.keys(player.stats).length > 0) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos - 3, pageWidth - 20, 7, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text("STATISTIQUES DÉTAILLÉES", 15, yPos + 2);
          yPos += 12;
          pdf.setFont("helvetica", "normal");

          Object.entries(player.stats)
            .filter(([key]) => !key.includes("bowlingFrames"))
            .forEach(([key, value]) => {
              if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
              }
              pdf.text(`${getStatLabel(key)}: ${formatStatValue(key, value, player.roundCount)}`, 15, yPos);
              yPos += 5;
            });
          yPos += 5;
        }

        // Aviron best time
        if (isAviron && player.bestTime) {
          pdf.text(`Meilleur temps: ${formatTime(player.bestTime)}`, 15, yPos);
          yPos += 10;
        }

        // Separator between players
        if (playerIndex < playerStats.length - 1) {
          yPos += 5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(10, yPos, pageWidth - 10, yPos);
          yPos += 10;
        }
      });

      // Save PDF
      const filename = `stats_${competitionName.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
      toast.success("PDF exporté avec succès");
    } catch (error) {
      console.error("Erreur export PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques - {competitionName}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Résumé des statistiques agrégées depuis les {roundLabel.toLowerCase()}
            </p>
            {playerStats.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exporter PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement des statistiques...</p>
            </div>
          ) : playerStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune statistique enregistrée pour cette compétition.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ajoutez des {roundLabel.toLowerCase()} dans "Gestion des {roundLabel}" pour voir les statistiques ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Athletics: Group by discipline */}
              {isAthletics ? (() => {
                // Group players by discipline
                const disciplineGroups = new Map<string, PlayerAggregatedStats[]>();
                playerStats.forEach(p => {
                  const disc = p.specialty || p.discipline || "Général";
                  if (!disciplineGroups.has(disc)) disciplineGroups.set(disc, []);
                  disciplineGroups.get(disc)!.push(p);
                });

                return Array.from(disciplineGroups.entries()).map(([discipline, players]) => {
                  const disciplineStats = getAthletismeStatsForDiscipline(discipline);
                  return (
                    <div key={discipline} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Medal className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{discipline}</h3>
                        <Badge variant="secondary">{players.length} athlète{players.length > 1 ? 's' : ''}</Badge>
                      </div>

                      {players.map(player => (
                        <Card key={player.playerId}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-base">
                              <span>{player.playerName}</span>
                              <div className="flex gap-2">
                                <Badge variant="secondary">
                                  {player.roundCount} épreuve{player.roundCount > 1 ? 's' : ''}
                                </Badge>
                                {player.bestRanking && (
                                  <Badge variant="outline" className="gap-1">
                                    🏅 {player.bestRanking}e
                                  </Badge>
                                )}
                                {player.qualifications > 0 && (
                                  <Badge className="gap-1 bg-green-600">
                                    {player.qualifications}Q
                                  </Badge>
                                )}
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Summary KPIs */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Épreuves</p>
                                <p className="font-bold">{player.roundCount}</p>
                              </div>
                              {player.bestRanking && (
                                <div className="p-2 rounded bg-primary/10">
                                  <p className="text-xs text-muted-foreground">Meilleur classement</p>
                                  <p className="font-bold text-primary">{player.bestRanking}e</p>
                                </div>
                              )}
                              <div className="p-2 rounded bg-accent/50">
                                <p className="text-xs text-muted-foreground">Qualifications</p>
                                <p className="font-bold">{player.qualifications}/{player.roundCount}</p>
                              </div>
                            </div>

                            {/* Rounds detail table */}
                            {player.rounds.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                                  <Timer className="h-4 w-4" />
                                  Détail des épreuves
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-muted/50">
                                        <th className="text-left px-2 py-1.5 font-medium">Phase</th>
                                        <th className="px-2 py-1.5 font-medium text-center">Place</th>
                                        <th className="px-2 py-1.5 font-medium text-center">Résultat</th>
                                        {disciplineStats.slice(0, 5).map(s => (
                                          <th key={s.key} className="px-2 py-1.5 font-medium text-center" title={s.label}>
                                            {s.shortLabel}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {player.rounds.map((round, idx) => (
                                        <tr key={idx} className={idx % 2 === 1 ? "bg-muted/20" : ""}>
                                          <td className="px-2 py-1.5">
                                            {ATHLETISME_PHASES.find(p => p.value === round.phase)?.label || round.phase || `Épreuve ${idx + 1}`}
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-semibold">
                                            {round.ranking ? (
                                              <Badge variant={round.ranking <= 3 ? "default" : "secondary"} className="text-[10px]">
                                                {round.ranking === 1 ? "🥇" : round.ranking === 2 ? "🥈" : round.ranking === 3 ? "🥉" : `${round.ranking}e`}
                                              </Badge>
                                            ) : '-'}
                                          </td>
                                          <td className="px-2 py-1.5 text-center">
                                            {round.result === 'qualified' ? (
                                              <Badge className="bg-green-600 text-[10px]">Q</Badge>
                                            ) : round.result === 'eliminated' ? (
                                              <Badge variant="destructive" className="text-[10px]">Élim.</Badge>
                                            ) : round.result ? (
                                              <span className="text-muted-foreground">{round.result.toUpperCase()}</span>
                                            ) : '-'}
                                          </td>
                                          {disciplineStats.slice(0, 5).map(s => (
                                            <td key={s.key} className="px-2 py-1.5 text-center font-mono">
                                              {round.stats[s.key] != null ? round.stats[s.key] : '-'}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Aggregated discipline stats */}
                            {Object.keys(player.stats).length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Statistiques cumulées</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {disciplineStats.map(s => {
                                    const val = player.stats[s.key];
                                    if (val == null) return null;
                                    return (
                                      <div key={s.key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                                        <span className="text-xs text-muted-foreground">{s.shortLabel}</span>
                                        <span className="font-medium text-sm">{val}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                });
              })() : (
                /* Non-Athletics: original per-player display */
                playerStats.map((player) => (
                <Card key={player.playerId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{player.playerName}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {player.roundCount} {player.roundCount === 1 ? roundLabel.slice(0, -1) : roundLabel}
                        </Badge>
                        {(player.wins > 0 || player.losses > 0 || player.draws > 0) && (
                          <Badge variant="outline" className="gap-1">
                            <span className="text-primary">{player.wins}V</span>
                            <span className="text-destructive">{player.losses}D</span>
                            {player.draws > 0 && <span className="text-muted-foreground">{player.draws}N</span>}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Judo-specific comprehensive stats */}
                    {isJudo && player.judoComputed && (
                      <div className="space-y-4">
                        {/* Section: Résultats */}
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Résultats de la compétition
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Combats</p>
                              <p className="font-bold">{player.roundCount}</p>
                            </div>
                            <div className="p-2 rounded bg-primary/10 text-center">
                              <p className="text-xs text-muted-foreground">% Victoires</p>
                              <p className="font-bold text-primary">{player.judoComputed.winPercentage.toFixed(1)}%</p>
                            </div>
                            <div className="p-2 rounded bg-green-100 dark:bg-green-900/20 text-center">
                              <p className="text-xs text-muted-foreground">Victoires</p>
                              <p className="font-bold text-green-600">{player.wins}</p>
                            </div>
                            <div className="p-2 rounded bg-red-100 dark:bg-red-900/20 text-center">
                              <p className="text-xs text-muted-foreground">Défaites</p>
                              <p className="font-bold text-red-600">{player.losses}</p>
                            </div>
                          </div>
                        </div>

                        {/* Section: Scoring */}
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Scoring
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Ippon/combat</p>
                              <p className="font-bold">{player.judoComputed.ipponPerCombat.toFixed(2)}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Waza-ari/combat</p>
                              <p className="font-bold">{player.judoComputed.wazaariPerCombat.toFixed(2)}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">% avant limite</p>
                              <p className="font-bold">{player.judoComputed.winsBeforeLimit.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Section: Attaque & Style */}
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                            <Swords className="h-4 w-4" />
                            Attaque & Style
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">% Nage-waza</p>
                              <p className="font-bold">{player.judoComputed.nageWazaPercent.toFixed(1)}%</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">% Ne-waza</p>
                              <p className="font-bold">{player.judoComputed.neWazaPercent.toFixed(1)}%</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Côté dominant</p>
                              <p className="font-bold">{player.judoComputed.dominantSide}</p>
                            </div>
                          </div>
                        </div>

                        {/* Section: Discipline */}
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Discipline</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Moy. Shido/combat</p>
                              <p className="font-bold">{player.judoComputed.avgShidoPerCombat.toFixed(2)}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">% perdus par pénalités</p>
                              <p className="font-bold">{player.judoComputed.lostByPenaltyPercent.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Section: Physique & Endurance */}
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Physique & Endurance</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">Durée moy.</p>
                              <p className="font-bold">{formatDuration(player.judoComputed.avgCombatDuration)}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground">% Golden Score</p>
                              <p className="font-bold">{player.judoComputed.goldenScorePercent.toFixed(1)}%</p>
                            </div>
                            <div className="p-2 rounded bg-green-100 dark:bg-green-900/20 text-center">
                              <p className="text-xs text-muted-foreground">Vic. en GS</p>
                              <p className="font-bold text-green-600">{player.judoComputed.goldenScoreWins}</p>
                            </div>
                            <div className="p-2 rounded bg-red-100 dark:bg-red-900/20 text-center">
                              <p className="text-xs text-muted-foreground">Déf. en GS</p>
                              <p className="font-bold text-red-600">{player.judoComputed.goldenScoreLosses}</p>
                            </div>
                          </div>
                        </div>

                        {/* All raw stats */}
                        {Object.keys(player.stats).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Détails bruts</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(player.stats)
                                .filter(([key]) => !key.includes("bowlingFrames"))
                                .map(([key, value]) => (
                                  <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                                    <span className="text-xs text-muted-foreground">{getStatLabel(key)}</span>
                                    <span className="font-medium text-sm">{formatStatValue(key, value, player.roundCount)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Non-Judo sports: Original display */}
                    {!isJudo && (
                      <>
                        {/* Highlighted stats */}
                        {getHighlightedStats(player.stats, player.roundCount).length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {getHighlightedStats(player.stats, player.roundCount).map((stat, idx) => (
                              <div key={idx} className="p-3 rounded-lg bg-primary/5 text-center">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-lg font-bold text-primary">
                                  {stat.value}{stat.suffix}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Best time for Aviron */}
                        {isAviron && player.bestTime && (
                          <div className="p-3 rounded-lg bg-accent/50 mb-4">
                            <p className="text-xs text-muted-foreground">Meilleur temps</p>
                            <p className="text-lg font-bold text-primary">{formatTime(player.bestTime)}</p>
                          </div>
                        )}

                        {/* All stats */}
                        {Object.keys(player.stats).length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(player.stats)
                              .filter(([key]) => !key.includes("bowlingFrames"))
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                                  <span className="text-sm text-muted-foreground">{getStatLabel(key)}</span>
                                  <span className="font-medium">{formatStatValue(key, value, player.roundCount)}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        {Object.keys(player.stats).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Pas de statistiques détaillées disponibles
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t flex-shrink-0">
          {playerStats.length > 0 && (
            <Button variant="outline" onClick={exportToPDF} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className={playerStats.length === 0 ? "ml-auto" : ""}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}