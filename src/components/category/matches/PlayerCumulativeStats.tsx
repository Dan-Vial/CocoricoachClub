import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Trophy, Target, Shield, Activity, Dumbbell, Filter, CheckSquare, Calendar, Download, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { CumulativeStatsCharts } from "./CumulativeStatsCharts";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { preparePdfWithSettings } from "@/lib/pdfExport";

interface PlayerCumulativeStatsProps {
  categoryId: string;
  sportType?: string;
}

interface MatchInfo {
  id: string;
  match_date: string;
  opponent: string;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
}

export function PlayerCumulativeStats({ categoryId, sportType = "XV" }: PlayerCumulativeStatsProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Use stat preferences hook to respect user's configured stats
  const { stats: sportStats, isLoading: loadingPrefs } = useStatPreferences({
    categoryId,
    sportType,
  });
  const statCategories = getStatCategories(sportType);

  // Fetch all matches that have stats data for this category
  const { data: allMatches = [] } = useQuery({
    queryKey: ["matches-list-cumulative", categoryId],
    queryFn: async () => {
      // Get match IDs that have player stats
      const { data: statsMatchIds, error: statsError } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .in("match_id", 
          (await supabase
            .from("matches")
            .select("id")
            .eq("category_id", categoryId)
          ).data?.map(m => m.id) || []
        );
      if (statsError) throw statsError;
      
      const uniqueMatchIds = [...new Set((statsMatchIds || []).map(s => s.match_id))];
      if (uniqueMatchIds.length === 0) return [] as MatchInfo[];

      const { data, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .in("id", uniqueMatchIds)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return (data || []) as MatchInfo[];
    },
  });

  // Determine which match IDs to use (all or selected)
  const activeMatchIds = useMemo(() => {
    if (selectedMatchIds.length === 0) return allMatches.map(m => m.id);
    return selectedMatchIds;
  }, [selectedMatchIds, allMatches]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["cumulative_player_stats", categoryId, sportType, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];

      // Get all player stats for selected matches
      const { data: playerStats, error: statsError } = await supabase
        .from("player_match_stats")
        .select(`
          *,
          players(id, name, first_name)
        `)
        .in("match_id", activeMatchIds);

      if (statsError) throw statsError;
      if (!playerStats) return [];

      // Aggregate stats by player
      const aggregated: Record<string, CumulativeStats> = {};

      playerStats.forEach((stat) => {
        const player = stat.players as { id: string; name: string; first_name?: string } | null;
        const playerId = stat.player_id;
        const playerName = player
          ? [player.first_name, player.name].filter(Boolean).join(" ")
          : "Athlète inconnu";

        if (!aggregated[playerId]) {
          aggregated[playerId] = {
            playerId,
            playerName,
            matchesPlayed: 0,
            sportData: {},
          };
        }

        const p = aggregated[playerId];
        p.matchesPlayed += 1;

        // Aggregate sport-specific stats from sport_data JSONB
        const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
        
        sportStats.forEach(statField => {
          if (statField.computedFrom) return;
          
          const value = sportData[statField.key] || 
                       stat[statField.key as keyof typeof stat] || 
                       0;
          
          if (!p.sportData[statField.key]) {
            p.sportData[statField.key] = 0;
          }
          p.sportData[statField.key] += Number(value) || 0;
        });
      });

      // Compute percentage stats from aggregated totals
      Object.values(aggregated).forEach(p => {
        sportStats.forEach(statField => {
          if (statField.computedFrom) {
            const { successKey, totalKey, failureKey } = statField.computedFrom;
            const success = p.sportData[successKey] || 0;
            const total = totalKey 
              ? (p.sportData[totalKey] || 0)
              : success + (p.sportData[failureKey!] || 0);
            p.sportData[statField.key] = total > 0 ? Math.round((success / total) * 100) : 0;
          }
        });
      });

      return Object.values(aggregated);
    },
    enabled: activeMatchIds.length > 0,
  });

  // Fetch per-match breakdown for charts
  const { data: matchesDataForCharts = [] } = useQuery({
    queryKey: ["per_match_player_stats", categoryId, sportType, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];

      const { data: playerStats, error } = await supabase
        .from("player_match_stats")
        .select(`*, players(id, name, first_name)`)
        .in("match_id", activeMatchIds);

      if (error) throw error;
      if (!playerStats) return [];

      // Group by match
      const matchMap: Record<string, {
        matchId: string;
        matchLabel: string;
        matchDate: string;
        players: Record<string, { playerName: string; sportData: Record<string, number> }>;
      }> = {};

      playerStats.forEach((stat) => {
        const matchId = stat.match_id;
        const matchInfo = allMatches.find(m => m.id === matchId);
        if (!matchMap[matchId]) {
          matchMap[matchId] = {
            matchId,
            matchLabel: matchInfo ? `vs ${matchInfo.opponent || '?'}` : matchId.slice(0, 6),
            matchDate: matchInfo?.match_date || "",
            players: {},
          };
        }
        const player = stat.players as { id: string; name: string; first_name?: string } | null;
        const playerId = stat.player_id;
        const playerName = player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Inconnu";
        const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
        
        // Also check top-level keys
        const merged: Record<string, number> = {};
        sportStats.forEach(sf => {
          if (!sf.computedFrom) {
            merged[sf.key] = Number(sportData[sf.key] || stat[sf.key as keyof typeof stat] || 0) || 0;
          }
        });
        
        matchMap[matchId].players[playerId] = { playerName, sportData: merged };
      });

      // Sort by date ascending for evolution chart
      return Object.values(matchMap).sort((a, b) => a.matchDate.localeCompare(b.matchDate));
    },
    enabled: activeMatchIds.length > 1,
  });

  const toggleMatch = (matchId: string) => {
    setSelectedMatchIds(prev => {
      // If currently "all selected" (empty array), switch to "all except this one"
      if (prev.length === 0) {
        return allMatches.filter(m => m.id !== matchId).map(m => m.id);
      }
      if (prev.includes(matchId)) {
        const newSelection = prev.filter(id => id !== matchId);
        // If nothing left selected, go back to "all"
        return newSelection.length === 0 ? [] : newSelection;
      }
      return [...prev, matchId];
    });
  };

  const selectAllMatches = () => setSelectedMatchIds([]);
  const clearSelection = () => setSelectedMatchIds(allMatches.map(m => m.id));

  // Compute per-player progression (first match vs last match)
  const playerProgressions = useMemo(() => {
    if (!matchesDataForCharts || matchesDataForCharts.length < 2 || !stats) return {};
    const progressions: Record<string, Record<string, number>> = {};
    stats.forEach(player => {
      const playerMatchData = matchesDataForCharts
        .filter(m => m.players[player.playerId])
        .map(m => m.players[player.playerId].sportData);
      if (playerMatchData.length < 2) return;
      const first = playerMatchData[0];
      const last = playerMatchData[playerMatchData.length - 1];
      progressions[player.playerId] = {};
      sportStats.forEach(stat => {
        const firstVal = first[stat.key] || 0;
        const lastVal = last[stat.key] || 0;
        progressions[player.playerId][stat.key] = lastVal - firstVal;
      });
    });
    return progressions;
  }, [matchesDataForCharts, stats, sportStats]);

  const selectedCount = selectedMatchIds.length === 0 ? allMatches.length : selectedMatchIds.length;

  if (isLoading || loadingPrefs) {
    return <p className="text-muted-foreground">Chargement des statistiques...</p>;
  }

  if (!stats || stats.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune statistique enregistrée pour le moment.</p>
            <p className="text-sm mt-2">Les statistiques apparaîtront ici une fois saisies pour les matchs.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get top performers
  const scoringStats = sportStats.filter(s => s.category === "scoring");
  const attackStats = sportStats.filter(s => s.category === "attack");
  const defenseStats = sportStats.filter(s => s.category === "defense");

  const topScoringStatKey = scoringStats[0]?.key;
  const topAttackStatKey = attackStats[0]?.key;
  const topDefenseStatKey = defenseStats[0]?.key;

  const topScorers = topScoringStatKey 
    ? [...stats].sort((a, b) => (b.sportData[topScoringStatKey] || 0) - (a.sportData[topScoringStatKey] || 0)).slice(0, 3)
    : [];
  const topAttackers = topAttackStatKey
    ? [...stats].sort((a, b) => (b.sportData[topAttackStatKey] || 0) - (a.sportData[topAttackStatKey] || 0)).slice(0, 3)
    : [];
  const topDefenders = topDefenseStatKey
    ? [...stats].sort((a, b) => (b.sportData[topDefenseStatKey] || 0) - (a.sportData[topDefenseStatKey] || 0)).slice(0, 3)
    : [];

  const getCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "scoring": return <Trophy className="h-4 w-4 text-primary" />;
      case "attack": return <Target className="h-4 w-4 text-primary" />;
      case "defense": return <Shield className="h-4 w-4 text-primary" />;
      case "general": return <Activity className="h-4 w-4 text-primary" />;
      default: return <Dumbbell className="h-4 w-4 text-primary" />;
    }
  };



  // Export Excel
  const handleExportExcel = async () => {
    if (!stats || stats.length === 0) return;
    try {
      const branding = await getExcelBranding(categoryId);
      const wb = new ExcelJS.Workbook();

      statCategories.forEach(cat => {
        const categoryStats = sportStats.filter(s => s.category === cat.key);
        if (categoryStats.length === 0) return;
        
        const ws = wb.addWorksheet(cat.label);
        const colCount = 2 + categoryStats.length * 2; // Name, Matchs, then stat + progression pairs
        ws.columns = [
          { header: "Athlète", key: "name", width: 22 },
          { header: "Matchs", key: "matches", width: 10 },
          ...categoryStats.flatMap(s => [
            { header: s.shortLabel, key: s.key, width: 12 },
            { header: `+/-`, key: `${s.key}_prog`, width: 10 },
          ]),
        ];
        const startRow = addBrandedHeader(ws, `Stats cumulées - ${cat.label}`, branding, [
          ["Matchs sélectionnés", `${selectedCount}/${allMatches.length}`],
        ]);
        styleDataHeaderRow(ws, startRow, colCount, branding.headerColor);
        const headerRow = ws.getRow(startRow);
        headerRow.getCell(1).value = "Athlète";
        headerRow.getCell(2).value = "Matchs";
        categoryStats.forEach((s, i) => {
          headerRow.getCell(3 + i * 2).value = s.shortLabel;
          headerRow.getCell(4 + i * 2).value = "+/-";
        });

        const sorted = [...stats].sort((a, b) => {
          const firstStat = categoryStats[0]?.key;
          return firstStat ? (b.sportData[firstStat] || 0) - (a.sportData[firstStat] || 0) : 0;
        });

        sorted.forEach((p, idx) => {
          const row = ws.getRow(startRow + 1 + idx);
          row.getCell(1).value = p.playerName;
          row.getCell(2).value = p.matchesPlayed;
          categoryStats.forEach((s, i) => {
            const val = p.sportData[s.key] || 0;
            row.getCell(3 + i * 2).value = s.computedFrom ? `${val}%` : val;
            const prog = playerProgressions[p.playerId]?.[s.key] || 0;
            const progCell = row.getCell(4 + i * 2);
            progCell.value = prog > 0 ? `+${prog}` : String(prog);
            progCell.font = { color: { argb: prog > 0 ? "FF16A34A" : prog < 0 ? "FFDC2626" : "FF64748B" } };
          });
        });
        addZebraRows(ws, startRow + 1, startRow + sorted.length, colCount);
        addFooter(ws, startRow + sorted.length + 1, colCount, branding.footerText);
      });

      await downloadWorkbook(wb, `stats-competition-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!stats || stats.length === 0) return;
    try {
      const { settings, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header
      if (settings?.header_color) {
        const hc = settings.header_color.replace("#", "");
        doc.setFillColor(parseInt(hc.substring(0, 2), 16), parseInt(hc.substring(2, 4), 16), parseInt(hc.substring(4, 6), 16));
      } else {
        doc.setFillColor(34, 67, 120);
      }
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("Stats compétition cumulées", 14, 12);
      doc.setFontSize(10);
      doc.text(`${clubName || ""} • ${categoryName || ""} • ${seasonName || ""}`, 14, 20);
      doc.text(`${selectedCount} matchs • ${format(new Date(), "dd/MM/yyyy")}`, pageW - 14, 20, { align: "right" });

      let y = 36;

      statCategories.forEach((cat, catIdx) => {
        const categoryStats = sportStats.filter(s => s.category === cat.key).slice(0, 5);
        if (categoryStats.length === 0) return;

        if (catIdx > 0 && y > pageH - 50) {
          doc.addPage();
          y = 15;
        }

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(cat.label, 14, y);
        y += 6;

        // Table header
        const colWidths = [60, 20, ...categoryStats.flatMap(() => [22, 18])];
        const headers = ["Athlète", "M", ...categoryStats.flatMap(s => [s.shortLabel, "+/-"])];
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageW - 28, 7, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let x = 14;
        headers.forEach((h, i) => {
          doc.text(h, x + 1, y + 5);
          x += colWidths[i] || 20;
        });
        y += 9;
        doc.setFont("helvetica", "normal");

        const sorted = [...stats].sort((a, b) => {
          const firstStat = categoryStats[0]?.key;
          return firstStat ? (b.sportData[firstStat] || 0) - (a.sportData[firstStat] || 0) : 0;
        });

        sorted.forEach((p) => {
          if (y > pageH - 15) {
            doc.addPage();
            y = 15;
          }
          x = 14;
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(8);
          doc.text(p.playerName.substring(0, 20), x + 1, y + 4);
          x += colWidths[0];
          doc.text(String(p.matchesPlayed), x + 1, y + 4);
          x += colWidths[1];

          categoryStats.forEach((s, i) => {
            const val = p.sportData[s.key] || 0;
            doc.setTextColor(30, 41, 59);
            doc.text(s.computedFrom ? `${val}%` : String(val), x + 1, y + 4);
            x += colWidths[2 + i * 2];
            
            const prog = playerProgressions[p.playerId]?.[s.key] || 0;
            if (prog > 0) doc.setTextColor(22, 163, 74);
            else if (prog < 0) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(100, 116, 139);
            doc.text(prog > 0 ? `+${prog}` : String(prog), x + 1, y + 4);
            x += colWidths[3 + i * 2] || 18;
          });
          y += 7;
        });
        y += 6;
      });

      doc.save(`stats-competition-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const ProgressionIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{value}</span>;
    if (value < 0) return <span className="text-destructive text-xs font-medium flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{value}</span>;
    return <span className="text-muted-foreground text-xs"><Minus className="h-3 w-3 inline" /></span>;
  };

  return (
    <div className="space-y-6">
      {/* Match filter + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrer les matchs
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {selectedCount}/{allMatches.length}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">Sélectionner les matchs</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choisissez les matchs à inclure dans le cumul
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllMatches}>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Tous
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedMatchIds([])}>
                  Réinitialiser
                </Button>
              </div>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-1">
                {allMatches.map(match => {
                  const isSelected = selectedMatchIds.length === 0 || selectedMatchIds.includes(match.id);
                  return (
                    <button
                      key={match.id}
                      onClick={() => toggleMatch(match.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-muted ${
                        isSelected ? 'bg-primary/5' : 'opacity-50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          vs {match.opponent || "Adversaire inconnu"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(match.match_date), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {allMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun match</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {selectedMatchIds.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Trophy className="h-3 w-3" />
            {selectedMatchIds.length} match{selectedMatchIds.length > 1 ? 's' : ''} sélectionné{selectedMatchIds.length > 1 ? 's' : ''}
          </Badge>
        )}
        {selectedMatchIds.length === 0 && allMatches.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            Tous les matchs ({allMatches.length})
          </Badge>
        )}
      </div>

      {/* Charts section */}
      {stats && stats.length > 0 && (
        <CumulativeStatsCharts
          stats={stats}
          matchesData={matchesDataForCharts}
          sportStats={sportStats}
          selectedMatchIds={activeMatchIds}
        />
      )}

      {/* Top performers cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topScoringStatKey && scoringStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Top {scoringStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topScorers.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topScoringStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {topAttackStatKey && attackStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Top {attackStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topAttackers.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topAttackStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {topDefenseStatKey && defenseStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Top {defenseStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topDefenders.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topDefenseStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed stats table */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques détaillées par athlète
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={statCategories[0]?.key || "scoring"} className="w-full">
            <TabsList className={`grid w-full grid-cols-${Math.min(statCategories.length, 4)}`}>
              {statCategories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="gap-1">
                  {getCategoryIcon(cat.key)}
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {statCategories.map(cat => {
              const categoryStats = sportStats.filter(s => s.category === cat.key);
              
              return (
                <TabsContent key={cat.key} value={cat.key}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlète</TableHead>
                          <TableHead className="text-center">Matchs</TableHead>
                          {categoryStats.slice(0, 6).map(stat => (
                            <TableHead key={stat.key} className="text-center">
                              {stat.shortLabel}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...stats]
                          .sort((a, b) => {
                            const firstStat = categoryStats[0]?.key;
                            if (!firstStat) return 0;
                            return (b.sportData[firstStat] || 0) - (a.sportData[firstStat] || 0);
                          })
                          .map((p) => (
                            <TableRow key={p.playerId}>
                              <TableCell className="font-medium">{p.playerName}</TableCell>
                              <TableCell className="text-center">{p.matchesPlayed}</TableCell>
                              {categoryStats.slice(0, 6).map(stat => (
                                <TableCell key={stat.key} className="text-center">
                                  {stat.computedFrom 
                                    ? `${p.sportData[stat.key] || 0}%`
                                    : (p.sportData[stat.key] || 0)
                                  }
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
