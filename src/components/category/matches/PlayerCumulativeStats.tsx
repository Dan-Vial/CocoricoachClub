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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getStatCategories, type StatField } from "@/lib/constants/sportStats";
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

interface PlayerCumulativeStatsProps {
  categoryId: string;
  sportType?: string;
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
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
  avatarUrl?: string;
  position?: string;
}

export function PlayerCumulativeStats({ categoryId, sportType = "XV" }: PlayerCumulativeStatsProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [exportPlayerId, setExportPlayerId] = useState<string>("");
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
        .select("id, match_date, opponent, is_home, location, match_time, competition, competition_stage, event_type")
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

  // Aggregate kicking stats per player from player_match_stats
  const kickingByPlayerFinal = useMemo(() => {
    const map: Record<string, {
      total: number; success: number;
      penalty: { total: number; success: number };
      conversion: { total: number; success: number };
      drop: { total: number; success: number };
      byMatch: Record<string, { total: number; success: number }>;
      allKicks: { x: number; y: number; kickType: string; success: boolean }[];
    }> = {};

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

      // Skip players with no kicking activity
      if (totalAttempts === 0) return;

      if (!map[row.player_id]) {
        map[row.player_id] = {
          total: 0, success: 0,
          penalty: { total: 0, success: 0 },
          conversion: { total: 0, success: 0 },
          drop: { total: 0, success: 0 },
          byMatch: {},
          allKicks: [],
        };
      }
      const p = map[row.player_id];
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

      // Collect individual kick positions
      if (Array.isArray(sportData.kickAttempts)) {
        p.allKicks.push(...sportData.kickAttempts);
      }
    });

    return map;
  }, [kickingData]);

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

  const selectedCount = selectedMatchIds.length === 0 ? allMatches.length : selectedMatchIds.length;
  const selectedPlayer = stats?.find(p => p.playerId === selectedPlayerId);

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

      const drawHeader = (title: string) => {
        doc.setFillColor(parseInt(hc.substring(0, 2), 16), parseInt(hc.substring(2, 4), 16), parseInt(hc.substring(4, 6), 16));
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
      selectedMatches.slice(0, 6).forEach((m, i) => {
        const lieu = m.is_home ? "DOM" : "EXT";
        const loc = m.location ? ` — ${m.location}` : "";
        const comp = m.competition || "";
        const stage = m.competition_stage ? ` (${m.competition_stage})` : "";
        const time = m.match_time ? ` ${m.match_time}` : "";
        doc.text(
          `${format(new Date(m.match_date), "dd/MM/yy")} • vs ${m.opponent} [${lieu}]${loc}${time} ${comp}${stage}`,
          14, y
        );
        y += 4;
      });
      if (selectedMatches.length > 6) {
        doc.text(`... et ${selectedMatches.length - 6} autre(s)`, 14, y);
        y += 4;
      }
      y += 4;

      statCategories.forEach((cat, catIdx) => {
        const categoryStats = sportStats.filter(s => s.category === cat.key);
        if (categoryStats.length === 0) return;

        // Paginate: max 6 stat columns per page section
        const chunks: StatField[][] = [];
        for (let i = 0; i < categoryStats.length; i += 6) {
          chunks.push(categoryStats.slice(i, i + 6));
        }

        chunks.forEach((chunk, chunkIdx) => {
          if (y > pageH - 50) {
            doc.addPage();
            y = 15;
          }

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${cat.label}${chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : ""}`, 14, y);
          y += 6;

          const colWidths = [55, 18, ...chunk.flatMap(() => [20, 16])];
          const headers = ["Athlète", "M", ...chunk.flatMap(s => [s.shortLabel, "+/-"])];
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, pageW - 28, 7, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
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

          sorted.forEach((p) => {
            if (y > pageH - 15) {
              doc.addPage();
              y = 15;
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
          y += 6;
        });
      });

      // Kicking map page (rugby only) - unified map with different symbols
      if (isRugby && Object.keys(kickingByPlayerFinal).length > 0) {
        doc.addPage();
        drawHeader("Cartographie des tirs au but");
        let ky = 36;

        // Helper to draw a kick on the PDF
        const drawKickOnMap = (
          doc: jsPDF,
          kick: { x: number; y: number; kickType: string; success: boolean },
          mapX: number, mapY: number, mapW: number, mapH: number
        ) => {
          const kx = mapX + (kick.x / 100) * mapW;
          const kyy = mapY + (kick.y / 100) * mapH;
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
            // Diamond for drop
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

        // Draw field background
        const drawFieldBg = (doc: jsPDF, fx: number, fy: number, fw: number, fh: number) => {
          doc.setFillColor(21, 128, 61);
          doc.rect(fx, fy, fw, fh, "F");
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.3);
          doc.rect(fx, fy, fw, fh, "S");
          // Distance lines
          const lines = [0, 10, 22, 30, 40, 50];
          lines.forEach(m => {
            const lx = fx + (m / 100) * fw;
            doc.setLineDashPattern([1, 1], 0);
            doc.line(lx, fy, lx, fy + fh);
          });
          doc.setLineDashPattern([], 0);
          // Posts
          doc.setLineWidth(1);
          doc.line(fx + fw, fy + fh * 0.4, fx + fw, fy + fh * 0.6);
          doc.setLineWidth(0.3);
        };

        // Legend
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("● Transformation   ■ Pénalité   ◆ Drop   |   Vert = réussi   Rouge = raté", 14, ky);
        ky += 6;

        // For each player with kicks
        const kickerIds = Object.keys(kickingByPlayerFinal).filter(pid => kickingByPlayerFinal[pid].allKicks.length > 0 && (!singlePlayerId || pid === singlePlayerId));
        kickerIds.forEach(pid => {
          const kicker = kickingByPlayerFinal[pid];
          const playerInfo = stats?.find(s => s.playerId === pid);
          const name = playerInfo?.playerName || "Buteur";

          if (ky > pageH - 70) {
            doc.addPage();
            ky = 15;
          }

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
          drawFieldBg(doc, 14, ky, mapW, mapH);

          kicker.allKicks.forEach(kick => {
            drawKickOnMap(doc, kick, 14, ky, mapW, mapH);
          });

          ky += mapH + 8;
        });
      }

      const playerLabel = singlePlayerId ? exportStats[0]?.playerName?.replace(/\s+/g, '-') : "";
      const suffix = mode === "team" ? "-equipe" : mode === "single" ? `-${playerLabel}` : mode === "individual" ? "-individuelles" : "";
      doc.save(`stats-competition${suffix}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF téléchargé !");
    } catch (e) {
      toast.error("Erreur lors de l'export PDF");
    }
  }, [stats, sportStats, statCategories, categoryId, selectedCount, allMatches, activeMatchIds, playerProgressions, isRugby, kickingByPlayerFinal]);

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

        <div className="flex gap-2 items-center">
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
        </div>
      </div>

      {/* Charts */}
      {stats.length > 0 && (
        <CumulativeStatsCharts stats={stats} matchesData={matchesDataForCharts} sportStats={sportStats} selectedMatchIds={activeMatchIds} sportType={sportType} />
      )}

      {/* SPLIT SCREEN: Team (left) + Individual (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Team Stats */}
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
          />
        </div>

        {/* RIGHT: Individual Stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Statistiques individuelles
            </h3>
            <Select value={selectedPlayerId || (stats[0]?.playerId || "")} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Choisir un joueur" />
              </SelectTrigger>
              <SelectContent>
                {stats.map(p => (
                  <SelectItem key={p.playerId} value={p.playerId}>{p.playerName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const player = selectedPlayer || stats[0];
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
                    return (
                      <TabsContent key={cat.key} value={cat.key}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {categoryStats.map(stat => {
                            const val = player.sportData[stat.key] || 0;
                            const prog = playerProgressions[player.playerId]?.[stat.key] || 0;
                            return (
                              <div key={stat.key} className="p-3 bg-muted/50 rounded-lg text-center space-y-1">
                                <p className="text-2xl font-bold">{stat.computedFrom ? `${val}%` : val}</p>
                                <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                                {matchesDataForCharts.length >= 2 && (
                                  <ProgressionIndicator value={prog} />
                                )}
                              </div>
                            );
                          })}
                        </div>
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-primary/10 rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">{rate}%</p>
                            <p className="text-xs text-muted-foreground">Global</p>
                            <p className="text-xs text-muted-foreground">{k.success}/{k.total}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{penRate}%</p>
                            <p className="text-xs text-muted-foreground">Pénalités</p>
                            <p className="text-xs text-muted-foreground">{k.penalty.success}/{k.penalty.total}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{convRate}%</p>
                            <p className="text-xs text-muted-foreground">Transformations</p>
                            <p className="text-xs text-muted-foreground">{k.conversion.success}/{k.conversion.total}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{dropRate}%</p>
                            <p className="text-xs text-muted-foreground">Drops</p>
                            <p className="text-xs text-muted-foreground">{k.drop.success}/{k.drop.total}</p>
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
              return (
                <TabsContent key={cat.key} value={cat.key}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlète</TableHead>
                          <TableHead className="text-center">Matchs</TableHead>
                          {categoryStats.map(stat => (
                            <TableHead key={stat.key} className="text-center">{stat.shortLabel}</TableHead>
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
                              {categoryStats.map(stat => {
                                const val = p.sportData[stat.key] || 0;
                                const prog = playerProgressions[p.playerId]?.[stat.key] || 0;
                                return (
                                  <TableCell key={stat.key} className="text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span>{stat.computedFrom ? `${val}%` : val}</span>
                                      {matchesDataForCharts.length >= 2 && (
                                        <ProgressionIndicator value={prog} />
                                      )}
                                    </div>
                                  </TableCell>
                                );
                              })}
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
    </div>
  );
}
