import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Download, User, Calendar, Trophy, Loader2, Users, FileSpreadsheet, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { generateCsv, downloadCsv } from "@/lib/csv";
import { preparePdfWithSettings, drawPdfHeader as drawPdfHeaderCustom, drawSectionTitle, drawTableHeader as drawTableHeaderLib, drawTableRow as drawTableRowLib, checkPageBreak as checkPageBreakLib, type PdfCustomSettings } from "@/lib/pdfExport";
import { getStatsForSport, type StatField } from "@/lib/constants/sportStats";
import { TEST_CATEGORIES, getTestLabel } from "@/lib/constants/testCategories";

interface ReportsTabProps {
  categoryId: string;
}

export function ReportsTab({ categoryId }: ReportsTabProps) {
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Date range states
  const [overviewDateFrom, setOverviewDateFrom] = useState("");
  const [overviewDateTo, setOverviewDateTo] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");
  const [tdjDateFrom, setTdjDateFrom] = useState("");
  const [tdjDateTo, setTdjDateTo] = useState("");

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name, sport)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Shared PDF helper functions (local, using custom settings colors)
  const defaultColors = {
    primary: [41, 128, 185] as [number, number, number],
    success: [39, 174, 96] as [number, number, number],
    warning: [241, 196, 15] as [number, number, number],
    danger: [231, 76, 60] as [number, number, number],
    muted: [149, 165, 166] as [number, number, number],
    dark: [52, 73, 94] as [number, number, number],
    light: [236, 240, 241] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const drawKpiCard = (pdf: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, color: [number, number, number]) => {
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, w, h, 3, 3, 'F');
    pdf.setTextColor(...defaultColors.white);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    const valueWidth = pdf.getTextWidth(value);
    pdf.text(value, x + (w - valueWidth) / 2, y + h / 2);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    const labelWidth = pdf.getTextWidth(label);
    pdf.text(label, x + (w - labelWidth) / 2, y + h / 2 + 8);
  };

  const drawTableHeaderPdf = (pdf: jsPDF, headers: string[], colWidths: number[], y: number, margin: number, contentWidth: number) => {
    pdf.setFillColor(...defaultColors.dark);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setTextColor(...defaultColors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      const maxChars = Math.max(3, Math.floor(colWidths[i] / 2.2));
      pdf.text(header.substring(0, maxChars), xPos, y + 5.5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    return y + 8;
  };

  const drawTableRowPdf = (pdf: jsPDF, values: string[], colWidths: number[], y: number, isAlternate: boolean, margin: number, contentWidth: number, rowColors?: ([number, number, number] | null)[]) => {
    if (isAlternate) {
      pdf.setFillColor(...defaultColors.light);
      pdf.rect(margin, y, contentWidth, 7, 'F');
    }
    
    pdf.setFontSize(8);
    let xPos = margin + 2;
    values.forEach((value, i) => {
      if (rowColors && rowColors[i]) {
        pdf.setTextColor(...rowColors[i]!);
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setTextColor(...defaultColors.dark);
        pdf.setFont("helvetica", "normal");
      }
      pdf.text((value || "-").substring(0, 25), xPos, y + 5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    return y + 7;
  };

  const localCheckPageBreak = (pdf: jsPDF, yPos: number, needed: number = 25): number => {
    if (yPos + needed > pdf.internal.pageSize.getHeight() - 15) {
      pdf.addPage();
      return 20;
    }
    return yPos;
  };

  // ========================== TDJ (Temps de Jeu) REPORT ==========================
  const generateTdjReport = async () => {
    setGeneratingReport("tdj");
    try {
      const { settings: pdfSettings, logoBase64, seasonName } = await preparePdfWithSettings(categoryId);

      // Fetch all matches with lineups, stats and injuries
      let matchQuery = supabase.from("matches").select("id, match_date, opponent, is_home").eq("category_id", categoryId).order("match_date");
      if (tdjDateFrom) matchQuery = matchQuery.gte("match_date", tdjDateFrom);
      if (tdjDateTo) matchQuery = matchQuery.lte("match_date", tdjDateTo);

      const matchesFirst = await matchQuery;
      const matchIds = matchesFirst.data?.map(m => m.id) || [];

      const [lineupsRes, statsRes, injuriesRes] = await Promise.all([
        supabase.from("match_lineups").select("match_id, player_id, is_starter, minutes_played").in("match_id", matchIds),
        supabase.from("player_match_stats").select("match_id, player_id, sport_data").in("match_id", matchIds),
        (() => {
          let q = supabase.from("injuries").select("player_id, injury_date, estimated_return_date, status").eq("category_id", categoryId);
          if (tdjDateFrom) q = q.gte("injury_date", tdjDateFrom);
          if (tdjDateTo) q = q.lte("injury_date", tdjDateTo);
          return q;
        })(),
      ]);

      const matchesData = matchesFirst.data || [];
      const lineups = lineupsRes.data || [];
      const matchStats = statsRes.data || [];
      const injuries = injuriesRes.data || [];

      // Build a map of playing time from player_match_stats (sport_data.minutesPlayed)
      const statsMinutesMap = new Map<string, number>();
      matchStats.forEach((s: any) => {
        const minutes = s.sport_data?.minutesPlayed || s.sport_data?.playingTime || 0;
        if (minutes > 0) {
          const key = `${s.match_id}_${s.player_id}`;
          statsMinutesMap.set(key, Number(minutes));
        }
      });

      // Build per-player stats
      const playerTdj = players.map(player => {
        const playerLineups = lineups.filter(l => l.player_id === player.id);
        // Use match_lineups.minutes_played first, fall back to player_match_stats.sport_data.minutesPlayed
        const totalMinutes = playerLineups.reduce((sum, l) => {
          const lineupMin = l.minutes_played || 0;
          if (lineupMin > 0) return sum + lineupMin;
          // Fallback to sport_data
          const statsMin = statsMinutesMap.get(`${l.match_id}_${l.player_id}`) || 0;
          return sum + statsMin;
        }, 0);
        const starterCount = playerLineups.filter(l => l.is_starter).length;
        const subCount = playerLineups.filter(l => !l.is_starter).length;
        const matchCount = playerLineups.length;
        const playerInjuries = injuries.filter(i => i.player_id === player.id);
        const injuredCount = playerInjuries.length;
        // "Hors-groupe" = matches where player was NOT in lineup and not injured
        const matchIds = new Set(matchesData.map(m => m.id));
        const playerMatchIds = new Set(playerLineups.map(l => l.match_id));
        let horsGroupeCount = 0;
        matchesData.forEach(m => {
          if (!playerMatchIds.has(m.id)) {
            // Check if injured at that date
            const wasInjured = playerInjuries.some(inj => {
              const injDate = new Date(inj.injury_date);
              const matchDate = new Date(m.match_date);
              const returnDate = inj.estimated_return_date ? new Date(inj.estimated_return_date) : null;
              return injDate <= matchDate && (!returnDate || returnDate >= matchDate);
            });
            if (!wasInjured) horsGroupeCount++;
          }
        });

        // Blessé = matches missed due to injury
        const blesseCount = matchesData.length - matchCount - horsGroupeCount;

        return {
          name: [player.first_name, player.name].filter(Boolean).join(" "),
          totalMinutes,
          starterCount,
          subCount,
          matchCount,
          horsGroupeCount,
          blesseCount: Math.max(0, blesseCount),
          injuredCount,
        };
      }).sort((a, b) => b.totalMinutes - a.totalMinutes);

      // Generate PDF
      const pdf = new jsPDF({ orientation: "landscape" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      const dateRange = tdjDateFrom || tdjDateTo
        ? `${tdjDateFrom ? format(new Date(tdjDateFrom), "d MMM yyyy", { locale: fr }) : "Début"} → ${tdjDateTo ? format(new Date(tdjDateTo), "d MMM yyyy", { locale: fr }) : "Aujourd'hui"}`
        : "";

      let yPos = drawPdfHeaderCustom(
        pdf,
        `SUIVI TEMPS DE JEU${seasonName ? ` - ${seasonName}` : ""}`,
        `${category?.clubs?.name} - ${category?.name}`,
        `${matchesData.length} matchs | ${format(new Date(), "d MMMM yyyy", { locale: fr })}${dateRange ? ` | ${dateRange}` : ""}`,
        pdfSettings,
        logoBase64
      );

      // KPI row
      const cardW = (contentWidth - 20) / 5;
      const cardH = 18;
      const totalMatchMinutes = playerTdj.reduce((s, p) => s + p.totalMinutes, 0);
      const avgMinutes = players.length > 0 ? Math.round(totalMatchMinutes / players.length) : 0;

      drawKpiCard(pdf, margin, yPos, cardW, cardH, String(matchesData.length), "MATCHS", defaultColors.primary);
      drawKpiCard(pdf, margin + cardW + 5, yPos, cardW, cardH, String(players.length), "JOUEURS", defaultColors.primary);
      drawKpiCard(pdf, margin + (cardW + 5) * 2, yPos, cardW, cardH, String(totalMatchMinutes), "MIN TOTALES", defaultColors.success);
      drawKpiCard(pdf, margin + (cardW + 5) * 3, yPos, cardW, cardH, String(avgMinutes), "MIN MOY/JOUEUR", defaultColors.warning);
      drawKpiCard(pdf, margin + (cardW + 5) * 4, yPos, cardW, cardH, String(injuries.length), "BLESSURES", injuries.length > 5 ? defaultColors.danger : defaultColors.success);

      yPos += cardH + 12;

      // Table header
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("TOTAL DE LA SAISON", margin, yPos);
      yPos += 7;

      const headers = ["Prénom / NOM", "Min. totales", "Titulaire", "Remplaçant", "Matchs joués", "Hors-groupe", "Blessé"];
      const colWidths = [70, 35, 35, 35, 35, 35, 35];
      yPos = drawTableHeaderPdf(pdf, headers, colWidths, yPos, margin, contentWidth);

      playerTdj.forEach((p, index) => {
        if (yPos + 7 > pdf.internal.pageSize.getHeight() - 15) {
          pdf.addPage("landscape");
          yPos = 20;
          yPos = drawTableHeaderPdf(pdf, headers, colWidths, yPos, margin, contentWidth);
        }

        const minuteColor = p.totalMinutes > 500 ? defaultColors.success : p.totalMinutes > 200 ? defaultColors.warning : defaultColors.danger;
        const blesseColor = p.blesseCount > 3 ? defaultColors.danger : null;

        yPos = drawTableRowPdf(
          pdf,
          [
            p.name,
            String(p.totalMinutes),
            String(p.starterCount),
            String(p.subCount),
            String(p.matchCount),
            String(p.horsGroupeCount),
            String(p.blesseCount),
          ],
          colWidths,
          yPos,
          index % 2 === 1,
          margin,
          contentWidth,
          [null, minuteColor, defaultColors.success, defaultColors.warning, null, defaultColors.muted, blesseColor]
        );
      });

      pdf.save(`tdj_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport Temps de Jeu généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateTdjCsv = async () => {
    setGeneratingReport("tdj-csv");
    try {
      let matchQuery = supabase.from("matches").select("id, match_date, opponent").eq("category_id", categoryId).order("match_date");
      if (tdjDateFrom) matchQuery = matchQuery.gte("match_date", tdjDateFrom);
      if (tdjDateTo) matchQuery = matchQuery.lte("match_date", tdjDateTo);

      const [matchesRes, lineupsRes, injuriesRes] = await Promise.all([
        matchQuery,
        supabase.from("match_lineups").select("match_id, player_id, is_starter, minutes_played").in("match_id", (await matchQuery).data?.map(m => m.id) || []),
        supabase.from("injuries").select("player_id, injury_date, estimated_return_date").eq("category_id", categoryId),
      ]);

      const matchesData = matchesRes.data || [];
      const lineups = lineupsRes.data || [];
      const injuries = injuriesRes.data || [];

      const headers = ["Joueur", "Minutes totales", "Titulaire", "Remplaçant", "Matchs joués", "Hors-groupe", "Blessé"];
      const rows = players.map(player => {
        const pl = lineups.filter(l => l.player_id === player.id);
        const totalMin = pl.reduce((s, l) => s + (l.minutes_played || 0), 0);
        const starter = pl.filter(l => l.is_starter).length;
        const sub = pl.filter(l => !l.is_starter).length;
        const playerInjuries = injuries.filter(i => i.player_id === player.id);
        const playerMatchIds = new Set(pl.map(l => l.match_id));
        let horsGroupe = 0;
        matchesData.forEach(m => {
          if (!playerMatchIds.has(m.id)) {
            const wasInjured = playerInjuries.some(inj => {
              const injDate = new Date(inj.injury_date);
              const matchDate = new Date(m.match_date);
              const returnDate = inj.estimated_return_date ? new Date(inj.estimated_return_date) : null;
              return injDate <= matchDate && (!returnDate || returnDate >= matchDate);
            });
            if (!wasInjured) horsGroupe++;
          }
        });
        const blesse = Math.max(0, matchesData.length - pl.length - horsGroupe);
        return [[player.first_name, player.name].filter(Boolean).join(" "), totalMin, starter, sub, pl.length, horsGroupe, blesse];
      }).sort((a, b) => (b[1] as number) - (a[1] as number));

      const csv = generateCsv(headers, rows);
      downloadCsv(`tdj_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
      toast.success("Export CSV généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== SEASON REPORT ==========================
  const generateSeasonReport = async () => {
    setGeneratingReport("season");
    
    try {
      const { settings: pdfSettings, logoBase64, seasonName: sName } = await preparePdfWithSettings(categoryId);

      const [matchesRes, injuriesRes, goalsRes, awcrRes] = await Promise.all([
        supabase.from("matches").select("*").eq("category_id", categoryId).order("match_date"),
        supabase.from("injuries").select("*, players(name)").eq("category_id", categoryId),
        supabase.from("season_goals").select("*").eq("category_id", categoryId).eq("season_year", new Date().getFullYear()),
        supabase.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false }),
      ]);

      const matchesData = matchesRes.data || [];
      const wins = matchesData.filter(m => 
        (m.is_home && (m.score_home || 0) > (m.score_away || 0)) ||
        (!m.is_home && (m.score_away || 0) > (m.score_home || 0))
      ).length;
      const losses = matchesData.filter(m => 
        (m.is_home && (m.score_home || 0) < (m.score_away || 0)) ||
        (!m.is_home && (m.score_away || 0) < (m.score_home || 0))
      ).length;
      const draws = matchesData.length - wins - losses;
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status === 'active').length;

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      let yPos = drawPdfHeaderCustom(
        pdf,
        `BILAN DE SAISON${sName ? ` - ${sName}` : ` ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}`,
        `${category?.clubs?.name} - ${category?.name}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`,
        pdfSettings,
        logoBase64
      );

      // KPI Cards
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(players.length), "JOUEURS", defaultColors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(matchesData.length), "MATCHS", defaultColors.primary);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(wins), "VICTOIRES", defaultColors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSÉS", activeInjuries > 0 ? defaultColors.danger : defaultColors.success);

      yPos += cardHeight + 15;

      // Match Record Summary
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("BILAN SPORTIF", margin, yPos);
      yPos += 10;

      const recordBoxWidth = (contentWidth - 10) / 3;
      
      pdf.setFillColor(...defaultColors.success);
      pdf.roundedRect(margin, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setTextColor(...defaultColors.white);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(wins), margin + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("VICTOIRES", margin + recordBoxWidth / 2 - 15, yPos + 15);

      pdf.setFillColor(...defaultColors.muted);
      pdf.roundedRect(margin + recordBoxWidth + 5, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setFontSize(14);
      pdf.text(String(draws), margin + recordBoxWidth + 5 + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("NULS", margin + recordBoxWidth + 5 + recordBoxWidth / 2 - 8, yPos + 15);

      pdf.setFillColor(...defaultColors.danger);
      pdf.roundedRect(margin + (recordBoxWidth + 5) * 2, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setFontSize(14);
      pdf.text(String(losses), margin + (recordBoxWidth + 5) * 2 + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("DÉFAITES", margin + (recordBoxWidth + 5) * 2 + recordBoxWidth / 2 - 14, yPos + 15);

      yPos += 28;

      // Goals Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("OBJECTIFS DE SAISON", margin, yPos);
      yPos += 8;

      const goals = goalsRes.data || [];
      if (goals.length > 0) {
        const goalHeaders = ["Objectif", "Progression", "Statut"];
        const goalColWidths = [100, 40, 40];
        yPos = drawTableHeaderPdf(pdf, goalHeaders, goalColWidths, yPos, margin, contentWidth);

        goals.forEach((goal, index) => {
          const statusLabel = goal.status === 'completed' ? 'Atteint' : goal.status === 'in_progress' ? 'En cours' : 'En attente';
          const statusColor = goal.status === 'completed' ? defaultColors.success : goal.status === 'in_progress' ? defaultColors.warning : defaultColors.muted;
          yPos = drawTableRowPdf(pdf, [
            goal.title,
            `${goal.progress_percentage || 0}%`,
            statusLabel
          ], goalColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, statusColor]);
        });
        yPos += 5;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...defaultColors.muted);
        pdf.text("Aucun objectif défini", margin, yPos);
        yPos += 10;
      }

      // Match Results
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("RÉSULTATS DES MATCHS", margin, yPos);
      yPos += 8;

      if (matchesData.length > 0) {
        const matchHeaders = ["Date", "Adversaire", "Score", "Résultat"];
        const matchColWidths = [35, 70, 35, 40];
        yPos = drawTableHeaderPdf(pdf, matchHeaders, matchColWidths, yPos, margin, contentWidth);

        matchesData.slice(0, 12).forEach((match, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const score = `${match.score_home ?? '-'} - ${match.score_away ?? '-'}`;
          let result = '-';
          let resultColor: [number, number, number] | null = null;
          
          if (match.score_home !== null && match.score_away !== null) {
            const isWin = (match.is_home && match.score_home > match.score_away) || (!match.is_home && match.score_away > match.score_home);
            const isLoss = (match.is_home && match.score_home < match.score_away) || (!match.is_home && match.score_away < match.score_home);
            result = isWin ? 'Victoire' : isLoss ? 'Défaite' : 'Nul';
            resultColor = isWin ? defaultColors.success : isLoss ? defaultColors.danger : defaultColors.muted;
          }
          
          yPos = drawTableRowPdf(pdf, [
            format(new Date(match.match_date), "dd/MM/yy"),
            match.opponent,
            score,
            result
          ], matchColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, null, resultColor]);
        });
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...defaultColors.muted);
        pdf.text("Aucun match joué", margin, yPos);
      }

      // Injury Summary
      yPos += 15;
      yPos = localCheckPageBreak(pdf, yPos, 40);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("BILAN MÉDICAL", margin, yPos);
      yPos += 10;

      const injuryStats = [
        { label: "Blessures totales", value: allInjuries.length, color: defaultColors.primary },
        { label: "Actuellement blessés", value: activeInjuries, color: activeInjuries > 0 ? defaultColors.danger : defaultColors.success },
        { label: "En réathlétisation", value: allInjuries.filter(i => i.status === 'recovering').length, color: defaultColors.warning },
      ];

      const statBoxWidth = (contentWidth - 10) / 3;
      injuryStats.forEach((stat, i) => {
        pdf.setFillColor(...stat.color);
        pdf.roundedRect(margin + (statBoxWidth + 5) * i, yPos, statBoxWidth, 18, 2, 2, 'F');
        pdf.setTextColor(...defaultColors.white);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(stat.value), margin + (statBoxWidth + 5) * i + statBoxWidth / 2 - 5, yPos + 10);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        const labelWidth = pdf.getTextWidth(stat.label);
        pdf.text(stat.label, margin + (statBoxWidth + 5) * i + (statBoxWidth - labelWidth) / 2, yPos + 15);
      });

      pdf.save(`bilan_saison_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport de saison généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== MATCH REPORT ==========================
  const generateMatchReport = async () => {
    if (!selectedMatch) {
      toast.error("Veuillez sélectionner un match");
      return;
    }

    setGeneratingReport("match");
    
    try {
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) throw new Error("Match non trouvé");

      const { settings: pdfSettings, logoBase64, seasonName: sn2 } = await preparePdfWithSettings(categoryId);

      // Fetch match data + stat preferences
      const [lineupsRes, statsRes, statPrefsRes, customStatsRes] = await Promise.all([
        supabase.from("match_lineups").select("*, players(name, first_name, position)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*, players(name, first_name)").eq("match_id", selectedMatch),
        supabase.from("category_stat_preferences").select("enabled_stats, enabled_custom_stats").eq("category_id", categoryId).maybeSingle(),
        supabase.from("custom_stats").select("*").eq("category_id", categoryId),
      ]);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Determine result
      let resultText = "Match";
      let resultColor = defaultColors.primary;
      if (match.score_home !== null && match.score_away !== null) {
        const isWin = (match.is_home && match.score_home > match.score_away) || (!match.is_home && match.score_away > match.score_home);
        const isLoss = (match.is_home && match.score_home < match.score_away) || (!match.is_home && match.score_away < match.score_home);
        resultText = isWin ? "VICTOIRE" : isLoss ? "DÉFAITE" : "MATCH NUL";
        resultColor = isWin ? defaultColors.success : isLoss ? defaultColors.danger : defaultColors.muted;
      }

      let yPos = drawPdfHeaderCustom(
        pdf,
        `RAPPORT DE MATCH`,
        `vs ${match.opponent} - ${match.location || 'Lieu non défini'}`,
        `${format(new Date(match.match_date), "EEEE d MMMM yyyy", { locale: fr })}`,
        pdfSettings,
        logoBase64
      );

      // Score Card
      const scoreBoxWidth = contentWidth;
      pdf.setFillColor(...resultColor);
      pdf.roundedRect(margin, yPos, scoreBoxWidth, 35, 3, 3, 'F');
      
      pdf.setTextColor(...defaultColors.white);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(resultText, margin + scoreBoxWidth / 2 - pdf.getTextWidth(resultText) / 2, yPos + 8);
      
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      const scoreText = `${match.score_home ?? '-'} - ${match.score_away ?? '-'}`;
      pdf.text(scoreText, margin + scoreBoxWidth / 2 - pdf.getTextWidth(scoreText) / 2, yPos + 25);
      
      yPos += 45;

      // Match Stats
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("STATISTIQUES DU MATCH", margin, yPos);
      yPos += 10;

      const matchStatsData = [
        { label: "Temps effectif", value: match.effective_play_time ? `${match.effective_play_time} min` : '-' },
        { label: "Séq. la plus longue", value: match.longest_play_sequence ? `${match.longest_play_sequence} sec` : '-' },
        { label: "Séq. moyenne", value: match.average_play_sequence ? `${match.average_play_sequence} sec` : '-' },
      ];

      pdf.setFillColor(...defaultColors.light);
      pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(...defaultColors.dark);
      pdf.setFont("helvetica", "normal");
      
      let xOffset = margin + 5;
      matchStatsData.forEach((stat) => {
        pdf.text(`${stat.label}: ${stat.value}`, xOffset, yPos + 10);
        xOffset += 60;
      });
      
      yPos += 25;

      // Lineup
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("COMPOSITION", margin, yPos);
      yPos += 8;

      const starters = lineupsRes.data?.filter(l => l.is_starter) || [];
      const subs = lineupsRes.data?.filter(l => !l.is_starter) || [];

      if (starters.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.success);
        pdf.text("Titulaires", margin, yPos);
        yPos += 6;

        const lineupHeaders = ["Joueur", "Position", "Minutes"];
        const lineupColWidths = [80, 50, 50];
        yPos = drawTableHeaderPdf(pdf, lineupHeaders, lineupColWidths, yPos, margin, contentWidth);

        starters.forEach((p, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const fullName = [p.players?.first_name, p.players?.name].filter(Boolean).join(" ") || 'Inconnu';
          yPos = drawTableRowPdf(pdf, [
            fullName,
            p.position || p.players?.position || '-',
            `${p.minutes_played || 0} min`
          ], lineupColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
        yPos += 5;
      }

      if (subs.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.warning);
        pdf.text("Remplaçants", margin, yPos);
        yPos += 6;

        const subHeaders = ["Joueur", "Position", "Minutes"];
        const subColWidths = [80, 50, 50];
        yPos = drawTableHeaderPdf(pdf, subHeaders, subColWidths, yPos, margin, contentWidth);

        subs.forEach((p, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const fullName = [p.players?.first_name, p.players?.name].filter(Boolean).join(" ") || 'Inconnu';
          yPos = drawTableRowPdf(pdf, [
            fullName,
            p.position || p.players?.position || '-',
            `${p.minutes_played || 0} min`
          ], subColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
      }

      // Player Stats with DYNAMIC columns from stat preferences
      const playerStats = statsRes.data || [];
      if (playerStats.length > 0) {
        yPos += 10;
        yPos = localCheckPageBreak(pdf, yPos, 30);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("STATISTIQUES JOUEURS", margin, yPos);
        yPos += 8;

        // Get the stats to display based on preferences
        const sportType = category?.clubs?.sport || "rugby";
        const allStatsDef = getStatsForSport(sportType);
        const customStatFields = (customStatsRes.data || []).map((cs: any) => ({
          key: cs.key, label: cs.label, shortLabel: cs.short_label,
          category: cs.category_type as StatField["category"],
          type: "number" as const,
        }));
        const allAvailable = [...allStatsDef, ...customStatFields];
        const enabledKeys = [
          ...(statPrefsRes.data?.enabled_stats as string[] || []),
          ...(statPrefsRes.data?.enabled_custom_stats as string[] || []),
        ];
        const displayStats = enabledKeys.length > 0
          ? allAvailable.filter(s => enabledKeys.includes(s.key))
          : allAvailable;

        // Filter to only show stats that have at least one non-zero value across all players
        const statsWithData = displayStats.filter(s => {
          return playerStats.some((stat: any) => {
            const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
            const val = sportData[s.key] ?? stat[s.key] ?? 0;
            return val !== 0 && val !== null && val !== undefined;
          });
        });

        // If no stats have data, show first 6 anyway with zeros
        const statsToShow = statsWithData.length > 0 ? statsWithData : displayStats.slice(0, 6);

        // Paginate stats in groups of 8 columns
        const COLS_PER_TABLE = 8;
        for (let pageIdx = 0; pageIdx < statsToShow.length; pageIdx += COLS_PER_TABLE) {
          const pageStats = statsToShow.slice(pageIdx, pageIdx + COLS_PER_TABLE);
          
          if (pageIdx > 0) {
            yPos += 5;
            yPos = localCheckPageBreak(pdf, yPos, 20);
          }

          const statHeaders = ["Joueur", ...pageStats.map(s => s.shortLabel)];
          const nameColWidth = 45;
          const statColWidth = Math.max(15, Math.floor((contentWidth - nameColWidth) / pageStats.length));
          const statColWidths = [nameColWidth, ...pageStats.map(() => statColWidth)];
          yPos = drawTableHeaderPdf(pdf, statHeaders, statColWidths, yPos, margin, contentWidth);

          playerStats.forEach((stat: any, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10);
            const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
            const playerName = [stat.players?.first_name, stat.players?.name].filter(Boolean).join(" ") || 'Inconnu';
            
            const values = [
              playerName,
              ...pageStats.map(s => {
                const val = sportData[s.key] ?? stat[s.key] ?? stat[s.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
                return val != null ? String(val) : '-';
              })
            ];

            const rowColors: ([number, number, number] | null)[] = [
              null,
              ...pageStats.map(s => {
                const val = sportData[s.key] ?? stat[s.key];
                if (s.key === 'tries' && val && val > 0) return defaultColors.success;
                if (s.key === 'yellowCards' && val && val > 0) return defaultColors.warning;
                if (s.key === 'redCards' && val && val > 0) return defaultColors.danger;
                return null;
              })
            ];

            yPos = drawTableRowPdf(pdf, values, statColWidths, yPos, index % 2 === 1, margin, contentWidth, rowColors);
          });
        }
      }

      pdf.save(`match_${match.opponent.replace(/\s+/g, '_')}_${format(new Date(match.match_date), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport de match généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== SQUAD OVERVIEW REPORT ==========================
  const generateSquadReport = async () => {
    setGeneratingReport("squad");
    
    try {
      const { settings: pdfSettings, logoBase64, seasonName: sn3 } = await preparePdfWithSettings(categoryId);

      const { data: categoryMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("category_id", categoryId);
      
      const matchIds = categoryMatches?.map(m => m.id) || [];

      // Build date-filtered queries
      const [
        injuriesRes, wellnessRes, awcrRes, speedTestsRes, jumpTestsRes,
        matchLineupsRes, measurementsRes, bodyCompRes,
      ] = await Promise.all([
        (() => {
          let q = supabase.from("injuries").select("*, players(name)").eq("category_id", categoryId);
          if (overviewDateFrom) q = q.gte("injury_date", overviewDateFrom);
          if (overviewDateTo) q = q.lte("injury_date", overviewDateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from("wellness_tracking").select("*, players(name)").eq("category_id", categoryId).order("tracking_date", { ascending: false });
          if (overviewDateFrom) q = q.gte("tracking_date", overviewDateFrom);
          if (overviewDateTo) q = q.lte("tracking_date", overviewDateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false });
          if (overviewDateFrom) q = q.gte("session_date", overviewDateFrom);
          if (overviewDateTo) q = q.lte("session_date", overviewDateTo);
          return q;
        })(),
        supabase.from("speed_tests").select("*, players(name)").eq("category_id", categoryId),
        supabase.from("jump_tests").select("*, players(name)").eq("category_id", categoryId),
        matchIds.length > 0 
          ? supabase.from("match_lineups").select("*, players(name), matches(match_date, opponent)").in("match_id", matchIds)
          : Promise.resolve({ data: [] }),
        supabase.from("player_measurements").select("*, players(name)").eq("category_id", categoryId).order("measurement_date", { ascending: false }),
        supabase.from("body_composition").select("*, players(name)").eq("category_id", categoryId).order("measurement_date", { ascending: false }),
      ]);

      const pdf = new jsPDF();
      let yPos = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      const colors = defaultColors;

      const checkPageBreak = (needed: number = 25) => {
        if (yPos + needed > 280) {
          pdf.addPage();
          yPos = 20;
        }
      };

      const drawColoredBox = (x: number, y: number, w: number, h: number, color: [number, number, number], text: string) => {
        pdf.setFillColor(...color);
        pdf.roundedRect(x, y, w, h, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(10);
        const textWidth = pdf.getTextWidth(text);
        pdf.text(text, x + (w - textWidth) / 2, y + h / 2 + 3);
      };

      const drawTableHeader = (headers: string[], colWidths: number[], y: number) => {
        pdf.setFillColor(...colors.dark);
        pdf.rect(margin, y, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        
        let xPos = margin + 2;
        headers.forEach((header, i) => {
          pdf.text(header.substring(0, Math.floor(colWidths[i] / 3)), xPos, y + 5.5);
          xPos += colWidths[i];
        });
        pdf.setFont("helvetica", "normal");
        return y + 8;
      };

      const drawTableRow = (values: string[], colWidths: number[], y: number, isAlternate: boolean, rowColors?: ([number, number, number] | null)[]) => {
        if (isAlternate) {
          pdf.setFillColor(...colors.light);
          pdf.rect(margin, y, contentWidth, 7, 'F');
        }
        
        pdf.setFontSize(8);
        let xPos = margin + 2;
        values.forEach((value, i) => {
          if (rowColors && rowColors[i]) {
            pdf.setTextColor(...rowColors[i]!);
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setTextColor(...colors.dark);
            pdf.setFont("helvetica", "normal");
          }
          pdf.text((value || "-").substring(0, 20), xPos, y + 5);
          xPos += colWidths[i];
        });
        pdf.setFont("helvetica", "normal");
        return y + 7;
      };

      // ========== PAGE 1: HEADER + EXECUTIVE SUMMARY ==========
      const dateRange = overviewDateFrom || overviewDateTo 
        ? `\nPériode: ${overviewDateFrom ? format(new Date(overviewDateFrom), "dd/MM/yyyy") : "début"} - ${overviewDateTo ? format(new Date(overviewDateTo), "dd/MM/yyyy") : "aujourd'hui"}`
        : "";
      
      yPos = drawPdfHeaderCustom(
        pdf,
        "VUE D'ENSEMBLE DE L'EFFECTIF",
        `${category?.clubs?.name} - ${category?.name}${sn3 ? ` • ${sn3}` : ''}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}${dateRange ? ` | ${dateRange.trim()}` : ""}`,
        pdfSettings,
        logoBase64
      );

      pdf.setTextColor(...colors.dark);

      // Calculate key metrics
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status === 'active');
      const recoveringInjuries = allInjuries.filter(i => i.status === 'recovering');

      const latestAwcrByPlayer: Record<string, any> = {};
      (awcrRes.data || []).forEach((a: any) => {
        if (!latestAwcrByPlayer[a.player_id]) {
          latestAwcrByPlayer[a.player_id] = a;
        }
      });
      const awcrEntries = Object.values(latestAwcrByPlayer);
      // Use EWMA ratio thresholds: optimal 0.85-1.30, high >1.5
      const highEwma = awcrEntries.filter((a: any) => (a.awcr || 0) > 1.5).length;
      const optimalEwma = awcrEntries.filter((a: any) => (a.awcr || 0) >= 0.85 && (a.awcr || 0) <= 1.3).length;

      const latestWellnessByPlayer: Record<string, any> = {};
      (wellnessRes.data || []).forEach((w: any) => {
        if (!latestWellnessByPlayer[w.player_id]) {
          latestWellnessByPlayer[w.player_id] = w;
        }
      });
      const wellnessEntries = Object.values(latestWellnessByPlayer);
      const playersWithPain = wellnessEntries.filter((w: any) => w.has_specific_pain).length;

      // Executive Summary Cards
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 25;
      const cardY = yPos;

      // Card 1: Players
      pdf.setFillColor(...colors.primary);
      pdf.roundedRect(margin, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(players.length), margin + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("JOUEURS", margin + cardWidth / 2 - 12, cardY + 20);

      // Card 2: Active Injuries
      const injuryColor = activeInjuries.length > 0 ? colors.danger : colors.success;
      pdf.setFillColor(...injuryColor);
      pdf.roundedRect(margin + cardWidth + 5, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(activeInjuries.length), margin + cardWidth + 5 + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("BLESSÉS", margin + cardWidth + 5 + cardWidth / 2 - 10, cardY + 20);

      // Card 3: High EWMA (was AWCR)
      const ewmaColor = highEwma > 0 ? colors.warning : colors.success;
      pdf.setFillColor(...ewmaColor);
      pdf.roundedRect(margin + (cardWidth + 5) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(highEwma), margin + (cardWidth + 5) * 2 + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("EWMA ÉLEVÉ", margin + (cardWidth + 5) * 2 + cardWidth / 2 - 14, cardY + 20);

      // Card 4: Players with pain
      const painColor = playersWithPain > 0 ? colors.warning : colors.success;
      pdf.setFillColor(...painColor);
      pdf.roundedRect(margin + (cardWidth + 5) * 3, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(playersWithPain), margin + (cardWidth + 5) * 3 + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("DOULEURS", margin + (cardWidth + 5) * 3 + cardWidth / 2 - 12, cardY + 20);

      yPos = cardY + cardHeight + 15;

      // Legend
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);
      pdf.text("Légende: ", margin, yPos);
      drawColoredBox(margin + 20, yPos - 4, 8, 6, colors.success, "");
      pdf.setTextColor(...colors.dark);
      pdf.text("Bon", margin + 30, yPos);
      drawColoredBox(margin + 45, yPos - 4, 8, 6, colors.warning, "");
      pdf.text("Attention", margin + 55, yPos);
      drawColoredBox(margin + 80, yPos - 4, 8, 6, colors.danger, "");
      pdf.text("Critique", margin + 90, yPos);
      yPos += 15;

      // ========== INJURIES OVERVIEW ==========
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("BILAN MÉDICAL", margin, yPos);
      yPos += 8;

      const statusBoxWidth = (contentWidth - 10) / 3;
      drawColoredBox(margin, yPos, statusBoxWidth, 15, colors.danger, `${activeInjuries.length} Actives`);
      drawColoredBox(margin + statusBoxWidth + 5, yPos, statusBoxWidth, 15, colors.warning, `${recoveringInjuries.length} Réathlétisation`);
      drawColoredBox(margin + (statusBoxWidth + 5) * 2, yPos, statusBoxWidth, 15, colors.success, `${allInjuries.filter(i => i.status === 'healed').length} Guéries`);
      yPos += 22;

      // Injury types
      const injuryTypes: Record<string, number> = {};
      allInjuries.forEach(i => { injuryTypes[i.injury_type] = (injuryTypes[i.injury_type] || 0) + 1; });
      
      if (Object.keys(injuryTypes).length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text("Types de blessures:", margin, yPos);
        yPos += 6;

        const injuryHeaders = ["Type", "Nombre", "%"];
        const injuryColWidths = [100, 40, 40];
        yPos = drawTableHeader(injuryHeaders, injuryColWidths, yPos);

        Object.entries(injuryTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([type, count], index) => {
            const percent = ((count / allInjuries.length) * 100).toFixed(0);
            yPos = drawTableRow([type, String(count), `${percent}%`], injuryColWidths, yPos, index % 2 === 1);
          });
      }
      yPos += 10;

      // ========== PAGE 2: COMPARATIVE TABLE ==========
      pdf.addPage();
      yPos = 20;

      pdf.setFillColor(...colors.primary);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("TABLEAU COMPARATIF DES JOUEURS", margin, 16);
      
      yPos = 35;
      pdf.setTextColor(...colors.dark);

      // Build player comparison data
      const lineups = matchLineupsRes.data || [];
      const matchesByPlayer: Record<string, { matches: number; minutes: number }> = {};
      lineups.forEach((l: any) => {
        if (!matchesByPlayer[l.player_id]) {
          matchesByPlayer[l.player_id] = { matches: 0, minutes: 0 };
        }
        matchesByPlayer[l.player_id].matches += 1;
        matchesByPlayer[l.player_id].minutes += l.minutes_played || 0;
      });

      const sprintTests = (speedTestsRes.data || []).filter((t: any) => t.test_type === '40m' && t.time_40m_seconds);
      const bestSprintByPlayer: Record<string, number> = {};
      sprintTests.forEach((t: any) => {
        if (!bestSprintByPlayer[t.player_id] || t.time_40m_seconds! < bestSprintByPlayer[t.player_id]) {
          bestSprintByPlayer[t.player_id] = t.time_40m_seconds!;
        }
      });

      const cmjTests = (jumpTestsRes.data || []).filter((t: any) => t.test_type === 'CMJ');
      const bestCmjByPlayer: Record<string, number> = {};
      cmjTests.forEach((t: any) => {
        if (!bestCmjByPlayer[t.player_id] || t.result_cm > bestCmjByPlayer[t.player_id]) {
          bestCmjByPlayer[t.player_id] = t.result_cm;
        }
      });

      // Comparative table - EWMA instead of AWCR
      const compHeaders = ["Joueur", "Pos.", "Bless.", "EWMA", "40m", "CMJ", "Matchs", "Min."];
      const compColWidths = [45, 25, 20, 25, 22, 22, 22, 22];
      yPos = drawTableHeader(compHeaders, compColWidths, yPos);

      players.forEach((player, index) => {
        checkPageBreak(10);
        
        const playerInjuries = allInjuries.filter(i => i.player_id === player.id && i.status === 'active').length;
        const playerAwcr = latestAwcrByPlayer[player.id]?.awcr;
        const playerSprint = bestSprintByPlayer[player.id];
        const playerCmj = bestCmjByPlayer[player.id];
        const playerMatches = matchesByPlayer[player.id];
        
        const values = [
          [player.first_name, player.name].filter(Boolean).join(" "),
          player.position || '-',
          String(playerInjuries),
          playerAwcr ? playerAwcr.toFixed(2) : '-',
          playerSprint ? `${playerSprint.toFixed(2)}s` : '-',
          playerCmj ? `${playerCmj}cm` : '-',
          playerMatches ? String(playerMatches.matches) : '0',
          playerMatches ? String(playerMatches.minutes) : '0',
        ];

        const rowColors: ([number, number, number] | null)[] = [
          null, null,
          playerInjuries > 0 ? colors.danger : null,
          playerAwcr ? (playerAwcr > 1.5 ? colors.danger : playerAwcr < 0.85 ? colors.warning : colors.success) : null,
          playerSprint ? (playerSprint < 5.2 ? colors.success : playerSprint > 5.8 ? colors.danger : null) : null,
          playerCmj ? (playerCmj > 40 ? colors.success : playerCmj < 30 ? colors.danger : null) : null,
          null, null,
        ];

        yPos = drawTableRow(values, compColWidths, yPos, index % 2 === 1, rowColors);
      });

      yPos += 15;

      // Physical Stats Summary
      checkPageBreak(60);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("STATISTIQUES PHYSIQUES", margin, yPos);
      yPos += 10;

      const sprintTimes = Object.values(bestSprintByPlayer);
      const cmjHeights = Object.values(bestCmjByPlayer);
      
      if (sprintTimes.length > 0 || cmjHeights.length > 0) {
        const statBoxW = (contentWidth - 5) / 2;
        
        if (sprintTimes.length > 0) {
          const avgSprint = sprintTimes.reduce((a, b) => a + b, 0) / sprintTimes.length;
          const bestSprint = Math.min(...sprintTimes);
          
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin, yPos, statBoxW, 25, 2, 2, 'F');
          pdf.setTextColor(...colors.dark);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("SPRINT 40M", margin + 5, yPos + 8);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(`Moyenne: ${avgSprint.toFixed(2)}s | Meilleur: ${bestSprint.toFixed(2)}s`, margin + 5, yPos + 18);
        }
        
        if (cmjHeights.length > 0) {
          const avgCmj = cmjHeights.reduce((a, b) => a + b, 0) / cmjHeights.length;
          const maxCmj = Math.max(...cmjHeights);
          
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin + (contentWidth - 5) / 2 + 5, yPos, (contentWidth - 5) / 2, 25, 2, 2, 'F');
          pdf.setTextColor(...colors.dark);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("DÉTENTE CMJ", margin + (contentWidth - 5) / 2 + 10, yPos + 8);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(`Moyenne: ${avgCmj.toFixed(1)}cm | Max: ${maxCmj.toFixed(1)}cm`, margin + (contentWidth - 5) / 2 + 10, yPos + 18);
        }
        yPos += 30;
      }

      // EWMA Distribution (was AWCR)
      checkPageBreak(40);
      if (awcrEntries.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text("Distribution Ratio EWMA:", margin, yPos);
        yPos += 8;

        const lowEwma = awcrEntries.filter((a: any) => (a.awcr || 0) < 0.85).length;
        const barWidth = contentWidth / 3 - 5;
        
        pdf.setFillColor(...colors.warning);
        pdf.roundedRect(margin, yPos, barWidth, 12, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(9);
        pdf.text(`< 0.85: ${lowEwma} joueurs`, margin + 5, yPos + 8);
        
        pdf.setFillColor(...colors.success);
        pdf.roundedRect(margin + barWidth + 5, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`0.85-1.3: ${optimalEwma} joueurs`, margin + barWidth + 10, yPos + 8);
        
        pdf.setFillColor(...colors.danger);
        pdf.roundedRect(margin + (barWidth + 5) * 2, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`> 1.5: ${highEwma} joueurs`, margin + (barWidth + 5) * 2 + 5, yPos + 8);
        
        yPos += 20;
      }

      // Playing Time
      checkPageBreak(60);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("TEMPS DE JEU", margin, yPos);
      yPos += 10;

      const playerTimeStats = players.map(p => ({
        name: p.name,
        matches: matchesByPlayer[p.id]?.matches || 0,
        minutes: matchesByPlayer[p.id]?.minutes || 0,
      })).sort((a, b) => b.minutes - a.minutes);

      if (playerTimeStats.some(p => p.minutes > 0)) {
        const timeHeaders = ["Joueur", "Matchs", "Minutes", "Moy./Match"];
        const timeColWidths = [80, 30, 35, 35];
        yPos = drawTableHeader(timeHeaders, timeColWidths, yPos);

        playerTimeStats.slice(0, 15).forEach((p, index) => {
          checkPageBreak(10);
          const avgMinPerMatch = p.matches > 0 ? (p.minutes / p.matches).toFixed(0) : '0';
          yPos = drawTableRow([p.name, String(p.matches), String(p.minutes), avgMinPerMatch], timeColWidths, yPos, index % 2 === 1);
        });
      }

      pdf.save(`effectif_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport d'effectif généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== CSV EXPORTS ==========================
  const generateSquadCsv = async () => {
    setGeneratingReport("squad-csv");
    try {
      const [injuriesRes, wellnessRes, awcrRes, speedTestsRes, jumpTestsRes, matchLineupsRes] = await Promise.all([
        supabase.from("injuries").select("*").eq("category_id", categoryId),
        supabase.from("wellness_tracking").select("*").eq("category_id", categoryId).order("tracking_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
        supabase.from("speed_tests").select("*").eq("category_id", categoryId),
        supabase.from("jump_tests").select("*").eq("category_id", categoryId),
        supabase.from("match_lineups").select("*, matches(match_date)"),
      ]);

      const categoryMatchIds = matches.map(m => m.id);
      const filteredLineups = (matchLineupsRes.data || []).filter(l => categoryMatchIds.includes(l.match_id));

      const headers = ["Nom", "Position", "Blessures actives", "Fatigue", "Ratio EWMA", "Matchs joués", "Minutes jouées"];
      const rows = players.map(player => {
        const playerInjuries = (injuriesRes.data || []).filter(i => i.player_id === player.id && i.status !== 'healed').length;
        const playerWellness = (wellnessRes.data || []).find(w => w.player_id === player.id);
        const playerAwcr = (awcrRes.data || []).find(a => a.player_id === player.id);
        const playerLineups = filteredLineups.filter(l => l.player_id === player.id);
        const totalMinutes = playerLineups.reduce((sum, l) => sum + (l.minutes_played || 0), 0);
        
        return [
          [player.first_name, player.name].filter(Boolean).join(" "),
          player.position || "",
          playerInjuries,
          playerWellness?.general_fatigue?.toString() || "-",
          playerAwcr?.awcr?.toFixed(2) || "-",
          playerLineups.length,
          totalMinutes,
        ];
      });

      const csv = generateCsv(headers, rows);
      downloadCsv(`effectif_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
      toast.success("Export CSV généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setGeneratingReport(null);
    }
  };


  const generateSeasonCsv = async () => {
    setGeneratingReport("season-csv");
    try {
      const matchesData = matches || [];
      
      const headers = ["Date", "Adversaire", "Domicile", "Score", "Résultat", "Lieu"];
      const rows = matchesData.map(m => {
        const isWin = (m.is_home && (m.score_home || 0) > (m.score_away || 0)) || (!m.is_home && (m.score_away || 0) > (m.score_home || 0));
        const isLoss = (m.is_home && (m.score_home || 0) < (m.score_away || 0)) || (!m.is_home && (m.score_away || 0) < (m.score_home || 0));
        const result = isWin ? "Victoire" : isLoss ? "Défaite" : "Nul";
        
        return [
          format(new Date(m.match_date), "dd/MM/yyyy"),
          m.opponent,
          m.is_home ? "Oui" : "Non",
          `${m.score_home || 0} - ${m.score_away || 0}`,
          result,
          m.location || "",
        ];
      });

      const csv = generateCsv(headers, rows);
      downloadCsv(`saison_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
      toast.success("Export CSV généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateMatchCsv = async () => {
    if (!selectedMatch) {
      toast.error("Veuillez sélectionner un match");
      return;
    }
    setGeneratingReport("match-csv");
    try {
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) throw new Error("Match non trouvé");

      const { data: lineups } = await supabase
        .from("match_lineups")
        .select("*, players(name, position)")
        .eq("match_id", selectedMatch);

      const headers = ["Joueur", "Position", "Titulaire", "Minutes jouées"];
      const rows = (lineups || []).map(l => [
        l.players?.name || "-",
        l.position || l.players?.position || "-",
        l.is_starter ? "Oui" : "Non",
        l.minutes_played || 0,
      ]);

      const csv = generateCsv(headers, rows);
      downloadCsv(`match_${match.opponent.replace(/\s+/g, '_')}_${format(new Date(match.match_date), "yyyy-MM-dd")}.csv`, csv);
      toast.success("Export CSV généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== ATTENDANCE REPORT ==========================
  const generateAttendanceReport = async () => {
    setGeneratingReport("attendance");
    
    try {
      const { settings: pdfSettings, logoBase64, seasonName: sn4 } = await preparePdfWithSettings(categoryId);

      // Fetch attendance data with date filtering
      const [sessionsRes, attendanceRes] = await Promise.all([
        (() => {
          let q = supabase.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false });
          if (attendanceDateFrom) q = q.gte("session_date", attendanceDateFrom);
          if (attendanceDateTo) q = q.lte("session_date", attendanceDateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from("training_attendance").select("*, training_sessions!inner(session_date, session_type, duration_minutes, intensity)").eq("category_id", categoryId);
          if (attendanceDateFrom) q = q.gte("training_sessions.session_date", attendanceDateFrom);
          if (attendanceDateTo) q = q.lte("training_sessions.session_date", attendanceDateTo);
          return q;
        })(),
      ]);

      const sessionsData = sessionsRes.data || [];
      const attendanceData = attendanceRes.data || [];
      const sessionIds = new Set(sessionsData.map(s => s.id));
      const filteredAttendance = attendanceData.filter(a => sessionIds.has(a.training_session_id));

      // Build session lookup for duration/type/intensity
      const sessionMap: Record<string, any> = {};
      sessionsData.forEach(s => { sessionMap[s.id] = s; });

      const playerStats = players.map((player) => {
        const playerAttendance = filteredAttendance.filter((a) => a.player_id === player.id);
        const present = playerAttendance.filter((a) => a.status === "present").length;
        const late = playerAttendance.filter((a) => a.status === "late").length;
        const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
        const absent = playerAttendance.filter((a) => a.status === "absent").length;
        const excused = playerAttendance.filter((a) => a.status === "excused").length;
        const total = playerAttendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        // Calculate training minutes by session type and intensity
        let totalMinutes = 0;
        const minutesByType: Record<string, number> = {};
        const minutesByIntensity: Record<string, number> = {};

        const calcDuration = (session: any): number => {
          if (session.session_start_time && session.session_end_time) {
            const [sh, sm] = session.session_start_time.split(':').map(Number);
            const [eh, em] = session.session_end_time.split(':').map(Number);
            return (eh * 60 + em) - (sh * 60 + sm);
          }
          return 60; // default 60 min
        };

        playerAttendance.filter(a => a.status === "present" || a.status === "late").forEach(a => {
          const session = sessionMap[a.training_session_id];
          if (session) {
            const dur = calcDuration(session);
            totalMinutes += dur;
            const sType = session.training_type || 'Autre';
            minutesByType[sType] = (minutesByType[sType] || 0) + dur;
            const intensityVal = session.intensity || session.planned_intensity || 5;
            const intensityLabel = intensityVal >= 8 ? 'haute' : intensityVal >= 5 ? 'moyenne' : 'basse';
            minutesByIntensity[intensityLabel] = (minutesByIntensity[intensityLabel] || 0) + dur;
          }
        });

        return {
          ...player,
          present, late, lateJustified,
          lateUnjustified: late - lateJustified,
          absent, excused, total, rate,
          totalMinutes, minutesByType, minutesByIntensity,
        };
      }).sort((a, b) => b.rate - a.rate);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      const dateRange = attendanceDateFrom || attendanceDateTo 
        ? ` | Période: ${attendanceDateFrom ? format(new Date(attendanceDateFrom), "dd/MM/yyyy") : "début"} - ${attendanceDateTo ? format(new Date(attendanceDateTo), "dd/MM/yyyy") : "aujourd'hui"}`
        : "";

      let yPos = drawPdfHeaderCustom(
        pdf,
        "RAPPORT DE PRÉSENCES",
        `${category?.clubs?.name} - ${category?.name}${sn4 ? ` • ${sn4}` : ''}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}${dateRange}`,
        pdfSettings,
        logoBase64
      );

      // KPI Cards
      const totalSessions = sessionsData.length;
      const avgRate = playerStats.length
        ? Math.round(playerStats.reduce((acc, p) => acc + p.rate, 0) / playerStats.length)
        : 0;
      const totalLate = playerStats.reduce((acc, p) => acc + p.late, 0);
      const totalAbsent = playerStats.reduce((acc, p) => acc + p.absent, 0);
      const totalTrainMinutes = playerStats.reduce((acc, p) => acc + p.totalMinutes, 0);

      const cardWidth = (contentWidth - 20) / 5;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(totalSessions), "SÉANCES", defaultColors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, `${avgRate}%`, "TAUX MOYEN", avgRate >= 80 ? defaultColors.success : avgRate >= 60 ? defaultColors.warning : defaultColors.danger);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(totalLate), "RETARDS", totalLate > 10 ? defaultColors.warning : defaultColors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(totalAbsent), "ABSENCES", totalAbsent > 10 ? defaultColors.danger : defaultColors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 4, yPos, cardWidth, cardHeight, `${Math.round(totalTrainMinutes / Math.max(players.length, 1))}`, "MIN MOY/JOUEUR", defaultColors.primary);

      yPos += cardHeight + 15;

      // Player attendance table with minutes
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("PRÉSENCES PAR JOUEUR", margin, yPos);
      yPos += 8;

      const attendHeaders = ["Joueur", "Prés.", "Retard", "Exc.", "Abs.", "Taux", "Min. total"];
      const attendColWidths = [48, 22, 22, 22, 22, 22, 26];
      yPos = drawTableHeaderPdf(pdf, attendHeaders, attendColWidths, yPos, margin, contentWidth);

      playerStats.forEach((player, index) => {
        yPos = localCheckPageBreak(pdf, yPos, 10);
        const rateColor = player.rate >= 80 ? defaultColors.success : player.rate >= 60 ? defaultColors.warning : defaultColors.danger;
        yPos = drawTableRowPdf(
          pdf,
          [
            [player.first_name, player.name].filter(Boolean).join(" "),
            String(player.present),
            String(player.late),
            String(player.excused),
            String(player.absent),
            `${player.rate}%`,
            `${player.totalMinutes}`,
          ],
          attendColWidths,
          yPos,
          index % 2 === 1,
          margin,
          contentWidth,
          [null, defaultColors.success, defaultColors.warning, null, defaultColors.danger, rateColor, null]
        );
      });

      // Sessions by type breakdown
      yPos += 10;
      yPos = localCheckPageBreak(pdf, yPos, 40);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("RÉPARTITION PAR TYPE DE SÉANCE", margin, yPos);
      yPos += 8;

      const calcSessionDuration = (s: any): number => {
        if (s.session_start_time && s.session_end_time) {
          const [sh, sm] = s.session_start_time.split(':').map(Number);
          const [eh, em] = s.session_end_time.split(':').map(Number);
          return (eh * 60 + em) - (sh * 60 + sm);
        }
        return 60;
      };

      const sessionsByType: Record<string, { count: number; totalMin: number }> = {};
      sessionsData.forEach(s => {
        const t = s.training_type || 'Autre';
        if (!sessionsByType[t]) sessionsByType[t] = { count: 0, totalMin: 0 };
        sessionsByType[t].count++;
        sessionsByType[t].totalMin += calcSessionDuration(s);
      });

      if (Object.keys(sessionsByType).length > 0) {
        const typeHeaders = ["Type", "Séances", "Durée totale", "Durée moy."];
        const typeColWidths = [60, 40, 40, 40];
        yPos = drawTableHeaderPdf(pdf, typeHeaders, typeColWidths, yPos, margin, contentWidth);

        Object.entries(sessionsByType).sort((a, b) => b[1].count - a[1].count).forEach(([type, data], index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          yPos = drawTableRowPdf(pdf, [
            type,
            String(data.count),
            `${data.totalMin} min`,
            `${data.count > 0 ? Math.round(data.totalMin / data.count) : 0} min`,
          ], typeColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
      }

      // Sessions by intensity
      yPos += 10;
      yPos = localCheckPageBreak(pdf, yPos, 40);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("RÉPARTITION PAR INTENSITÉ", margin, yPos);
      yPos += 8;

      const sessionsByIntensity: Record<string, number> = {};
      sessionsData.forEach(s => {
        const intensityVal = s.intensity || s.planned_intensity || 5;
        const intensityLabel = intensityVal >= 8 ? 'haute' : intensityVal >= 5 ? 'moyenne' : 'basse';
        sessionsByIntensity[intensityLabel] = (sessionsByIntensity[intensityLabel] || 0) + 1;
      });

      if (Object.keys(sessionsByIntensity).length > 0) {
        const intensityLabels: Record<string, string> = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse', recovery: 'Récupération' };
        const intensityColors: Record<string, [number, number, number]> = {
          haute: defaultColors.danger,
          moyenne: defaultColors.warning,
          basse: defaultColors.success,
          recovery: defaultColors.primary,
        };
        
        const intHeaders = ["Intensité", "Séances", "%"];
        const intColWidths = [60, 60, 60];
        yPos = drawTableHeaderPdf(pdf, intHeaders, intColWidths, yPos, margin, contentWidth);

        Object.entries(sessionsByIntensity).sort((a, b) => b[1] - a[1]).forEach(([intensity, count], index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const pct = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
          yPos = drawTableRowPdf(pdf, [
            intensityLabels[intensity] || intensity,
            String(count),
            `${pct}%`,
          ], intColWidths, yPos, index % 2 === 1, margin, contentWidth, [
            intensityColors[intensity] || null, null, null,
          ]);
        });
      }

      pdf.save(`presences_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport de présences généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateAttendanceCsv = async () => {
    setGeneratingReport("attendance-csv");
    try {
      const { data: attendanceData } = await supabase
        .from("training_attendance")
        .select("*")
        .eq("category_id", categoryId);

      const playerStats = players.map((player) => {
        const playerAttendance = (attendanceData || []).filter((a) => a.player_id === player.id);
        const present = playerAttendance.filter((a) => a.status === "present").length;
        const late = playerAttendance.filter((a) => a.status === "late").length;
        const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
        const absent = playerAttendance.filter((a) => a.status === "absent").length;
        const excused = playerAttendance.filter((a) => a.status === "excused").length;
        const total = playerAttendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          name: [player.first_name, player.name].filter(Boolean).join(" "),
          position: player.position || "",
          present, late, lateJustified,
          lateUnjustified: late - lateJustified,
          absent, excused, total, rate,
        };
      }).sort((a, b) => b.rate - a.rate);

      const headers = ["Joueur", "Position", "Présent", "Retard justifié", "Retard non justifié", "Excusé", "Absent", "Total", "Taux (%)"];
      const rows = playerStats.map((p) => [
        p.name, p.position, p.present, p.lateJustified, p.lateUnjustified,
        p.excused, p.absent, p.total, p.rate,
      ]);

      const csv = generateCsv(headers, rows);
      downloadCsv(`presences_${category?.name?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
      toast.success("Export CSV généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setGeneratingReport(null);
    }
  };

  // Date range rendering helper (not a component to avoid remounting/focus loss)
  const renderDateRange = (from: string, to: string, onFromChange: (v: string) => void, onToChange: (v: string) => void) => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs text-muted-foreground">Du</Label>
        <Input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Au</Label>
        <Input type="date" value={to} onChange={e => onToChange(e.target.value)} className="h-8 text-xs" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Rapports</h2>
        <p className="text-muted-foreground">Générez et exportez des rapports en PDF ou CSV (Excel)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Squad Overview Report */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vue d'Ensemble Effectif
            </CardTitle>
            <CardDescription>
              Synthèse globale avec Ratio EWMA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDateRange(overviewDateFrom, overviewDateTo, setOverviewDateFrom, setOverviewDateTo)}
            <div className="flex gap-2">
              <Button 
                onClick={generateSquadReport} 
                className="flex-1"
                disabled={generatingReport === "squad" || generatingReport === "squad-csv"}
              >
                {generatingReport === "squad" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generateSquadCsv}
                variant="outline"
                className="flex-1"
                disabled={generatingReport === "squad" || generatingReport === "squad-csv"}
              >
                {generatingReport === "squad-csv" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suivi Temps de Jeu (TDJ) */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Suivi Temps de Jeu
            </CardTitle>
            <CardDescription>
              Minutes, titularisations, remplacements, hors-groupe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDateRange(tdjDateFrom, tdjDateTo, setTdjDateFrom, setTdjDateTo)}
            <div className="flex gap-2">
              <Button 
                onClick={generateTdjReport} 
                className="flex-1"
                disabled={generatingReport === "tdj" || generatingReport === "tdj-csv"}
              >
                {generatingReport === "tdj" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generateTdjCsv}
                variant="outline"
                className="flex-1"
                disabled={generatingReport === "tdj" || generatingReport === "tdj-csv"}
              >
                {generatingReport === "tdj-csv" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Season Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bilan de Saison
            </CardTitle>
            <CardDescription>
              Résumé complet de la saison en cours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saison {new Date().getFullYear()}/{new Date().getFullYear() + 1}
            </p>
            <p className="text-sm">
              {players.length} joueurs • {matches.length} matchs
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={generateSeasonReport} 
                className="flex-1"
                disabled={generatingReport === "season" || generatingReport === "season-csv"}
              >
                {generatingReport === "season" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generateSeasonCsv}
                variant="outline"
                className="flex-1"
                disabled={generatingReport === "season" || generatingReport === "season-csv"}
              >
                {generatingReport === "season-csv" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Rapport de Match
            </CardTitle>
            <CardDescription>
              Stats dynamiques selon vos préférences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    vs {match.opponent} ({format(new Date(match.match_date), "d MMM", { locale: fr })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                onClick={generateMatchReport} 
                className="flex-1"
                disabled={!selectedMatch || generatingReport === "match" || generatingReport === "match-csv"}
              >
                {generatingReport === "match" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generateMatchCsv}
                variant="outline"
                className="flex-1"
                disabled={!selectedMatch || generatingReport === "match" || generatingReport === "match-csv"}
              >
                {generatingReport === "match-csv" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Rapport de Présences
            </CardTitle>
            <CardDescription>
              Taux de présence et retards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDateRange(attendanceDateFrom, attendanceDateTo, setAttendanceDateFrom, setAttendanceDateTo)}
            <div className="flex gap-2">
              <Button 
                onClick={generateAttendanceReport} 
                className="flex-1"
                disabled={generatingReport === "attendance" || generatingReport === "attendance-csv"}
              >
                {generatingReport === "attendance" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generateAttendanceCsv}
                variant="outline"
                className="flex-1"
                disabled={generatingReport === "attendance" || generatingReport === "attendance-csv"}
              >
                {generatingReport === "attendance-csv" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
