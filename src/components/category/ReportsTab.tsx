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
import ExcelJS from "exceljs";
import { getExcelBranding, addBrandedHeader, styleDataHeaderRow, addZebraRows, addFooter, downloadWorkbook } from "@/lib/excelExport";
import { preparePdfWithSettings, drawPdfHeader as drawPdfHeaderCustom, drawSectionTitle, drawTableHeader as drawTableHeaderLib, drawTableRow as drawTableRowLib, checkPageBreak as checkPageBreakLib, type PdfCustomSettings } from "@/lib/pdfExport";
import { drawPdfRugbyField, drawPdfZoneStatsGrid, svgPctToPdfPos } from "@/lib/pdfRugbyField";
import { getStatsForSport, supportsCompetitionRounds, getBaseSport, type StatField } from "@/lib/constants/sportStats";
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

  const INDIVIDUAL_SPORTS = ["athletisme", "athlétisme", "judo", "aviron", "bowling", "natation", "ski", "snow", "surf", "triathlon", "hyrox"];
  const RACKET_SPORTS = ["tennis", "padel"];
  const sport = ((category?.clubs as any)?.sport || "rugby").toLowerCase();
  const baseSport = getBaseSport(sport);
  const isIndividualSport = INDIVIDUAL_SPORTS.some(s => baseSport.includes(s));
  const isRacketSport = RACKET_SPORTS.some(s => baseSport.includes(s));
  const isTeamSport = !isIndividualSport && !isRacketSport;
  const hasTdj = isTeamSport; // Only team sports have meaningful TDJ (starters/subs/minutes)
  const athleteLabel = isIndividualSport ? "Athlètes" : isRacketSport ? "Joueurs" : "Joueurs";
  const athleteLabelSingular = isIndividualSport ? "Athlète" : "Joueur";
  const competitionLabel = isIndividualSport ? "Compétitions" : isRacketSport ? "Matchs" : "Matchs";

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
      const { settings: pdfSettings, logoBase64, seasonName, clubName: cn1, categoryName: catName1 } = await preparePdfWithSettings(categoryId);

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
        `${cn1 || category?.clubs?.name || ''} - ${catName1 || category?.name || ''}`,
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

      pdf.save(`tdj_${(catName1 || category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
      const branding = await getExcelBranding(categoryId);
      let matchQuery = supabase.from("matches").select("id, match_date, opponent").eq("category_id", categoryId).order("match_date");
      if (tdjDateFrom) matchQuery = matchQuery.gte("match_date", tdjDateFrom);
      if (tdjDateTo) matchQuery = matchQuery.lte("match_date", tdjDateTo);

      const matchesFirst = await matchQuery;
      const matchIds = matchesFirst.data?.map(m => m.id) || [];

      const [lineupsRes, statsRes, injuriesRes] = await Promise.all([
        supabase.from("match_lineups").select("match_id, player_id, is_starter, minutes_played").in("match_id", matchIds),
        supabase.from("player_match_stats").select("match_id, player_id, sport_data").in("match_id", matchIds),
        supabase.from("injuries").select("player_id, injury_date, estimated_return_date").eq("category_id", categoryId),
      ]);

      const matchesData = matchesFirst.data || [];
      const lineups = lineupsRes.data || [];
      const csvMatchStats = statsRes.data || [];
      const injuries = injuriesRes.data || [];

      const csvStatsMinutesMap = new Map<string, number>();
      csvMatchStats.forEach((s: any) => {
        const minutes = s.sport_data?.minutesPlayed || s.sport_data?.playingTime || 0;
        if (minutes > 0) csvStatsMinutesMap.set(`${s.match_id}_${s.player_id}`, Number(minutes));
      });

      const headers = ["Joueur", "Minutes totales", "Titulaire", "Remplaçant", "Matchs joués", "Hors-groupe", "Blessé"];
      const rows = players.map(player => {
        const pl = lineups.filter(l => l.player_id === player.id);
        const totalMin = pl.reduce((s, l) => {
          const lineupMin = l.minutes_played || 0;
          if (lineupMin > 0) return s + lineupMin;
          return s + (csvStatsMinutesMap.get(`${l.match_id}_${l.player_id}`) || 0);
        }, 0);
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

      const workbook = new ExcelJS.Workbook();
      // Sheet 1: Summary
      const sheet = workbook.addWorksheet("Suivi Temps de Jeu");
      const extraInfo: [string, string][] = [
        ["Matchs analysés", `${matchesData.length}`],
        ["Minutes totales", `${rows.reduce((s, r) => s + (r[1] as number), 0)}`],
      ];
      if (tdjDateFrom || tdjDateTo) {
        extraInfo.push(["Période", `${tdjDateFrom || "début"} — ${tdjDateTo || "aujourd'hui"}`]);
      }
      const dataStart = addBrandedHeader(sheet, "SUIVI TEMPS DE JEU", branding, extraInfo);

      headers.forEach((h, i) => { sheet.getCell(dataStart, i + 1).value = h; });
      styleDataHeaderRow(sheet, dataStart, headers.length, branding.headerColor);

      rows.forEach((row, ri) => {
        const r = sheet.getRow(dataStart + 1 + ri);
        row.forEach((val, ci) => { r.getCell(ci + 1).value = val as any; });
        // Color-code minutes
        const minCell = r.getCell(2);
        const minVal = row[1] as number;
        if (minVal > 500) minCell.font = { color: { argb: 'FF22C55E' }, bold: true };
        else if (minVal > 200) minCell.font = { color: { argb: 'FFEAB308' }, bold: true };
        else if (minVal > 0) minCell.font = { color: { argb: 'FFEF4444' }, bold: true };
      });
      addZebraRows(sheet, dataStart + 1, dataStart + rows.length, headers.length);

      // Totals row
      const totIdx = dataStart + rows.length + 1;
      const totRow = sheet.getRow(totIdx);
      totRow.getCell(1).value = 'TOTAL / MOYENNE';
      totRow.getCell(1).font = { bold: true };
      const totalMin = rows.reduce((s, r) => s + (r[1] as number), 0);
      totRow.getCell(2).value = totalMin;
      totRow.getCell(2).font = { bold: true };
      const avgMin = rows.length > 0 ? Math.round(totalMin / rows.length) : 0;
      totRow.getCell(3).value = `Moy: ${Math.round(rows.reduce((s, r) => s + (r[2] as number), 0) / Math.max(rows.length, 1))}`;
      totRow.getCell(5).value = `Moy: ${Math.round(rows.reduce((s, r) => s + (r[4] as number), 0) / Math.max(rows.length, 1))}`;
      for (let i = 1; i <= headers.length; i++) {
        totRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }

      addFooter(sheet, totIdx + 1, headers.length, branding.footerText);
      headers.forEach((_, i) => { sheet.getColumn(i + 1).width = i === 0 ? 25 : 18; });

      // Sheet 2: Per-match detail
      const detailSheet = workbook.addWorksheet("Détail par match");
      const detailStart = addBrandedHeader(detailSheet, "DÉTAIL PAR MATCH", branding, []);
      const detailHeaders = ["Match", "Date", "Joueur", "Titulaire", "Minutes"];
      detailHeaders.forEach((h, i) => { detailSheet.getCell(detailStart, i + 1).value = h; });
      styleDataHeaderRow(detailSheet, detailStart, detailHeaders.length, branding.headerColor);

      let dRowIdx = detailStart + 1;
      matchesData.forEach(m => {
        const matchLineups = lineups.filter(l => l.match_id === m.id);
        matchLineups.forEach(l => {
          const p = players.find(pl => pl.id === l.player_id);
          const pName = p ? [p.first_name, p.name].filter(Boolean).join(" ") : "?";
          const lineupMin = l.minutes_played || csvStatsMinutesMap.get(`${l.match_id}_${l.player_id}`) || 0;
          const r = detailSheet.getRow(dRowIdx);
          r.getCell(1).value = m.opponent;
          r.getCell(2).value = format(new Date(m.match_date), "dd/MM/yyyy");
          r.getCell(3).value = pName;
          r.getCell(4).value = l.is_starter ? "Oui" : "Non";
          r.getCell(5).value = lineupMin;
          if (dRowIdx % 2 === 0) {
            for (let i = 1; i <= detailHeaders.length; i++) {
              r.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
          }
          dRowIdx++;
        });
      });
      detailHeaders.forEach((_, i) => { detailSheet.getColumn(i + 1).width = i <= 2 ? 22 : 14; });

      await downloadWorkbook(workbook, `tdj_${(category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== SEASON REPORT ==========================
  const generateSeasonReport = async () => {
    setGeneratingReport("season");
    
    try {
      const { settings: pdfSettings, logoBase64, seasonName: sName, clubName: cn2, categoryName: catName2 } = await preparePdfWithSettings(categoryId);

      const [matchesRes, injuriesRes, goalsRes, awcrRes] = await Promise.all([
        supabase.from("matches").select("*").eq("category_id", categoryId).order("match_date"),
        supabase.from("injuries").select("*, players(name, first_name)").eq("category_id", categoryId),
        supabase.from("season_goals").select("*").eq("category_id", categoryId).eq("season_year", new Date().getFullYear()),
        supabase.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false }),
      ]);

      const matchesData = matchesRes.data || [];
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter((i: any) => i.status === 'active').length;

      // For individual sports, fetch all competition rounds across all matches
      let competitionRounds: any[] = [];
      if (isIndividualSport && matchesData.length > 0) {
        const matchIds = matchesData.map((m: any) => m.id);
        const { data: rounds } = await supabase
          .from("competition_rounds")
          .select("*, players(name, first_name, specialty, discipline)")
          .in("match_id", matchIds)
          .order("round_number");
        competitionRounds = rounds || [];
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      let yPos = drawPdfHeaderCustom(
        pdf,
        `BILAN DE SAISON${sName ? ` - ${sName}` : ` ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}`,
        `${cn2 || category?.clubs?.name || ''} - ${catName2 || category?.name || ''}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`,
        pdfSettings,
        logoBase64
      );

      // KPI Cards - Adapted per sport
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      if (isIndividualSport) {
        // Individual sports: Athlètes, Compétitions, Podiums, Blessés
        const podiums = competitionRounds.filter((r: any) => r.ranking && r.ranking <= 3).length;
        drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(players.length), "ATHLÈTES", defaultColors.primary);
        drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(matchesData.length), "COMPÉTITIONS", defaultColors.primary);
        drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(podiums), "PODIUMS", podiums > 0 ? defaultColors.success : defaultColors.muted);
        drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSÉS", activeInjuries > 0 ? defaultColors.danger : defaultColors.success);
      } else {
        // Team & racket sports: Joueurs, Matchs, Victoires, Blessés
        const wins = matchesData.filter((m: any) => 
          (m.is_home && (m.score_home || 0) > (m.score_away || 0)) ||
          (!m.is_home && (m.score_away || 0) > (m.score_home || 0))
        ).length;
        drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(players.length), "JOUEURS", defaultColors.primary);
        drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(matchesData.length), "MATCHS", defaultColors.primary);
        drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(wins), "VICTOIRES", defaultColors.success);
        drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSÉS", activeInjuries > 0 ? defaultColors.danger : defaultColors.success);
      }

      yPos += cardHeight + 15;

      // Bilan sportif - Adapted per sport type
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("BILAN SPORTIF", margin, yPos);
      yPos += 10;

      if (isIndividualSport) {
        // Individual sports: show participation stats per athlete
        const recordBoxWidth = (contentWidth - 10) / 3;
        const totalRounds = competitionRounds.length;
        const goldCount = competitionRounds.filter((r: any) => r.ranking === 1).length;
        const top3Count = competitionRounds.filter((r: any) => r.ranking && r.ranking <= 3).length;

        pdf.setFillColor(...defaultColors.success);
        pdf.roundedRect(margin, yPos, recordBoxWidth, 18, 2, 2, 'F');
        pdf.setTextColor(...defaultColors.white);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(goldCount), margin + recordBoxWidth / 2 - 5, yPos + 10);
        pdf.setFontSize(8);
        const goldLabel = baseSport === "bowling" ? "1ÈRES PLACES" : "MÉDAILLES D'OR";
        const goldLabelW = pdf.getTextWidth(goldLabel);
        pdf.text(goldLabel, margin + (recordBoxWidth - goldLabelW) / 2, yPos + 15);

        pdf.setFillColor(...defaultColors.warning);
        pdf.roundedRect(margin + recordBoxWidth + 5, yPos, recordBoxWidth, 18, 2, 2, 'F');
        pdf.setFontSize(14);
        pdf.text(String(top3Count), margin + recordBoxWidth + 5 + recordBoxWidth / 2 - 5, yPos + 10);
        pdf.setFontSize(8);
        const podLabel = "PODIUMS";
        const podLabelW = pdf.getTextWidth(podLabel);
        pdf.text(podLabel, margin + recordBoxWidth + 5 + (recordBoxWidth - podLabelW) / 2, yPos + 15);

        pdf.setFillColor(...defaultColors.primary);
        pdf.roundedRect(margin + (recordBoxWidth + 5) * 2, yPos, recordBoxWidth, 18, 2, 2, 'F');
        pdf.setFontSize(14);
        pdf.text(String(totalRounds), margin + (recordBoxWidth + 5) * 2 + recordBoxWidth / 2 - 5, yPos + 10);
        pdf.setFontSize(8);
        const partLabel = "PARTICIPATIONS";
        const partLabelW = pdf.getTextWidth(partLabel);
        pdf.text(partLabel, margin + (recordBoxWidth + 5) * 2 + (recordBoxWidth - partLabelW) / 2, yPos + 15);
      } else {
        // Team/racket sports: W/L/D
        const wins = matchesData.filter((m: any) => 
          (m.is_home && (m.score_home || 0) > (m.score_away || 0)) ||
          (!m.is_home && (m.score_away || 0) > (m.score_home || 0))
        ).length;
        const losses = matchesData.filter((m: any) => 
          (m.is_home && (m.score_home || 0) < (m.score_away || 0)) ||
          (!m.is_home && (m.score_away || 0) < (m.score_home || 0))
        ).length;
        const draws = matchesData.length - wins - losses;

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
      }

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

        goals.forEach((goal: any, index: number) => {
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

      // Results Section - Adapted per sport
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);

      if (isIndividualSport) {
        pdf.text("RÉSULTATS DES COMPÉTITIONS", margin, yPos);
        yPos += 8;

        if (matchesData.length > 0) {
          const compHeaders = ["Date", "Compétition", "Participants"];
          const compColWidths = [35, 85, 60];
          yPos = drawTableHeaderPdf(pdf, compHeaders, compColWidths, yPos, margin, contentWidth);

          matchesData.slice(0, 15).forEach((match: any, index: number) => {
            yPos = localCheckPageBreak(pdf, yPos, 10);
            const matchRounds = competitionRounds.filter((r: any) => r.match_id === match.id);
            const uniquePlayerIds = new Set(matchRounds.map((r: any) => r.player_id));
            yPos = drawTableRowPdf(pdf, [
              format(new Date(match.match_date), "dd/MM/yy"),
              match.opponent || 'Compétition',
              `${uniquePlayerIds.size} athlète${uniquePlayerIds.size > 1 ? 's' : ''}`,
            ], compColWidths, yPos, index % 2 === 1, margin, contentWidth);
          });
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(...defaultColors.muted);
          pdf.text("Aucune compétition enregistrée", margin, yPos);
        }
      } else {
        pdf.text("RÉSULTATS DES MATCHS", margin, yPos);
        yPos += 8;

        if (matchesData.length > 0) {
          const matchHeaders = ["Date", "Adversaire", "Score", "Résultat"];
          const matchColWidths = [35, 70, 35, 40];
          yPos = drawTableHeaderPdf(pdf, matchHeaders, matchColWidths, yPos, margin, contentWidth);

          matchesData.slice(0, 12).forEach((match: any, index: number) => {
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
      }

      // Injury Summary
      yPos += 15;
      yPos = localCheckPageBreak(pdf, yPos, 40);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("BILAN MÉDICAL", margin, yPos);
      yPos += 10;

      const recoveringCount = allInjuries.filter((i: any) => i.status === 'recovering').length;
      const injuryStats = [
        { label: "Blessures totales", value: allInjuries.length, color: defaultColors.primary },
        { label: "Actuellement blessés", value: activeInjuries, color: activeInjuries > 0 ? defaultColors.danger : defaultColors.success },
        { label: "En réathlétisation", value: recoveringCount, color: defaultColors.warning },
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
      yPos += 25;

      // Detail table for active injuries and recovering players
      const injuredOrRecovering = allInjuries.filter((i: any) => i.status === 'active' || i.status === 'recovering');
      if (injuredOrRecovering.length > 0) {
        yPos = localCheckPageBreak(pdf, yPos, 20);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text(`Détail des ${isIndividualSport ? 'athlètes' : 'joueurs'} blessés / en réathlétisation`, margin, yPos);
        yPos += 6;

        const injHeaders = [isIndividualSport ? "Athlète" : "Joueur", "Blessure", "Statut", "Date", "Retour estimé"];
        const injColWidths = [45, 40, 30, 30, 30];
        yPos = drawTableHeaderPdf(pdf, injHeaders, injColWidths, yPos, margin, contentWidth);

        injuredOrRecovering.forEach((injury: any, index: number) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const playerFullName = [injury.players?.first_name, injury.players?.name].filter(Boolean).join(" ") || 'Inconnu';
          const statusLabel = injury.status === 'active' ? 'Blessé' : 'Réathlétisation';
          const statusColor = injury.status === 'active' ? defaultColors.danger : defaultColors.warning;
          yPos = drawTableRowPdf(pdf, [
            playerFullName,
            injury.injury_type || '-',
            statusLabel,
            injury.injury_date ? format(new Date(injury.injury_date), "dd/MM/yy") : '-',
            injury.estimated_return_date ? format(new Date(injury.estimated_return_date), "dd/MM/yy") : '-',
          ], injColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, statusColor, null, null]);
        });
      }

      pdf.save(`bilan_saison_${(catName2 || category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

      const sportType = category?.clubs?.sport || "rugby";
      const isIndividualSport = supportsCompetitionRounds(sportType);

      // Fetch match data + stat preferences + competition rounds + kicking attempts
      const isRugbySport = sportType.toLowerCase().includes("rugby");
      const [lineupsRes, statsRes, statPrefsRes, customStatsRes, competitionRoundsRes, kickingRes] = await Promise.all([
        supabase.from("match_lineups").select("*, players(name, first_name, position)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*, players(name, first_name)").eq("match_id", selectedMatch),
        supabase.from("category_stat_preferences").select("enabled_stats, enabled_custom_stats").eq("category_id", categoryId).maybeSingle(),
        supabase.from("custom_stats").select("*").eq("category_id", categoryId),
        isIndividualSport
          ? supabase.from("competition_rounds").select("*, competition_round_stats(stat_data), players!inner(name, first_name, specialty, discipline)").eq("match_id", selectedMatch).order("round_number")
          : Promise.resolve({ data: [] }),
        isRugbySport
          ? supabase.from("kicking_attempts").select("*, players(name, first_name)").eq("match_id", selectedMatch).eq("category_id", categoryId).order("created_at")
          : Promise.resolve({ data: [] }),
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
        const categoryDiscipline = players.find(p => (p as any).specialty || (p as any).discipline);
        const discipline = (categoryDiscipline as any)?.specialty || (categoryDiscipline as any)?.discipline;
        const allStatsDef = getStatsForSport(sportType, false, discipline);
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
        const displayStats = statPrefsRes.data
          ? allAvailable.filter(s => enabledKeys.includes(s.key))
          : allAvailable;

        // Show ALL enabled stats (not just those with data) to match coach's preferences
        const statsToShow = displayStats;

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

      // ===== KICKING MAP for Rugby =====
      const kickingAttempts = (kickingRes.data || []) as any[];
      if (isRugbySport && kickingAttempts.length > 0) {
        yPos += 10;
        yPos = localCheckPageBreak(pdf, yPos, 100);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("CARTOGRAPHIE DES TIRS AU BUT", margin, yPos);
        yPos += 8;

        // Draw rugby field
        const fieldW = contentWidth;
        const fieldH = fieldW * 0.6;
        const fieldX = margin;
        const fieldY = yPos;

        // Check page break for field
        if (fieldY + fieldH + 30 > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPos = 25;
        }
        const fY = yPos;

        // Field background using shared helper
        const fieldBounds = drawPdfRugbyField(pdf, fieldX, fY, fieldW, fieldH);

        // Draw kick attempts
        const typeColors: Record<string, [number, number, number]> = {
          conversion: [59, 130, 246], // blue
          penalty: [245, 158, 11], // amber
          drop: [139, 92, 246], // purple
        };

        kickingAttempts.forEach((attempt: any) => {
          const pos = svgPctToPdfPos({ x: attempt.zone_x, y: attempt.zone_y }, fieldBounds);
          const cx = pos.kx;
          const cy = pos.ky;
          const r = Math.max(2.5, fieldW * 0.012);
          
          // Circle fill: green for success, red for miss
          if (attempt.success) {
            pdf.setFillColor(34, 197, 94);
          } else {
            pdf.setFillColor(239, 68, 68);
          }
          
          // Border color by type
          const borderColor = typeColors[attempt.kick_type] || defaultColors.primary;
          pdf.setDrawColor(...borderColor);
          pdf.setLineWidth(0.6);
          pdf.circle(cx, cy, r, 'FD');
          
          // Symbol
          pdf.setFontSize(5);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text(attempt.success ? "✓" : "✗", cx, cy + 1.5, { align: "center" });
        });

        yPos = fY + fieldH + 5;

        // Legend
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...defaultColors.dark);
        
        let legendX = margin;
        // Success/fail legend
        pdf.setFillColor(34, 197, 94);
        pdf.circle(legendX + 2, yPos, 2, 'F');
        pdf.text("Réussi", legendX + 6, yPos + 1.5);
        legendX += 25;
        pdf.setFillColor(239, 68, 68);
        pdf.circle(legendX + 2, yPos, 2, 'F');
        pdf.text("Raté", legendX + 6, yPos + 1.5);
        legendX += 20;
        
        // Type legend
        Object.entries(typeColors).forEach(([type, color]) => {
          pdf.setDrawColor(...color);
          pdf.setLineWidth(1);
          pdf.line(legendX, yPos - 1, legendX + 6, yPos - 1);
          const typeLabel = type === "conversion" ? "Transfo." : type === "penalty" ? "Pénalité" : "Drop";
          pdf.setTextColor(...defaultColors.dark);
          pdf.text(typeLabel, legendX + 8, yPos + 1);
          legendX += 28;
        });
        
        yPos += 8;

        // Zone stats grid below cartography
        const zoneKicks = kickingAttempts.map((a: any) => ({
          x: a.zone_x,
          y: a.zone_y,
          success: !!a.success,
        }));
        yPos = drawPdfZoneStatsGrid(pdf, zoneKicks, contentWidth + margin * 2, yPos, pdf.internal.pageSize.getHeight() - 20);

        // Stats summary by player
        const kicksByPlayer = new Map<string, { name: string; total: number; success: number; byType: Record<string, { total: number; success: number }> }>();
        kickingAttempts.forEach((a: any) => {
          const pid = a.player_id;
          const pName = a.players ? [a.players.first_name, a.players.name].filter(Boolean).join(" ") : "Inconnu";
          if (!kicksByPlayer.has(pid)) kicksByPlayer.set(pid, { name: pName, total: 0, success: 0, byType: {} });
          const pData = kicksByPlayer.get(pid)!;
          pData.total++;
          if (a.success) pData.success++;
          if (!pData.byType[a.kick_type]) pData.byType[a.kick_type] = { total: 0, success: 0 };
          pData.byType[a.kick_type].total++;
          if (a.success) pData.byType[a.kick_type].success++;
        });

        if (kicksByPlayer.size > 0) {
          const kickHeaders = ["Buteur", "Total", "Réussis", "%", "Transfo.", "Pénalités", "Drops"];
          const kickColWidths = [45, 20, 20, 20, 25, 25, 25];
          yPos = drawTableHeaderPdf(pdf, kickHeaders, kickColWidths, yPos, margin, contentWidth);

          let kidx = 0;
          kicksByPlayer.forEach((pData) => {
            yPos = localCheckPageBreak(pdf, yPos, 10);
            const rate = pData.total > 0 ? Math.round((pData.success / pData.total) * 100) : 0;
            const transfo = pData.byType["conversion"];
            const penal = pData.byType["penalty"];
            const drop = pData.byType["drop"];
            yPos = drawTableRowPdf(pdf, [
              pData.name,
              String(pData.total),
              String(pData.success),
              `${rate}%`,
              transfo ? `${transfo.success}/${transfo.total}` : "-",
              penal ? `${penal.success}/${penal.total}` : "-",
              drop ? `${drop.success}/${drop.total}` : "-",
            ], kickColWidths, yPos, kidx % 2 === 1, margin, contentWidth);
            kidx++;
          });
        }
      }

      // ===== COMPETITION ROUNDS for individual sports (Judo, Bowling, Athletics, Aviron) =====
      const competitionRounds = competitionRoundsRes.data || [];
      if (isIndividualSport && competitionRounds.length > 0) {
        yPos += 10;
        yPos = localCheckPageBreak(pdf, yPos, 30);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("ROUNDS / COMBATS DE COMPÉTITION", margin, yPos);
        yPos += 8;

        // Group rounds by player
        const roundsByPlayer = new Map<string, { name: string; discipline?: string; rounds: any[] }>();
        competitionRounds.forEach((r: any) => {
          const pid = r.player_id;
          const pName = [r.players?.first_name, r.players?.name].filter(Boolean).join(" ") || "Inconnu";
          const disc = r.players?.specialty || r.players?.discipline;
          if (!roundsByPlayer.has(pid)) roundsByPlayer.set(pid, { name: pName, discipline: disc, rounds: [] });
          roundsByPlayer.get(pid)!.rounds.push(r);
        });

        const isAthleticsReport = sportType.toLowerCase().includes("athletisme") || sportType.toLowerCase().includes("athlétisme");
        const isJudoReport = sportType.toLowerCase().includes("judo");

        roundsByPlayer.forEach((playerData) => {
          yPos = localCheckPageBreak(pdf, yPos, 25);
          
          // Player sub-header
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...defaultColors.primary);
          pdf.text(`${playerData.name}${playerData.discipline ? ` (${playerData.discipline})` : ''}`, margin, yPos);
          yPos += 6;

          const roundStatsDef = getStatsForSport(sportType, false, playerData.discipline);
          const fixedHeaders = isAthleticsReport
            ? ["Phase", "Place", "Résultat"]
            : isJudoReport
            ? ["Round", "Adversaire", "Résultat"]
            : ["Round", "Adversaire", "Résultat"];
          const fixedColWidths = [28, 28, 20];

          // Paginate stats in groups of 6
          const STATS_PER_PAGE = 6;
          for (let pageIdx = 0; pageIdx < roundStatsDef.length; pageIdx += STATS_PER_PAGE) {
            const pageStats = roundStatsDef.slice(pageIdx, pageIdx + STATS_PER_PAGE);

            if (pageIdx > 0) {
              yPos += 3;
              yPos = localCheckPageBreak(pdf, yPos, 20);
            }

            const sColW = Math.max(14, Math.floor((contentWidth - 76) / pageStats.length));
            const colWidths = [...fixedColWidths, ...pageStats.map(() => sColW)];
            const headers = [...fixedHeaders, ...pageStats.map(s => s.shortLabel)];

            yPos = drawTableHeaderPdf(pdf, headers, colWidths, yPos, margin, contentWidth);

            playerData.rounds.forEach((round: any, idx: number) => {
              yPos = localCheckPageBreak(pdf, yPos, 10);
              const roundStats = round.competition_round_stats || [];
              const statData = roundStats.length > 0 ? (roundStats[0].stat_data as Record<string, any> || {}) : {};

              const resultLabel = isJudoReport
                ? (statData.combatResult === 1 ? 'V' : statData.combatResult === 0 ? 'D' : round.result || '-')
                : isAthleticsReport
                ? (round.result === 'qualified' ? 'Q' : round.result === 'eliminated' ? 'Élim.' : round.result || '-')
                : (round.result || '-');

              const fixedData = isAthleticsReport
                ? [
                    round.phase || `Épreuve ${round.round_number || idx + 1}`,
                    round.ranking ? `${round.ranking}e` : '-',
                    resultLabel,
                  ]
                : [
                    String(round.round_number || idx + 1),
                    round.opponent_name || '-',
                    resultLabel,
                  ];

              const rowData = [
                ...fixedData,
                ...pageStats.map(s => {
                  const val = statData[s.key];
                  return val != null ? String(val) : '-';
                }),
              ];

              yPos = drawTableRowPdf(pdf, rowData, colWidths, yPos, idx % 2 === 1, margin, contentWidth);
            });
          }
          yPos += 5;
        });
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
      const { settings: pdfSettings, logoBase64, seasonName: sn3, clubName: cn3, categoryName: catName3 } = await preparePdfWithSettings(categoryId);

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
        `${cn3 || category?.clubs?.name || ''} - ${catName3 || category?.name || ''}${sn3 ? ` • ${sn3}` : ''}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}${dateRange ? ` | ${dateRange.trim()}` : ""}`,
        pdfSettings,
        logoBase64
      );

      pdf.setTextColor(...colors.dark);

      // Calculate key metrics
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status === 'active');
      const recoveringInjuries = allInjuries.filter(i => i.status === 'recovering');

      const MIN_CHRONIC_LOAD = 50;
      const latestAwcrByPlayer: Record<string, any> = {};
      (awcrRes.data || []).forEach((a: any) => {
        // Only use entries with non-null awcr (skip auto-completed entries without computed EWMA)
        if (!latestAwcrByPlayer[a.player_id] && a.awcr != null) {
          latestAwcrByPlayer[a.player_id] = a;
        }
      });
      const awcrEntries = Object.values(latestAwcrByPlayer).filter((a: any) => (a.chronic_load || 0) >= MIN_CHRONIC_LOAD);
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
      pdf.text(isIndividualSport ? "ATHLÈTES" : "JOUEURS", margin + cardWidth / 2 - 12, cardY + 20);

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
      pdf.text(isIndividualSport ? "TABLEAU COMPARATIF DES ATHLÈTES" : "TABLEAU COMPARATIF DES JOUEURS", margin, 16);
      
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

      // Comparative table - Adapted per sport
      if (isIndividualSport) {
        const compHeaders = [isIndividualSport ? "Athlète" : "Joueur", "Spécialité", "Bless.", "EWMA", "Compét."];
        const compColWidths = [50, 40, 25, 30, 30];
        yPos = drawTableHeader(compHeaders, compColWidths, yPos);

        players.forEach((player, index) => {
          checkPageBreak(10);
          const playerInjuries = allInjuries.filter(i => i.player_id === player.id && i.status === 'active').length;
          const playerAwcr = latestAwcrByPlayer[player.id]?.awcr;
          const playerMatches = matchesByPlayer[player.id];
          const values = [
            [player.first_name, player.name].filter(Boolean).join(" "),
            (player as any).specialty || (player as any).discipline || player.position || '-',
            String(playerInjuries),
            playerAwcr ? playerAwcr.toFixed(2) : '-',
            playerMatches ? String(playerMatches.matches) : '0',
          ];
          const rowColors: ([number, number, number] | null)[] = [
            null, null,
            playerInjuries > 0 ? colors.danger : null,
            playerAwcr ? (playerAwcr > 1.5 ? colors.danger : playerAwcr < 0.85 ? colors.warning : colors.success) : null,
            null,
          ];
          yPos = drawTableRow(values, compColWidths, yPos, index % 2 === 1, rowColors);
        });
      } else {
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
      }

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
        pdf.text(`< 0.85: ${lowEwma} ${isIndividualSport ? 'athlètes' : 'joueurs'}`, margin + 5, yPos + 8);
        
        pdf.setFillColor(...colors.success);
        pdf.roundedRect(margin + barWidth + 5, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`0.85-1.3: ${optimalEwma} ${isIndividualSport ? 'athlètes' : 'joueurs'}`, margin + barWidth + 10, yPos + 8);
        
        pdf.setFillColor(...colors.danger);
        pdf.roundedRect(margin + (barWidth + 5) * 2, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`> 1.5: ${highEwma} ${isIndividualSport ? 'athlètes' : 'joueurs'}`, margin + (barWidth + 5) * 2 + 5, yPos + 8);
        
        yPos += 20;
      }

      // Playing Time - Only for team sports
      if (isTeamSport) {
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
      } // end isTeamSport

      pdf.save(`effectif_${(catName3 || category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport d'effectif généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== EXCEL EXPORTS ==========================
  const generateSquadCsv = async () => {
    setGeneratingReport("squad-csv");
    try {
      const branding = await getExcelBranding(categoryId);
      const [injuriesRes, wellnessRes, awcrRes, speedTestsRes, jumpTestsRes, matchLineupsRes, bodyCompRes, genericTestsRes] = await Promise.all([
        supabase.from("injuries").select("*").eq("category_id", categoryId),
        supabase.from("wellness_tracking").select("*").eq("category_id", categoryId).order("tracking_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
        supabase.from("speed_tests").select("*").eq("category_id", categoryId),
        supabase.from("jump_tests").select("*").eq("category_id", categoryId),
        supabase.from("match_lineups").select("*, matches(match_date)"),
        supabase.from("body_composition").select("*").eq("category_id", categoryId).order("measurement_date", { ascending: false }),
        supabase.from("generic_tests").select("*").eq("category_id", categoryId),
      ]);

      const categoryMatchIds = matches.map(m => m.id);
      const filteredLineups = (matchLineupsRes.data || []).filter(l => categoryMatchIds.includes(l.match_id));

      const headers = [
        "Nom", "Prénom", "Position", "Date naissance", "Poids (kg)", "Taille (cm)", "IMC",
        "Blessures actives", "Sommeil", "Fatigue", "Stress", "Haut corps", "Bas corps", "Wellness moy.",
        "Ratio EWMA", "Charge aiguë", "Charge chronique",
        "Matchs joués", "Minutes jouées", "Min moy/match",
      ];
      const rows = players.map(player => {
        const playerInjuries = (injuriesRes.data || []).filter(i => i.player_id === player.id && i.status !== 'healed').length;
        const playerWellness = (wellnessRes.data || []).find(w => w.player_id === player.id);
        const playerAwcr = (awcrRes.data || []).find(a => a.player_id === player.id);
        const playerLineups = filteredLineups.filter(l => l.player_id === player.id);
        const totalMinutes = playerLineups.reduce((sum, l) => sum + (l.minutes_played || 0), 0);
        const latestBody = (bodyCompRes.data || []).find(b => b.player_id === player.id);

        // Wellness average
        const wVals = [playerWellness?.sleep_quality, playerWellness?.general_fatigue, playerWellness?.stress_level,
          playerWellness?.soreness_upper_body, playerWellness?.soreness_lower_body].filter(v => v != null) as number[];
        const wellnessAvg = wVals.length > 0 ? Math.round((wVals.reduce((a, b) => a + b, 0) / wVals.length) * 10) / 10 : null;

        return [
          player.name || "",
          player.first_name || "",
          player.position || "",
          player.birth_date ? format(new Date(player.birth_date), "dd/MM/yyyy") : "",
          latestBody?.weight_kg || "",
          latestBody?.height_cm || "",
          latestBody?.bmi ? Number(latestBody.bmi.toFixed(1)) : "",
          playerInjuries,
          playerWellness?.sleep_quality ?? "-",
          playerWellness?.general_fatigue ?? "-",
          playerWellness?.stress_level ?? "-",
          playerWellness?.soreness_upper_body ?? "-",
          playerWellness?.soreness_lower_body ?? "-",
          wellnessAvg ?? "-",
          playerAwcr?.awcr?.toFixed(2) || "-",
          playerAwcr?.acute_load != null ? Number(playerAwcr.acute_load.toFixed(0)) : "-",
          playerAwcr?.chronic_load != null ? Number(playerAwcr.chronic_load.toFixed(0)) : "-",
          playerLineups.length,
          totalMinutes,
          playerLineups.length > 0 ? Math.round(totalMinutes / playerLineups.length) : 0,
        ];
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Vue d'Ensemble Effectif");
      const dataStart = addBrandedHeader(sheet, "VUE D'ENSEMBLE EFFECTIF", branding, [
        ["Joueurs", `${players.length}`],
        ["Matchs", `${matches.length}`],
      ]);
      headers.forEach((h, i) => { sheet.getCell(dataStart, i + 1).value = h; });
      styleDataHeaderRow(sheet, dataStart, headers.length, branding.headerColor);
      rows.forEach((row, ri) => {
        const r = sheet.getRow(dataStart + 1 + ri);
        row.forEach((val, ci) => { r.getCell(ci + 1).value = val as any; });
        // Color-code EWMA ratio
        const ewmaCell = r.getCell(15);
        const ewmaVal = parseFloat(String(row[14]));
        if (!isNaN(ewmaVal)) {
          ewmaCell.font = { bold: true, color: { argb: ewmaVal > 1.5 ? 'FFEF4444' : ewmaVal > 1.3 ? 'FFEAB308' : ewmaVal >= 0.8 ? 'FF22C55E' : 'FFEAB308' } };
        }
        // Color-code injuries
        const injCell = r.getCell(8);
        if ((row[7] as number) > 0) injCell.font = { bold: true, color: { argb: 'FFEF4444' } };
      });
      addZebraRows(sheet, dataStart + 1, dataStart + rows.length, headers.length);
      addFooter(sheet, dataStart + rows.length + 1, headers.length, branding.footerText);
      headers.forEach((_, i) => { sheet.getColumn(i + 1).width = i <= 1 ? 18 : 15; });

      await downloadWorkbook(workbook, `effectif_${(category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateSeasonCsv = async () => {
    setGeneratingReport("season-csv");
    try {
      const branding = await getExcelBranding(categoryId);
      const matchesData = matches || [];
      
      // Also fetch injuries & player stats for enrichment
      const [injuriesRes, awcrRes] = await Promise.all([
        supabase.from("injuries").select("*, players(name, first_name)").eq("category_id", categoryId),
        supabase.from("awcr_tracking").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
      ]);
      
      const headers = ["Date", "Adversaire", "Domicile", "Score Dom.", "Score Ext.", "Écart", "Résultat", "Lieu"];
      const rows = matchesData.map(m => {
        const isWin = (m.is_home && (m.score_home || 0) > (m.score_away || 0)) || (!m.is_home && (m.score_away || 0) > (m.score_home || 0));
        const isLoss = (m.is_home && (m.score_home || 0) < (m.score_away || 0)) || (!m.is_home && (m.score_away || 0) < (m.score_home || 0));
        const result = isWin ? "Victoire" : isLoss ? "Défaite" : "Nul";
        const diff = (m.score_home || 0) - (m.score_away || 0);
        return [
          format(new Date(m.match_date), "dd/MM/yyyy"), m.opponent,
          m.is_home ? "Oui" : "Non", m.score_home ?? 0, m.score_away ?? 0,
          diff > 0 ? `+${diff}` : String(diff),
          result, m.location || "",
        ];
      });
      const wins = rows.filter(r => r[6] === "Victoire").length;
      const losses = rows.filter(r => r[6] === "Défaite").length;
      const draws = rows.filter(r => r[6] === "Nul").length;
      const totalScoreFor = matchesData.reduce((s, m) => s + (m.is_home ? (m.score_home || 0) : (m.score_away || 0)), 0);
      const totalScoreAgainst = matchesData.reduce((s, m) => s + (m.is_home ? (m.score_away || 0) : (m.score_home || 0)), 0);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Bilan de Saison");
      const dataStart = addBrandedHeader(sheet, "BILAN DE SAISON", branding, [
        ["Matchs joués", `${matchesData.length}`],
        ["Bilan", `${wins}V / ${draws}N / ${losses}D`],
        ["Points marqués/encaissés", `${totalScoreFor} / ${totalScoreAgainst} (diff: ${totalScoreFor - totalScoreAgainst > 0 ? '+' : ''}${totalScoreFor - totalScoreAgainst})`],
      ]);
      headers.forEach((h, i) => { sheet.getCell(dataStart, i + 1).value = h; });
      styleDataHeaderRow(sheet, dataStart, headers.length, branding.headerColor);
      rows.forEach((row, ri) => {
        const r = sheet.getRow(dataStart + 1 + ri);
        row.forEach((val, ci) => { r.getCell(ci + 1).value = val as any; });
        const resultCell = r.getCell(7);
        if (row[6] === "Victoire") resultCell.font = { color: { argb: "FF22C55E" }, bold: true };
        else if (row[6] === "Défaite") resultCell.font = { color: { argb: "FFEF4444" }, bold: true };
      });
      addZebraRows(sheet, dataStart + 1, dataStart + rows.length, headers.length);

      // Injuries sheet
      const allInjuries = injuriesRes.data || [];
      const injuredOrRecovering = allInjuries.filter((i: any) => i.status === 'active' || i.status === 'recovering');
      if (injuredOrRecovering.length > 0) {
        const injSheet = workbook.addWorksheet("Blessures");
        const injStart = addBrandedHeader(injSheet, "BILAN MÉDICAL", branding, [
          ["Blessures totales", `${allInjuries.length}`],
          ["Actives", `${allInjuries.filter((i: any) => i.status === 'active').length}`],
          ["Réathlétisation", `${allInjuries.filter((i: any) => i.status === 'recovering').length}`],
        ]);
        const injHeaders = ["Joueur", "Blessure", "Sévérité", "Statut", "Date", "Retour estimé"];
        injHeaders.forEach((h, i) => { injSheet.getCell(injStart, i + 1).value = h; });
        styleDataHeaderRow(injSheet, injStart, injHeaders.length, branding.headerColor);
        injuredOrRecovering.forEach((inj: any, ri) => {
          const r = injSheet.getRow(injStart + 1 + ri);
          const playerFullName = [inj.players?.first_name, inj.players?.name].filter(Boolean).join(" ") || 'Inconnu';
          const statusMap: Record<string, string> = { active: 'Blessé', recovering: 'Réathlétisation' };
          r.getCell(1).value = playerFullName;
          r.getCell(2).value = inj.injury_type || '-';
          r.getCell(3).value = inj.severity || '-';
          r.getCell(4).value = statusMap[inj.status] || inj.status;
          if (inj.status === 'active') r.getCell(4).font = { color: { argb: 'FFEF4444' }, bold: true };
          else r.getCell(4).font = { color: { argb: 'FFEAB308' }, bold: true };
          r.getCell(5).value = inj.injury_date ? format(new Date(inj.injury_date), "dd/MM/yyyy") : '-';
          r.getCell(6).value = inj.estimated_return_date ? format(new Date(inj.estimated_return_date), "dd/MM/yyyy") : '-';
        });
        addZebraRows(injSheet, injStart + 1, injStart + injuredOrRecovering.length, injHeaders.length);
        injHeaders.forEach((_, i) => { injSheet.getColumn(i + 1).width = i === 0 ? 25 : 18; });
      }

      addFooter(sheet, dataStart + rows.length + 1, headers.length, branding.footerText);
      headers.forEach((_, i) => { sheet.getColumn(i + 1).width = i === 1 ? 25 : 16; });

      await downloadWorkbook(workbook, `saison_${(category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
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
      const branding = await getExcelBranding(categoryId);
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) throw new Error("Match non trouvé");

      const [lineupsRes, statsRes, statPrefsRes, customStatsRes] = await Promise.all([
        supabase.from("match_lineups").select("*, players(name, first_name, position)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*").eq("match_id", selectedMatch),
        supabase.from("category_stat_preferences").select("*").eq("category_id", categoryId).maybeSingle(),
        supabase.from("custom_stats").select("*").eq("category_id", categoryId),
      ]);

      const lineups = lineupsRes.data || [];
      const matchStatsData = statsRes.data || [];

      const sport = (category?.clubs as any)?.sport || "football";
      const categoryDiscipline = players.find(p => (p as any).specialty || (p as any).discipline);
      const discipline = (categoryDiscipline as any)?.specialty || (categoryDiscipline as any)?.discipline;
      const allFields = getStatsForSport(sport, false, discipline);
      const customStatFields = (customStatsRes.data || []).map((cs: any) => ({
        key: cs.key, label: cs.short_label || cs.label, category: cs.category_type,
      }));
      const allAvailable = [...allFields, ...customStatFields];
      const enabledKeys = [
        ...(statPrefsRes.data?.enabled_stats as string[] || []),
        ...(statPrefsRes.data?.enabled_custom_stats as string[] || []),
      ];
      const displayStats = statPrefsRes.data
        ? allAvailable.filter(s => enabledKeys.includes(s.key))
        : allFields;

      const baseHeaders = ["Joueur", "Position", "Titulaire", "Minutes jouées"];
      const statHeaders = displayStats.map(s => s.label);
      const allHeaders = [...baseHeaders, ...statHeaders];

      const dataRows = lineups.map(l => {
        const playerStat = matchStatsData.find(s => s.player_id === l.player_id);
        const sportData = (playerStat?.sport_data || {}) as Record<string, any>;
        const fullName = [l.players?.first_name, l.players?.name].filter(Boolean).join(" ");
        return [
          fullName || "-",
          l.position || l.players?.position || "-",
          l.is_starter ? "Oui" : "Non",
          l.minutes_played || 0,
          ...displayStats.map(s => sportData[s.key] ?? "-"),
        ];
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Rapport de Match");
      const dataStart = addBrandedHeader(sheet, `RAPPORT DE MATCH — vs ${match.opponent}`, branding, [
        ["Date", format(new Date(match.match_date), "dd/MM/yyyy")],
        ["Score", `${match.score_home ?? "?"} - ${match.score_away ?? "?"}`],
        ["Lieu", match.location || "-"],
      ]);
      allHeaders.forEach((h, i) => { sheet.getCell(dataStart, i + 1).value = h; });
      styleDataHeaderRow(sheet, dataStart, allHeaders.length, branding.headerColor);
      dataRows.forEach((row, ri) => {
        const r = sheet.getRow(dataStart + 1 + ri);
        row.forEach((val, ci) => { r.getCell(ci + 1).value = val as any; });
      });
      addZebraRows(sheet, dataStart + 1, dataStart + dataRows.length, allHeaders.length);

      // TOTALS row
      const totalsRowIdx = dataStart + dataRows.length + 1;
      const tRow = sheet.getRow(totalsRowIdx);
      tRow.getCell(1).value = 'TOTAL';
      tRow.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
      tRow.getCell(4).value = dataRows.reduce((sum, r) => sum + (Number(r[3]) || 0), 0);
      tRow.getCell(4).font = { bold: true };
      displayStats.forEach((s, i) => {
        const vals = dataRows.map(r => r[i + 4]).filter(v => v !== '-' && v != null).map(v => Number(v)).filter(v => !isNaN(v));
        if (vals.length > 0) {
          tRow.getCell(i + 5).value = vals.reduce((a, b) => a + b, 0);
          tRow.getCell(i + 5).font = { bold: true };
        }
      });
      for (let i = 1; i <= allHeaders.length; i++) {
        tRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }

      // AVERAGES row
      const avgRowIdx = totalsRowIdx + 1;
      const aRow = sheet.getRow(avgRowIdx);
      aRow.getCell(1).value = 'MOYENNE';
      aRow.getCell(1).font = { bold: true, italic: true, color: { argb: 'FF1E293B' } };
      const playersWithMinutes = dataRows.filter(r => Number(r[3]) > 0).length || 1;
      aRow.getCell(4).value = Math.round(dataRows.reduce((sum, r) => sum + (Number(r[3]) || 0), 0) / playersWithMinutes);
      aRow.getCell(4).font = { bold: true, italic: true };
      displayStats.forEach((s, i) => {
        const vals = dataRows.map(r => r[i + 4]).filter(v => v !== '-' && v != null).map(v => Number(v)).filter(v => !isNaN(v));
        if (vals.length > 0) {
          aRow.getCell(i + 5).value = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
          aRow.getCell(i + 5).font = { bold: true, italic: true };
        }
      });
      for (let i = 1; i <= allHeaders.length; i++) {
        aRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      }

      addFooter(sheet, avgRowIdx + 1, allHeaders.length, branding.footerText);
      allHeaders.forEach((_, i) => { sheet.getColumn(i + 1).width = i === 0 ? 25 : 15; });

      await downloadWorkbook(workbook, `match_${match.opponent.replace(/\s+/g, '_')}_${format(new Date(match.match_date), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setGeneratingReport(null);
    }
  };

  // ========================== ATTENDANCE REPORT ==========================
  const generateAttendanceReport = async () => {
    setGeneratingReport("attendance");
    
    try {
      const { settings: pdfSettings, logoBase64, seasonName: sn4, clubName: cn4, categoryName: catName4 } = await preparePdfWithSettings(categoryId);

      // Fetch attendance data with date filtering
      const [sessionsRes, attendanceRes] = await Promise.all([
        (() => {
          let q = supabase.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false });
          if (attendanceDateFrom) q = q.gte("session_date", attendanceDateFrom);
          if (attendanceDateTo) q = q.lte("session_date", attendanceDateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from("training_attendance").select("*, training_sessions!inner(session_date, training_type, intensity, session_start_time, session_end_time)").eq("category_id", categoryId);
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
        `${cn4 || category?.clubs?.name || ''} - ${catName4 || category?.name || ''}${sn4 ? ` • ${sn4}` : ''}`,
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

      pdf.save(`presences_${(catName4 || category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
      const branding = await getExcelBranding(categoryId);
      
      // Fetch attendance with sessions for detailed data
      const [sessionsRes, attendanceRes] = await Promise.all([
        (() => {
          let q = supabase.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false });
          if (attendanceDateFrom) q = q.gte("session_date", attendanceDateFrom);
          if (attendanceDateTo) q = q.lte("session_date", attendanceDateTo);
          return q;
        })(),
        supabase.from("training_attendance").select("*").eq("category_id", categoryId),
      ]);
      
      const sessionsData = sessionsRes.data || [];
      const sessionIds = new Set(sessionsData.map(s => s.id));
      const allAttendance = (attendanceRes.data || []).filter(a => sessionIds.has(a.training_session_id));

      const calcDuration = (s: any): number => {
        if (s.session_start_time && s.session_end_time) {
          const [sh, sm] = s.session_start_time.split(':').map(Number);
          const [eh, em] = s.session_end_time.split(':').map(Number);
          return (eh * 60 + em) - (sh * 60 + sm);
        }
        return 60;
      };

      const sessionMap: Record<string, any> = {};
      sessionsData.forEach(s => { sessionMap[s.id] = s; });

      const playerStats = players.map((player) => {
        const playerAttendance = allAttendance.filter((a) => a.player_id === player.id);
        const present = playerAttendance.filter((a) => a.status === "present").length;
        const late = playerAttendance.filter((a) => a.status === "late").length;
        const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
        const absent = playerAttendance.filter((a) => a.status === "absent").length;
        const excused = playerAttendance.filter((a) => a.status === "excused").length;
        const total = playerAttendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        let totalMinutes = 0;
        playerAttendance.filter(a => a.status === "present" || a.status === "late").forEach(a => {
          const session = sessionMap[a.training_session_id];
          if (session) totalMinutes += calcDuration(session);
        });

        return {
          name: [player.first_name, player.name].filter(Boolean).join(" "),
          position: player.position || "",
          present, late, lateJustified,
          lateUnjustified: late - lateJustified,
          absent, excused, total, rate, totalMinutes,
        };
      }).sort((a, b) => b.rate - a.rate);

      const headers = ["Joueur", "Position", "Présent", "Retard justifié", "Retard non just.", "Excusé", "Absent", "Total séances", "Taux (%)", "Min. entraîn."];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Rapport de Présences");
      const avgRate = playerStats.length > 0 ? Math.round(playerStats.reduce((s, p) => s + p.rate, 0) / playerStats.length) : 0;
      const totalSessions = sessionsData.length;
      const totalTrainMin = playerStats.reduce((s, p) => s + p.totalMinutes, 0);
      const dateRangeLabel = attendanceDateFrom || attendanceDateTo
        ? `${attendanceDateFrom || "début"} — ${attendanceDateTo || "aujourd'hui"}`
        : "Toute la saison";
      const dataStart = addBrandedHeader(sheet, "RAPPORT DE PRÉSENCES", branding, [
        ["Séances", `${totalSessions}`],
        ["Joueurs", `${playerStats.length}`],
        ["Taux moyen", `${avgRate}%`],
        ["Période", dateRangeLabel],
      ]);

      headers.forEach((h, i) => { sheet.getCell(dataStart, i + 1).value = h; });
      styleDataHeaderRow(sheet, dataStart, headers.length, branding.headerColor);

      playerStats.forEach((p, ri) => {
        const r = sheet.getRow(dataStart + 1 + ri);
        const vals = [p.name, p.position, p.present, p.lateJustified, p.lateUnjustified, p.excused, p.absent, p.total, p.rate, p.totalMinutes];
        vals.forEach((val, ci) => { r.getCell(ci + 1).value = val as any; });
        const rateCell = r.getCell(9);
        if (p.rate >= 80) rateCell.font = { color: { argb: "FF22C55E" }, bold: true };
        else if (p.rate < 50) rateCell.font = { color: { argb: "FFEF4444" }, bold: true };
      });
      addZebraRows(sheet, dataStart + 1, dataStart + playerStats.length, headers.length);

      // Totals row
      const totIdx2 = dataStart + playerStats.length + 1;
      const tRow2 = sheet.getRow(totIdx2);
      tRow2.getCell(1).value = 'TOTAL / MOYENNE';
      tRow2.getCell(1).font = { bold: true };
      tRow2.getCell(3).value = playerStats.reduce((s, p) => s + p.present, 0);
      tRow2.getCell(7).value = playerStats.reduce((s, p) => s + p.absent, 0);
      tRow2.getCell(9).value = avgRate;
      tRow2.getCell(9).font = { bold: true };
      tRow2.getCell(10).value = Math.round(totalTrainMin / Math.max(playerStats.length, 1));
      for (let i = 1; i <= headers.length; i++) {
        tRow2.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }

      // Sheet 2: Sessions by type breakdown
      const sessionsByType: Record<string, { count: number; totalMin: number }> = {};
      sessionsData.forEach(s => {
        const t = s.training_type || 'Autre';
        if (!sessionsByType[t]) sessionsByType[t] = { count: 0, totalMin: 0 };
        sessionsByType[t].count++;
        sessionsByType[t].totalMin += calcDuration(s);
      });

      if (Object.keys(sessionsByType).length > 0) {
        const typeSheet = workbook.addWorksheet("Répartition séances");
        const typeStart = addBrandedHeader(typeSheet, "RÉPARTITION PAR TYPE DE SÉANCE", branding, []);
        const typeHeaders = ["Type", "Séances", "Durée totale (min)", "Durée moy. (min)", "% du total"];
        typeHeaders.forEach((h, i) => { typeSheet.getCell(typeStart, i + 1).value = h; });
        styleDataHeaderRow(typeSheet, typeStart, typeHeaders.length, branding.headerColor);
        
        Object.entries(sessionsByType).sort((a, b) => b[1].count - a[1].count).forEach(([type, data], ri) => {
          const r = typeSheet.getRow(typeStart + 1 + ri);
          r.getCell(1).value = type;
          r.getCell(2).value = data.count;
          r.getCell(3).value = data.totalMin;
          r.getCell(4).value = data.count > 0 ? Math.round(data.totalMin / data.count) : 0;
          r.getCell(5).value = totalSessions > 0 ? Math.round((data.count / totalSessions) * 100) : 0;
        });
        addZebraRows(typeSheet, typeStart + 1, typeStart + Object.keys(sessionsByType).length, typeHeaders.length);
        typeHeaders.forEach((_, i) => { typeSheet.getColumn(i + 1).width = i === 0 ? 22 : 18; });
      }

      addFooter(sheet, totIdx2 + 1, headers.length, branding.footerText);
      headers.forEach((_, i) => { sheet.getColumn(i + 1).width = i === 0 ? 25 : 18; });

      await downloadWorkbook(workbook, `presences_${(category?.name || 'rapport')?.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Export Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export Excel");
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
        <Input type="date" value={to} min={from || undefined} onChange={e => onToChange(e.target.value)} className="h-8 text-xs" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Rapports</h2>
        <p className="text-muted-foreground">Générez et exportez des rapports en PDF ou Excel</p>
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
              {isIndividualSport 
                ? "Synthèse : blessures, wellness, ratio EWMA"
                : "Synthèse globale avec Ratio EWMA"}
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
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suivi Temps de Jeu (TDJ) - Only for team sports */}
        {hasTdj && (
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
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Season Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bilan de Saison
            </CardTitle>
            <CardDescription>
              {isIndividualSport 
                ? "Résumé des compétitions et performances"
                : isRacketSport
                ? "Résumé des matchs et performances"
                : "Résumé complet de la saison en cours"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saison {new Date().getFullYear()}/{new Date().getFullYear() + 1}
            </p>
            <p className="text-sm">
              {players.length} {athleteLabel.toLowerCase()} • {matches.length} {competitionLabel.toLowerCase()}
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
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match / Competition Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {isIndividualSport ? "Rapport de Compétition" : "Rapport de Match"}
            </CardTitle>
            <CardDescription>
              {isIndividualSport 
                ? "Détail par compétition et par athlète"
                : "Stats dynamiques selon vos préférences"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger>
                <SelectValue placeholder={isIndividualSport ? "Sélectionner une compétition" : "Sélectionner un match"} />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    {isIndividualSport ? "" : "vs "}{match.opponent} ({format(new Date(match.match_date), "d MMM", { locale: fr })})
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
                Excel
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
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
