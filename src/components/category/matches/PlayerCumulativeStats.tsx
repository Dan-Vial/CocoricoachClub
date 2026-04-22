import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Trophy, Target, Shield, Activity, Dumbbell, Filter, CheckSquare, Calendar, Download, FileSpreadsheet, TrendingUp, TrendingDown, Minus, Users, User, Crosshair } from "lucide-react";
import { isRugbyType } from "@/lib/constants/sportTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { groupStatsByTheme } from "@/lib/statSubGroups";
import { pdfGroupColor } from "@/lib/pdfStatGroupPalette";
import { useStatPreferences } from "@/hooks/use-stat-preferences";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { CumulativeStatsCharts } from "./CumulativeStatsCharts";
import { TeamCumulativeStats } from "./TeamCumulativeStats";
import { CumulativeKickingMap } from "./CumulativeKickingMap";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { preparePdfWithSettings } from "@/lib/pdfExport";
import { drawPdfRugbyField, drawPdfZoneStatsGrid, svgPctToPdfPos } from "@/lib/pdfRugbyField";
import { drawStatEvolutionTable, drawStatLineChart, type StatEvolutionData } from "@/lib/pdfPlayerEvolution";

interface PlayerCumulativeStatsProps {
  categoryId: string;
  sportType?: string;
  playerId?: string;
}

interface MatchInfo {
  id: string;
  match_date: string;
  opponent: string;
  is_home?: boolean;
  location?: string;
  match_time?: string;
  competition?: string;
  competition_stage?: string;
  event_type?: string;
  score_home?: number | null;
  score_away?: number | null;
  effective_play_time?: number | null;
  longest_play_sequence?: number | null;
  average_play_sequence?: number | null;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
  avatarUrl?: string;
  position?: string;
}

export function PlayerCumulativeStats({ categoryId, sportType = "XV", playerId: fixedPlayerId }: PlayerCumulativeStatsProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(fixedPlayerId || "");
  const [exportPlayerId, setExportPlayerId] = useState<string>("");
  const isSinglePlayerMode = !!fixedPlayerId;
  const isRugby = isRugbyType(sportType);

  const { stats: sportStats, isLoading: loadingPrefs } = useStatPreferences({ categoryId, sportType });
  const statCategories = getStatCategories(sportType);

  const { data: allMatches = [] } = useQuery({
    queryKey: ["matches-list-cumulative", categoryId],
    queryFn: async () => {
      const { data: statsMatchIds, error: statsError } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .in("match_id",
          (await supabase.from("matches").select("id").eq("category_id", categoryId)).data?.map(m => m.id) || []
        );
      if (statsError) throw statsError;
      const uniqueMatchIds = [...new Set((statsMatchIds || []).map(s => s.match_id))];
      if (uniqueMatchIds.length === 0) return [] as MatchInfo[];
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent, is_home, location, match_time, competition, competition_stage, event_type, score_home, score_away, effective_play_time, longest_play_sequence, average_play_sequence")
        .in("id", uniqueMatchIds)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return (data || []) as MatchInfo[];
    },
  });

  const activeMatchIds = useMemo(() => {
    if (selectedMatchIds.length === 0) return allMatches.map(m => m.id);
    return selectedMatchIds;
  }, [selectedMatchIds, allMatches]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["cumulative_player_stats", categoryId, sportType, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data: playerStats, error: statsError } = await supabase
        .from("player_match_stats")
        .select(`*, players(id, name, first_name, avatar_url, position)`)
        .in("match_id", activeMatchIds);
      if (statsError) throw statsError;
      if (!playerStats) return [];

      const aggregated: Record<string, CumulativeStats> = {};
      playerStats.forEach((stat) => {
        const player = stat.players as { id: string; name: string; first_name?: string; avatar_url?: string; position?: string } | null;
        const playerId = stat.player_id;
        const playerName = player ? [player.first_name, player.name].filter(Boolean).join(" ") : "Athlète inconnu";
        if (!aggregated[playerId]) {
          aggregated[playerId] = { playerId, playerName, matchesPlayed: 0, sportData: {}, avatarUrl: player?.avatar_url || undefined, position: player?.position || undefined };
        }
        const p = aggregated[playerId];
        p.matchesPlayed += 1;
        const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
        sportStats.forEach(statField => {
          if (statField.computedFrom) return;
          const value = sportData[statField.key] || stat[statField.key as keyof typeof stat] || 0;
          if (!p.sportData[statField.key]) p.sportData[statField.key] = 0;
          p.sportData[statField.key] += Number(value) || 0;
        });
      });

      Object.values(aggregated).forEach(p => {
        sportStats.forEach(statField => {
          if (statField.computedFrom) {
            const { successKey, totalKey, failureKey } = statField.computedFrom;
            const success = p.sportData[successKey] || 0;
            const total = totalKey ? (p.sportData[totalKey] || 0) : success + (p.sportData[failureKey!] || 0);
            p.sportData[statField.key] = total > 0 ? Math.round((success / total) * 100) : 0;
          }
        });
      });

      return Object.values(aggregated);
    },
    enabled: activeMatchIds.length > 0,
  });

  // Fetch per-match kicking data from player_match_stats for rugby
  const { data: kickingData = [] } = useQuery({
    queryKey: ["kicking-from-match-stats", categoryId, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data, error } = await supabase
        .from("player_match_stats")
        .select("player_id, match_id, conversions, penalties_scored, drop_goals, sport_data")
        .in("match_id", activeMatchIds);
      if (error) throw error;
      return data || [];
    },
    enabled: isRugby && activeMatchIds.length > 0,
  });

  // Fetch individual kicking attempts from the dedicated table
  const { data: kickingAttempts = [] } = useQuery({
    queryKey: ["kicking-attempts-cumulative", categoryId, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data, error } = await supabase
        .from("kicking_attempts")
        .select("player_id, match_id, kick_type, zone_x, zone_y, success")
        .eq("category_id", categoryId)
        .in("match_id", activeMatchIds);
      if (error) throw error;
      return data || [];
    },
    enabled: isRugby && activeMatchIds.length > 0,
  });

  // Aggregate kicking stats per player from player_match_stats + kicking_attempts table
  const kickingByPlayerFinal = useMemo(() => {
    const map: Record<string, {
      total: number; success: number;
      penalty: { total: number; success: number };
      conversion: { total: number; success: number };
      drop: { total: number; success: number };
      byMatch: Record<string, { total: number; success: number }>;
      allKicks: { x: number; y: number; kickType: string; success: boolean }[];
    }> = {};

    const ensurePlayer = (playerId: string) => {
      if (!map[playerId]) {
        map[playerId] = {
          total: 0, success: 0,
          penalty: { total: 0, success: 0 },
          conversion: { total: 0, success: 0 },
          drop: { total: 0, success: 0 },
          byMatch: {},
          allKicks: [],
        };
      }
      return map[playerId];
    };

    // First pass: aggregate from player_match_stats (numeric totals)
    kickingData.forEach((row: any) => {
      const sportData = row.sport_data || {};
      const convSuccess = Number(row.conversions) || 0;
      const convAttempts = Number(sportData.conversionAttempts) || convSuccess;
      const penSuccess = Number(row.penalties_scored) || 0;
      const penAttempts = Number(sportData.penaltyAttempts) || penSuccess;
      const dropSuccess = Number(row.drop_goals) || 0;
      const dropAttempts = Number(sportData.dropAttempts) || dropSuccess;

      const totalAttempts = convAttempts + penAttempts + dropAttempts;
      const totalSuccess = convSuccess + penSuccess + dropSuccess;

      if (totalAttempts === 0) return;

      const p = ensurePlayer(row.player_id);
      p.total += totalAttempts;
      p.success += totalSuccess;
      p.penalty.total += penAttempts;
      p.penalty.success += penSuccess;
      p.conversion.total += convAttempts;
      p.conversion.success += convSuccess;
      p.drop.total += dropAttempts;
      p.drop.success += dropSuccess;
      if (!p.byMatch[row.match_id]) p.byMatch[row.match_id] = { total: 0, success: 0 };
      p.byMatch[row.match_id].total += totalAttempts;
      p.byMatch[row.match_id].success += totalSuccess;

      // Collect individual kick positions from sport_data (legacy)
      if (Array.isArray(sportData.kickAttempts)) {
        p.allKicks.push(...sportData.kickAttempts);
      }
    });

    // Second pass: add kick positions from kicking_attempts table
    kickingAttempts.forEach((attempt: any) => {
      const p = ensurePlayer(attempt.player_id);
      p.allKicks.push({
        x: attempt.zone_x,
        y: attempt.zone_y,
        kickType: attempt.kick_type,
        success: attempt.success,
      });

      // If player had no match stats rows, also count totals from kicking_attempts
      // Check if this match was already counted from player_match_stats
      const alreadyCounted = kickingData.some(
        (row: any) => row.player_id === attempt.player_id && row.match_id === attempt.match_id
      );
      if (!alreadyCounted) {
        p.total += 1;
        if (attempt.success) p.success += 1;
        const typeKey = attempt.kick_type as "penalty" | "conversion" | "drop";
        if (p[typeKey]) {
          p[typeKey].total += 1;
          if (attempt.success) p[typeKey].success += 1;
        }
        if (!p.byMatch[attempt.match_id]) p.byMatch[attempt.match_id] = { total: 0, success: 0 };
        p.byMatch[attempt.match_id].total += 1;
        if (attempt.success) p.byMatch[attempt.match_id].success += 1;
      }
    });

    // Deduplicate allKicks (remove duplicates if same position from both sources)
    Object.values(map).forEach(p => {
      const seen = new Set<string>();
      p.allKicks = p.allKicks.filter(k => {
        const key = `${k.x}-${k.y}-${k.kickType}-${k.success}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    return map;
  }, [kickingData, kickingAttempts]);

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

      const matchMap: Record<string, {
        matchId: string; matchLabel: string; matchDate: string;
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
        const merged: Record<string, number> = {};
        sportStats.forEach(sf => {
          if (!sf.computedFrom) {
            merged[sf.key] = Number(sportData[sf.key] || stat[sf.key as keyof typeof stat] || 0) || 0;
          }
        });
        matchMap[matchId].players[playerId] = { playerName, sportData: merged };
      });

      return Object.values(matchMap).sort((a, b) => a.matchDate.localeCompare(b.matchDate));
    },
    enabled: activeMatchIds.length > 1,
  });

  const toggleMatch = (matchId: string) => {
    setSelectedMatchIds(prev => {
      if (prev.length === 0) return allMatches.filter(m => m.id !== matchId).map(m => m.id);
      if (prev.includes(matchId)) {
        const newSel = prev.filter(id => id !== matchId);
        return newSel.length === 0 ? [] : newSel;
      }
      return [...prev, matchId];
    });
  };

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
        progressions[player.playerId][stat.key] = (last[stat.key] || 0) - (first[stat.key] || 0);
      });
    });
    return progressions;
  }, [matchesDataForCharts, stats, sportStats]);

  const filteredStats = isSinglePlayerMode ? stats?.filter(p => p.playerId === fixedPlayerId) : stats;
  const selectedCount = selectedMatchIds.length === 0 ? allMatches.length : selectedMatchIds.length;
  const selectedPlayer = filteredStats?.find(p => p.playerId === (selectedPlayerId || fixedPlayerId)) || filteredStats?.[0];

  // Export Excel
  const handleExportExcel = useCallback(async (mode: "all" | "team" | "individual" | "single" = "all", singlePlayerId?: string) => {
    if (!stats || stats.length === 0) return;
    const exportStats = singlePlayerId ? stats.filter(p => p.playerId === singlePlayerId) : stats;
    try {
      const branding = await getExcelBranding(categoryId);
      const wb = new ExcelJS.Workbook();

      if (mode === "all" || mode === "team") {
        // Sheet: Team totals
        const wsTeam = wb.addWorksheet("Équipe");
        const teamStats: Record<string, number> = {};
        sportStats.forEach(stat => {
          if (stat.computedFrom) return;
          teamStats[stat.key] = stats.reduce((sum, p) => sum + (p.sportData[stat.key] || 0), 0);
        });
        sportStats.forEach(stat => {
          if (stat.computedFrom) {
            const { successKey, totalKey, failureKey } = stat.computedFrom;
            const success = teamStats[successKey] || 0;
            const total = totalKey ? (teamStats[totalKey] || 0) : success + (teamStats[failureKey!] || 0);
            teamStats[stat.key] = total > 0 ? Math.round((success / total) * 100) : 0;
          }
        });

        wsTeam.columns = [
          { header: "Catégorie", key: "cat", width: 15 },
          { header: "Statistique", key: "stat", width: 25 },
          { header: "Total équipe", key: "total", width: 15 },
          { header: "Moy/match", key: "avg", width: 15 },
        ];
        const teamStartRow = addBrandedHeader(wsTeam, "Stats équipe cumulées", branding, [
          ["Matchs", `${selectedCount}/${allMatches.length}`],
        ]);
        styleDataHeaderRow(wsTeam, teamStartRow, 4, branding.headerColor);
        const teamHdr = wsTeam.getRow(teamStartRow);
        teamHdr.getCell(1).value = "Catégorie";
        teamHdr.getCell(2).value = "Statistique";
        teamHdr.getCell(3).value = "Total";
        teamHdr.getCell(4).value = "Moy/match";

        let tRow = teamStartRow + 1;
        // Add score section first
        const matchesWithScores = allMatches.filter(m => activeMatchIds.includes(m.id) && m.score_home != null && m.score_away != null);
        if (matchesWithScores.length > 0) {
          let totalScored = 0, totalConceded = 0, wins = 0, draws = 0, losses = 0;
          matchesWithScores.forEach(m => {
            const scored = m.is_home ? (m.score_home || 0) : (m.score_away || 0);
            const conceded = m.is_home ? (m.score_away || 0) : (m.score_home || 0);
            totalScored += scored;
            totalConceded += conceded;
            if (scored > conceded) wins++;
            else if (scored < conceded) losses++;
            else draws++;
          });
          const scoreRows = [
            { cat: "Bilan", stat: "Points marqués", total: totalScored, avg: Math.round((totalScored / matchesWithScores.length) * 10) / 10 },
            { cat: "Bilan", stat: "Points encaissés", total: totalConceded, avg: Math.round((totalConceded / matchesWithScores.length) * 10) / 10 },
            { cat: "Bilan", stat: "Différentiel", total: totalScored - totalConceded, avg: "" },
            { cat: "Bilan", stat: "Bilan V/N/D", total: `${wins}V ${draws}N ${losses}D`, avg: "" },
          ];
          scoreRows.forEach(sr => {
            const row = wsTeam.getRow(tRow);
            row.getCell(1).value = sr.cat;
            row.getCell(2).value = sr.stat;
            row.getCell(3).value = sr.total;
            row.getCell(4).value = sr.avg;
            if (typeof sr.total === "number" && sr.stat === "Différentiel") {
              row.getCell(3).font = { color: { argb: sr.total >= 0 ? "FF16A34A" : "FFDC2626" } };
            }
            tRow++;
          });
          // Separator row
          tRow++;
        }

        statCategories.forEach(cat => {
          const catStats = sportStats.filter(s => s.category === cat.key);
          catStats.forEach(s => {
            const row = wsTeam.getRow(tRow);
            row.getCell(1).value = cat.label;
            row.getCell(2).value = s.label;
            const val = teamStats[s.key] || 0;
            row.getCell(3).value = s.computedFrom ? `${val}%` : val;
            row.getCell(4).value = s.computedFrom ? "" : Math.round((val / Math.max(selectedCount, 1)) * 10) / 10;
            tRow++;
          });
        });
        addZebraRows(wsTeam, teamStartRow + 1, tRow - 1, 4);
        addFooter(wsTeam, tRow, 4, branding.footerText);
      }

      if (mode === "all" || mode === "individual" || mode === "single") {
        // Individual sheets per category
        statCategories.forEach(cat => {
          const categoryStats = sportStats.filter(s => s.category === cat.key);
          if (categoryStats.length === 0) return;
          const ws = wb.addWorksheet(cat.label);
          const colCount = 2 + categoryStats.length * 2;
          ws.columns = [
            { header: "Athlète", key: "name", width: 22 },
            { header: "Matchs", key: "matches", width: 10 },
            ...categoryStats.flatMap(s => [
              { header: s.shortLabel, key: s.key, width: 12 },
              { header: "+/-", key: `${s.key}_prog`, width: 10 },
            ]),
          ];
          const startRow = addBrandedHeader(ws, `Stats individuelles - ${cat.label}`, branding, [
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
          const sorted = [...exportStats].sort((a, b) => {
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
      }

      const playerLabel = singlePlayerId ? exportStats[0]?.playerName?.replace(/\s+/g, '-') : "";
      const suffix = mode === "team" ? "-equipe" : mode === "single" ? `-${playerLabel}` : mode === "individual" ? "-individuelles" : "";
      await downloadWorkbook(wb, `stats-competition${suffix}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export Excel");
    }
  }, [stats, sportStats, statCategories, categoryId, selectedCount, allMatches, playerProgressions]);

  // Export PDF
  const handleExportPdf = useCallback(async (mode: "all" | "team" | "individual" | "single" = "all", singlePlayerId?: string) => {
    if (!stats || stats.length === 0) return;
    const exportStats = singlePlayerId ? stats.filter(p => p.playerId === singlePlayerId) : stats;
    try {
      const { settings, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const hc = (settings?.header_color || "#224378").replace("#", "");
      const hcR = parseInt(hc.substring(0, 2), 16);
      const hcG = parseInt(hc.substring(2, 4), 16);
      const hcB = parseInt(hc.substring(4, 6), 16);

      const drawHeader = (title: string) => {
        doc.setFillColor(hcR, hcG, hcB);
        doc.rect(0, 0, pageW, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(title, 14, 12);
        doc.setFontSize(10);
        doc.text(`${clubName || ""} • ${categoryName || ""} • ${seasonName || ""}`, 14, 20);
        doc.text(`${selectedCount} matchs • ${format(new Date(), "dd/MM/yyyy")}`, pageW - 14, 20, { align: "right" });
      };
      drawHeader("Stats compétition cumulées");
      let y = 36;

      // Match context info
      const selectedMatches = allMatches.filter(m => activeMatchIds.includes(m.id));
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      selectedMatches.slice(0, 6).forEach((m) => {
        const lieu = m.is_home ? "DOM" : "EXT";
        const loc = m.location ? ` — ${m.location}` : "";
        const comp = m.competition || "";
        const stage = m.competition_stage ? ` (${m.competition_stage})` : "";
        const time = m.match_time ? ` ${m.match_time}` : "";
        const score = (m.score_home != null && m.score_away != null) ? ` ${m.score_home}-${m.score_away}` : "";
        doc.text(
          `${format(new Date(m.match_date), "dd/MM/yy")} • vs ${m.opponent} [${lieu}]${score}${loc}${time} ${comp}${stage}`,
          14, y
        );
        y += 4;
      });
      if (selectedMatches.length > 6) {
        doc.text(`... et ${selectedMatches.length - 6} autre(s)`, 14, y);
        y += 4;
      }
      y += 4;

      // ===== TEAM MODE: Global team stats only (no individual players) =====
      if (mode === "team") {
        // Compute team totals
        const teamStats: Record<string, number> = {};
        sportStats.forEach(stat => {
          if (stat.computedFrom) return;
          teamStats[stat.key] = stats.reduce((sum, p) => sum + (p.sportData[stat.key] || 0), 0);
        });
        sportStats.forEach(stat => {
          if (stat.computedFrom) {
            const { successKey, totalKey, failureKey } = stat.computedFrom;
            const success = teamStats[successKey] || 0;
            const total = totalKey ? (teamStats[totalKey] || 0) : success + (teamStats[failureKey!] || 0);
            teamStats[stat.key] = total > 0 ? Math.round((success / total) * 100) : 0;
          }
        });

        // Compute team progression (first match vs last match)
        const teamProgression: Record<string, number> = {};
        if (matchesDataForCharts.length >= 2) {
          const firstMatch = matchesDataForCharts[0];
          const lastMatch = matchesDataForCharts[matchesDataForCharts.length - 1];
          sportStats.forEach(stat => {
            if (stat.computedFrom) return;
            const firstVal = Object.values(firstMatch.players).reduce((s, p) => s + (p.sportData[stat.key] || 0), 0);
            const lastVal = Object.values(lastMatch.players).reduce((s, p) => s + (p.sportData[stat.key] || 0), 0);
            teamProgression[stat.key] = lastVal - firstVal;
          });
        }

        // ---- Points scored / conceded section ----
        const matchesWithScores = selectedMatches.filter(m => m.score_home != null && m.score_away != null);
        if (matchesWithScores.length > 0) {
          let totalScored = 0;
          let totalConceded = 0;
          let wins = 0, draws = 0, losses = 0;
          matchesWithScores.forEach(m => {
            const scored = m.is_home ? (m.score_home || 0) : (m.score_away || 0);
            const conceded = m.is_home ? (m.score_away || 0) : (m.score_home || 0);
            totalScored += scored;
            totalConceded += conceded;
            if (scored > conceded) wins++;
            else if (scored < conceded) losses++;
            else draws++;
          });
          const avgScored = Math.round((totalScored / matchesWithScores.length) * 10) / 10;
          const avgConceded = Math.round((totalConceded / matchesWithScores.length) * 10) / 10;
          const diff = totalScored - totalConceded;

          // Section title
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Bilan & Score", 14, y);
          y += 7;

          // Cards row
          const cardW = (pageW - 28 - 15) / 4;
          const cards = [
            { label: "Points marqués", value: String(totalScored), sub: `Moy: ${avgScored}/match`, color: [34, 197, 94] as [number, number, number] },
            { label: "Points encaissés", value: String(totalConceded), sub: `Moy: ${avgConceded}/match`, color: [239, 68, 68] as [number, number, number] },
            { label: "Différentiel", value: (diff >= 0 ? "+" : "") + diff, sub: "", color: diff >= 0 ? [34, 197, 94] as [number, number, number] : [239, 68, 68] as [number, number, number] },
            { label: "Bilan", value: `${wins}V ${draws}N ${losses}D`, sub: `${matchesWithScores.length} matchs`, color: [hcR, hcG, hcB] as [number, number, number] },
          ];
          cards.forEach((card, i) => {
            const cx = 14 + i * (cardW + 5);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(cx, y, cardW, 22, 2, 2, "F");
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(cx, y, cardW, 22, 2, 2, "S");
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...card.color);
            doc.text(card.value, cx + cardW / 2, y + 10, { align: "center" });
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(card.label, cx + cardW / 2, y + 16, { align: "center" });
            if (card.sub) {
              doc.setFontSize(6);
              doc.text(card.sub, cx + cardW / 2, y + 20, { align: "center" });
            }
          });
          y += 28;
        }

        // ---- Team play-time metrics (TJE / Séq. la + longue / Séq. moyenne) ----
        {
          const fmtSecToMin = (totalSeconds: number) => {
            const safe = Math.max(0, Math.round(totalSeconds));
            const mins = Math.floor(safe / 60);
            const secs = safe % 60;
            return `${mins}'${secs.toString().padStart(2, "0")}`;
          };
          const epts = selectedMatches
            .map(m => m.effective_play_time)
            .filter((v): v is number => typeof v === "number");
          const longs = selectedMatches
            .map(m => m.longest_play_sequence)
            .filter((v): v is number => typeof v === "number");
          const avgs = selectedMatches
            .map(m => m.average_play_sequence)
            .filter((v): v is number => typeof v === "number");

          if (epts.length > 0 || longs.length > 0 || avgs.length > 0) {
            const avg = (arr: number[]) =>
              arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;
            const eptVal = avg(epts);
            const longVal = longs.length > 0 ? Math.max(...longs) : null;
            const avgVal = avg(avgs);

            if (y > pageH - 40) { doc.addPage(); y = 15; }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("Temps de jeu & Séquences", 14, y);
            y += 7;

            const ptCardW = (pageW - 28 - 10) / 3;
            const ptCards: Array<{
              label: string;
              value: string;
              sub: string;
              color: [number, number, number];
            }> = [
              {
                label: "Tps de jeu effectif (min)",
                value: eptVal != null ? String(eptVal) : "—",
                sub: epts.length > 0 ? `Moy / ${epts.length} match${epts.length > 1 ? "s" : ""}` : "Non renseigné",
                color: [14, 165, 233],
              },
              {
                label: "Séquence la + longue (min)",
                value: longVal != null ? fmtSecToMin(longVal) : "—",
                sub: longs.length > 0 ? "Record équipe" : "Non renseigné",
                color: [139, 92, 246],
              },
              {
                label: "Séquence moyenne (min)",
                value: avgVal != null ? fmtSecToMin(avgVal) : "—",
                sub: avgs.length > 0 ? `Moy / ${avgs.length} match${avgs.length > 1 ? "s" : ""}` : "Non renseigné",
                color: [245, 158, 11],
              },
            ];
            ptCards.forEach((card, i) => {
              const cx = 14 + i * (ptCardW + 5);
              doc.setFillColor(248, 250, 252);
              doc.roundedRect(cx, y, ptCardW, 22, 2, 2, "F");
              doc.setDrawColor(226, 232, 240);
              doc.roundedRect(cx, y, ptCardW, 22, 2, 2, "S");
              doc.setFontSize(16);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(card.color[0], card.color[1], card.color[2]);
              doc.text(card.value, cx + ptCardW / 2, y + 10, { align: "center" });
              doc.setFontSize(7);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(100, 116, 139);
              doc.text(card.label, cx + ptCardW / 2, y + 16, { align: "center" });
              doc.setFontSize(6);
              doc.text(card.sub, cx + ptCardW / 2, y + 20, { align: "center" });
            });
            y += 28;
          }
        }

        // ---- Stats by category, organised in colored sub-blocks (mirrors UI) ----
        statCategories.forEach(cat => {
          const categoryStats = sportStats.filter(s => s.category === cat.key);
          if (categoryStats.length === 0) return;

          const groups = groupStatsByTheme(cat.key, categoryStats);

          if (y > pageH - 50) { doc.addPage(); y = 15; }

          // Category title
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(cat.label, 14, y);
          y += 6;

          const innerW = pageW - 28;
          const labeledGroups = groups.filter(g => g.label);
          const unlabeledGroups = groups.filter(g => !g.label);

          // Render labeled groups side-by-side (each as a colored block)
          if (labeledGroups.length > 0) {
            const gap = 4;
            const blockW = (innerW - gap * (labeledGroups.length - 1)) / labeledGroups.length;

            // Pre-compute per-block heights to align row tops
            const titleH = 6;
            const headerH = 6;
            const rowH = 5;
            const padding = 2;
            const blockHeights = labeledGroups.map(g =>
              titleH + headerH + g.items.length * rowH + padding * 2
            );
            const maxBlockH = Math.max(...blockHeights);

            if (y + maxBlockH > pageH - 12) { doc.addPage(); y = 15; }

            labeledGroups.forEach((group, gi) => {
              const palette = pdfGroupColor(gi);
              const bx = 14 + gi * (blockW + gap);
              const by = y;

              // Outer block (body tint + colored border)
              doc.setFillColor(...palette.body);
              doc.setDrawColor(...palette.border);
              doc.setLineWidth(0.4);
              doc.roundedRect(bx, by, blockW, maxBlockH, 1.5, 1.5, "FD");

              // Title band
              doc.setFillColor(...palette.head);
              doc.roundedRect(bx, by, blockW, titleH, 1.5, 1.5, "F");
              // Square off bottom of title band
              doc.rect(bx, by + titleH - 1.5, blockW, 1.5, "F");

              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...palette.accent);
              doc.text(String(group.label).toUpperCase(), bx + 2, by + 4.2);

              // Column headers (Stat / Total / Moy / +/-)
              const cTotalX = bx + blockW - 22;
              const cAvgX = bx + blockW - 14;
              const cProgX = bx + blockW - 5;
              let ry = by + titleH + headerH - 1.5;
              doc.setFontSize(6);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(71, 85, 105);
              doc.text("Stat", bx + 2, ry);
              doc.text("Tot", cTotalX, ry, { align: "center" });
              doc.text("Moy", cAvgX, ry, { align: "center" });
              doc.text("+/-", cProgX, ry, { align: "center" });

              // Rows
              doc.setFont("helvetica", "normal");
              ry = by + titleH + headerH + 1;
              group.items.forEach((s, idx) => {
                if (idx % 2 === 1) {
                  doc.setFillColor(...palette.head);
                  doc.rect(bx + 0.6, ry - 3.6, blockW - 1.2, rowH, "F");
                }
                const val = teamStats[s.key] || 0;
                const avgVal = s.computedFrom ? "" : String(Math.round((val / Math.max(selectedCount, 1)) * 10) / 10);
                const prog = teamProgression[s.key] || 0;

                doc.setFontSize(6.5);
                doc.setTextColor(30, 41, 59);
                const labelTxt = s.shortLabel.length > 18 ? s.shortLabel.substring(0, 18) : s.shortLabel;
                doc.text(labelTxt, bx + 2, ry);
                doc.text(s.computedFrom ? `${val}%` : String(val), cTotalX, ry, { align: "center" });
                doc.text(avgVal || "—", cAvgX, ry, { align: "center" });

                if (matchesDataForCharts.length >= 2 && !s.computedFrom) {
                  if (prog > 0) doc.setTextColor(22, 163, 74);
                  else if (prog < 0) doc.setTextColor(220, 38, 38);
                  else doc.setTextColor(100, 116, 139);
                  doc.text(prog > 0 ? `+${prog}` : String(prog), cProgX, ry, { align: "center" });
                } else {
                  doc.setTextColor(148, 163, 184);
                  doc.text("—", cProgX, ry, { align: "center" });
                }
                ry += rowH;
              });
            });
            y += maxBlockH + 4;
          }

          // Render unlabeled groups (full-width) as a flat 4-column grid of mini-tiles
          if (unlabeledGroups.length > 0) {
            const palette = pdfGroupColor(labeledGroups.length); // continue palette progression
            unlabeledGroups.forEach(group => {
              const cols = 4;
              const tileW = (innerW - (cols - 1) * 3) / cols;
              const tileH = 12;
              const rows = Math.ceil(group.items.length / cols);
              const blockH = rows * (tileH + 2);
              if (y + blockH > pageH - 12) { doc.addPage(); y = 15; }

              group.items.forEach((s, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const tx = 14 + col * (tileW + 3);
                const ty = y + row * (tileH + 2);
                const val = teamStats[s.key] || 0;

                doc.setFillColor(...palette.body);
                doc.setDrawColor(...palette.border);
                doc.setLineWidth(0.3);
                doc.roundedRect(tx, ty, tileW, tileH, 1.2, 1.2, "FD");

                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...palette.accent);
                doc.text(s.computedFrom ? `${val}%` : String(val), tx + tileW / 2, ty + 5.5, { align: "center" });

                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text(s.shortLabel.substring(0, 16), tx + tileW / 2, ty + 10, { align: "center" });
              });
              y += blockH + 2;
            });
          }

          y += 4;
        });

        // ---- Evolution per match (table showing per-match team totals for key stats) ----
        if (matchesDataForCharts.length >= 2) {
          if (y > pageH - 50) { doc.addPage(); y = 15; }

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Évolution par match", 14, y);
          y += 7;

          // Pick key stats (first 6 non-computed)
          const keyStats = sportStats.filter(s => !s.computedFrom).slice(0, 6);
          const evColW = [35, ...keyStats.map(() => Math.min(30, (pageW - 35 - 28) / keyStats.length))];

          // Header
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(14, y, pageW - 28, 8, 1.5, 1.5, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(71, 85, 105);
          doc.text("Match", 16, y + 5.5);
          let hx = 14 + evColW[0];
          keyStats.forEach((s, i) => {
            doc.text(s.shortLabel.substring(0, 8), hx + evColW[i + 1] / 2, y + 5.5, { align: "center" });
            hx += evColW[i + 1];
          });
          y += 10;

          doc.setFont("helvetica", "normal");
          matchesDataForCharts.forEach((match, mIdx) => {
            if (y > pageH - 12) { doc.addPage(); y = 15; }
            if (mIdx % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, y - 1, pageW - 28, 7, "F");
            }

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(7);
            doc.text(match.matchLabel.substring(0, 14), 16, y + 4);

            let rx = 14 + evColW[0];
            keyStats.forEach((s, i) => {
              const teamVal = Object.values(match.players).reduce((sum, p) => sum + (p.sportData[s.key] || 0), 0);
              doc.text(String(teamVal), rx + evColW[i + 1] / 2, y + 4, { align: "center" });
              rx += evColW[i + 1];
            });
            y += 7;
          });
          y += 5;
        }

        // Kicking map for team (rugby only)
        if (isRugby && Object.keys(kickingByPlayerFinal).length > 0) {
          if (y > pageH - 60) { doc.addPage(); y = 15; }
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Cartographie des tirs au but — Équipe", 14, y);
          y += 5;
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text("● Transformation   ■ Pénalité   ◆ Drop   |   Vert = réussi   Rouge = raté", 14, y);
          y += 5;

          const allKicks = Object.values(kickingByPlayerFinal).flatMap(k => k.allKicks);
          const mapW = pageW - 28;
          const mapH = 55;
          const fb = drawPdfRugbyField(doc, 14, y, mapW, mapH);
          allKicks.forEach(kick => {
            const pos = svgPctToPdfPos(kick, fb);
            const kx = pos.kx; const ky = pos.ky;
            const r = 2.5;
            const fillColor: [number, number, number] = kick.success ? [34, 197, 94] : [239, 68, 68];
            doc.setFillColor(...fillColor);
            if (kick.kickType === "conversion") {
              doc.circle(kx, ky, r, "F");
            } else if (kick.kickType === "penalty") {
              doc.rect(kx - r, ky - r, r * 2, r * 2, "F");
            } else {
              const pts = [
                { x: kx, y: ky - r * 1.2 },
                { x: kx + r * 1.2, y: ky },
                { x: kx, y: ky + r * 1.2 },
                { x: kx - r * 1.2, y: ky },
              ];
              (doc as any).triangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, "F");
              (doc as any).triangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y, "F");
            }
          });
          y += mapH + 5;

          // Zone stats grid
          const kicks = allKicks.map(k => ({ x: k.x, y: k.y, success: k.success }));
          y = drawPdfZoneStatsGrid(doc, kicks, pageW, y, pageH);
        }

      } else {
        // ===== ALL / INDIVIDUAL / SINGLE: per-player tables, one per sub-group =====
        statCategories.forEach((cat) => {
          const categoryStats = sportStats.filter(s => s.category === cat.key);
          if (categoryStats.length === 0) return;

          const groups = groupStatsByTheme(cat.key, categoryStats);

          // Category title (rendered once per category)
          if (y > pageH - 30) { doc.addPage(); y = 15; }
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(cat.label, 14, y);
          y += 6;

          groups.forEach((group, gi) => {
            const palette = pdfGroupColor(gi);
            // Chunk stats by 6 inside the group to keep tables readable
            const chunks: StatField[][] = [];
            for (let i = 0; i < group.items.length; i += 6) {
              chunks.push(group.items.slice(i, i + 6));
            }

            chunks.forEach((chunk, chunkIdx) => {
              if (y > pageH - 50) { doc.addPage(); y = 15; }

              // Sub-group colored title band
              if (group.label) {
                doc.setFillColor(...palette.head);
                doc.setDrawColor(...palette.border);
                doc.setLineWidth(0.4);
                doc.roundedRect(14, y, pageW - 28, 6, 1.5, 1.5, "FD");
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...palette.accent);
                const subTitle = `${String(group.label).toUpperCase()}${chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : ""}`;
                doc.text(subTitle, 17, y + 4.2);
                y += 7;
              }

              const colWidths = [55, 18, ...chunk.flatMap(() => [20, 16])];
              const headers = ["Athlète", "M", ...chunk.flatMap(s => [s.shortLabel, "+/-"])];
              // Header row tinted with the sub-group's body color
              doc.setFillColor(...palette.body);
              doc.rect(14, y, pageW - 28, 7, "F");
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...palette.accent);
              let x = 14;
              headers.forEach((h, i) => {
                doc.text(h.substring(0, 10), x + 1, y + 5);
                x += colWidths[i] || 18;
              });
              y += 9;
              doc.setFont("helvetica", "normal");

              const sorted = [...exportStats].sort((a, b) => {
                const firstStat = chunk[0]?.key;
                return firstStat ? (b.sportData[firstStat] || 0) - (a.sportData[firstStat] || 0) : 0;
              });

              sorted.forEach((p, rowIdx) => {
                if (y > pageH - 15) { doc.addPage(); y = 15; }
                // Subtle zebra tint with the sub-group palette
                if (rowIdx % 2 === 0) {
                  doc.setFillColor(...palette.body);
                  doc.rect(14, y - 2, pageW - 28, 7, "F");
                }
                x = 14;
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(7);
                doc.text(p.playerName.substring(0, 18), x + 1, y + 4);
                x += colWidths[0];
                doc.text(String(p.matchesPlayed), x + 1, y + 4);
                x += colWidths[1];
                chunk.forEach((s, i) => {
                  const val = p.sportData[s.key] || 0;
                  doc.setTextColor(30, 41, 59);
                  doc.text(s.computedFrom ? `${val}%` : String(val), x + 1, y + 4);
                  x += colWidths[2 + i * 2];
                  const prog = playerProgressions[p.playerId]?.[s.key] || 0;
                  if (prog > 0) doc.setTextColor(22, 163, 74);
                  else if (prog < 0) doc.setTextColor(220, 38, 38);
                  else doc.setTextColor(100, 116, 139);
                  doc.text(prog > 0 ? `+${prog}` : String(prog), x + 1, y + 4);
                  x += colWidths[3 + i * 2] || 16;
                });
                y += 7;
              });
              y += 4;
            });
          });
          y += 2;
        });

        // ===== Évolution & progression par stat (multi-compétitions) — per athlete =====
        if (matchesDataForCharts.length >= 2 && (mode === "single" || mode === "individual")) {
          for (const p of exportStats) {
            const playerMatches = matchesDataForCharts.filter((m) => m.players[p.playerId]);
            if (playerMatches.length < 2) continue;

            doc.addPage();
            drawHeader(`Évolution & progression — ${p.playerName}`);
            y = 36;

            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(
              "% calculé par rapport à la valeur précédente. Vert = progression, Rouge = régression.",
              14,
              y
            );
            y += 6;

            const evoStats: StatEvolutionData[] = sportStats
              .map((s) => {
                const points = playerMatches.map((m) => {
                  const psd = m.players[p.playerId]?.sportData || {};
                  let value = Number(psd[s.key] || 0);
                  if (s.computedFrom) {
                    const { successKey, totalKey, failureKey } = s.computedFrom;
                    const success = Number(psd[successKey] || 0);
                    const total = totalKey
                      ? Number(psd[totalKey] || 0)
                      : success + Number(psd[failureKey!] || 0);
                    value = total > 0 ? Math.round((success / total) * 100) : 0;
                  }
                  const matchInfo = allMatches.find((mm) => mm.id === m.matchId);
                  const compLabel = matchInfo?.competition || matchInfo?.opponent || m.matchLabel;
                  return {
                    matchId: m.matchId,
                    matchDate: m.matchDate,
                    matchLabel: compLabel,
                    value,
                  };
                });
                const hasData = points.some((pp) => pp.value !== 0);
                return {
                  statKey: s.key,
                  statLabel: s.label,
                  isPercent: !!s.computedFrom,
                  points: hasData ? points : [],
                };
              })
              .filter((s) => s.points.length > 0);

            const halfW = (pageW - 28 - 6) / 2;
            evoStats.forEach((evo) => {
              const tableH = 14 + evo.points.length * 6 + 8;
              const blockH = Math.max(45, tableH);
              if (y + blockH > pageH - 10) {
                doc.addPage();
                y = 15;
              }
              drawStatLineChart(doc, evo, 14, y, halfW, 42);
              drawStatEvolutionTable(doc, evo, 14 + halfW + 6, y, halfW, pageH);
              y += blockH + 4;
            });
          }
        }

        // Kicking map page (rugby only) - unified map with different symbols
        if (isRugby && Object.keys(kickingByPlayerFinal).length > 0) {
          doc.addPage();
          drawHeader("Cartographie des tirs au but");
          let ky = 36;

          const drawKickOnMap = (
            doc: jsPDF,
            kick: { x: number; y: number; kickType: string; success: boolean },
            fb: { fx: number; fy: number; fw: number; fh: number }
          ) => {
            const { kx, ky: kyy } = svgPctToPdfPos(kick, fb);
            const r = 3;
            const fillColor: [number, number, number] = kick.success ? [34, 197, 94] : [239, 68, 68];
            doc.setFillColor(...fillColor);
            if (kick.kickType === "conversion") {
              doc.circle(kx, kyy, r, "F");
              doc.setDrawColor(59, 130, 246);
              doc.circle(kx, kyy, r, "S");
            } else if (kick.kickType === "penalty") {
              doc.rect(kx - r, kyy - r, r * 2, r * 2, "F");
              doc.setDrawColor(245, 158, 11);
              doc.rect(kx - r, kyy - r, r * 2, r * 2, "S");
            } else {
              const pts = [
                { x: kx, y: kyy - r * 1.2 },
                { x: kx + r * 1.2, y: kyy },
                { x: kx, y: kyy + r * 1.2 },
                { x: kx - r * 1.2, y: kyy },
              ];
              doc.setFillColor(...fillColor);
              (doc as any).triangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, "F");
              (doc as any).triangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y, "F");
              doc.setDrawColor(139, 92, 246);
            }
          };

          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text("● Transformation   ■ Pénalité   ◆ Drop   |   Vert = réussi   Rouge = raté", 14, ky);
          ky += 6;

          const kickerIds = Object.keys(kickingByPlayerFinal).filter(pid => kickingByPlayerFinal[pid].allKicks.length > 0 && (!singlePlayerId || pid === singlePlayerId));
          kickerIds.forEach(pid => {
            const kicker = kickingByPlayerFinal[pid];
            const playerInfo = stats?.find(s => s.playerId === pid);
            const name = playerInfo?.playerName || "Buteur";

            if (ky > pageH - 70) { doc.addPage(); ky = 15; }

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(name, 14, ky);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            const rate = kicker.total > 0 ? Math.round((kicker.success / kicker.total) * 100) : 0;
            doc.text(`${kicker.success}/${kicker.total} (${rate}%)  —  T: ${kicker.conversion.success}/${kicker.conversion.total}  P: ${kicker.penalty.success}/${kicker.penalty.total}  D: ${kicker.drop.success}/${kicker.drop.total}`, 14, ky + 5);
            ky += 10;

            const mapW = pageW - 28;
            const mapH = 45;
            const fb = drawPdfRugbyField(doc, 14, ky, mapW, mapH, { showLabels: false });
            kicker.allKicks.forEach(kick => drawKickOnMap(doc, kick, fb));
            ky += mapH + 8;
          });
        }
      }

      // ===== Palmarès / Médailles (per athlete in single/individual modes) =====
      if (mode === "single" || mode === "individual") {
        try {
          const playerIdsForMedals = mode === "single" && singlePlayerId
            ? [singlePlayerId]
            : exportStats.map(p => p.playerId);

          for (const pid of playerIdsForMedals) {
            const { data: medals } = await supabase
              .from("player_medals")
              .select("*, matches(opponent, competition, match_date, location)")
              .eq("player_id", pid)
              .order("awarded_date", { ascending: false });

            if (!medals || medals.length === 0) continue;

            const playerInfo = exportStats.find(p => p.playerId === pid);
            const playerName = playerInfo?.playerName || "Athlète";

            if (y > pageH - 60) { doc.addPage(); y = 15; }

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text(`Palmarès — ${playerName} (${medals.length})`, 14, y);
            y += 6;

            const counts: Record<string, number> = {};
            medals.forEach((m: any) => { counts[m.medal_type] = (counts[m.medal_type] || 0) + 1; });
            const summary: string[] = [];
            if (counts.gold) summary.push(`Or: ${counts.gold}`);
            if (counts.silver) summary.push(`Argent: ${counts.silver}`);
            if (counts.bronze) summary.push(`Bronze: ${counts.bronze}`);
            if (counts.ranking) summary.push(`Classements: ${counts.ranking}`);
            if (counts.title) summary.push(`Titres: ${counts.title}`);
            if (summary.length) {
              doc.setFontSize(8);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(100, 116, 139);
              doc.text(summary.join("  •  "), 14, y);
              y += 6;
            }

            const medalLabel = (m: any) => {
              if (m.medal_type === "gold") return "Or";
              if (m.medal_type === "silver") return "Argent";
              if (m.medal_type === "bronze") return "Bronze";
              if (m.medal_type === "ranking") return `${m.rank}e place`;
              if (m.medal_type === "title") return m.custom_title || "Titre";
              return m.medal_type;
            };
            const medalColor = (type: string): [number, number, number] => {
              if (type === "gold") return [202, 138, 4];
              if (type === "silver") return [148, 163, 184];
              if (type === "bronze") return [180, 83, 9];
              if (type === "ranking") return [59, 130, 246];
              return [100, 116, 139];
            };

            medals.forEach((m: any) => {
              if (y > pageH - 22) { doc.addPage(); y = 15; }
              const match = m.matches;
              const compName = match?.competition || match?.opponent || "Compétition";
              const dateStr = m.awarded_date ? format(new Date(m.awarded_date), "dd/MM/yyyy") : "";
              const [r, g, b] = medalColor(m.medal_type);

              doc.setFillColor(248, 250, 252);
              doc.roundedRect(14, y, pageW - 28, 16, 1.5, 1.5, "F");
              doc.setFillColor(r, g, b);
              doc.rect(14, y, 2, 16, "F");

              doc.setFontSize(9);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(r, g, b);
              doc.text(medalLabel(m), 20, y + 6);

              doc.setFont("helvetica", "normal");
              doc.setTextColor(30, 41, 59);
              doc.setFontSize(8);
              const titleExtra = m.custom_title && m.medal_type !== "title" ? ` — ${m.custom_title}` : "";
              const teamExtra = m.team_label ? `  [${m.team_label}]` : (m.group_id ? "  [Équipe]" : "");
              doc.text(`${compName}${titleExtra}${teamExtra}`, 50, y + 6);

              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139);
              const locStr = match?.location ? `  •  ${match.location}` : "";
              doc.text(`${dateStr}${locStr}`, 20, y + 11);
              if (m.notes) {
                doc.setFont("helvetica", "italic");
                doc.text(String(m.notes).substring(0, 110), 20, y + 14.5);
                doc.setFont("helvetica", "normal");
              }

              y += 18;
            });

            y += 4;
          }
        } catch (err) {
          console.error("Erreur palmarès:", err);
        }
      }

      const playerLabel = singlePlayerId ? exportStats[0]?.playerName?.replace(/\s+/g, '-') : "";
      const suffix = mode === "team" ? "-equipe" : mode === "single" ? `-${playerLabel}` : mode === "individual" ? "-individuelles" : "";
      doc.save(`stats-competition${suffix}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export PDF");
    }
  }, [stats, sportStats, statCategories, categoryId, selectedCount, allMatches, activeMatchIds, playerProgressions, matchesDataForCharts, isRugby, kickingByPlayerFinal]);

  // Enhanced individual player PDF export with photo, club, category, matches, kicking map
  const handleExportPlayerPdf = useCallback(async (playerId: string) => {
    if (!stats) return;
    const player = stats.find(p => p.playerId === playerId);
    if (!player) return;
    try {
      const { settings, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
      const { data: medals } = await supabase
        .from("player_medals")
        .select("medal_type, rank, custom_title")
        .eq("player_id", playerId)
        .order("awarded_date", { ascending: false });

      const doc = new jsPDF({ orientation: "portrait" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const hc = (settings?.header_color || "#224378").replace("#", "");
      const hcR = parseInt(hc.substring(0, 2), 16);
      const hcG = parseInt(hc.substring(2, 4), 16);
      const hcB = parseInt(hc.substring(4, 6), 16);

      // Header bar
      doc.setFillColor(hcR, hcG, hcB);
      doc.rect(0, 0, pageW, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport individuel — Compétition", 14, 14);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${clubName || ""} • ${categoryName || ""} • ${seasonName || ""}`, 14, 24);
      doc.text(format(new Date(), "dd/MM/yyyy"), pageW - 14, 24, { align: "right" });

      let y = 40;

      // Player info section with avatar
      if (player.avatarUrl) {
        try {
          const response = await fetch(player.avatarUrl + (player.avatarUrl.includes("?") ? "&" : "?") + "t=" + Date.now(), { mode: "cors" });
          if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const imgFormat = dataUrl.includes("image/png") ? "PNG" : "JPEG";
            doc.addImage(dataUrl, imgFormat, 14, y, 22, 22);
          }
        } catch { /* skip photo */ }
      }

      const infoX = player.avatarUrl ? 42 : 14;
      const medalLabel = (medal: { medal_type: string; rank?: number | null; custom_title?: string | null }) => {
        if (medal.medal_type === "gold") return "Or";
        if (medal.medal_type === "silver") return "Argent";
        if (medal.medal_type === "bronze") return "Bronze";
        if (medal.medal_type === "ranking") return `${medal.rank || ""}e place`;
        if (medal.medal_type === "title") return medal.custom_title || "Titre";
        return medal.medal_type;
      };
      const medalColor = (type: string): [number, number, number] => {
        if (type === "gold") return [202, 138, 4];
        if (type === "silver") return [148, 163, 184];
        if (type === "bronze") return [180, 83, 9];
        if (type === "ranking") return [59, 130, 246];
        return [hcR, hcG, hcB];
      };

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(player.playerName, infoX, y + 8);

      let metaY = y + 15;
      if (medals && medals.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        let badgeX = infoX;
        const badgeY = y + 14;

        medals.slice(0, 4).forEach((medal: any) => {
          const label = medalLabel(medal);
          const [r, g, b] = medalColor(medal.medal_type);
          doc.setFillColor(r, g, b);
          doc.circle(badgeX + 2, badgeY - 1, 1.6, "F");
          doc.setTextColor(r, g, b);
          doc.text(label, badgeX + 6, badgeY);
          badgeX += doc.getTextWidth(label) + 14;
        });

        if (medals.length > 4) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`+${medals.length - 4}`, badgeX, badgeY);
        }

        metaY = y + 21;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Poste : ${player.position || "—"}  •  ${player.matchesPlayed} matchs joués`, infoX, metaY);
      doc.text(`Club : ${clubName || "—"}  •  Catégorie : ${categoryName || "—"}`, infoX, metaY + 6);
      y = metaY + 9;

      // Selected matches list
      const selectedMatches = allMatches.filter(m => activeMatchIds.includes(m.id));
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Matchs inclus", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      selectedMatches.forEach((m) => {
        if (y > pageH - 30) { doc.addPage(); y = 15; }
        const lieu = m.is_home ? "DOM" : "EXT";
        const comp = m.competition ? ` — ${m.competition}` : "";
        doc.text(`${format(new Date(m.match_date), "dd/MM/yyyy")} • vs ${m.opponent} [${lieu}]${comp}`, 18, y);
        y += 4;
      });
      y += 6;

      // Stats by category, organised in colored sub-blocks (mirrors UI)
      statCategories.forEach(cat => {
        const categoryStats = sportStats.filter(s => s.category === cat.key);
        if (categoryStats.length === 0) return;

        const groups = groupStatsByTheme(cat.key, categoryStats);

        if (y > pageH - 40) { doc.addPage(); y = 15; }
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(cat.label, 14, y);
        y += 5;

        groups.forEach((group, gi) => {
          const palette = pdfGroupColor(gi);
          if (y > pageH - 25) { doc.addPage(); y = 15; }

          // Sub-group title band (only if labeled)
          if (group.label) {
            doc.setFillColor(...palette.head);
            doc.setDrawColor(...palette.border);
            doc.setLineWidth(0.4);
            doc.roundedRect(14, y, pageW - 28, 5.5, 1.2, 1.2, "FD");
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...palette.accent);
            doc.text(String(group.label).toUpperCase(), 17, y + 4);
            y += 6.5;
          }

          const tableW = pageW - 28;
          const colW = tableW / group.items.length;

          // Header row tinted with sub-group body color
          doc.setFillColor(...palette.body);
          doc.rect(14, y, tableW, 7, "F");
          doc.setDrawColor(...palette.border);
          doc.setLineWidth(0.3);
          doc.rect(14, y, tableW, 7, "S");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...palette.accent);
          let x = 14;
          group.items.forEach((s, i) => {
            if (i > 0) doc.line(x, y, x, y + 7);
            doc.text(s.shortLabel.substring(0, 12), x + 1, y + 5);
            x += colW;
          });
          y += 7;

          // Values row
          doc.setFillColor(255, 255, 255);
          doc.rect(14, y, tableW, 7, "F");
          doc.setDrawColor(...palette.border);
          doc.rect(14, y, tableW, 7, "S");
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
          x = 14;
          group.items.forEach((s, i) => {
            if (i > 0) doc.line(x, y, x, y + 7);
            const val = player.sportData[s.key] || 0;
            doc.text(s.computedFrom ? `${val}%` : String(val), x + 1, y + 5);
            x += colW;
          });
          y += 9;
        });
        y += 3;
      });

      // ===== Évolution & progression par stat (multi-compétitions) =====
      if (matchesDataForCharts.length >= 2) {
        const playerMatches = matchesDataForCharts.filter((m) => m.players[playerId]);
        if (playerMatches.length >= 2) {
          // New page for the evolution dossier (clean layout)
          doc.addPage();
          doc.setFillColor(hcR, hcG, hcB);
          doc.rect(0, 0, pageW, 32, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("Évolution & progression", 14, 14);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`${player.playerName} • ${playerMatches.length} compétitions`, 14, 24);
          doc.text(format(new Date(), "dd/MM/yyyy"), pageW - 14, 24, { align: "right" });
          y = 40;

          // Legend
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(
            "% calculé par rapport à la valeur précédente. Vert = progression, Rouge = régression.",
            14,
            y
          );
          y += 6;

          // Build per-stat evolution data
          const evoStats: StatEvolutionData[] = sportStats.map((s) => {
            const points = playerMatches.map((m) => {
              const psd = m.players[playerId]?.sportData || {};
              let value = Number(psd[s.key] || 0);
              if (s.computedFrom) {
                const { successKey, totalKey, failureKey } = s.computedFrom;
                const success = Number(psd[successKey] || 0);
                const total = totalKey
                  ? Number(psd[totalKey] || 0)
                  : success + Number(psd[failureKey!] || 0);
                value = total > 0 ? Math.round((success / total) * 100) : 0;
              }
              const matchInfo = allMatches.find((mm) => mm.id === m.matchId);
              const compLabel = matchInfo?.competition || matchInfo?.opponent || m.matchLabel;
              return {
                matchId: m.matchId,
                matchDate: m.matchDate,
                matchLabel: compLabel,
                value,
              };
            });
            // Skip stats where all values are 0
            const hasData = points.some((p) => p.value !== 0);
            return {
              statKey: s.key,
              statLabel: s.label,
              isPercent: !!s.computedFrom,
              points: hasData ? points : [],
            };
          }).filter((s) => s.points.length > 0);

          // Render: chart on left + table on right per stat
          const halfW = (pageW - 28 - 6) / 2;
          evoStats.forEach((evo) => {
            const tableH = 14 + evo.points.length * 6 + 8;
            const blockH = Math.max(45, tableH);
            if (y + blockH > pageH - 10) {
              doc.addPage();
              y = 15;
            }
            // Chart on left
            drawStatLineChart(doc, evo, 14, y, halfW, 42);
            // Table on right
            drawStatEvolutionTable(doc, evo, 14 + halfW + 6, y, halfW, pageH);
            y += blockH + 4;
          });
        }
      }

      // Kicking section for rugby
      if (isRugby && kickingByPlayerFinal[playerId]) {
        const k = kickingByPlayerFinal[playerId];
        if (k.total > 0) {
          if (y > pageH - 100) { doc.addPage(); y = 15; }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text("Statistiques Buteur", 14, y);
          y += 6;

          // Stats summary
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const rate = Math.round((k.success / k.total) * 100);
          const penRate = k.penalty.total > 0 ? Math.round((k.penalty.success / k.penalty.total) * 100) : 0;
          const convRate = k.conversion.total > 0 ? Math.round((k.conversion.success / k.conversion.total) * 100) : 0;
          const dropRate = k.drop.total > 0 ? Math.round((k.drop.success / k.drop.total) * 100) : 0;
          doc.text(`Global: ${k.success}/${k.total} (${rate}%)  •  Transformations: ${k.conversion.success}/${k.conversion.total} (${convRate}%)  •  Pénalités: ${k.penalty.success}/${k.penalty.total} (${penRate}%)  •  Drops: ${k.drop.success}/${k.drop.total} (${dropRate}%)`, 14, y);
          y += 8;

          // Legend
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          // Transformation legend (blue circle)
          doc.setFillColor(59, 130, 246);
          doc.circle(18, y - 1, 2, "F");
          doc.text("Transformation", 22, y);
          // Penalty legend (orange square)
          doc.setFillColor(249, 115, 22);
          doc.rect(56, y - 3, 4, 4, "F");
          doc.text("Pénalité", 62, y);
          // Drop legend (purple diamond)
          doc.setFillColor(139, 92, 246);
          const dx = 90, dy = y - 1;
          (doc as any).triangle(dx, dy - 2.5, dx + 2.5, dy, dx, dy + 2.5, "F");
          (doc as any).triangle(dx, dy - 2.5, dx - 2.5, dy, dx, dy + 2.5, "F");
          doc.text("Drop", 94, y);
          // Success colors
          doc.setFillColor(34, 197, 94);
          doc.circle(118, y - 1, 2, "F");
          doc.text("Réussi", 122, y);
          doc.setFillColor(239, 68, 68);
          doc.circle(144, y - 1, 2, "F");
          doc.text("Raté", 148, y);
          y += 6;

          // Draw field
          const mapW = pageW - 28;
          const mapH = 70;
          const fieldBounds = drawPdfRugbyField(doc, 14, y, mapW, mapH);

          // Draw kicks using inner field bounds
          k.allKicks.forEach(kick => {
            const { kx, ky: ky2 } = svgPctToPdfPos(kick, fieldBounds);
            const r = 3;
            const fillColor: [number, number, number] = kick.success ? [34, 197, 94] : [239, 68, 68];
            doc.setFillColor(...fillColor);

            if (kick.kickType === "conversion") {
              doc.circle(kx, ky2, r, "F");
              doc.setDrawColor(59, 130, 246);
              doc.circle(kx, ky2, r, "S");
            } else if (kick.kickType === "penalty") {
              doc.rect(kx - r, ky2 - r, r * 2, r * 2, "F");
              doc.setDrawColor(249, 115, 22);
              doc.rect(kx - r, ky2 - r, r * 2, r * 2, "S");
            } else {
              const pts = [
                { x: kx, y: ky2 - r * 1.2 },
                { x: kx + r * 1.2, y: ky2 },
                { x: kx, y: ky2 + r * 1.2 },
                { x: kx - r * 1.2, y: ky2 },
              ];
              doc.setFillColor(...fillColor);
              (doc as any).triangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, "F");
              (doc as any).triangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y, "F");
              doc.setDrawColor(139, 92, 246);
            }
          });

          y += mapH + 6;

          // Zone stats grid below cartography
          const zoneKicks = k.allKicks.map((kick: any) => ({
            x: kick.x as number,
            y: kick.y as number,
            success: !!kick.success,
          }));
          y = drawPdfZoneStatsGrid(doc, zoneKicks, pageW, y, pageH);
        }
      }

      // ===== Palmarès / Médailles =====
      try {
        const { data: medals } = await supabase
          .from("player_medals")
          .select("*, matches(opponent, competition, match_date, location)")
          .eq("player_id", playerId)
          .order("awarded_date", { ascending: false });

        if (medals && medals.length > 0) {
          if (y > pageH - 60) { doc.addPage(); y = 15; }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(`Palmarès (${medals.length})`, 14, y);
          y += 6;

          // Counts summary
          const counts: Record<string, number> = {};
          medals.forEach((m: any) => { counts[m.medal_type] = (counts[m.medal_type] || 0) + 1; });
          const summary: string[] = [];
          if (counts.gold) summary.push(`Or: ${counts.gold}`);
          if (counts.silver) summary.push(`Argent: ${counts.silver}`);
          if (counts.bronze) summary.push(`Bronze: ${counts.bronze}`);
          if (counts.ranking) summary.push(`Classements: ${counts.ranking}`);
          if (counts.title) summary.push(`Titres: ${counts.title}`);
          if (summary.length) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(summary.join("  •  "), 14, y);
            y += 6;
          }

          const medalLabel = (m: any) => {
            if (m.medal_type === "gold") return "Or";
            if (m.medal_type === "silver") return "Argent";
            if (m.medal_type === "bronze") return "Bronze";
            if (m.medal_type === "ranking") return `${m.rank}e place`;
            if (m.medal_type === "title") return m.custom_title || "Titre";
            return m.medal_type;
          };
          const medalColor = (type: string): [number, number, number] => {
            if (type === "gold") return [202, 138, 4];
            if (type === "silver") return [148, 163, 184];
            if (type === "bronze") return [180, 83, 9];
            if (type === "ranking") return [59, 130, 246];
            return [hcR, hcG, hcB];
          };

          medals.forEach((m: any) => {
            if (y > pageH - 22) { doc.addPage(); y = 15; }
            const match = m.matches;
            const compName = match?.competition || match?.opponent || "Compétition";
            const dateStr = m.awarded_date ? format(new Date(m.awarded_date), "dd/MM/yyyy") : "";
            const [r, g, b] = medalColor(m.medal_type);

            // Card
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, y, pageW - 28, 16, 1.5, 1.5, "F");
            // Color accent
            doc.setFillColor(r, g, b);
            doc.rect(14, y, 2, 16, "F");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(medalLabel(m), 20, y + 6);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(8);
            const titleExtra = m.custom_title && m.medal_type !== "title" ? ` — ${m.custom_title}` : "";
            const teamExtra = m.team_label ? `  [${m.team_label}]` : (m.group_id ? "  [Équipe]" : "");
            doc.text(`${compName}${titleExtra}${teamExtra}`, 50, y + 6);

            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            const locStr = match?.location ? `  •  ${match.location}` : "";
            doc.text(`${dateStr}${locStr}`, 20, y + 11);
            if (m.notes) {
              doc.setFont("helvetica", "italic");
              doc.text(String(m.notes).substring(0, 110), 20, y + 14.5);
              doc.setFont("helvetica", "normal");
            }

            y += 18;
          });
        }
      } catch { /* skip palmarès on error */ }

      // Footer
      if (settings?.footer_text) {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(settings.footer_text, pageW / 2, pageH - 8, { align: "center" });
      }

      doc.save(`rapport-${player.playerName.replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport PDF téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  }, [stats, sportStats, statCategories, categoryId, allMatches, activeMatchIds, isRugby, kickingByPlayerFinal, matchesDataForCharts]);

  const getCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "scoring": return <Trophy className="h-4 w-4 text-primary" />;
      case "attack": return <Target className="h-4 w-4 text-primary" />;
      case "defense": return <Shield className="h-4 w-4 text-primary" />;
      case "general": return <Activity className="h-4 w-4 text-primary" />;
      default: return <Dumbbell className="h-4 w-4 text-primary" />;
    }
  };

  const ProgressionIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{value}</span>;
    if (value < 0) return <span className="text-destructive text-xs font-medium flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{value}</span>;
    return <span className="text-muted-foreground text-xs"><Minus className="h-3 w-3 inline" /></span>;
  };

  if (isLoading || loadingPrefs) {
    return <p className="text-muted-foreground">Chargement des statistiques...</p>;
  }

  if ((!stats || stats.length === 0) || (isSinglePlayerMode && (!filteredStats || filteredStats.length === 0))) {
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

  return (
    <div className="space-y-6">
      {/* Match filter + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
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
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedMatchIds([])}>
                    <CheckSquare className="h-3 w-3 mr-1" />Tous
                  </Button>
                </div>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="p-2 space-y-1">
                  {allMatches.map(match => {
                    const isSelected = selectedMatchIds.length === 0 || selectedMatchIds.includes(match.id);
                    return (
                      <button key={match.id} onClick={() => toggleMatch(match.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-muted ${isSelected ? 'bg-primary/5' : 'opacity-50'}`}>
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">vs {match.opponent || "Adversaire inconnu"}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(match.match_date), "dd MMM yyyy", { locale: fr })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {selectedMatchIds.length === 0 && allMatches.length > 0 && (
            <Badge variant="secondary" className="gap-1">Tous les matchs ({allMatches.length})</Badge>
          )}
          {selectedMatchIds.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3 w-3" />{selectedMatchIds.length} match{selectedMatchIds.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {!isSinglePlayerMode && <div className="flex gap-2 items-center">
          {/* Player selector for single export */}
          <Select value={exportPlayerId} onValueChange={setExportPlayerId}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Exporter un athlète" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les athlètes</SelectItem>
              {stats.map(p => (
                <SelectItem key={p.playerId} value={p.playerId}>{p.playerName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FileSpreadsheet className="h-4 w-4" /><span className="hidden sm:inline">Excel</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Exporter en Excel</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {exportPlayerId && exportPlayerId !== "__all__" ? (
                <DropdownMenuItem onClick={() => handleExportExcel("single", exportPlayerId)}>
                  <User className="h-3.5 w-3.5 mr-2" />{stats.find(p => p.playerId === exportPlayerId)?.playerName || "Athlète"}
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleExportExcel("all")}>
                    <Users className="h-3.5 w-3.5 mr-2" />Tout (équipe + individuel)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel("team")}>
                    <Users className="h-3.5 w-3.5 mr-2" />Statistiques équipe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel("individual")}>
                    <User className="h-3.5 w-3.5 mr-2" />Statistiques individuelles
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">PDF</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Exporter en PDF</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {exportPlayerId && exportPlayerId !== "__all__" ? (
                <DropdownMenuItem onClick={() => handleExportPdf("single", exportPlayerId)}>
                  <User className="h-3.5 w-3.5 mr-2" />{stats.find(p => p.playerId === exportPlayerId)?.playerName || "Athlète"} + cartographie
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleExportPdf("all")}>
                    <Users className="h-3.5 w-3.5 mr-2" />Tout (équipe + individuel)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPdf("team")}>
                    <Users className="h-3.5 w-3.5 mr-2" />Statistiques équipe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPdf("individual")}>
                    <User className="h-3.5 w-3.5 mr-2" />Statistiques individuelles
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>}
      </div>

      {/* STACKED LAYOUT: Team (top, full width) + Individual (below) — or just individual in single player mode */}
      <div className={isSinglePlayerMode ? "" : "space-y-6"}>
        {/* TOP: Team Stats — full width, all categories stacked */}
        {!isSinglePlayerMode && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Statistiques équipe
          </h3>
          <TeamCumulativeStats
            stats={stats}
            matchesData={matchesDataForCharts}
            sportStats={sportStats}
            sportType={sportType}
            matchesWithScores={allMatches.filter(m => activeMatchIds.includes(m.id)).map(m => ({
              id: m.id,
              is_home: m.is_home,
              score_home: m.score_home ?? null,
              score_away: m.score_away ?? null,
              effective_play_time: m.effective_play_time ?? null,
              longest_play_sequence: m.longest_play_sequence ?? null,
              average_play_sequence: m.average_play_sequence ?? null,
            }))}
          />
        </div>
        )}

        {/* RIGHT: Individual Stats */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Statistiques individuelles
            </h3>
            <div className="flex items-center gap-2">
              {!isSinglePlayerMode && (
              <Select value={selectedPlayerId || (stats[0]?.playerId || "")} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Choisir un joueur" />
                </SelectTrigger>
                <SelectContent>
                  {stats.map(p => (
                    <SelectItem key={p.playerId} value={p.playerId}>{p.playerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => {
                const pid = fixedPlayerId || selectedPlayerId || stats[0]?.playerId;
                if (pid) handleExportExcel("single", pid);
              }}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => {
                const pid = fixedPlayerId || selectedPlayerId || stats[0]?.playerId;
                if (pid) handleExportPlayerPdf(pid);
              }}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {(() => {
            const player = selectedPlayer || filteredStats?.[0] || stats[0];
            if (!player) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-semibold text-lg">{player.playerName}</p>
                    <p className="text-sm text-muted-foreground">{player.matchesPlayed} matchs joués</p>
                  </div>
                </div>

                <Tabs defaultValue={statCategories[0]?.key || "general"} className="w-full">
                  <TabsList className={`grid w-full grid-cols-${Math.min(statCategories.length, 4)}`}>
                    {statCategories.map(cat => (
                      <TabsTrigger key={cat.key} value={cat.key} className="gap-1 text-xs">
                        {getCategoryIcon(cat.key)}
                        <span className="hidden sm:inline">{cat.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {statCategories.map(cat => {
                    const categoryStats = sportStats.filter(s => s.category === cat.key);
                    const groups = groupStatsByTheme(cat.key, categoryStats);

                    const renderTile = (stat: typeof categoryStats[number], opts?: { large?: boolean }) => {
                      const large = opts?.large;
                      const val = player.sportData[stat.key] || 0;
                      const prog = playerProgressions[player.playerId]?.[stat.key] || 0;
                      return (
                        <Tooltip key={stat.key}>
                          <TooltipTrigger asChild>
                            <div
                              className={`${large ? "p-2" : "p-1"} bg-muted/50 rounded text-center space-y-0 border border-border/50`}
                            >
                              <p className={`${large ? "text-base" : "text-xs"} font-bold leading-tight`}>{stat.computedFrom ? `${val}%` : val}</p>
                              <p className={`${large ? "text-[10px]" : "text-[9px]"} text-muted-foreground leading-tight`}>{stat.shortLabel}</p>
                              {matchesDataForCharts.length >= 2 && (
                                <ProgressionIndicator value={prog} />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-semibold">{stat.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    };

                    const labeledGroups = groups.filter(g => g.label);
                    const unlabeledGroups = groups.filter(g => !g.label);

                    return (
                      <TabsContent key={cat.key} value={cat.key} className="space-y-2">
                        {labeledGroups.length > 0 && (
                          <div
                            className="grid gap-2"
                            style={{ gridTemplateColumns: `repeat(${labeledGroups.length}, minmax(0, 1fr))` }}
                          >
                            {labeledGroups.map(group => (
                              <div
                                key={group.key}
                                className={`rounded-md border p-1.5 space-y-1 ${group.color?.ring || "border-border/50"} ${group.color?.soft || "bg-muted/20"}`}
                              >
                                <p className={`text-[10px] font-semibold uppercase tracking-wide px-0.5 ${group.color?.accent || "text-muted-foreground"}`}>
                                  {group.label}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {group.items.map(s => renderTile(s, { large: true }))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {unlabeledGroups.map(group => (
                          <div key={group.key} className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1">
                            {group.items.map(s => renderTile(s))}
                          </div>
                        ))}
                      </TabsContent>
                    );
                  })}
                </Tabs>
                {/* Kicking stats for rugby */}
                {isRugby && kickingByPlayerFinal[player.playerId] && (() => {
                  const k = kickingByPlayerFinal[player.playerId];
                  const rate = k.total > 0 ? Math.round((k.success / k.total) * 100) : 0;
                  const penRate = k.penalty.total > 0 ? Math.round((k.penalty.success / k.penalty.total) * 100) : 0;
                  const convRate = k.conversion.total > 0 ? Math.round((k.conversion.success / k.conversion.total) * 100) : 0;
                  const dropRate = k.drop.total > 0 ? Math.round((k.drop.success / k.drop.total) * 100) : 0;
                  return (
                    <Card className="mt-4 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Crosshair className="h-4 w-4 text-primary" />
                          Statistiques Buteur
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <div className="p-1.5 bg-primary/10 rounded-md text-center border border-primary/30">
                            <p className="text-base font-bold text-primary leading-tight">{rate}%</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">Global</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{k.success}/{k.total}</p>
                          </div>
                          <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                            <p className="text-base font-bold leading-tight">{penRate}%</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">Pénalités</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{k.penalty.success}/{k.penalty.total}</p>
                          </div>
                          <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                            <p className="text-base font-bold leading-tight">{convRate}%</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">Transformations</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{k.conversion.success}/{k.conversion.total}</p>
                          </div>
                          <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                            <p className="text-base font-bold leading-tight">{dropRate}%</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">Drops</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{k.drop.success}/{k.drop.total}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
                {/* Kicking field map */}
                {isRugby && kickingByPlayerFinal[player.playerId] && (
                  <CumulativeKickingMap
                    kicks={kickingByPlayerFinal[player.playerId].allKicks}
                    playerName={player.playerName}
                    hasKickingStats={kickingByPlayerFinal[player.playerId].total > 0}
                  />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {!isSinglePlayerMode && <>
      {/* Per-kicker stats + cartography (rugby only, when 2+ kickers) */}
      {isRugby && (() => {
        const kickerIds = Object.keys(kickingByPlayerFinal).filter(pid => kickingByPlayerFinal[pid].total > 0);
        if (kickerIds.length < 2) return null;
        return (
          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-primary" />
                Buteurs — statistiques & cartographie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {kickerIds.map(pid => {
                const k = kickingByPlayerFinal[pid];
                const playerInfo = stats.find(s => s.playerId === pid);
                const name = playerInfo?.playerName || "Buteur";
                const rate = k.total > 0 ? Math.round((k.success / k.total) * 100) : 0;
                const penRate = k.penalty.total > 0 ? Math.round((k.penalty.success / k.penalty.total) * 100) : 0;
                const convRate = k.conversion.total > 0 ? Math.round((k.conversion.success / k.conversion.total) * 100) : 0;
                const dropRate = k.drop.total > 0 ? Math.round((k.drop.success / k.drop.total) * 100) : 0;
                return (
                  <div key={pid} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{name}</span>
                      <span className="text-xs text-muted-foreground">— {k.success}/{k.total} ({rate}%)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <div className="p-1.5 bg-primary/10 rounded-md text-center border border-primary/30">
                        <p className="text-base font-bold text-primary leading-tight">{rate}%</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Global</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{k.success}/{k.total}</p>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                        <p className="text-base font-bold leading-tight">{penRate}%</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Pénalités</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{k.penalty.success}/{k.penalty.total}</p>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                        <p className="text-base font-bold leading-tight">{convRate}%</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Transformations</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{k.conversion.success}/{k.conversion.total}</p>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded-md text-center border border-border/50">
                        <p className="text-base font-bold leading-tight">{dropRate}%</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Drops</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{k.drop.success}/{k.drop.total}</p>
                      </div>
                    </div>
                    {k.allKicks.length > 0 && (
                      <CumulativeKickingMap
                        kicks={k.allKicks}
                        playerName={name}
                        hasKickingStats={true}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* Charts (Comparaison / Évolution / Progression) — placed just above the detailed table */}
      {stats.length > 0 && (
        <CumulativeStatsCharts stats={stats} matchesData={matchesDataForCharts} sportStats={sportStats} selectedMatchIds={activeMatchIds} sportType={sportType} />
      )}

      {/* Full detailed table below */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tableau détaillé — tous les joueurs
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
              const columnGroups = groupStatsByTheme(cat.key, categoryStats);
              const hasGroupLabels = columnGroups.some(g => g.label);

              return (
                <TabsContent key={cat.key} value={cat.key}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {hasGroupLabels && (
                          <TableRow>
                            <TableHead colSpan={2} className="bg-transparent border-b-0" />
                            {columnGroups.map((group, gIdx) => (
                              <TableHead
                                key={`grp-${group.key}`}
                                colSpan={group.items.length}
                                className={`text-center text-[11px] font-semibold uppercase tracking-wide border-b ${
                                  group.color?.head || "bg-muted/40 text-muted-foreground"
                                } ${gIdx > 0 ? "border-l-2 border-l-background" : ""}`}
                              >
                                {group.label || ""}
                              </TableHead>
                            ))}
                          </TableRow>
                        )}
                        <TableRow>
                          <TableHead>Athlète</TableHead>
                          <TableHead className="text-center">Matchs</TableHead>
                          {columnGroups.map((group, gIdx) =>
                            group.items.map((stat, sIdx) => (
                              <TableHead
                                key={stat.key}
                                className={`text-center ${group.color?.head || ""} ${
                                  gIdx > 0 && sIdx === 0 ? "border-l-2 border-l-background" : ""
                                }`}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">{stat.shortLabel}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-semibold">{stat.label}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableHead>
                            ))
                          )}
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
                              {columnGroups.map((group, gIdx) =>
                                group.items.map((stat, sIdx) => {
                                  const val = p.sportData[stat.key] || 0;
                                  const prog = playerProgressions[p.playerId]?.[stat.key] || 0;
                                  return (
                                    <TableCell
                                      key={stat.key}
                                      className={`text-center ${group.color?.body || ""} ${
                                        gIdx > 0 && sIdx === 0 ? "border-l-2 border-l-background" : ""
                                      }`}
                                    >
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span>{stat.computedFrom ? `${val}%` : val}</span>
                                        {matchesDataForCharts.length >= 2 && (
                                          <ProgressionIndicator value={prog} />
                                        )}
                                      </div>
                                    </TableCell>
                                  );
                                })
                              )}
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

      {/* Kicking ranking table for rugby */}
      {isRugby && Object.keys(kickingByPlayerFinal).length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />
              Classement Buteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlète</TableHead>
                    <TableHead className="text-center">Global</TableHead>
                    <TableHead className="text-center">Pénalités</TableHead>
                    <TableHead className="text-center">Transformations</TableHead>
                    <TableHead className="text-center">Drops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(kickingByPlayerFinal)
                    .map(([playerId, k]) => {
                      const playerInfo = stats?.find(s => s.playerId === playerId);
                      return { playerId, name: playerInfo?.playerName || "Inconnu", k };
                    })
                    .sort((a, b) => (b.k.total > 0 ? b.k.success / b.k.total : 0) - (a.k.total > 0 ? a.k.success / a.k.total : 0))
                    .map(({ playerId, name, k }) => {
                      const rate = k.total > 0 ? Math.round((k.success / k.total) * 100) : 0;
                      const penRate = k.penalty.total > 0 ? Math.round((k.penalty.success / k.penalty.total) * 100) : 0;
                      const convRate = k.conversion.total > 0 ? Math.round((k.conversion.success / k.conversion.total) * 100) : 0;
                      const dropRate = k.drop.total > 0 ? Math.round((k.drop.success / k.drop.total) * 100) : 0;
                      return (
                        <TableRow key={playerId}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{rate}%</span>
                            <span className="text-xs text-muted-foreground ml-1">({k.success}/{k.total})</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {k.penalty.total > 0 ? (
                              <><span className="font-semibold">{penRate}%</span><span className="text-xs text-muted-foreground ml-1">({k.penalty.success}/{k.penalty.total})</span></>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {k.conversion.total > 0 ? (
                              <><span className="font-semibold">{convRate}%</span><span className="text-xs text-muted-foreground ml-1">({k.conversion.success}/{k.conversion.total})</span></>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {k.drop.total > 0 ? (
                              <><span className="font-semibold">{dropRate}%</span><span className="text-xs text-muted-foreground ml-1">({k.drop.success}/{k.drop.total})</span></>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </>}
    </div>
  );
}
