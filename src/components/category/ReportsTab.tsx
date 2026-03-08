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
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Date range states
  const [playerDateFrom, setPlayerDateFrom] = useState("");
  const [playerDateTo, setPlayerDateTo] = useState("");
  const [overviewDateFrom, setOverviewDateFrom] = useState("");
  const [overviewDateTo, setOverviewDateTo] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");

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
      pdf.text(header.substring(0, Math.floor(colWidths[i] / 3)), xPos, y + 5.5);
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

  // ========================== PLAYER REPORT ==========================
  const generatePlayerReport = async () => {
    if (!selectedPlayer) {
      toast.error("Veuillez sélectionner un joueur");
      return;
    }

    setGeneratingReport("player");
    
    try {
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) throw new Error("Joueur non trouvé");

      // Prepare custom PDF settings
      const { settings: pdfSettings, logoBase64, seasonName } = await preparePdfWithSettings(categoryId);

      // Build date filters
      const dateFilters = (query: any) => {
        let q = query;
        if (playerDateFrom) q = q.gte("tracking_date", playerDateFrom).or(`test_date.gte.${playerDateFrom},session_date.gte.${playerDateFrom},injury_date.gte.${playerDateFrom}`);
        return q;
      };

      // Fetch player data with date filtering
      const [measurementsRes, injuriesRes, wellnessRes, speedTestsRes, jumpTestsRes, awcrRes, bodyCompRes, matchLineupsRes, genericTestsRes, matchStatsRes] = await Promise.all([
        supabase.from("player_measurements").select("*").eq("player_id", selectedPlayer).order("measurement_date", { ascending: false }).limit(1),
        (() => {
          let q = supabase.from("injuries").select("*").eq("player_id", selectedPlayer);
          if (playerDateFrom) q = q.gte("injury_date", playerDateFrom);
          if (playerDateTo) q = q.lte("injury_date", playerDateTo);
          return q.order("injury_date", { ascending: false });
        })(),
        (() => {
          let q = supabase.from("wellness_tracking").select("*").eq("player_id", selectedPlayer);
          if (playerDateFrom) q = q.gte("tracking_date", playerDateFrom);
          if (playerDateTo) q = q.lte("tracking_date", playerDateTo);
          return q.order("tracking_date", { ascending: false });
        })(),
        (() => {
          let q = supabase.from("speed_tests").select("*").eq("player_id", selectedPlayer);
          if (playerDateFrom) q = q.gte("test_date", playerDateFrom);
          if (playerDateTo) q = q.lte("test_date", playerDateTo);
          return q.order("test_date", { ascending: false });
        })(),
        (() => {
          let q = supabase.from("jump_tests").select("*").eq("player_id", selectedPlayer);
          if (playerDateFrom) q = q.gte("test_date", playerDateFrom);
          if (playerDateTo) q = q.lte("test_date", playerDateTo);
          return q.order("test_date", { ascending: false });
        })(),
        supabase.from("awcr_tracking").select("*").eq("player_id", selectedPlayer).order("session_date", { ascending: false }).limit(1),
        supabase.from("body_composition").select("*").eq("player_id", selectedPlayer).order("measurement_date", { ascending: false }).limit(1),
        supabase.from("match_lineups").select("*, matches(match_date, opponent)").eq("player_id", selectedPlayer),
        (() => {
          let q = supabase.from("generic_tests").select("*").eq("player_id", selectedPlayer);
          if (playerDateFrom) q = q.gte("test_date", playerDateFrom);
          if (playerDateTo) q = q.lte("test_date", playerDateTo);
          return q.order("test_date", { ascending: false });
        })(),
        supabase.from("player_match_stats").select("*, players(name), matches(match_date, opponent)").eq("player_id", selectedPlayer),
      ]);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      const dateRange = playerDateFrom || playerDateTo 
        ? `Période: ${playerDateFrom ? format(new Date(playerDateFrom), "dd/MM/yyyy") : "début"} - ${playerDateTo ? format(new Date(playerDateTo), "dd/MM/yyyy") : "aujourd'hui"}`
        : "";

      // Header with custom settings
      let yPos = drawPdfHeaderCustom(
        pdf,
        `FICHE JOUEUR`,
        `${[player.first_name, player.name].filter(Boolean).join(" ")} - ${player.position || 'Position non définie'}`,
        `${category?.clubs?.name} - ${category?.name}${seasonName ? ` • ${seasonName}` : ''} | ${format(new Date(), "d MMMM yyyy", { locale: fr })}${dateRange ? ` | ${dateRange}` : ""}`,
        pdfSettings,
        logoBase64
      );

      // KPI Cards
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status !== 'healed').length;
      const matchCount = matchLineupsRes.data?.length || 0;
      const totalMinutes = matchLineupsRes.data?.reduce((sum, m) => sum + (m.minutes_played || 0), 0) || 0;
      const latestAwcr = awcrRes.data?.[0]?.awcr;

      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(matchCount), "MATCHS", defaultColors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(totalMinutes), "MINUTES", defaultColors.primary);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSURES", activeInjuries > 0 ? defaultColors.danger : defaultColors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, latestAwcr ? latestAwcr.toFixed(2) : '-', "EWMA", latestAwcr ? (latestAwcr > 1.5 ? defaultColors.danger : latestAwcr < 0.8 ? defaultColors.warning : defaultColors.success) : defaultColors.muted);

      yPos += cardHeight + 15;

      // Biometrics Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("BIOMÉTRIE", margin, yPos);
      yPos += 8;

      const measurement = measurementsRes.data?.[0];
      const bodyComp = bodyCompRes.data?.[0];

      if (measurement || bodyComp) {
        pdf.setFillColor(...defaultColors.light);
        pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...defaultColors.dark);
        
        let bioText = [];
        if (measurement?.height_cm) bioText.push(`Taille: ${measurement.height_cm} cm`);
        if (measurement?.weight_kg) bioText.push(`Poids: ${measurement.weight_kg} kg`);
        if (bodyComp?.body_fat_percentage) bioText.push(`Masse grasse: ${bodyComp.body_fat_percentage}%`);
        if (bodyComp?.muscle_mass_kg) bioText.push(`Masse musculaire: ${bodyComp.muscle_mass_kg} kg`);
        
        pdf.text(bioText.join("  |  "), margin + 5, yPos + 12);
        yPos += 25;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...defaultColors.muted);
        pdf.text("Aucune mesure enregistrée", margin, yPos);
        yPos += 10;
      }

      // Injuries Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("HISTORIQUE BLESSURES", margin, yPos);
      yPos += 8;

      if (allInjuries.length > 0) {
        const injuryHeaders = ["Type", "Sévérité", "Statut", "Date", "Retour"];
        const injuryColWidths = [50, 30, 30, 30, 40];
        yPos = drawTableHeaderPdf(pdf, injuryHeaders, injuryColWidths, yPos, margin, contentWidth);

        allInjuries.forEach((injury, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const statusLabel = injury.status === 'active' ? 'Active' : injury.status === 'recovering' ? 'Récup.' : 'Guérie';
          const statusColor = injury.status === 'active' ? defaultColors.danger : injury.status === 'recovering' ? defaultColors.warning : defaultColors.success;
          yPos = drawTableRowPdf(pdf, [
            injury.injury_type,
            injury.severity,
            statusLabel,
            format(new Date(injury.injury_date), "dd/MM/yy"),
            injury.estimated_return_date ? format(new Date(injury.estimated_return_date), "dd/MM/yy") : '-'
          ], injuryColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, statusColor, null, null]);
        });
        yPos += 5;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...defaultColors.success);
        pdf.text("Aucune blessure enregistrée", margin, yPos);
        yPos += 10;
      }

      // ===== TESTS SECTION - Grouped by category =====
      // Combine all test sources into a unified list
      const allTestResults: Array<{test_type: string; test_category: string; result_value: number; result_unit: string | null; test_date: string}> = [];

      // Add speed tests
      (speedTestsRes.data || []).forEach(t => {
        if (t.test_type === '40m' && t.time_40m_seconds) {
          allTestResults.push({ test_type: 'Sprint 40m', test_category: 'sprint', result_value: t.time_40m_seconds, result_unit: 's', test_date: t.test_date });
        } else if (t.test_type === '1600m' && t.vma_kmh) {
          allTestResults.push({ test_type: 'Test 1600m (VMA)', test_category: 'cardio', result_value: t.vma_kmh, result_unit: 'km/h', test_date: t.test_date });
        }
      });

      // Add jump tests
      (jumpTestsRes.data || []).forEach(t => {
        allTestResults.push({ test_type: t.test_type, test_category: 'saut', result_value: t.result_cm, result_unit: 'cm', test_date: t.test_date });
      });

      // Add generic tests
      (genericTestsRes.data || []).forEach(t => {
        allTestResults.push({ test_type: t.test_type, test_category: t.test_category, result_value: t.result_value, result_unit: t.result_unit, test_date: t.test_date });
      });

      if (allTestResults.length > 0) {
        // Group by test_category
        const groupedTests: Record<string, typeof allTestResults> = {};
        allTestResults.forEach(t => {
          const cat = t.test_category || 'autres';
          if (!groupedTests[cat]) groupedTests[cat] = [];
          groupedTests[cat].push(t);
        });

        // Get nice category labels from TEST_CATEGORIES
        const getCategoryLabel = (catValue: string): string => {
          const found = TEST_CATEGORIES.find(c => c.value === catValue);
          if (found) return found.label;
          // Capitalize fallback
          return catValue.charAt(0).toUpperCase() + catValue.slice(1).replace(/_/g, ' ');
        };

        // Sort categories for consistent order
        const orderedCategories = Object.keys(groupedTests).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b)));

        // Section header
        yPos = localCheckPageBreak(pdf, yPos, 30);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("TESTS DE PERFORMANCE", margin, yPos);
        yPos += 8;

        for (const catKey of orderedCategories) {
          const tests = groupedTests[catKey];
          yPos = localCheckPageBreak(pdf, yPos, 25);

          // Sub-header for category
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...defaultColors.primary);
          pdf.text(getCategoryLabel(catKey), margin + 2, yPos);
          yPos += 6;

          const testHeaders = ["Test", "Résultat", "Date"];
          const testColWidths = [70, 55, 55];
          yPos = drawTableHeaderPdf(pdf, testHeaders, testColWidths, yPos, margin, contentWidth);

          // Sort tests by date desc within category
          tests.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());

          tests.forEach((test, index) => {
            yPos = localCheckPageBreak(pdf, yPos, 10);
            // Show full test label without category prefix (e.g. "Clean - 1RM" not just "1RM")
            const fullLabel = getTestLabel(test.test_type);
            let testLabel = test.test_type;
            if (fullLabel !== test.test_type) {
              const parts = fullLabel.split(' - ');
              if (parts.length >= 3) {
                testLabel = parts.slice(1).join(' - ');
              } else if (parts.length === 2) {
                testLabel = parts[1];
              } else {
                testLabel = fullLabel;
              }
            }
            yPos = drawTableRowPdf(pdf, [
              testLabel,
              `${test.result_value}${test.result_unit ? ` ${test.result_unit}` : ''}`,
              format(new Date(test.test_date), "dd/MM/yy")
            ], testColWidths, yPos, index % 2 === 1, margin, contentWidth);
          });
          yPos += 4;
        }
        yPos += 5;
      } else {
        yPos = localCheckPageBreak(pdf, yPos, 20);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("TESTS DE PERFORMANCE", margin, yPos);
        yPos += 8;
        pdf.setFontSize(9);
        pdf.setTextColor(...defaultColors.muted);
        pdf.text("Aucun test enregistré", margin, yPos);
        yPos += 10;
      }

      // Match Stats Section
      const matchStats = matchStatsRes.data || [];
      if (matchStats.length > 0) {
        yPos = localCheckPageBreak(pdf, yPos, 30);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("STATISTIQUES PAR MATCH", margin, yPos);
        yPos += 8;

        // Get the configured stat preferences + custom stats
        const [statPrefsResp, customStatsResp] = await Promise.all([
          supabase.from("category_stat_preferences").select("enabled_stats, enabled_custom_stats").eq("category_id", categoryId).maybeSingle(),
          supabase.from("custom_stats").select("*").eq("category_id", categoryId),
        ]);

        const sportType = category?.clubs?.sport || "rugby";
        const allStatsDef = getStatsForSport(sportType);
        const customStatFields = (customStatsResp.data || []).map((cs: any) => ({
          key: cs.key, label: cs.label, shortLabel: cs.short_label,
          category: cs.category_type as StatField["category"],
          type: "number" as const,
        }));
        const allAvailable = [...allStatsDef, ...customStatFields];
        
        const enabledKeys = [
          ...(statPrefsResp.data?.enabled_stats as string[] || []),
          ...(statPrefsResp.data?.enabled_custom_stats as string[] || []),
        ];
        const displayStats = enabledKeys.length > 0
          ? allAvailable.filter(s => enabledKeys.includes(s.key))
          : allAvailable;
        const limitedStats = displayStats.slice(0, 6);

        const matchStatHeaders = ["Match", "Date", ...limitedStats.map(s => s.shortLabel)];
        const nameColW = 40;
        const dateColW = 22;
        const statColW = Math.max(15, Math.floor((contentWidth - nameColW - dateColW) / limitedStats.length));
        const matchStatColWidths = [nameColW, dateColW, ...limitedStats.map(() => statColW)];
        yPos = drawTableHeaderPdf(pdf, matchStatHeaders, matchStatColWidths, yPos, margin, contentWidth);

        matchStats.forEach((stat: any, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
          const values = [
            stat.matches?.opponent || '-',
            stat.matches?.match_date ? format(new Date(stat.matches.match_date), "dd/MM") : '-',
            ...limitedStats.map(s => {
              const val = sportData[s.key] ?? stat[s.key] ?? stat[s.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
              return val != null ? String(val) : '-';
            })
          ];
          yPos = drawTableRowPdf(pdf, values, matchStatColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
        yPos += 5;
      }

      // Wellness Summary (last 10)
      const wellnessData = wellnessRes.data || [];
      if (wellnessData.length > 0) {
        yPos = localCheckPageBreak(pdf, yPos, 30);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...defaultColors.dark);
        pdf.text("WELLNESS (dernières entrées)", margin, yPos);
        yPos += 8;

        const wHeaders = ["Date", "Sommeil", "Fatigue", "Stress", "Haut", "Bas", "Moy."];
        const wColWidths = [32, 24, 24, 24, 24, 24, 24];
        yPos = drawTableHeaderPdf(pdf, wHeaders, wColWidths, yPos, margin, contentWidth);

        const getWellnessColor = (val: number | null): [number, number, number] | null => {
          if (val == null) return null;
          if (val >= 4) return defaultColors.success;
          if (val >= 3) return defaultColors.warning;
          return defaultColors.danger;
        };

        wellnessData.slice(0, 10).forEach((w, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const wValues = [w.sleep_quality, w.general_fatigue, w.stress_level, w.soreness_upper_body, w.soreness_lower_body].filter(v => v != null) as number[];
          const wAvg = wValues.length > 0 ? (wValues.reduce((a, b) => a + b, 0) / wValues.length).toFixed(1) : '-';
          const avgNum = parseFloat(wAvg);
          yPos = drawTableRowPdf(pdf, [
            format(new Date(w.tracking_date), "dd/MM/yy"),
            `${w.sleep_quality || '-'}/5`,
            `${w.general_fatigue || '-'}/5`,
            `${w.stress_level || '-'}/5`,
            `${w.soreness_upper_body || '-'}/5`,
            `${w.soreness_lower_body || '-'}/5`,
            wAvg,
          ], wColWidths, yPos, index % 2 === 1, margin, contentWidth, [
            null,
            getWellnessColor(w.sleep_quality),
            getWellnessColor(w.general_fatigue),
            getWellnessColor(w.stress_level),
            getWellnessColor(w.soreness_upper_body),
            getWellnessColor(w.soreness_lower_body),
            !isNaN(avgNum) ? getWellnessColor(avgNum) : null,
          ]);
        });
      }

      pdf.save(`fiche_${[player.first_name, player.name].filter(Boolean).join('_').replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport généré avec succès");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
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
        supabase.from("match_lineups").select("*, players(name, position)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*, players(name)").eq("match_id", selectedMatch),
        supabase.from("category_stat_preferences").select("enabled_stats").eq("category_id", categoryId).maybeSingle(),
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
          yPos = drawTableRowPdf(pdf, [
            p.players?.name || 'Inconnu',
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
          yPos = drawTableRowPdf(pdf, [
            p.players?.name || 'Inconnu',
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
        // Show up to 6 stat columns in PDF
        const limitedStats = displayStats.slice(0, 6);

        const statHeaders = ["Joueur", ...limitedStats.map(s => s.shortLabel)];
        const nameColWidth = 50;
        const statColWidth = Math.max(15, Math.floor((contentWidth - nameColWidth) / limitedStats.length));
        const statColWidths = [nameColWidth, ...limitedStats.map(() => statColWidth)];
        yPos = drawTableHeaderPdf(pdf, statHeaders, statColWidths, yPos, margin, contentWidth);

        playerStats.forEach((stat: any, index) => {
          yPos = localCheckPageBreak(pdf, yPos, 10);
          const sportData = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
          
          const values = [
            stat.players?.name || 'Inconnu',
            ...limitedStats.map(s => {
              const val = sportData[s.key] ?? stat[s.key] ?? stat[s.key.replace(/([A-Z])/g, '_$1').toLowerCase()];
              return val != null ? String(val) : '-';
            })
          ];

          const rowColors: ([number, number, number] | null)[] = [
            null,
            ...limitedStats.map(s => {
              const sportDataLocal = (stat.sport_data && typeof stat.sport_data === 'object') ? stat.sport_data as Record<string, any> : {};
              const val = sportDataLocal[s.key] ?? stat[s.key];
              if (s.key === 'tries' && val && val > 0) return defaultColors.success;
              if (s.key === 'yellowCards' && val && val > 0) return defaultColors.warning;
              if (s.key === 'redCards' && val && val > 0) return defaultColors.danger;
              return null;
            })
          ];

          yPos = drawTableRowPdf(pdf, values, statColWidths, yPos, index % 2 === 1, margin, contentWidth, rowColors);
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

  const generatePlayerCsv = async () => {
    if (!selectedPlayer) {
      toast.error("Veuillez sélectionner un joueur");
      return;
    }
    setGeneratingReport("player-csv");
    try {
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) throw new Error("Joueur non trouvé");

      const [injuriesRes, wellnessRes, speedTestsRes, jumpTestsRes, awcrRes] = await Promise.all([
        supabase.from("injuries").select("*").eq("player_id", selectedPlayer).order("injury_date", { ascending: false }),
        supabase.from("wellness_tracking").select("*").eq("player_id", selectedPlayer).order("tracking_date", { ascending: false }),
        supabase.from("speed_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }),
        supabase.from("jump_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*").eq("player_id", selectedPlayer).order("session_date", { ascending: false }),
      ]);

      const wellnessHeaders = ["Date", "Fatigue", "Sommeil (h)", "Qualité sommeil", "Stress", "Douleurs haut", "Douleurs bas", "Moyenne"];
      const wellnessRows = (wellnessRes.data || []).map(w => {
        const values = [w.general_fatigue, w.sleep_quality, w.stress_level, w.soreness_upper_body, w.soreness_lower_body].filter(v => v != null && v !== undefined) as number[];
        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "-";
        return [
          format(new Date(w.tracking_date), "dd/MM/yyyy"),
          w.general_fatigue || "-",
          w.sleep_duration || "-",
          w.sleep_quality || "-",
          w.stress_level || "-",
          w.soreness_upper_body || "-",
          w.soreness_lower_body || "-",
          avg,
        ];
      });

      const csv = generateCsv(wellnessHeaders, wellnessRows);
      downloadCsv(`joueur_${[player.first_name, player.name].filter(Boolean).join('_').replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
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
          let q = supabase.from("training_attendance").select("*, training_sessions!inner(session_date)").eq("category_id", categoryId);
          if (attendanceDateFrom) q = q.gte("training_sessions.session_date", attendanceDateFrom);
          if (attendanceDateTo) q = q.lte("training_sessions.session_date", attendanceDateTo);
          return q;
        })(),
      ]);

      const sessionsData = sessionsRes.data || [];
      const attendanceData = attendanceRes.data || [];
      const sessionIds = new Set(sessionsData.map(s => s.id));

      // Filter attendance to only sessions in the date range
      const filteredAttendance = attendanceData.filter(a => sessionIds.has(a.training_session_id));

      const playerStats = players.map((player) => {
        const playerAttendance = filteredAttendance.filter((a) => a.player_id === player.id);
        const present = playerAttendance.filter((a) => a.status === "present").length;
        const late = playerAttendance.filter((a) => a.status === "late").length;
        const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
        const absent = playerAttendance.filter((a) => a.status === "absent").length;
        const excused = playerAttendance.filter((a) => a.status === "excused").length;
        const total = playerAttendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          ...player,
          present, late, lateJustified,
          lateUnjustified: late - lateJustified,
          absent, excused, total, rate,
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

      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(totalSessions), "SÉANCES", defaultColors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, `${avgRate}%`, "TAUX MOYEN", avgRate >= 80 ? defaultColors.success : avgRate >= 60 ? defaultColors.warning : defaultColors.danger);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(totalLate), "RETARDS", totalLate > 10 ? defaultColors.warning : defaultColors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(totalAbsent), "ABSENCES", totalAbsent > 10 ? defaultColors.danger : defaultColors.success);

      yPos += cardHeight + 15;

      // Player attendance table
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...defaultColors.dark);
      pdf.text("PRÉSENCES PAR JOUEUR", margin, yPos);
      yPos += 8;

      const attendHeaders = ["Joueur", "Présent", "Retard", "Excusé", "Absent", "Taux"];
      const attendColWidths = [60, 25, 25, 25, 25, 25];
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
          ],
          attendColWidths,
          yPos,
          index % 2 === 1,
          margin,
          contentWidth,
          [null, defaultColors.success, defaultColors.warning, null, defaultColors.danger, rateColor]
        );
      });

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

        {/* Player Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Fiche Joueur
            </CardTitle>
            <CardDescription>
              Stats, tests, blessures et wellness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un joueur" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {[player.first_name, player.name].filter(Boolean).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderDateRange(playerDateFrom, playerDateTo, setPlayerDateFrom, setPlayerDateTo)}
            <div className="flex gap-2">
              <Button 
                onClick={generatePlayerReport} 
                className="flex-1"
                disabled={!selectedPlayer || generatingReport === "player" || generatingReport === "player-csv"}
              >
                {generatingReport === "player" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
              <Button 
                onClick={generatePlayerCsv}
                variant="outline"
                className="flex-1"
                disabled={!selectedPlayer || generatingReport === "player" || generatingReport === "player-csv"}
              >
                {generatingReport === "player-csv" ? (
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
