import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Download, Loader2, FileSpreadsheet, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { generateCsv, downloadCsv } from "@/lib/csv";
import ExcelJS from "exceljs";
import { preparePdfWithSettings, drawPdfHeader as drawPdfHeaderCustom, type PdfCustomSettings } from "@/lib/pdfExport";
import { TEST_CATEGORIES, getTestLabel } from "@/lib/constants/testCategories";
import { getStatsForSport, getStatCategories } from "@/lib/constants/sportStats";

interface PlayerReportSectionProps {
  playerId: string;
  categoryId: string;
  playerName: string;
  sportType?: string;
}

type ReportSection = "tests" | "biometrics" | "wellness" | "matches" | "training_stats" | "ewma";

const SECTION_LABELS: Record<ReportSection, string> = {
  tests: "Tests de performance",
  biometrics: "Données biométriques",
  wellness: "Wellness",
  matches: "Statistiques compétitions",
  training_stats: "Statistiques entraînement",
  ewma: "Charge d'entraînement (EWMA)",
};

export function PlayerReportSection({ playerId, categoryId, playerName, sportType }: PlayerReportSectionProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(["tests", "biometrics", "wellness", "matches", "training_stats", "ewma"]);
  const [generating, setGenerating] = useState<"pdf" | "csv" | null>(null);

  const { data: player } = useQuery({
    queryKey: ["player-report-info", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, categories(name, club_id, clubs(name, sport, logo_url))")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: category } = useQuery({
    queryKey: ["category-report", categoryId],
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

  const toggleSection = (s: ReportSection) => {
    setSelectedSections(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  // PDF color palette
  const colors = {
    primary: [34, 67, 120] as [number, number, number],
    secondary: [59, 130, 246] as [number, number, number],
    success: [39, 174, 96] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    dark: [30, 41, 59] as [number, number, number],
    light: [241, 245, 249] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
  };

  const drawTableHeaderPdf = (pdf: jsPDF, headers: string[], colWidths: number[], y: number, margin: number) => {
    const contentWidth = colWidths.reduce((a, b) => a + b, 0);
    pdf.setFillColor(...colors.dark);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      const maxChars = Math.max(4, Math.floor(colWidths[i] / 2.2));
      const text = header.length > maxChars ? header.substring(0, maxChars - 1) + '.' : header;
      pdf.text(text, xPos, y + 5.5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.dark);
    return y + 8;
  };

  const drawTableRowPdf = (pdf: jsPDF, values: string[], colWidths: number[], y: number, isAlternate: boolean, margin: number, rowColors?: ([number, number, number] | null)[]) => {
    const contentWidth = colWidths.reduce((a, b) => a + b, 0);
    if (isAlternate) {
      pdf.setFillColor(...colors.light);
      pdf.rect(margin, y, contentWidth, 7, 'F');
    }
    pdf.setFontSize(8);
    let xPos = margin + 2;
    values.forEach((value, i) => {
      if (rowColors?.[i]) {
        pdf.setTextColor(...rowColors[i]!);
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setTextColor(...colors.dark);
        pdf.setFont("helvetica", "normal");
      }
      const maxChars = Math.max(4, Math.floor(colWidths[i] / 2.2));
      const displayVal = (value || "-");
      const text = displayVal.length > maxChars ? displayVal.substring(0, maxChars - 1) + '.' : displayVal;
      pdf.text(text, xPos, y + 5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.dark);
    return y + 7;
  };

  // ===== MINI CHART HELPERS =====
  const drawBarChart = (
    pdf: jsPDF, 
    dataPoints: { label: string; value: number; color?: [number, number, number] }[],
    x: number, y: number, width: number, height: number,
    title: string
  ) => {
    if (dataPoints.length === 0) return y;
    
    // Title
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.dark);
    pdf.text(title, x, y - 2);
    
    const maxVal = Math.max(...dataPoints.map(d => d.value), 1);
    const barWidth = Math.min(12, (width - 10) / dataPoints.length - 2);
    const chartX = x + 5;
    
    // Background
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(chartX, y, chartX, y + height);
    pdf.line(chartX, y + height, chartX + width - 10, y + height);
    
    // Bars
    dataPoints.forEach((dp, i) => {
      const barHeight = (dp.value / maxVal) * (height - 8);
      const bx = chartX + 4 + i * (barWidth + 2);
      const by = y + height - barHeight;
      
      pdf.setFillColor(...(dp.color || colors.primary));
      pdf.rect(bx, by, barWidth, barHeight, 'F');
      
      // Value on top
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      const valStr = dp.value % 1 === 0 ? String(dp.value) : dp.value.toFixed(1);
      pdf.text(valStr, bx + barWidth / 2, by - 1, { align: "center" });
      
      // Label below
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5);
      pdf.setTextColor(...colors.muted);
      const shortLabel = dp.label.length > 8 ? dp.label.substring(0, 7) + '.' : dp.label;
      pdf.text(shortLabel, bx + barWidth / 2, y + height + 4, { align: "center" });
    });
    
    pdf.setTextColor(...colors.dark);
    pdf.setFont("helvetica", "normal");
    return y + height + 10;
  };

  const drawLineChart = (
    pdf: jsPDF,
    dataPoints: { label: string; value: number }[],
    x: number, y: number, width: number, height: number,
    title: string,
    lineColor: [number, number, number] = colors.secondary
  ) => {
    if (dataPoints.length < 2) return y;
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.dark);
    pdf.text(title, x, y - 2);
    
    const values = dataPoints.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const chartX = x + 5;
    const chartWidth = width - 15;
    const chartHeight = height - 8;
    
    // Background grid
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.15);
    for (let i = 0; i <= 3; i++) {
      const gy = y + (chartHeight * i / 3);
      pdf.line(chartX, gy, chartX + chartWidth, gy);
    }
    pdf.line(chartX, y + chartHeight, chartX + chartWidth, y + chartHeight);
    
    // Min/Max labels
    pdf.setFontSize(5);
    pdf.setTextColor(...colors.muted);
    pdf.text(maxVal.toFixed(1), chartX - 1, y + 3, { align: "right" });
    pdf.text(minVal.toFixed(1), chartX - 1, y + chartHeight, { align: "right" });
    
    // Line + dots
    pdf.setDrawColor(...lineColor);
    pdf.setLineWidth(0.6);
    
    const points: [number, number][] = dataPoints.map((dp, i) => {
      const px = chartX + (i / (dataPoints.length - 1)) * chartWidth;
      const py = y + chartHeight - ((dp.value - minVal) / range) * chartHeight;
      return [px, py];
    });
    
    for (let i = 0; i < points.length - 1; i++) {
      pdf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    }
    
    // Dots
    pdf.setFillColor(...lineColor);
    points.forEach(([px, py]) => {
      pdf.circle(px, py, 1, 'F');
    });
    
    // X labels (first and last)
    pdf.setFontSize(5);
    pdf.setTextColor(...colors.muted);
    pdf.text(dataPoints[0].label, chartX, y + chartHeight + 4);
    pdf.text(dataPoints[dataPoints.length - 1].label, chartX + chartWidth, y + chartHeight + 4, { align: "right" });
    
    pdf.setTextColor(...colors.dark);
    pdf.setFont("helvetica", "normal");
    return y + height + 10;
  };

  const localCheckPageBreak = (pdf: jsPDF, yPos: number, needed: number = 25, customSettings?: PdfCustomSettings | null): number => {
    if (yPos + needed > pdf.internal.pageSize.getHeight() - 15) {
      pdf.addPage();
      if (customSettings?.footer_text) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.muted);
        pdf.text(customSettings.footer_text, pageWidth / 2, pageHeight - 5, { align: "center" });
        pdf.setTextColor(...colors.dark);
      }
      return 20;
    }
    return yPos;
  };

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
      const response = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* ignore */ }
    return null;
  };

  const fetchAllData = async () => {
    const [
      measurementsRes,
      bodyCompRes,
      genericTestsRes,
      speedTestsRes,
      jumpTestsRes,
      wellnessRes,
      matchLineupsRes,
      matchStatsRes,
      injuriesRes,
      awcrRes,
      competitionRoundsRes,
      bowlingSpareRes,
      tennisDrillRes,
      precisionRes,
      trainingRoundsRes,
    ] = await Promise.all([
      supabase.from("player_measurements").select("*").eq("player_id", playerId).order("measurement_date", { ascending: false }),
      supabase.from("body_composition").select("*").eq("player_id", playerId).order("measurement_date", { ascending: false }),
      (() => {
        let q = supabase.from("generic_tests").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("test_date", dateFrom);
        if (dateTo) q = q.lte("test_date", dateTo);
        return q.order("test_date", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("speed_tests").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("test_date", dateFrom);
        if (dateTo) q = q.lte("test_date", dateTo);
        return q.order("test_date", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("jump_tests").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("test_date", dateFrom);
        if (dateTo) q = q.lte("test_date", dateTo);
        return q.order("test_date", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("wellness_tracking").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("tracking_date", dateFrom);
        if (dateTo) q = q.lte("tracking_date", dateTo);
        return q.order("tracking_date", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("match_lineups").select("*, matches!inner(match_date, opponent)").eq("player_id", playerId);
        if (dateFrom) q = q.gte("matches.match_date", dateFrom);
        if (dateTo) q = q.lte("matches.match_date", dateTo);
        return q;
      })(),
      (() => {
        let q = supabase.from("player_match_stats").select("*, matches!inner(match_date, opponent)").eq("player_id", playerId);
        if (dateFrom) q = q.gte("matches.match_date", dateFrom);
        if (dateTo) q = q.lte("matches.match_date", dateTo);
        return q;
      })(),
      (() => {
        let q = supabase.from("injuries").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("injury_date", dateFrom);
        if (dateTo) q = q.lte("injury_date", dateTo);
        return q.order("injury_date", { ascending: false });
      })(),
      // EWMA: fetch ALL data without date filter (need full history for accurate calculations)
      (() => {
        let q = supabase.from("awcr_tracking").select("*").eq("player_id", playerId);
        // Only apply dateTo filter, not dateFrom — we need history for EWMA context
        if (dateTo) q = q.lte("session_date", dateTo);
        return q.order("session_date", { ascending: false });
      })(),
      // Competition rounds for individual sports (bowling, athletics, judo, rowing)
      (() => {
        let q = supabase.from("competition_rounds")
          .select("*, competition_round_stats(stat_data), matches!inner(match_date, opponent)")
          .eq("player_id", playerId);
        if (dateFrom) q = q.gte("matches.match_date", dateFrom);
        if (dateTo) q = q.lte("matches.match_date", dateTo);
        return q.order("created_at", { ascending: false });
      })(),
      // Bowling spare training
      (() => {
        let q = supabase.from("bowling_spare_training" as any).select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("session_date", dateFrom);
        if (dateTo) q = q.lte("session_date", dateTo);
        return q.order("session_date", { ascending: false });
      })(),
      // Tennis drill training
      (() => {
        let q = supabase.from("tennis_drill_training" as any).select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("session_date", dateFrom);
        if (dateTo) q = q.lte("session_date", dateTo);
        return q.order("session_date", { ascending: false });
      })(),
      // Precision training (generic)
      (() => {
        let q = supabase.from("precision_training").select("*").eq("player_id", playerId);
        if (dateFrom) q = q.gte("session_date", dateFrom);
        if (dateTo) q = q.lte("session_date", dateTo);
        return q.order("session_date", { ascending: false });
      })(),
      // Training competition rounds (bowling training games)
      (() => {
        const subQ = supabase.from("matches").select("id").eq("category_id", categoryId).eq("event_type", "training");
        return subQ.then(async (matchRes) => {
          if (!matchRes.data || matchRes.data.length === 0) return { data: [], error: null };
          const matchIds = matchRes.data.map(m => m.id);
          let q = supabase.from("competition_rounds")
            .select("*, competition_round_stats(stat_data), matches!inner(match_date)")
            .eq("player_id", playerId)
            .in("match_id", matchIds);
          if (dateFrom) q = q.gte("matches.match_date", dateFrom);
          if (dateTo) q = q.lte("matches.match_date", dateTo);
          return q.order("created_at", { ascending: false });
        });
      })(),
    ]);

    return {
      measurements: measurementsRes.data || [],
      bodyComps: bodyCompRes.data || [],
      genericTests: genericTestsRes.data || [],
      speedTests: speedTestsRes.data || [],
      jumpTests: jumpTestsRes.data || [],
      wellness: wellnessRes.data || [],
      matchLineups: matchLineupsRes.data || [],
      matchStats: matchStatsRes.data || [],
      injuries: injuriesRes.data || [],
      awcr: awcrRes.data || [],
      competitionRounds: competitionRoundsRes.data || [],
      bowlingSpareTraining: (bowlingSpareRes as any)?.data || [],
      tennisDrillTraining: (tennisDrillRes as any)?.data || [],
      precisionTraining: (precisionRes as any)?.data || [],
      trainingRounds: (trainingRoundsRes as any)?.data || [],
    };
  };

  const buildTestGroups = (data: Awaited<ReturnType<typeof fetchAllData>>) => {
    const allTests: Array<{ test_type: string; test_category: string; result_value: number; result_unit: string | null; test_date: string }> = [];

    data.speedTests.forEach(t => {
      if (t.test_type === '40m' && t.time_40m_seconds) {
        allTests.push({ test_type: 'Sprint 40m', test_category: 'sprint', result_value: t.time_40m_seconds, result_unit: 's', test_date: t.test_date });
      } else if (t.test_type === '1600m' && t.vma_kmh) {
        allTests.push({ test_type: 'Test 1600m (VMA)', test_category: 'cardio', result_value: t.vma_kmh, result_unit: 'km/h', test_date: t.test_date });
      }
    });

    data.jumpTests.forEach(t => {
      allTests.push({ test_type: t.test_type, test_category: 'saut', result_value: t.result_cm, result_unit: 'cm', test_date: t.test_date });
    });

    data.genericTests.forEach(t => {
      allTests.push({ test_type: t.test_type, test_category: t.test_category, result_value: t.result_value, result_unit: t.result_unit, test_date: t.test_date });
    });

    // Group by category
    const grouped: Record<string, typeof allTests> = {};
    allTests.forEach(t => {
      const cat = t.test_category || 'autres';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });

    return { allTests, grouped };
  };

  const getCategoryLabel = (catValue: string): string => {
    const found = TEST_CATEGORIES.find(c => c.value === catValue);
    if (found) return found.label;
    return catValue.charAt(0).toUpperCase() + catValue.slice(1).replace(/_/g, ' ');
  };

  // ===================== PDF GENERATION =====================
  const generatePdf = async () => {
    if (selectedSections.length === 0) {
      toast.error("Sélectionnez au moins une section");
      return;
    }

    setGenerating("pdf");
    try {
      const data = await fetchAllData();
      const { settings: pdfSettings, logoBase64, seasonName } = await preparePdfWithSettings(categoryId);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      const headerColor = pdfSettings?.header_color
        ? [parseInt(pdfSettings.header_color.slice(1, 3), 16), parseInt(pdfSettings.header_color.slice(3, 5), 16), parseInt(pdfSettings.header_color.slice(5, 7), 16)] as [number, number, number]
        : colors.primary;

      // ===== CUSTOM HEADER: Logo + Photo + Player Info =====
      pdf.setFillColor(...headerColor);
      pdf.rect(0, 0, pageWidth, 42, 'F');

      let xOffset = margin;

      // Club logo
      if (logoBase64 && pdfSettings?.show_logo !== false) {
        try {
          const fmt = logoBase64.includes("image/png") ? "PNG" : "JPEG";
          pdf.addImage(logoBase64, fmt, margin, 4, 30, 30);
          xOffset = margin + 35;
        } catch { /* ignore */ }
      }

      // Player photo
      let photoOffset = xOffset;
      if (player?.avatar_url) {
        const avatarBase64 = await loadImageAsBase64(player.avatar_url);
        if (avatarBase64) {
          try {
            const fmt = avatarBase64.includes("image/png") ? "PNG" : "JPEG";
            pdf.addImage(avatarBase64, fmt, xOffset, 4, 30, 30);
            photoOffset = xOffset + 35;
          } catch { /* ignore */ }
        }
      }

      // Player info text
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const fullName = [player?.first_name, player?.name].filter(Boolean).join(" ") || playerName;
      pdf.text(fullName.toUpperCase(), photoOffset, 14);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const infoLine1 = [
        player?.position ? `Poste: ${player.position}` : null,
        player?.birth_date ? `Né le ${format(new Date(player.birth_date), "dd/MM/yyyy")}` : null,
      ].filter(Boolean).join("  |  ");
      if (infoLine1) pdf.text(infoLine1, photoOffset, 22);

      pdf.setFontSize(9);
      const clubCatLine = `${category?.clubs?.name || ""} - ${category?.name || ""}${seasonName ? ` • ${seasonName}` : ""}`;
      pdf.text(clubCatLine, photoOffset, 30);

      const dateRange = dateFrom || dateTo
        ? `Période: ${dateFrom ? format(new Date(dateFrom), "dd/MM/yyyy") : "début"} - ${dateTo ? format(new Date(dateTo), "dd/MM/yyyy") : "aujourd'hui"}`
        : "";
      if (dateRange) {
        pdf.setFontSize(8);
        pdf.text(dateRange, photoOffset, 37);
      }

      pdf.setTextColor(...colors.dark);

      // Footer
      if (pdfSettings?.footer_text) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.muted);
        pdf.text(pdfSettings.footer_text, pageWidth / 2, pageHeight - 5, { align: "center" });
        pdf.setTextColor(...colors.dark);
      }

      let yPos = 52;

      // ===== KPI CARDS =====
      const matchCount = data.matchLineups.length;
      // Sum minutes from lineups, fallback to sport_data.minutes_played, then awcr_tracking (rpe=10 = match)
      let totalMinutes = data.matchLineups.reduce((sum, m) => sum + (m.minutes_played || 0), 0);
      if (totalMinutes === 0 && data.matchStats.length > 0) {
        totalMinutes = data.matchStats.reduce((sum, s: any) => {
          const sd = s.sport_data as Record<string, any> | null;
          return sum + (sd?.minutes_played || 0);
        }, 0);
      }
      // Final fallback: sum duration_minutes from awcr_tracking entries with rpe=10 (match RPE)
      if (totalMinutes === 0 && data.awcr.length > 0) {
        totalMinutes = data.awcr
          .filter(a => a.rpe === 10)
          .reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
      }
      const activeInjuries = data.injuries.filter(i => i.status !== 'healed').length;
      // Use EWMA ratio from latest non-null awcr_tracking entry
      const latestAwcr = data.awcr.find(e => e.awcr != null)?.awcr ?? null;

      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 20;

      const drawKpi = (x: number, value: string, label: string, color: [number, number, number]) => {
        pdf.setFillColor(...color);
        pdf.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        const vw = pdf.getTextWidth(value);
        pdf.text(value, x + (cardWidth - vw) / 2, yPos + cardHeight / 2);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        const lw = pdf.getTextWidth(label);
        pdf.text(label, x + (cardWidth - lw) / 2, yPos + cardHeight / 2 + 7);
      };

      drawKpi(margin, String(matchCount), "MATCHS", colors.primary);
      drawKpi(margin + cardWidth + 5, String(totalMinutes), "MINUTES", colors.primary);
      drawKpi(margin + (cardWidth + 5) * 2, String(activeInjuries), "BLESSURES", activeInjuries > 0 ? colors.danger : colors.success);
      drawKpi(margin + (cardWidth + 5) * 3, latestAwcr ? latestAwcr.toFixed(2) : '-', "EWMA", latestAwcr ? (latestAwcr > 1.5 ? colors.danger : latestAwcr < 0.8 ? colors.warning : colors.success) : colors.muted);

      pdf.setTextColor(...colors.dark);
      yPos += cardHeight + 12;

      // ===== TESTS SECTION =====
      if (selectedSections.includes("tests")) {
        const { grouped } = buildTestGroups(data);
        const orderedCategories = Object.keys(grouped).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b)));

        if (orderedCategories.length > 0) {
          yPos = localCheckPageBreak(pdf, yPos, 30, pdfSettings);
          pdf.setFillColor(...colors.light);
          pdf.rect(margin, yPos, contentWidth, 8, 'F');
          pdf.setTextColor(...colors.primary);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("TESTS DE PERFORMANCE", margin + 3, yPos + 5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...colors.dark);
          yPos += 12;

          for (const catKey of orderedCategories) {
            const tests = grouped[catKey];
            yPos = localCheckPageBreak(pdf, yPos, 25, pdfSettings);

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.primary);
            pdf.text(getCategoryLabel(catKey), margin + 2, yPos);
            yPos += 6;

            // Group by test type to show progression
            const testsByType: Record<string, typeof tests> = {};
            tests.forEach(t => {
              if (!testsByType[t.test_type]) testsByType[t.test_type] = [];
              testsByType[t.test_type].push(t);
            });

            const testHeaders = ["Test", "1er résultat", "Date", "Dernier résultat", "Date", "Progression"];
            const testColWidths = [38, 28, 22, 28, 22, 32];
            yPos = drawTableHeaderPdf(pdf, testHeaders, testColWidths, yPos, margin);

            Object.entries(testsByType).forEach(([testType, results], index) => {
              yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
              results.sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
              const first = results[0];
              const last = results[results.length - 1];
              const progression = results.length > 1
                ? (((last.result_value - first.result_value) / first.result_value) * 100).toFixed(1) + "%"
                : "-";
              const progColor: [number, number, number] | null = results.length > 1
                ? (last.result_value >= first.result_value ? colors.success : colors.danger)
                : null;

              // Show full test label without category prefix (e.g. "Clean - 1RM" not just "1RM")
              const fullLabel = getTestLabel(testType);
              let label = testType;
              if (fullLabel !== testType) {
                // Remove top-level category prefix but keep the test detail
                // fullLabel format: "Category - Test Label" or "Group > Category - Test Label"
                const parts = fullLabel.split(' - ');
                if (parts.length >= 3) {
                  // e.g. "Haltérophilie - Clean - 1RM" → "Clean - 1RM"
                  label = parts.slice(1).join(' - ');
                } else if (parts.length === 2) {
                  // e.g. "Musculation - Squat - 1RM" → "Squat - 1RM"
                  label = parts[1];
                } else {
                  label = fullLabel;
                }
              }

              yPos = drawTableRowPdf(pdf, [
                label,
                `${first.result_value}${first.result_unit ? ` ${first.result_unit}` : ''}`,
                format(new Date(first.test_date), "dd/MM/yy"),
                results.length > 1 ? `${last.result_value}${last.result_unit ? ` ${last.result_unit}` : ''}` : '-',
                results.length > 1 ? format(new Date(last.test_date), "dd/MM/yy") : '-',
                progression,
              ], testColWidths, yPos, index % 2 === 1, margin, [null, null, null, null, null, progColor]);
            });
            yPos += 8; // More space between test categories for visual separation
          }

          // === TESTS PROGRESSION CHART ===
          // Build chart data: last result per test type
          const chartData: { label: string; value: number; color?: [number, number, number] }[] = [];
          for (const catKey of orderedCategories) {
            const testsByType: Record<string, typeof grouped[string]> = {};
            grouped[catKey].forEach(t => {
              if (!testsByType[t.test_type]) testsByType[t.test_type] = [];
              testsByType[t.test_type].push(t);
            });
            Object.entries(testsByType).forEach(([testType, results]) => {
              if (results.length > 1) {
                results.sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
                const first = results[0];
                const last = results[results.length - 1];
                const prog = ((last.result_value - first.result_value) / first.result_value) * 100;
                const fullLabel = getTestLabel(testType);
                const parts = fullLabel.split(' - ');
                const shortLabel = parts.length >= 2 ? parts[parts.length - 1] : testType;
                chartData.push({
                  label: shortLabel.substring(0, 10),
                  value: Math.round(prog * 10) / 10,
                  color: prog >= 0 ? colors.success : colors.danger,
                });
              }
            });
          }
          if (chartData.length > 0) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            yPos = drawBarChart(pdf, chartData.slice(0, 10), margin, yPos, contentWidth / 2, 35, "Progression (%)");
          }
        }
      }

      // ===== BIOMETRICS SECTION =====
      if (selectedSections.includes("biometrics")) {
        yPos = localCheckPageBreak(pdf, yPos, 40, pdfSettings);
        pdf.setFillColor(...colors.light);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("DONNÉES BIOMÉTRIQUES", margin + 3, yPos + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        yPos += 12;

        // Weight tracking table
        if (data.bodyComps.length > 0 || data.measurements.length > 0) {
          // Merge measurements + body comp by date
          const allBioData = [
            ...data.measurements.map(m => ({
              date: m.measurement_date,
              weight: m.weight_kg,
              height: m.height_cm,
              fat: null as number | null,
              muscle: null as number | null,
              bmi: null as number | null,
            })),
            ...data.bodyComps.map(b => ({
              date: b.measurement_date,
              weight: b.weight_kg,
              height: b.height_cm,
              fat: b.body_fat_percentage,
              muscle: b.muscle_mass_kg,
              bmi: b.bmi,
            })),
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 12);

          // Summary KPI cards for latest available bio data
          const latestWithFat = allBioData.find(b => b.fat != null);
          const latestWithBmi = allBioData.find(b => b.bmi != null);
          const latestWithMuscle = allBioData.find(b => b.muscle != null);
          const latestWithWeight = allBioData.find(b => b.weight != null);
          const latestWithHeight = allBioData.find(b => b.height != null);
          
          const bioKpis: { label: string; value: string; color: [number, number, number] }[] = [];
          if (latestWithWeight?.weight) bioKpis.push({ label: "Poids", value: `${latestWithWeight.weight} kg`, color: colors.primary });
          if (latestWithHeight?.height) bioKpis.push({ label: "Taille", value: `${latestWithHeight.height} cm`, color: colors.primary });
          if (latestWithFat?.fat != null) bioKpis.push({ label: "MG%", value: `${latestWithFat.fat}%`, color: colors.secondary });
          if (latestWithBmi?.bmi != null) bioKpis.push({ label: "IMC", value: latestWithBmi.bmi.toFixed(1), color: colors.warning });
          if (latestWithMuscle?.muscle != null) bioKpis.push({ label: "Masse musc.", value: `${latestWithMuscle.muscle} kg`, color: colors.success });

          if (bioKpis.length > 0) {
            const bioCardW = (contentWidth - (bioKpis.length - 1) * 4) / bioKpis.length;
            bioKpis.forEach((kpi, i) => {
              const kx = margin + i * (bioCardW + 4);
              pdf.setFillColor(...kpi.color);
              pdf.roundedRect(kx, yPos, bioCardW, 18, 2, 2, 'F');
              pdf.setTextColor(...colors.white);
              pdf.setFontSize(12);
              pdf.setFont("helvetica", "bold");
              const vw = pdf.getTextWidth(kpi.value);
              pdf.text(kpi.value, kx + (bioCardW - vw) / 2, yPos + 8);
              pdf.setFontSize(6);
              pdf.setFont("helvetica", "normal");
              const lw = pdf.getTextWidth(kpi.label);
              pdf.text(kpi.label, kx + (bioCardW - lw) / 2, yPos + 14);
            });
            pdf.setTextColor(...colors.dark);
            yPos += 24;
          }

          const bioHeaders = ["Date", "Poids (kg)", "Taille (cm)", "% Graisse", "Masse musc. (kg)", "IMC"];
          const bioColWidths = [28, 27, 27, 27, 33, 28];
          yPos = drawTableHeaderPdf(pdf, bioHeaders, bioColWidths, yPos, margin);

          allBioData.forEach((bio, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            yPos = drawTableRowPdf(pdf, [
              format(new Date(bio.date), "dd/MM/yy"),
              bio.weight ? String(bio.weight) : '-',
              bio.height ? String(bio.height) : '-',
              bio.fat ? `${bio.fat}%` : '-',
              bio.muscle ? String(bio.muscle) : '-',
              bio.bmi ? bio.bmi.toFixed(1) : '-',
            ], bioColWidths, yPos, index % 2 === 1, margin);
          });
          yPos += 5;

          // === BIOMETRICS EVOLUTION CHARTS ===
          const chartHalfWidth = (contentWidth - 6) / 2;

          // Weight evolution
          const weightPoints = allBioData
            .filter(b => b.weight != null)
            .reverse()
            .map(b => ({ label: format(new Date(b.date), "dd/MM"), value: b.weight! }));
          
          // MG% evolution
          const fatPoints = allBioData
            .filter(b => b.fat != null)
            .reverse()
            .map(b => ({ label: format(new Date(b.date), "dd/MM"), value: b.fat! }));

          // Side by side: weight + MG%
          if (weightPoints.length >= 2 || fatPoints.length >= 2) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            const chartY = yPos;
            if (weightPoints.length >= 2) {
              drawLineChart(pdf, weightPoints.slice(-12), margin, chartY, chartHalfWidth, 35, "Évolution poids (kg)", colors.secondary);
            }
            if (fatPoints.length >= 2) {
              drawLineChart(pdf, fatPoints.slice(-12), margin + chartHalfWidth + 6, chartY, chartHalfWidth, 35, "Évolution MG (%)", colors.warning);
            }
            yPos = chartY + 35 + 10;
          }

          // IMC evolution
          const bmiPoints = allBioData
            .filter(b => b.bmi != null)
            .reverse()
            .map(b => ({ label: format(new Date(b.date), "dd/MM"), value: b.bmi! }));
          
          // Muscle mass evolution
          const musclePoints = allBioData
            .filter(b => b.muscle != null)
            .reverse()
            .map(b => ({ label: format(new Date(b.date), "dd/MM"), value: b.muscle! }));

          // Side by side: IMC + Muscle
          if (bmiPoints.length >= 2 || musclePoints.length >= 2) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            const chartY2 = yPos;
            if (bmiPoints.length >= 2) {
              drawLineChart(pdf, bmiPoints.slice(-12), margin, chartY2, chartHalfWidth, 35, "Évolution IMC", colors.primary);
            }
            if (musclePoints.length >= 2) {
              drawLineChart(pdf, musclePoints.slice(-12), margin + chartHalfWidth + 6, chartY2, chartHalfWidth, 35, "Évolution masse musc. (kg)", colors.success);
            }
            yPos = chartY2 + 35 + 10;
          }
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.text("Aucune mesure biométrique enregistrée", margin, yPos);
          yPos += 10;
        }
      }

      // ===== WELLNESS SECTION =====
      if (selectedSections.includes("wellness")) {
        yPos = localCheckPageBreak(pdf, yPos, 40, pdfSettings);
        pdf.setFillColor(...colors.light);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("WELLNESS", margin + 3, yPos + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        yPos += 12;

        if (data.wellness.length > 0) {
          const wHeaders = ["Date", "Sommeil", "Fatigue", "Stress", "Haut", "Bas", "Moyenne"];
          const wColWidths = [30, 24, 24, 24, 24, 24, 26];
          yPos = drawTableHeaderPdf(pdf, wHeaders, wColWidths, yPos, margin);

          // All metrics: 1=best (good), 5=worst (bad) → lower = better for ALL
          const getWellnessColor = (val: number | null): [number, number, number] | null => {
            if (val == null) return null;
            if (val <= 2) return colors.success;
            if (val <= 3) return colors.warning;
            return colors.danger;
          };

          data.wellness.slice(0, 15).forEach((w, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            const vals = [w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body].filter(v => v != null) as number[];
            // All metrics share same polarity (1=good, 5=bad → lower = better)
            const avgVals = [
              w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body
            ].filter(v => v != null) as number[];
            const avg = avgVals.length > 0 ? (avgVals.reduce((a, b) => a + b, 0) / avgVals.length).toFixed(1) : '-';
            const avgNum = parseFloat(avg);
            yPos = drawTableRowPdf(pdf, [
              format(new Date(w.tracking_date), "dd/MM/yy"),
              w.sleep_quality != null ? `${w.sleep_quality}/5` : '-',
              w.general_fatigue != null ? `${w.general_fatigue}/5` : '-',
              w.stress_level != null ? `${w.stress_level}/5` : '-',
              w.soreness_upper_body != null ? `${w.soreness_upper_body}/5` : '-',
              w.soreness_lower_body != null ? `${w.soreness_lower_body}/5` : '-',
              avg !== '-' ? `${avg}/5` : '-',
            ], wColWidths, yPos, index % 2 === 1, margin, [
              null,
              getWellnessColor(w.sleep_quality),
              getWellnessColor(w.general_fatigue),
              getWellnessColor(w.stress_level),
              getWellnessColor(w.soreness_upper_body),
              getWellnessColor(w.soreness_lower_body),
              !isNaN(avgNum) ? getWellnessColor(avgNum) : null,
            ]);
          });
          yPos += 5;

          // === WELLNESS LINE CHART (Average over time) ===
          const wellnessChartData = data.wellness
            .slice(0, 15)
            .reverse()
            .map(w => {
              const avgVals = [
                w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body
              ].filter(v => v != null) as number[];
              const avg = avgVals.length > 0 ? avgVals.reduce((a, b) => a + b, 0) / avgVals.length : 0;
              return { label: format(new Date(w.tracking_date), "dd/MM"), value: Math.round(avg * 10) / 10 };
            });
          if (wellnessChartData.length >= 2) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            yPos = drawLineChart(pdf, wellnessChartData, margin, yPos, contentWidth / 2, 35, "Évolution wellness (moyenne /5)", colors.warning);
          }
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.text("Aucune donnée wellness enregistrée", margin, yPos);
          yPos += 10;
        }
      }

      // ===== MATCHES SECTION =====
      if (selectedSections.includes("matches")) {
        yPos = localCheckPageBreak(pdf, yPos, 40, pdfSettings);
        pdf.setFillColor(...colors.light);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("STATISTIQUES MATCHS", margin + 3, yPos + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        yPos += 12;

        const matchStats = data.matchStats.filter(s => s.matches != null);
        if (matchStats.length > 0) {
          // Get stat preferences + custom stats dynamically
          const [statPrefsRes, customStatsRes] = await Promise.all([
            supabase.from("category_stat_preferences").select("enabled_stats, enabled_custom_stats").eq("category_id", categoryId).maybeSingle(),
            supabase.from("custom_stats").select("*").eq("category_id", categoryId),
          ]);

          const sport = category?.clubs?.sport || "rugby";
          const playerDiscipline = (player as any)?.specialty || (player as any)?.discipline;
          const allStatsDef = getStatsForSport(sport, false, playerDiscipline);
          const customStatFields = (customStatsRes.data || []).map((cs: any) => ({
            key: cs.key, label: cs.label, shortLabel: cs.short_label,
            category: cs.category_type, type: "number" as const,
          }));
          const allAvailable = [...allStatsDef, ...customStatFields];
          
          const enabledKeys = [
            ...(statPrefsRes.data?.enabled_stats as string[] || []),
            ...(statPrefsRes.data?.enabled_custom_stats as string[] || []),
          ];
          // If preferences row exists, use it (even if empty = user disabled all)
          // If no row exists (statPrefsRes.data is null), show all stats
          const displayStats = statPrefsRes.data
            ? allAvailable.filter(s => enabledKeys.includes(s.key))
            : allAvailable;

          // Group stats by category for organized display - use sport-specific categories
          const statCategories = getStatCategories(sport);

          for (const statCat of statCategories) {
            const catStats = displayStats.filter(s => s.category === statCat.key);
            if (catStats.length === 0) continue;

            yPos = localCheckPageBreak(pdf, yPos, 25, pdfSettings);
            
            // Category sub-header
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...colors.secondary);
            pdf.text(statCat.label, margin + 2, yPos);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colors.dark);
            yPos += 5;

            // Split stats into chunks of 6 to fit page width
            const chunkSize = 6;
            for (let chunk = 0; chunk < catStats.length; chunk += chunkSize) {
              const chunkStats = catStats.slice(chunk, chunk + chunkSize);
              
              const mHeaders = ["Adversaire", "Date", ...chunkStats.map(s => s.shortLabel)];
              const nameColW = 35;
              const dateColW = 22;
              const statColW = Math.max(18, Math.floor((contentWidth - nameColW - dateColW) / chunkStats.length));
              const mColWidths = [nameColW, dateColW, ...chunkStats.map(() => statColW)];
              
              yPos = localCheckPageBreak(pdf, yPos, 15, pdfSettings);
              yPos = drawTableHeaderPdf(pdf, mHeaders, mColWidths, yPos, margin);

              matchStats.forEach((stat: any, index) => {
                yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
                const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
                yPos = drawTableRowPdf(pdf, [
                  stat.matches?.opponent || '-',
                  stat.matches?.match_date ? format(new Date(stat.matches.match_date), "dd/MM") : '-',
                  ...chunkStats.map(s => {
                    const val = sportData[s.key] ?? stat[s.key] ?? stat[s.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
                    return val != null ? String(val) : '-';
                  })
                ], mColWidths, yPos, index % 2 === 1, margin);
              });
              yPos += 4;
            }
            yPos += 4;
          }
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.text("Aucune statistique de match enregistrée", margin, yPos);
          yPos += 10;
        }
      }

      // ===== COMPETITION ROUNDS (individual sports: bowling, athletics, judo, rowing) =====
      if (selectedSections.includes("matches") && data.competitionRounds.length > 0) {
        yPos = localCheckPageBreak(pdf, yPos, 30, pdfSettings);
        pdf.setFillColor(...colors.light);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("STATISTIQUES COMPÉTITIONS", margin + 3, yPos + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        yPos += 12;

        const sport = category?.clubs?.sport || "rugby";
        const playerDiscipline = (player as any)?.specialty || (player as any)?.discipline;
        const roundStatsDef = getStatsForSport(sport, false, playerDiscipline);
        const isAthleticsReport = sport.toLowerCase().includes("athletisme") || sport.toLowerCase().includes("athlétisme");
        const isJudoReport = sport.toLowerCase().includes("judo");

        // Paginate stats in groups of 6 to fit all stats across multiple tables
        const STATS_PER_PAGE = 6;
        const fixedHeaders = isAthleticsReport
          ? ["Phase", "Place", "Résultat"]
          : ["Adversaire", "Date", "Round"];
        const fixedColWidths = [35, 20, 14];

        for (let pageIdx = 0; pageIdx < roundStatsDef.length; pageIdx += STATS_PER_PAGE) {
          const pageStats = roundStatsDef.slice(pageIdx, pageIdx + STATS_PER_PAGE);
          
          if (pageIdx > 0) {
            yPos += 5;
            yPos = localCheckPageBreak(pdf, yPos, 20, pdfSettings);
            // Sub-header for continuation
            pdf.setFontSize(8);
            pdf.setTextColor(...colors.muted);
            pdf.text(`(suite des statistiques)`, margin, yPos);
            pdf.setTextColor(...colors.dark);
            yPos += 5;
          }

          const rColW = Math.max(16, Math.floor((contentWidth - 69) / pageStats.length));
          const rColWidths = [...fixedColWidths, ...pageStats.map(() => rColW)];
          const roundHeaders = [...fixedHeaders, ...pageStats.map(s => s.shortLabel)];

          yPos = drawTableHeaderPdf(pdf, roundHeaders, rColWidths, yPos, margin);

          data.competitionRounds.forEach((round: any, idx: number) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            const roundStats = round.competition_round_stats || [];
            const statData = roundStats.length > 0 ? (roundStats[0].stat_data as Record<string, any> || {}) : {};
            
            const fixedData = isAthleticsReport
              ? [
                  round.phase || `Épreuve ${round.round_number || idx + 1}`,
                  round.ranking ? `${round.ranking}e` : '-',
                  round.result === 'qualified' ? 'Q' : round.result === 'eliminated' ? 'Élim.' : round.result === 'dns' ? 'DNS' : round.result === 'dnf' ? 'DNF' : round.result === 'dq' ? 'DQ' : '-',
                ]
              : [
                  round.matches?.opponent || '-',
                  round.matches?.match_date ? format(new Date(round.matches.match_date), "dd/MM") : '-',
                  String(round.round_number || idx + 1),
                ];

            const rowData = [
              ...fixedData,
              ...pageStats.map(s => {
                const val = statData[s.key];
                return val != null ? String(val) : '-';
              }),
            ];

            yPos = drawTableRowPdf(pdf, rowData, rColWidths, yPos, idx % 2 === 1, margin);
          });
        }
        yPos += 8;
      }

      // ===== TRAINING STATS SECTION =====
      if (selectedSections.includes("training_stats")) {
        const allTrainingExercises: { exercise: string; date: string; attempts: number; successes: number; rate: number }[] = [];

        // Bowling spare training
        (data.bowlingSpareTraining || []).forEach((t: any) => {
          allTrainingExercises.push({
            exercise: t.exercise_type || '-',
            date: t.session_date,
            attempts: t.attempts || 0,
            successes: t.successes || 0,
            rate: t.success_rate || 0,
          });
        });

        // Tennis drill training
        (data.tennisDrillTraining || []).forEach((t: any) => {
          allTrainingExercises.push({
            exercise: t.exercise_type || '-',
            date: t.session_date,
            attempts: t.attempts || 0,
            successes: t.successes || 0,
            rate: t.success_rate || 0,
          });
        });

        // Precision training (generic)
        (data.precisionTraining || []).forEach((t: any) => {
          allTrainingExercises.push({
            exercise: t.exercise_label || '-',
            date: t.session_date,
            attempts: t.attempts || 0,
            successes: t.successes || 0,
            rate: t.success_rate || 0,
          });
        });

        if (allTrainingExercises.length > 0) {
          yPos = localCheckPageBreak(pdf, yPos, 40, pdfSettings);
          pdf.setFillColor(...colors.light);
          pdf.rect(margin, yPos, contentWidth, 8, 'F');
          pdf.setTextColor(...colors.primary);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("STATISTIQUES ENTRAÎNEMENT", margin + 3, yPos + 5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...colors.dark);
          yPos += 12;

          // Cumulative by exercise type
          const exerciseTotals = new Map<string, { attempts: number; successes: number }>();
          allTrainingExercises.forEach(t => {
            const existing = exerciseTotals.get(t.exercise) || { attempts: 0, successes: 0 };
            existing.attempts += t.attempts;
            existing.successes += t.successes;
            exerciseTotals.set(t.exercise, existing);
          });

          // Summary table
          const summHeaders = ["Exercice", "Tentatives", "Réussites", "% Réussite"];
          const summColWidths = [60, 35, 35, 35];
          yPos = drawTableHeaderPdf(pdf, summHeaders, summColWidths, yPos, margin);

          let idx = 0;
          exerciseTotals.forEach((totals, exercise) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            const rate = totals.attempts > 0 ? Math.round((totals.successes / totals.attempts) * 10000) / 100 : 0;
            const rateColor: [number, number, number] = rate >= 70 ? colors.success : rate >= 40 ? colors.warning : colors.danger;
            yPos = drawTableRowPdf(pdf, [
              exercise,
              String(totals.attempts),
              String(totals.successes),
              `${rate.toFixed(1)}%`,
            ], summColWidths, yPos, idx % 2 === 1, margin, [null, null, null, rateColor]);
            idx++;
          });
          yPos += 6;

          // Overall totals
          const totalAttempts = allTrainingExercises.reduce((sum, t) => sum + t.attempts, 0);
          const totalSuccesses = allTrainingExercises.reduce((sum, t) => sum + t.successes, 0);
          const overallRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 10000) / 100 : 0;

          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...colors.primary);
          pdf.text(`Total: ${totalAttempts} tentatives, ${totalSuccesses} réussites, ${overallRate.toFixed(1)}% de réussite`, margin, yPos);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...colors.dark);
          yPos += 8;

          // Detail table (recent entries)
          const detailHeaders = ["Date", "Exercice", "Tentatives", "Réussites", "% Réussite"];
          const detailColWidths = [28, 52, 30, 30, 30];
          yPos = localCheckPageBreak(pdf, yPos, 15, pdfSettings);
          yPos = drawTableHeaderPdf(pdf, detailHeaders, detailColWidths, yPos, margin);

          allTrainingExercises.slice(0, 20).forEach((t, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            const rateColor: [number, number, number] = t.rate >= 70 ? colors.success : t.rate >= 40 ? colors.warning : colors.danger;
            yPos = drawTableRowPdf(pdf, [
              t.date ? format(new Date(t.date), "dd/MM/yy") : '-',
              t.exercise,
              String(t.attempts),
              String(t.successes),
              `${t.rate.toFixed(1)}%`,
            ], detailColWidths, yPos, index % 2 === 1, margin, [null, null, null, null, rateColor]);
          });
          yPos += 8;

          // Bar chart of success rates by exercise
          const chartData = Array.from(exerciseTotals.entries()).map(([exercise, totals]) => ({
            label: exercise,
            value: totals.attempts > 0 ? Math.round((totals.successes / totals.attempts) * 100) : 0,
            color: colors.primary,
          }));
          if (chartData.length >= 2) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            yPos = drawBarChart(pdf, chartData, margin, yPos, contentWidth, 35, "% Réussite par exercice");
          }
        }
      }

      // ===== EWMA / CHARGE SECTION =====
      if (selectedSections.includes("ewma")) {
        yPos = localCheckPageBreak(pdf, yPos, 50, pdfSettings);
        pdf.setFillColor(...colors.light);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("CHARGE D'ENTRAÎNEMENT (EWMA)", margin + 3, yPos + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        yPos += 12;

        if (data.awcr.length > 0) {
          // Sort chronologically
          const sortedAwcr = [...data.awcr].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
          // Use the latest entry with computed EWMA values, not just the last chronological one
          const latestWithEwma = [...sortedAwcr].reverse().find(e => e.acute_load != null && e.chronic_load != null) || sortedAwcr[sortedAwcr.length - 1];
          
          // EWMA KPI cards
          const ewmaKpis: { label: string; value: string; color: [number, number, number] }[] = [
            { label: "Charge aiguë", value: latestWithEwma.acute_load != null ? latestWithEwma.acute_load.toFixed(0) : '-', color: colors.danger },
            { label: "Charge chronique", value: latestWithEwma.chronic_load != null ? latestWithEwma.chronic_load.toFixed(0) : '-', color: colors.primary },
            { label: "Ratio EWMA", value: latestWithEwma.awcr != null ? latestWithEwma.awcr.toFixed(2) : '-', color: latestWithEwma.awcr != null ? (latestWithEwma.awcr > 1.5 ? colors.danger : latestWithEwma.awcr > 1.3 ? colors.warning : latestWithEwma.awcr >= 0.8 ? colors.success : colors.warning) : colors.muted },
            { label: "Séances (période)", value: String(sortedAwcr.length), color: colors.secondary },
          ];

          const ewmaCardW = (contentWidth - 12) / 4;
          ewmaKpis.forEach((kpi, i) => {
            const kx = margin + i * (ewmaCardW + 4);
            pdf.setFillColor(...kpi.color);
            pdf.roundedRect(kx, yPos, ewmaCardW, 18, 2, 2, 'F');
            pdf.setTextColor(...colors.white);
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            const vw = pdf.getTextWidth(kpi.value);
            pdf.text(kpi.value, kx + (ewmaCardW - vw) / 2, yPos + 8);
            pdf.setFontSize(6);
            pdf.setFont("helvetica", "normal");
            const lw = pdf.getTextWidth(kpi.label);
            pdf.text(kpi.label, kx + (ewmaCardW - lw) / 2, yPos + 14);
          });
          pdf.setTextColor(...colors.dark);
          yPos += 24;

          // EWMA history table (last 15 entries)
          const ewmaHeaders = ["Date", "RPE", "Durée (min)", "Charge", "Aiguë", "Chronique", "Ratio"];
          const ewmaColWidths = [26, 18, 26, 24, 26, 26, 24];
          yPos = drawTableHeaderPdf(pdf, ewmaHeaders, ewmaColWidths, yPos, margin);

          sortedAwcr.slice(-15).reverse().forEach((entry, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10, pdfSettings);
            const ratio = entry.awcr;
            const ratioColor: [number, number, number] | null = ratio != null
              ? (ratio > 1.5 ? colors.danger : ratio > 1.3 ? colors.warning : ratio >= 0.8 ? colors.success : colors.warning)
              : null;
            yPos = drawTableRowPdf(pdf, [
              format(new Date(entry.session_date), "dd/MM/yy"),
              String(entry.rpe),
              String(entry.duration_minutes),
              entry.training_load != null ? String(entry.training_load) : '-',
              entry.acute_load != null ? entry.acute_load.toFixed(0) : '-',
              entry.chronic_load != null ? entry.chronic_load.toFixed(0) : '-',
              ratio != null ? ratio.toFixed(2) : '-',
            ], ewmaColWidths, yPos, index % 2 === 1, margin, [null, null, null, null, null, null, ratioColor]);
          });
          yPos += 5;

          // EWMA charts side by side: ratio + acute/chronic loads
          const chartHalfW = (contentWidth - 6) / 2;
          const ewmaRatioData = sortedAwcr
            .filter(e => e.awcr != null)
            .slice(-20)
            .map(e => ({ label: format(new Date(e.session_date), "dd/MM"), value: e.awcr! }));
          const ewmaAcuteData = sortedAwcr
            .filter(e => e.acute_load != null)
            .slice(-20)
            .map(e => ({ label: format(new Date(e.session_date), "dd/MM"), value: e.acute_load! }));

          if (ewmaRatioData.length >= 2 || ewmaAcuteData.length >= 2) {
            yPos = localCheckPageBreak(pdf, yPos, 55, pdfSettings);
            const chartYEwma = yPos;
            if (ewmaRatioData.length >= 2) {
              drawLineChart(pdf, ewmaRatioData, margin, chartYEwma, chartHalfW, 35, "Évolution ratio EWMA", colors.primary);
            }
            if (ewmaAcuteData.length >= 2) {
              drawLineChart(pdf, ewmaAcuteData, margin + chartHalfW + 6, chartYEwma, chartHalfW, 35, "Charge aiguë (EWMA)", colors.danger);
            }
            yPos = chartYEwma + 35 + 10;
          }
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.text("Aucune donnée de charge d'entraînement", margin, yPos);
          yPos += 10;
        }
      }

      // Generation date
      yPos += 10;
      yPos = localCheckPageBreak(pdf, yPos, 15, pdfSettings);
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.muted);
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, margin, yPos);

      const filename = `fiche_${[player?.first_name, player?.name].filter(Boolean).join('_').replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
      toast.success("Rapport PDF généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(null);
    }
  };

  // ===================== EXCEL GENERATION =====================
  const generateExcelExport = async () => {
    if (selectedSections.length === 0) {
      toast.error("Sélectionnez au moins une section");
      return;
    }

    setGenerating("csv");
    try {
      const data = await fetchAllData();
      const { settings: pdfSettings, seasonName } = await preparePdfWithSettings(categoryId);
      const fullName = [player?.first_name, player?.name].filter(Boolean).join(" ") || playerName;
      const clubName = (category?.clubs as any)?.name || "";
      const categoryName = category?.name || "";

      const workbook = new ExcelJS.Workbook();
      workbook.creator = clubName;
      workbook.created = new Date();

      // === Helper: add header info to a sheet ===
      const addSheetHeader = (sheet: ExcelJS.Worksheet, title: string) => {
        sheet.mergeCells('A1:F1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF224378' } };
        titleCell.alignment = { horizontal: 'left' };

        const infoRows = [
          ['Club', clubName],
          ['Joueur', fullName],
          ['Catégorie', categoryName],
          ['Saison', seasonName || '-'],
          ['Période', dateFrom || dateTo
            ? `${dateFrom ? format(new Date(dateFrom), "dd/MM/yyyy") : "début"} - ${dateTo ? format(new Date(dateTo), "dd/MM/yyyy") : "aujourd'hui"}`
            : 'Toutes les données'],
        ];

        infoRows.forEach((row, i) => {
          const r = sheet.getRow(i + 3);
          r.getCell(1).value = row[0];
          r.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
          r.getCell(2).value = row[1];
          r.getCell(2).font = { size: 10 };
        });

        return 9; // next data row
      };

      // === Helper: style header row ===
      const styleHeaderRow = (sheet: ExcelJS.Worksheet, rowNum: number, colCount: number) => {
        const row = sheet.getRow(rowNum);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        row.alignment = { horizontal: 'center' };
        for (let i = 1; i <= colCount; i++) {
          row.getCell(i).border = {
            bottom: { style: 'thin', color: { argb: 'FF334155' } },
          };
        }
      };

      // ===== FEUILLE TESTS =====
      if (selectedSections.includes("tests")) {
        const { grouped } = buildTestGroups(data);
        const orderedCategories = Object.keys(grouped).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b)));

        if (orderedCategories.length > 0) {
          const sheet = workbook.addWorksheet('Tests');
          let rowIdx = addSheetHeader(sheet, 'TESTS DE PERFORMANCE');

          const headers = ['Thème', 'Test', 'Date', 'Résultat', 'Unité', 'Rang'];
          sheet.columns = [
            { width: 18 }, { width: 25 }, { width: 14 }, { width: 16 }, { width: 10 }, { width: 10 },
          ];
          const hRow = sheet.getRow(rowIdx);
          headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
          styleHeaderRow(sheet, rowIdx, headers.length);
          rowIdx++;

          for (const catKey of orderedCategories) {
            const testsByType: Record<string, typeof grouped[string]> = {};
            grouped[catKey].forEach(t => {
              if (!testsByType[t.test_type]) testsByType[t.test_type] = [];
              testsByType[t.test_type].push(t);
            });

            Object.entries(testsByType).forEach(([testType, results]) => {
              results.sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
              const fullLabel = getTestLabel(testType);
              const parts = fullLabel.split(' - ');
              const label = parts.length >= 3 ? parts.slice(1).join(' - ') : parts.length === 2 ? parts[1] : fullLabel;

              // Show ALL results for this test, not just first/last
              results.forEach((t, tIdx) => {
                const row = sheet.getRow(rowIdx);
                row.getCell(1).value = getCategoryLabel(catKey);
                row.getCell(2).value = label;
                row.getCell(3).value = format(new Date(t.test_date), "dd/MM/yyyy");
                row.getCell(4).value = t.result_value;
                row.getCell(5).value = t.result_unit || '';
                row.getCell(6).value = tIdx + 1;
                if (rowIdx % 2 === 0) {
                  for (let i = 1; i <= headers.length; i++) {
                    row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                  }
                }
                rowIdx++;
              });

              // Progression summary row
              if (results.length > 1) {
                const first = results[0];
                const last = results[results.length - 1];
                const prog = ((last.result_value - first.result_value) / first.result_value * 100).toFixed(1);
                const summaryRow = sheet.getRow(rowIdx);
                summaryRow.getCell(2).value = `↳ Progression`;
                summaryRow.getCell(2).font = { italic: true, color: { argb: 'FF64748B' } };
                summaryRow.getCell(4).value = `${prog}%`;
                summaryRow.getCell(4).font = {
                  bold: true,
                  color: { argb: parseFloat(prog) >= 0 ? 'FF27AE60' : 'FFEF4444' },
                };
                rowIdx++;
              }
            });
          }
        }
      }

      // ===== FEUILLE BIOMÉTRIE =====
      if (selectedSections.includes("biometrics")) {
        const allBio = [
          ...data.measurements.map(m => ({ date: m.measurement_date, weight: m.weight_kg, height: m.height_cm, fat: null as number | null, muscle: null as number | null, bmi: null as number | null })),
          ...data.bodyComps.map(b => ({ date: b.measurement_date, weight: b.weight_kg, height: b.height_cm, fat: b.body_fat_percentage, muscle: b.muscle_mass_kg, bmi: b.bmi })),
        ];
        if (allBio.length > 0) {
          const sheet = workbook.addWorksheet('Biométrie');
          let rowIdx = addSheetHeader(sheet, 'DONNÉES BIOMÉTRIQUES');

          const headers = ['Date', 'Poids (kg)', 'Taille (cm)', '% Graisse', 'Masse musc. (kg)', 'IMC'];
          sheet.columns = [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 10 }];
          const hRow = sheet.getRow(rowIdx);
          headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
          styleHeaderRow(sheet, rowIdx, headers.length);
          rowIdx++;

          allBio.forEach((b) => {
            const row = sheet.getRow(rowIdx);
            row.getCell(1).value = format(new Date(b.date), "dd/MM/yyyy");
            row.getCell(2).value = b.weight;
            row.getCell(3).value = b.height;
            row.getCell(4).value = b.fat;
            row.getCell(5).value = b.muscle;
            row.getCell(6).value = b.bmi;
            if (rowIdx % 2 === 0) {
              for (let i = 1; i <= headers.length; i++) {
                row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              }
            }
            rowIdx++;
          });
        }
      }

      // ===== FEUILLE WELLNESS =====
      if (selectedSections.includes("wellness") && data.wellness.length > 0) {
        const sheet = workbook.addWorksheet('Wellness');
        let rowIdx = addSheetHeader(sheet, 'WELLNESS');

        const headers = ['Date', 'Sommeil', 'Fatigue', 'Stress', 'Haut du corps', 'Bas du corps', 'Moyenne'];
        sheet.columns = [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 12 }];
        const hRow = sheet.getRow(rowIdx);
        headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
        styleHeaderRow(sheet, rowIdx, headers.length);
        rowIdx++;

        data.wellness.forEach((w) => {
          const vals = [w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body].filter(v => v != null) as number[];
          const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;

          const row = sheet.getRow(rowIdx);
          row.getCell(1).value = format(new Date(w.tracking_date), "dd/MM/yyyy");
          row.getCell(2).value = w.sleep_quality;
          row.getCell(3).value = w.general_fatigue;
          row.getCell(4).value = w.stress_level;
          row.getCell(5).value = w.soreness_upper_body;
          row.getCell(6).value = w.soreness_lower_body;
          row.getCell(7).value = avg;
          if (avg != null) {
            row.getCell(7).font = { bold: true };
          }
          if (rowIdx % 2 === 0) {
            for (let i = 1; i <= headers.length; i++) {
              row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
          }
          rowIdx++;
        });

        // Moyenne globale
        rowIdx++;
        const avgRow = sheet.getRow(rowIdx);
        avgRow.getCell(1).value = 'MOYENNE GLOBALE';
        avgRow.getCell(1).font = { bold: true, color: { argb: 'FF224378' } };
        const allAvgs = data.wellness.map(w => {
          const vals = [w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body].filter(v => v != null) as number[];
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }).filter(v => v != null) as number[];
        if (allAvgs.length > 0) {
          avgRow.getCell(7).value = Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10;
          avgRow.getCell(7).font = { bold: true, size: 12, color: { argb: 'FF224378' } };
        }
      }

      // ===== FEUILLE MATCHS =====
      if (selectedSections.includes("matches")) {
        const matchStats = data.matchStats.filter(s => s.matches != null);
        if (matchStats.length > 0) {
          const [statPrefsRes, customStatsRes] = await Promise.all([
            supabase.from("category_stat_preferences").select("enabled_stats, enabled_custom_stats").eq("category_id", categoryId).maybeSingle(),
            supabase.from("custom_stats").select("*").eq("category_id", categoryId),
          ]);
          const sport = (category?.clubs as any)?.sport || "rugby";
          const playerDiscipline = (player as any)?.specialty || (player as any)?.discipline;
          const allStatsDef = getStatsForSport(sport, false, playerDiscipline);
          const customStatFields = (customStatsRes.data || []).map((cs: any) => ({
            key: cs.key, label: cs.label, shortLabel: cs.short_label,
            category: cs.category_type, type: "number" as const,
          }));
          const allAvailable = [...allStatsDef, ...customStatFields];
          const enabledKeys = [
            ...(statPrefsRes.data?.enabled_stats as string[] || []),
            ...(statPrefsRes.data?.enabled_custom_stats as string[] || []),
          ];
          const displayStats = statPrefsRes.data
            ? allAvailable.filter(s => enabledKeys.includes(s.key))
            : allAvailable;

          const sheet = workbook.addWorksheet('Statistiques Matchs');
          let rowIdx = addSheetHeader(sheet, 'STATISTIQUES MATCHS');

          const headers = ['Adversaire', 'Date', ...displayStats.map(s => s.shortLabel || s.label)];
          sheet.columns = [
            { width: 22 }, { width: 14 },
            ...displayStats.map(() => ({ width: 14 })),
          ];
          const hRow = sheet.getRow(rowIdx);
          headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
          styleHeaderRow(sheet, rowIdx, headers.length);
          rowIdx++;

          matchStats.forEach((stat: any) => {
            const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
            const row = sheet.getRow(rowIdx);
            row.getCell(1).value = stat.matches?.opponent || '-';
            row.getCell(2).value = stat.matches?.match_date ? format(new Date(stat.matches.match_date), "dd/MM/yyyy") : '-';
            displayStats.forEach((s, i) => {
              const val = sportData[s.key] ?? stat[s.key] ?? stat[s.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
              row.getCell(i + 3).value = val != null ? Number(val) : null;
            });
            if (rowIdx % 2 === 0) {
              for (let i = 1; i <= headers.length; i++) {
                row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              }
            }
            rowIdx++;
          });

          // TOTALS row
          rowIdx++;
          const totalsRow = sheet.getRow(rowIdx);
          totalsRow.getCell(1).value = 'TOTAL';
          totalsRow.getCell(1).font = { bold: true, color: { argb: 'FF224378' } };
          totalsRow.getCell(2).value = `${matchStats.length} matchs`;
          totalsRow.getCell(2).font = { bold: true, color: { argb: 'FF64748B' } };
          displayStats.forEach((s, i) => {
            const vals = matchStats.map((stat: any) => {
              const sd = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
              const val = sd[s.key] ?? stat[s.key];
              return val != null ? Number(val) : null;
            }).filter(v => v != null) as number[];
            if (vals.length > 0) {
              totalsRow.getCell(i + 3).value = vals.reduce((a, b) => a + b, 0);
              totalsRow.getCell(i + 3).font = { bold: true };
            }
          });
          for (let i = 1; i <= headers.length; i++) {
            totalsRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          }
          rowIdx++;

          // AVERAGES row
          const avgRow2 = sheet.getRow(rowIdx);
          avgRow2.getCell(1).value = 'MOYENNE';
          avgRow2.getCell(1).font = { bold: true, color: { argb: 'FF224378' } };
          displayStats.forEach((s, i) => {
            const vals = matchStats.map((stat: any) => {
              const sd = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
              const val = sd[s.key] ?? stat[s.key];
              return val != null ? Number(val) : null;
            }).filter(v => v != null) as number[];
            if (vals.length > 0) {
              avgRow2.getCell(i + 3).value = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
              avgRow2.getCell(i + 3).font = { bold: true, italic: true };
            }
          });
          for (let i = 1; i <= headers.length; i++) {
            avgRow2.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          }
        }
      }

      // ===== FEUILLE COMPÉTITIONS (rounds individuels) =====
      if (selectedSections.includes("matches") && data.competitionRounds.length > 0) {
        const sport = (category?.clubs as any)?.sport || "rugby";
        const playerDiscipline = (player as any)?.specialty || (player as any)?.discipline;
        const roundStatsDef = getStatsForSport(sport, false, playerDiscipline);
        const isAthleticsExcel = sport.toLowerCase().includes("athletisme") || sport.toLowerCase().includes("athlétisme");

        const sheet = workbook.addWorksheet('Compétitions');
        let rowIdx = addSheetHeader(sheet, 'STATISTIQUES COMPÉTITIONS');

        const headers = isAthleticsExcel
          ? ['Phase', 'Classement', 'Résultat', ...roundStatsDef.map(s => s.shortLabel || s.label)]
          : ['Adversaire', 'Date', 'Round', ...roundStatsDef.map(s => s.shortLabel || s.label)];
        sheet.columns = [
          { width: 22 }, { width: 14 }, { width: 10 },
          ...roundStatsDef.map(() => ({ width: 14 })),
        ];
        const hRow = sheet.getRow(rowIdx);
        headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
        styleHeaderRow(sheet, rowIdx, headers.length);
        rowIdx++;

        data.competitionRounds.forEach((round: any, idx: number) => {
          const roundStats = round.competition_round_stats || [];
          const statData = roundStats.length > 0 ? (roundStats[0].stat_data as Record<string, any> || {}) : {};
          const row = sheet.getRow(rowIdx);
          if (isAthleticsExcel) {
            row.getCell(1).value = round.phase || `Épreuve ${round.round_number || idx + 1}`;
            row.getCell(2).value = round.ranking ? `${round.ranking}e` : '-';
            const resultMap: Record<string, string> = { qualified: 'Qualifié', eliminated: 'Éliminé', dns: 'DNS', dnf: 'DNF', dq: 'DQ' };
            row.getCell(3).value = resultMap[round.result] || round.result || '-';
          } else {
            row.getCell(1).value = round.matches?.opponent || '-';
            row.getCell(2).value = round.matches?.match_date ? format(new Date(round.matches.match_date), "dd/MM/yyyy") : '-';
            row.getCell(3).value = round.round_number || idx + 1;
          }
          roundStatsDef.forEach((s, i) => {
            const val = statData[s.key];
            row.getCell(i + 4).value = val != null ? Number(val) : null;
          });
          if (rowIdx % 2 === 0) {
            for (let i = 1; i <= headers.length; i++) {
              row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
          }
          rowIdx++;
        });
      }

      // ===== FEUILLE STATS ENTRAÎNEMENT =====
      if (selectedSections.includes("training_stats")) {
        const allTrainingExercises: { exercise: string; date: string; attempts: number; successes: number; rate: number }[] = [];

        (data.bowlingSpareTraining || []).forEach((t: any) => {
          allTrainingExercises.push({ exercise: t.exercise_type || '-', date: t.session_date, attempts: t.attempts || 0, successes: t.successes || 0, rate: t.success_rate || 0 });
        });
        (data.tennisDrillTraining || []).forEach((t: any) => {
          allTrainingExercises.push({ exercise: t.exercise_type || '-', date: t.session_date, attempts: t.attempts || 0, successes: t.successes || 0, rate: t.success_rate || 0 });
        });
        (data.precisionTraining || []).forEach((t: any) => {
          allTrainingExercises.push({ exercise: t.exercise_label || '-', date: t.session_date, attempts: t.attempts || 0, successes: t.successes || 0, rate: t.success_rate || 0 });
        });

        if (allTrainingExercises.length > 0) {
          const sheet = workbook.addWorksheet('Stats Entraînement');
          let rowIdx = addSheetHeader(sheet, 'STATISTIQUES ENTRAÎNEMENT');

          // Cumulative summary section
          const exerciseTotals = new Map<string, { attempts: number; successes: number }>();
          allTrainingExercises.forEach(t => {
            const existing = exerciseTotals.get(t.exercise) || { attempts: 0, successes: 0 };
            existing.attempts += t.attempts;
            existing.successes += t.successes;
            exerciseTotals.set(t.exercise, existing);
          });

          // Summary header
          const summRow = sheet.getRow(rowIdx);
          summRow.getCell(1).value = 'RÉSUMÉ CUMULÉ';
          summRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF224378' } };
          rowIdx++;

          const summHeaders = ['Exercice', 'Tentatives', 'Réussites', '% Réussite'];
          sheet.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
          const shRow = sheet.getRow(rowIdx);
          summHeaders.forEach((h, i) => { shRow.getCell(i + 1).value = h; });
          styleHeaderRow(sheet, rowIdx, summHeaders.length);
          rowIdx++;

          exerciseTotals.forEach((totals, exercise) => {
            const row = sheet.getRow(rowIdx);
            const rate = totals.attempts > 0 ? Math.round((totals.successes / totals.attempts) * 10000) / 100 : 0;
            row.getCell(1).value = exercise;
            row.getCell(2).value = totals.attempts;
            row.getCell(3).value = totals.successes;
            row.getCell(4).value = rate;
            row.getCell(4).numFmt = '0.0"%"';
            row.getCell(4).font = { bold: true, color: { argb: rate >= 70 ? 'FF27AE60' : rate >= 40 ? 'FFEAB308' : 'FFEF4444' } };
            if (rowIdx % 2 === 0) {
              for (let i = 1; i <= 4; i++) {
                row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              }
            }
            rowIdx++;
          });

          // Overall total
          const totalAttempts = allTrainingExercises.reduce((sum, t) => sum + t.attempts, 0);
          const totalSuccesses = allTrainingExercises.reduce((sum, t) => sum + t.successes, 0);
          const overallRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 10000) / 100 : 0;
          rowIdx++;
          const totRow = sheet.getRow(rowIdx);
          totRow.getCell(1).value = 'TOTAL';
          totRow.getCell(1).font = { bold: true, color: { argb: 'FF224378' } };
          totRow.getCell(2).value = totalAttempts;
          totRow.getCell(2).font = { bold: true };
          totRow.getCell(3).value = totalSuccesses;
          totRow.getCell(3).font = { bold: true };
          totRow.getCell(4).value = overallRate;
          totRow.getCell(4).font = { bold: true, size: 12, color: { argb: overallRate >= 70 ? 'FF27AE60' : 'FFEAB308' } };
          for (let i = 1; i <= 4; i++) {
            totRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          }
          rowIdx += 2;

          // Detail section
          const detailTitleRow = sheet.getRow(rowIdx);
          detailTitleRow.getCell(1).value = 'DÉTAIL PAR SESSION';
          detailTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF224378' } };
          rowIdx++;

          const detailHeaders = ['Date', 'Exercice', 'Tentatives', 'Réussites', '% Réussite'];
          const dhRow = sheet.getRow(rowIdx);
          detailHeaders.forEach((h, i) => { dhRow.getCell(i + 1).value = h; });
          styleHeaderRow(sheet, rowIdx, detailHeaders.length);
          rowIdx++;

          allTrainingExercises.forEach((t) => {
            const row = sheet.getRow(rowIdx);
            row.getCell(1).value = t.date ? format(new Date(t.date), "dd/MM/yyyy") : '-';
            row.getCell(2).value = t.exercise;
            row.getCell(3).value = t.attempts;
            row.getCell(4).value = t.successes;
            row.getCell(5).value = t.rate;
            row.getCell(5).font = { color: { argb: t.rate >= 70 ? 'FF27AE60' : t.rate >= 40 ? 'FFEAB308' : 'FFEF4444' } };
            if (rowIdx % 2 === 0) {
              for (let i = 1; i <= 5; i++) {
                row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
              }
            }
            rowIdx++;
          });
        }
      }

      // ===== FEUILLE BLESSURES =====
      if (data.injuries.length > 0) {
        const sheet = workbook.addWorksheet('Blessures');
        let rowIdx = addSheetHeader(sheet, 'HISTORIQUE BLESSURES');

        const headers = ['Type', 'Sévérité', 'Statut', 'Zone', 'Date blessure', 'Retour estimé', 'Durée (j)', 'Notes'];
        sheet.columns = [
          { width: 20 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 30 },
        ];
        const hRow = sheet.getRow(rowIdx);
        headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
        styleHeaderRow(sheet, rowIdx, headers.length);
        rowIdx++;

        data.injuries.forEach((inj: any) => {
          const row = sheet.getRow(rowIdx);
          row.getCell(1).value = inj.injury_type || '-';
          row.getCell(2).value = inj.severity || '-';
          const statusMap: Record<string, string> = { active: 'Blessé', recovering: 'Réathlétisation', healed: 'Guéri' };
          row.getCell(3).value = statusMap[inj.status] || inj.status || '-';
          if (inj.status === 'active') row.getCell(3).font = { color: { argb: 'FFEF4444' }, bold: true };
          else if (inj.status === 'recovering') row.getCell(3).font = { color: { argb: 'FFEAB308' }, bold: true };
          else if (inj.status === 'healed') row.getCell(3).font = { color: { argb: 'FF27AE60' }, bold: true };
          row.getCell(4).value = inj.body_part || '-';
          row.getCell(5).value = inj.injury_date ? format(new Date(inj.injury_date), "dd/MM/yyyy") : '-';
          row.getCell(6).value = inj.estimated_return_date ? format(new Date(inj.estimated_return_date), "dd/MM/yyyy") : '-';
          // Calculate duration
          if (inj.injury_date) {
            const end = inj.status === 'healed' && inj.estimated_return_date ? new Date(inj.estimated_return_date) : new Date();
            const days = Math.round((end.getTime() - new Date(inj.injury_date).getTime()) / (1000 * 60 * 60 * 24));
            row.getCell(7).value = days > 0 ? days : null;
          }
          row.getCell(8).value = inj.notes || '';
          if (rowIdx % 2 === 0) {
            for (let i = 1; i <= headers.length; i++) {
              row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
          }
          rowIdx++;
        });

        // Summary row
        rowIdx++;
        const summRow = sheet.getRow(rowIdx);
        summRow.getCell(1).value = 'RÉSUMÉ';
        summRow.getCell(1).font = { bold: true, color: { argb: 'FF224378' } };
        const activeInj = data.injuries.filter((i: any) => i.status === 'active').length;
        const recInj = data.injuries.filter((i: any) => i.status === 'recovering').length;
        const healedInj = data.injuries.filter((i: any) => i.status === 'healed').length;
        summRow.getCell(2).value = `Total: ${data.injuries.length}`;
        summRow.getCell(3).value = `Actives: ${activeInj}`;
        summRow.getCell(3).font = { bold: true, color: { argb: activeInj > 0 ? 'FFEF4444' : 'FF27AE60' } };
        summRow.getCell(4).value = `Réathlt: ${recInj}`;
        summRow.getCell(5).value = `Guéries: ${healedInj}`;
      }

      // ===== FEUILLE EWMA =====
      if (selectedSections.includes("ewma") && data.awcr.length > 0) {
        const sheet = workbook.addWorksheet('EWMA');
        let rowIdx = addSheetHeader(sheet, "CHARGE D'ENTRAÎNEMENT (EWMA)");

        const sortedAwcr = [...data.awcr].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
        const latestWithEwma = [...sortedAwcr].reverse().find(e => e.acute_load != null && e.chronic_load != null);

        // KPI summary
        if (latestWithEwma) {
          const kpiRow = sheet.getRow(rowIdx);
          kpiRow.getCell(1).value = 'Charge aiguë';
          kpiRow.getCell(2).value = latestWithEwma.acute_load != null ? Number(latestWithEwma.acute_load.toFixed(0)) : null;
          kpiRow.getCell(3).value = 'Charge chronique';
          kpiRow.getCell(4).value = latestWithEwma.chronic_load != null ? Number(latestWithEwma.chronic_load.toFixed(0)) : null;
          kpiRow.getCell(5).value = 'Ratio EWMA';
          kpiRow.getCell(6).value = latestWithEwma.awcr != null ? Number(latestWithEwma.awcr.toFixed(2)) : null;
          [1, 3, 5].forEach(i => { kpiRow.getCell(i).font = { bold: true, color: { argb: 'FF64748B' } }; });
          [2, 4, 6].forEach(i => { kpiRow.getCell(i).font = { bold: true, size: 12 }; });
          if (latestWithEwma.awcr != null) {
            kpiRow.getCell(6).font = {
              bold: true, size: 12,
              color: { argb: latestWithEwma.awcr > 1.5 ? 'FFEF4444' : latestWithEwma.awcr > 1.3 ? 'FFEAB308' : latestWithEwma.awcr >= 0.8 ? 'FF27AE60' : 'FFEAB308' },
            };
          }
          rowIdx += 2;
        }

        const headers = ['Date', 'RPE', 'Durée (min)', 'Charge', 'Aiguë', 'Chronique', 'Ratio'];
        sheet.columns = [{ width: 14 }, { width: 8 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }];
        const hRow = sheet.getRow(rowIdx);
        headers.forEach((h, i) => { hRow.getCell(i + 1).value = h; });
        styleHeaderRow(sheet, rowIdx, headers.length);
        rowIdx++;

        sortedAwcr.forEach((entry) => {
          const row = sheet.getRow(rowIdx);
          row.getCell(1).value = format(new Date(entry.session_date), "dd/MM/yyyy");
          row.getCell(2).value = entry.rpe;
          row.getCell(3).value = entry.duration_minutes;
          row.getCell(4).value = entry.training_load;
          row.getCell(5).value = entry.acute_load != null ? Number(entry.acute_load.toFixed(0)) : null;
          row.getCell(6).value = entry.chronic_load != null ? Number(entry.chronic_load.toFixed(0)) : null;
          row.getCell(7).value = entry.awcr != null ? Number(Number(entry.awcr).toFixed(2)) : null;
          if (entry.awcr != null) {
            row.getCell(7).font = {
              bold: true,
              color: { argb: entry.awcr > 1.5 ? 'FFEF4444' : entry.awcr > 1.3 ? 'FFEAB308' : entry.awcr >= 0.8 ? 'FF27AE60' : 'FFEAB308' },
            };
          }
          if (rowIdx % 2 === 0) {
            for (let i = 1; i <= headers.length; i++) {
              row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }
          }
          rowIdx++;
        });
      }

      // === DOWNLOAD ===
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${fullName.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Rapport Excel généré");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération Excel");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Rapport individuel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Générez un rapport PDF ou CSV personnalisé pour ce joueur
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date de début
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date de fin
            </Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <Separator />

        {/* Section toggles */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Sections à inclure</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(SECTION_LABELS) as [ReportSection, string][]).map(([key, label]) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedSections.includes(key)
                    ? "bg-primary/10 border-primary/30"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => toggleSection(key)}
              >
                <Checkbox
                  checked={selectedSections.includes(key)}
                  className="pointer-events-none"
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Export buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={generatePdf}
            disabled={generating !== null || selectedSections.length === 0}
            className="flex-1"
          >
            {generating === "pdf" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter PDF
          </Button>
          <Button
            variant="outline"
            onClick={generateExcelExport}
            disabled={generating !== null || selectedSections.length === 0}
            className="flex-1"
          >
            {generating === "csv" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Exporter Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
