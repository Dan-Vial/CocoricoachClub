import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, User, Calendar, Trophy, Loader2, Users, FileSpreadsheet, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { generateCsv, downloadCsv } from "@/lib/csv";

interface ReportsTabProps {
  categoryId: string;
}

export function ReportsTab({ categoryId }: ReportsTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(name)")
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

  // Shared PDF helper functions
  const colors = {
    primary: [41, 128, 185] as [number, number, number],
    success: [39, 174, 96] as [number, number, number],
    warning: [241, 196, 15] as [number, number, number],
    danger: [231, 76, 60] as [number, number, number],
    muted: [149, 165, 166] as [number, number, number],
    dark: [52, 73, 94] as [number, number, number],
    light: [236, 240, 241] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const drawPdfHeader = (pdf: jsPDF, title: string, subtitle: string, date: string) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin, 18);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(subtitle, margin, 28);
    
    pdf.setFontSize(9);
    pdf.text(date, margin, 36);
    
    pdf.setTextColor(...colors.dark);
    return 50;
  };

  const drawKpiCard = (pdf: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, color: [number, number, number]) => {
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, w, h, 3, 3, 'F');
    pdf.setTextColor(...colors.white);
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
    pdf.setFillColor(...colors.dark);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      pdf.text(header, xPos, y + 5.5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    return y + 8;
  };

  const drawTableRowPdf = (pdf: jsPDF, values: string[], colWidths: number[], y: number, isAlternate: boolean, margin: number, contentWidth: number, rowColors?: ([number, number, number] | null)[]) => {
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
      pdf.text(value.substring(0, 25), xPos, y + 5);
      xPos += colWidths[i];
    });
    pdf.setFont("helvetica", "normal");
    return y + 7;
  };

  const generatePlayerReport = async () => {
    if (!selectedPlayer) {
      toast.error("Veuillez sélectionner un joueur");
      return;
    }

    setGeneratingReport("player");
    
    try {
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) throw new Error("Joueur non trouvé");

      // Fetch player data
      const [measurementsRes, injuriesRes, wellnessRes, speedTestsRes, jumpTestsRes, awcrRes, bodyCompRes, matchLineupsRes] = await Promise.all([
        supabase.from("player_measurements").select("*").eq("player_id", selectedPlayer).order("measurement_date", { ascending: false }).limit(1),
        supabase.from("injuries").select("*").eq("player_id", selectedPlayer),
        supabase.from("wellness_tracking").select("*").eq("player_id", selectedPlayer).order("tracking_date", { ascending: false }).limit(5),
        supabase.from("speed_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }),
        supabase.from("jump_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*").eq("player_id", selectedPlayer).order("session_date", { ascending: false }).limit(1),
        supabase.from("body_composition").select("*").eq("player_id", selectedPlayer).order("measurement_date", { ascending: false }).limit(1),
        supabase.from("match_lineups").select("*, matches(match_date, opponent)").eq("player_id", selectedPlayer),
      ]);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Header
      let yPos = drawPdfHeader(
        pdf,
        `FICHE JOUEUR`,
        `${player.name} - ${player.position || 'Position non définie'}`,
        `${category?.clubs?.name} - ${category?.name} | ${format(new Date(), "d MMMM yyyy", { locale: fr })}`
      );

      // KPI Cards
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status !== 'healed').length;
      const matchCount = matchLineupsRes.data?.length || 0;
      const totalMinutes = matchLineupsRes.data?.reduce((sum, m) => sum + (m.minutes_played || 0), 0) || 0;
      const latestAwcr = awcrRes.data?.[0]?.awcr;

      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(matchCount), "MATCHS", colors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(totalMinutes), "MINUTES", colors.primary);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSURES", activeInjuries > 0 ? colors.danger : colors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, latestAwcr ? latestAwcr.toFixed(2) : '-', "AWCR", latestAwcr ? (latestAwcr > 1.5 ? colors.danger : latestAwcr < 0.8 ? colors.warning : colors.success) : colors.muted);

      yPos += cardHeight + 15;

      // Biometrics Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("BIOMÉTRIE", margin, yPos);
      yPos += 8;

      const measurement = measurementsRes.data?.[0];
      const bodyComp = bodyCompRes.data?.[0];

      if (measurement || bodyComp) {
        pdf.setFillColor(...colors.light);
        pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        
        let bioText = [];
        if (measurement?.height_cm) bioText.push(`Taille: ${measurement.height_cm} cm`);
        if (measurement?.weight_kg) bioText.push(`Poids: ${measurement.weight_kg} kg`);
        if (bodyComp?.body_fat_percentage) bioText.push(`Masse grasse: ${bodyComp.body_fat_percentage}%`);
        if (bodyComp?.muscle_mass_kg) bioText.push(`Masse musculaire: ${bodyComp.muscle_mass_kg} kg`);
        
        pdf.text(bioText.join("  |  "), margin + 5, yPos + 12);
        yPos += 25;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.muted);
        pdf.text("Aucune mesure enregistrée", margin, yPos);
        yPos += 10;
      }

      // Injuries Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("HISTORIQUE BLESSURES", margin, yPos);
      yPos += 8;

      if (allInjuries.length > 0) {
        const injuryHeaders = ["Type", "Sévérité", "Statut", "Date"];
        const injuryColWidths = [60, 40, 40, 40];
        yPos = drawTableHeaderPdf(pdf, injuryHeaders, injuryColWidths, yPos, margin, contentWidth);

        allInjuries.slice(0, 5).forEach((injury, index) => {
          const statusLabel = injury.status === 'active' ? 'Active' : injury.status === 'recovering' ? 'Récup.' : 'Guérie';
          const statusColor = injury.status === 'active' ? colors.danger : injury.status === 'recovering' ? colors.warning : colors.success;
          yPos = drawTableRowPdf(pdf, [
            injury.injury_type,
            injury.severity,
            statusLabel,
            format(new Date(injury.injury_date), "dd/MM/yy")
          ], injuryColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, statusColor, null]);
        });
        yPos += 5;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.success);
        pdf.text("Aucune blessure enregistrée", margin, yPos);
        yPos += 10;
      }

      // Speed Tests Section
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("TESTS DE VITESSE", margin, yPos);
      yPos += 8;

      const speedTests = speedTestsRes.data || [];
      if (speedTests.length > 0) {
        const speedHeaders = ["Type", "Résultat", "Date"];
        const speedColWidths = [60, 60, 60];
        yPos = drawTableHeaderPdf(pdf, speedHeaders, speedColWidths, yPos, margin, contentWidth);

        speedTests.slice(0, 5).forEach((test, index) => {
          let result = '-';
          if (test.test_type === '40m' && test.time_40m_seconds) {
            result = `${test.time_40m_seconds}s (${test.speed_kmh?.toFixed(1) || '-'} km/h)`;
          } else if (test.test_type === '1600m') {
            result = `VMA: ${test.vma_kmh || '-'} km/h`;
          }
          yPos = drawTableRowPdf(pdf, [
            test.test_type === '40m' ? 'Sprint 40m' : 'Test 1600m',
            result,
            format(new Date(test.test_date), "dd/MM/yy")
          ], speedColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
        yPos += 5;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.muted);
        pdf.text("Aucun test enregistré", margin, yPos);
        yPos += 10;
      }

      // Jump Tests Section
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("TESTS DE SAUT", margin, yPos);
      yPos += 8;

      const jumpTests = jumpTestsRes.data || [];
      if (jumpTests.length > 0) {
        const jumpHeaders = ["Type", "Résultat", "Date"];
        const jumpColWidths = [60, 60, 60];
        yPos = drawTableHeaderPdf(pdf, jumpHeaders, jumpColWidths, yPos, margin, contentWidth);

        jumpTests.slice(0, 5).forEach((test, index) => {
          yPos = drawTableRowPdf(pdf, [
            test.test_type,
            `${test.result_cm} cm`,
            format(new Date(test.test_date), "dd/MM/yy")
          ], jumpColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.muted);
        pdf.text("Aucun test enregistré", margin, yPos);
      }

      pdf.save(`fiche_${player.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Rapport généré avec succès");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateSeasonReport = async () => {
    setGeneratingReport("season");
    
    try {
      // Fetch season data
      const [matchesRes, injuriesRes, goalsRes, awcrRes] = await Promise.all([
        supabase.from("matches").select("*").eq("category_id", categoryId).order("match_date"),
        supabase.from("injuries").select("*, players(name)").eq("category_id", categoryId),
        supabase.from("season_goals").select("*").eq("category_id", categoryId).eq("season_year", new Date().getFullYear()),
        supabase.from("awcr_tracking").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
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

      // Header
      let yPos = drawPdfHeader(
        pdf,
        `BILAN DE SAISON ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        `${category?.clubs?.name} - ${category?.name}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`
      );

      // KPI Cards
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(players.length), "JOUEURS", colors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, String(matchesData.length), "MATCHS", colors.primary);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(wins), "VICTOIRES", colors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(activeInjuries), "BLESSÉS", activeInjuries > 0 ? colors.danger : colors.success);

      yPos += cardHeight + 15;

      // Match Record Summary
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("BILAN SPORTIF", margin, yPos);
      yPos += 10;

      const recordBoxWidth = (contentWidth - 10) / 3;
      
      pdf.setFillColor(...colors.success);
      pdf.roundedRect(margin, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(wins), margin + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("VICTOIRES", margin + recordBoxWidth / 2 - 15, yPos + 15);

      pdf.setFillColor(...colors.muted);
      pdf.roundedRect(margin + recordBoxWidth + 5, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setFontSize(14);
      pdf.text(String(draws), margin + recordBoxWidth + 5 + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("NULS", margin + recordBoxWidth + 5 + recordBoxWidth / 2 - 8, yPos + 15);

      pdf.setFillColor(...colors.danger);
      pdf.roundedRect(margin + (recordBoxWidth + 5) * 2, yPos, recordBoxWidth, 18, 2, 2, 'F');
      pdf.setFontSize(14);
      pdf.text(String(losses), margin + (recordBoxWidth + 5) * 2 + recordBoxWidth / 2 - 5, yPos + 10);
      pdf.setFontSize(8);
      pdf.text("DÉFAITES", margin + (recordBoxWidth + 5) * 2 + recordBoxWidth / 2 - 14, yPos + 15);

      yPos += 28;

      // Goals Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("OBJECTIFS DE SAISON", margin, yPos);
      yPos += 8;

      const goals = goalsRes.data || [];
      if (goals.length > 0) {
        const goalHeaders = ["Objectif", "Progression", "Statut"];
        const goalColWidths = [100, 40, 40];
        yPos = drawTableHeaderPdf(pdf, goalHeaders, goalColWidths, yPos, margin, contentWidth);

        goals.forEach((goal, index) => {
          const statusLabel = goal.status === 'completed' ? 'Atteint' : goal.status === 'in_progress' ? 'En cours' : 'En attente';
          const statusColor = goal.status === 'completed' ? colors.success : goal.status === 'in_progress' ? colors.warning : colors.muted;
          yPos = drawTableRowPdf(pdf, [
            goal.title,
            `${goal.progress_percentage || 0}%`,
            statusLabel
          ], goalColWidths, yPos, index % 2 === 1, margin, contentWidth, [null, null, statusColor]);
        });
        yPos += 5;
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.muted);
        pdf.text("Aucun objectif défini", margin, yPos);
        yPos += 10;
      }

      // Match Results
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("RÉSULTATS DES MATCHS", margin, yPos);
      yPos += 8;

      if (matchesData.length > 0) {
        const matchHeaders = ["Date", "Adversaire", "Score", "Résultat"];
        const matchColWidths = [35, 70, 35, 40];
        yPos = drawTableHeaderPdf(pdf, matchHeaders, matchColWidths, yPos, margin, contentWidth);

        matchesData.slice(0, 12).forEach((match, index) => {
          const score = `${match.score_home ?? '-'} - ${match.score_away ?? '-'}`;
          let result = '-';
          let resultColor: [number, number, number] | null = null;
          
          if (match.score_home !== null && match.score_away !== null) {
            const isWin = (match.is_home && match.score_home > match.score_away) || (!match.is_home && match.score_away > match.score_home);
            const isLoss = (match.is_home && match.score_home < match.score_away) || (!match.is_home && match.score_away < match.score_home);
            result = isWin ? 'Victoire' : isLoss ? 'Défaite' : 'Nul';
            resultColor = isWin ? colors.success : isLoss ? colors.danger : colors.muted;
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
        pdf.setTextColor(...colors.muted);
        pdf.text("Aucun match joué", margin, yPos);
      }

      // Injury Summary
      yPos += 15;
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("BILAN MÉDICAL", margin, yPos);
      yPos += 10;

      const injuryStats = [
        { label: "Blessures totales", value: allInjuries.length, color: colors.primary },
        { label: "Actuellement blessés", value: activeInjuries, color: activeInjuries > 0 ? colors.danger : colors.success },
        { label: "En réathlétisation", value: allInjuries.filter(i => i.status === 'recovering').length, color: colors.warning },
      ];

      const statBoxWidth = (contentWidth - 10) / 3;
      injuryStats.forEach((stat, i) => {
        pdf.setFillColor(...stat.color);
        pdf.roundedRect(margin + (statBoxWidth + 5) * i, yPos, statBoxWidth, 18, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
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

  const generateMatchReport = async () => {
    if (!selectedMatch) {
      toast.error("Veuillez sélectionner un match");
      return;
    }

    setGeneratingReport("match");
    
    try {
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) throw new Error("Match non trouvé");

      // Fetch match data
      const [lineupsRes, statsRes] = await Promise.all([
        supabase.from("match_lineups").select("*, players(name, position)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*, players(name)").eq("match_id", selectedMatch),
      ]);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Determine result
      let resultText = "Match";
      let resultColor = colors.primary;
      if (match.score_home !== null && match.score_away !== null) {
        const isWin = (match.is_home && match.score_home > match.score_away) || (!match.is_home && match.score_away > match.score_home);
        const isLoss = (match.is_home && match.score_home < match.score_away) || (!match.is_home && match.score_away < match.score_home);
        resultText = isWin ? "VICTOIRE" : isLoss ? "DÉFAITE" : "MATCH NUL";
        resultColor = isWin ? colors.success : isLoss ? colors.danger : colors.muted;
      }

      // Header
      let yPos = drawPdfHeader(
        pdf,
        `RAPPORT DE MATCH`,
        `vs ${match.opponent} - ${match.location || 'Lieu non défini'}`,
        `${format(new Date(match.match_date), "EEEE d MMMM yyyy", { locale: fr })}`
      );

      // Score Card
      const scoreBoxWidth = contentWidth;
      pdf.setFillColor(...resultColor);
      pdf.roundedRect(margin, yPos, scoreBoxWidth, 35, 3, 3, 'F');
      
      pdf.setTextColor(...colors.white);
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
      pdf.setTextColor(...colors.dark);
      pdf.text("STATISTIQUES DU MATCH", margin, yPos);
      yPos += 10;

      const matchStatsData = [
        { label: "Temps effectif", value: match.effective_play_time ? `${match.effective_play_time} min` : '-' },
        { label: "Séq. la plus longue", value: match.longest_play_sequence ? `${match.longest_play_sequence} sec` : '-' },
        { label: "Séq. moyenne", value: match.average_play_sequence ? `${match.average_play_sequence} sec` : '-' },
      ];

      pdf.setFillColor(...colors.light);
      pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.dark);
      pdf.setFont("helvetica", "normal");
      
      let xOffset = margin + 5;
      matchStatsData.forEach((stat, i) => {
        pdf.text(`${stat.label}: ${stat.value}`, xOffset, yPos + 10);
        xOffset += 60;
      });
      
      yPos += 25;

      // Lineup
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("COMPOSITION", margin, yPos);
      yPos += 8;

      const starters = lineupsRes.data?.filter(l => l.is_starter) || [];
      const subs = lineupsRes.data?.filter(l => !l.is_starter) || [];

      if (starters.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.success);
        pdf.text("Titulaires", margin, yPos);
        yPos += 6;

        const lineupHeaders = ["Joueur", "Position", "Minutes"];
        const lineupColWidths = [80, 50, 50];
        yPos = drawTableHeaderPdf(pdf, lineupHeaders, lineupColWidths, yPos, margin, contentWidth);

        starters.forEach((p, index) => {
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
        pdf.setTextColor(...colors.warning);
        pdf.text("Remplaçants", margin, yPos);
        yPos += 6;

        const subHeaders = ["Joueur", "Position", "Minutes"];
        const subColWidths = [80, 50, 50];
        yPos = drawTableHeaderPdf(pdf, subHeaders, subColWidths, yPos, margin, contentWidth);

        subs.forEach((p, index) => {
          yPos = drawTableRowPdf(pdf, [
            p.players?.name || 'Inconnu',
            p.position || p.players?.position || '-',
            `${p.minutes_played || 0} min`
          ], subColWidths, yPos, index % 2 === 1, margin, contentWidth);
        });
      }

      // Player Stats if available
      const playerStats = statsRes.data || [];
      if (playerStats.length > 0) {
        yPos += 10;
        if (yPos > 230) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text("STATISTIQUES JOUEURS", margin, yPos);
        yPos += 8;

        const statHeaders = ["Joueur", "Essais", "Plaq.", "Portés", "Franchis."];
        const statColWidths = [55, 25, 30, 35, 35];
        yPos = drawTableHeaderPdf(pdf, statHeaders, statColWidths, yPos, margin, contentWidth);

        playerStats.forEach((stat, index) => {
          yPos = drawTableRowPdf(pdf, [
            stat.players?.name || 'Inconnu',
            String(stat.tries || 0),
            String(stat.tackles || 0),
            String(stat.carries || 0),
            String(stat.breakthroughs || 0)
          ], statColWidths, yPos, index % 2 === 1, margin, contentWidth, [
            null,
            stat.tries && stat.tries > 0 ? colors.success : null,
            null,
            null,
            stat.breakthroughs && stat.breakthroughs > 0 ? colors.success : null
          ]);
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

  const generateSquadReport = async () => {
    setGeneratingReport("squad");
    
    try {
      // First get matches for this category
      const { data: categoryMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("category_id", categoryId);
      
      const matchIds = categoryMatches?.map(m => m.id) || [];

      // Fetch all squad data
      const [
        injuriesRes,
        wellnessRes,
        awcrRes,
        speedTestsRes,
        jumpTestsRes,
        matchLineupsRes,
        measurementsRes,
        bodyCompRes,
      ] = await Promise.all([
        supabase.from("injuries").select("*, players(name)").eq("category_id", categoryId),
        supabase.from("wellness_tracking").select("*, players(name)").eq("category_id", categoryId).order("tracking_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*, players(name)").eq("category_id", categoryId).order("session_date", { ascending: false }),
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

      // Helper colors (RGB)
      const colors = {
        primary: [41, 128, 185] as [number, number, number], // Blue
        success: [39, 174, 96] as [number, number, number],  // Green
        warning: [241, 196, 15] as [number, number, number], // Yellow
        danger: [231, 76, 60] as [number, number, number],   // Red
        muted: [149, 165, 166] as [number, number, number],  // Gray
        dark: [52, 73, 94] as [number, number, number],      // Dark
        light: [236, 240, 241] as [number, number, number],  // Light gray
        white: [255, 255, 255] as [number, number, number],
      };

      // Helper functions
      const checkPageBreak = (needed: number = 25) => {
        if (yPos + needed > 280) {
          pdf.addPage();
          yPos = 20;
        }
      };

      const drawColoredBox = (x: number, y: number, w: number, h: number, color: [number, number, number], text: string, textColor: [number, number, number] = colors.white) => {
        pdf.setFillColor(...color);
        pdf.roundedRect(x, y, w, h, 2, 2, 'F');
        pdf.setTextColor(...textColor);
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
          pdf.text(header, xPos, y + 5.5);
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
          pdf.text(value.substring(0, 20), xPos, y + 5);
          xPos += colWidths[i];
        });
        pdf.setFont("helvetica", "normal");
        return y + 7;
      };

      const getStatusColor = (value: number, thresholds: { good: number; warning: number }, inverse: boolean = false): [number, number, number] => {
        if (inverse) {
          if (value <= thresholds.good) return colors.success;
          if (value <= thresholds.warning) return colors.warning;
          return colors.danger;
        }
        if (value >= thresholds.good) return colors.success;
        if (value >= thresholds.warning) return colors.warning;
        return colors.danger;
      };

      // ========== PAGE 1: HEADER + EXECUTIVE SUMMARY ==========
      
      // Header with colored background
      pdf.setFillColor(...colors.primary);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("VUE D'ENSEMBLE DE L'EFFECTIF", margin, 20);
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${category?.clubs?.name} - ${category?.name}`, margin, 30);
      
      pdf.setFontSize(10);
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, margin, 38);
      
      yPos = 55;
      pdf.setTextColor(...colors.dark);

      // Calculate key metrics for executive summary
      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status === 'active');
      const recoveringInjuries = allInjuries.filter(i => i.status === 'recovering');

      const latestAwcrByPlayer: Record<string, typeof awcrRes.data[0]> = {};
      (awcrRes.data || []).forEach(a => {
        if (!latestAwcrByPlayer[a.player_id]) {
          latestAwcrByPlayer[a.player_id] = a;
        }
      });
      const awcrEntries = Object.values(latestAwcrByPlayer);
      const highAwcr = awcrEntries.filter(a => (a.awcr || 0) > 1.5).length;
      const optimalAwcr = awcrEntries.filter(a => (a.awcr || 0) >= 0.8 && (a.awcr || 0) <= 1.5).length;

      const latestWellnessByPlayer: Record<string, typeof wellnessRes.data[0]> = {};
      (wellnessRes.data || []).forEach(w => {
        if (!latestWellnessByPlayer[w.player_id]) {
          latestWellnessByPlayer[w.player_id] = w;
        }
      });
      const wellnessEntries = Object.values(latestWellnessByPlayer);
      const playersWithPain = wellnessEntries.filter(w => w.has_specific_pain).length;

      // EXECUTIVE SUMMARY - KPI Cards
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("RÉSUMÉ EXÉCUTIF", margin, yPos);
      yPos += 10;

      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 25;
      const cardY = yPos;

      // Card 1: Total Players
      pdf.setFillColor(...colors.primary);
      pdf.roundedRect(margin, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(players.length), margin + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("JOUEURS", margin + cardWidth / 2 - 10, cardY + 20);

      // Card 2: Active Injuries (red if any)
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

      // Card 3: High AWCR (warning if any)
      const awcrColor = highAwcr > 0 ? colors.warning : colors.success;
      pdf.setFillColor(...awcrColor);
      pdf.roundedRect(margin + (cardWidth + 5) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(highAwcr), margin + (cardWidth + 5) * 2 + cardWidth / 2 - 5, cardY + 12);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("AWCR ÉLEVÉ", margin + (cardWidth + 5) * 2 + cardWidth / 2 - 13, cardY + 20);

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

      // Status indicators legend
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);
      pdf.text("Légende: ", margin, yPos);
      
      drawColoredBox(margin + 20, yPos - 4, 8, 6, colors.success, "");
      pdf.setTextColor(...colors.dark);
      pdf.text("Bon", margin + 30, yPos);
      
      drawColoredBox(margin + 45, yPos - 4, 8, 6, colors.warning, "");
      pdf.setTextColor(...colors.dark);
      pdf.text("Attention", margin + 55, yPos);
      
      drawColoredBox(margin + 80, yPos - 4, 8, 6, colors.danger, "");
      pdf.setTextColor(...colors.dark);
      pdf.text("Critique", margin + 90, yPos);
      
      yPos += 15;

      // ========== SECTION: INJURIES OVERVIEW ==========
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("BILAN MÉDICAL", margin, yPos);
      yPos += 8;

      // Injury status boxes
      const statusBoxWidth = (contentWidth - 10) / 3;
      
      drawColoredBox(margin, yPos, statusBoxWidth, 15, colors.danger, `${activeInjuries.length} Actives`);
      drawColoredBox(margin + statusBoxWidth + 5, yPos, statusBoxWidth, 15, colors.warning, `${recoveringInjuries.length} Réathlétisation`);
      drawColoredBox(margin + (statusBoxWidth + 5) * 2, yPos, statusBoxWidth, 15, colors.success, `${allInjuries.filter(i => i.status === 'healed').length} Guéries`);
      
      yPos += 22;

      // Injury types table
      const injuryTypes: Record<string, number> = {};
      allInjuries.forEach(i => {
        injuryTypes[i.injury_type] = (injuryTypes[i.injury_type] || 0) + 1;
      });
      
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
      lineups.forEach(l => {
        if (!matchesByPlayer[l.player_id]) {
          matchesByPlayer[l.player_id] = { matches: 0, minutes: 0 };
        }
        matchesByPlayer[l.player_id].matches += 1;
        matchesByPlayer[l.player_id].minutes += l.minutes_played || 0;
      });

      const sprintTests = (speedTestsRes.data || []).filter(t => t.test_type === '40m' && t.time_40m_seconds);
      const bestSprintByPlayer: Record<string, number> = {};
      sprintTests.forEach(t => {
        if (!bestSprintByPlayer[t.player_id] || t.time_40m_seconds! < bestSprintByPlayer[t.player_id]) {
          bestSprintByPlayer[t.player_id] = t.time_40m_seconds!;
        }
      });

      const cmjTests = (jumpTestsRes.data || []).filter(t => t.test_type === 'CMJ');
      const bestCmjByPlayer: Record<string, number> = {};
      cmjTests.forEach(t => {
        if (!bestCmjByPlayer[t.player_id] || t.result_cm > bestCmjByPlayer[t.player_id]) {
          bestCmjByPlayer[t.player_id] = t.result_cm;
        }
      });

      const latestMeasurementsByPlayer: Record<string, typeof measurementsRes.data[0]> = {};
      (measurementsRes.data || []).forEach(m => {
        if (!latestMeasurementsByPlayer[m.player_id]) {
          latestMeasurementsByPlayer[m.player_id] = m;
        }
      });

      // Comparative table
      const compHeaders = ["Joueur", "Pos.", "Bless.", "AWCR", "40m", "CMJ", "Matchs", "Min."];
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
          player.name,
          player.position || '-',
          String(playerInjuries),
          playerAwcr ? playerAwcr.toFixed(2) : '-',
          playerSprint ? `${playerSprint.toFixed(2)}s` : '-',
          playerCmj ? `${playerCmj}cm` : '-',
          playerMatches ? String(playerMatches.matches) : '0',
          playerMatches ? String(playerMatches.minutes) : '0',
        ];

        // Color coding for specific columns
        const rowColors: ([number, number, number] | null)[] = [
          null, // name
          null, // position
          playerInjuries > 0 ? colors.danger : null, // injuries
          playerAwcr ? (playerAwcr > 1.5 ? colors.danger : playerAwcr < 0.8 ? colors.warning : colors.success) : null, // AWCR
          playerSprint ? (playerSprint < 5.2 ? colors.success : playerSprint > 5.8 ? colors.danger : null) : null, // 40m
          playerCmj ? (playerCmj > 40 ? colors.success : playerCmj < 30 ? colors.danger : null) : null, // CMJ
          null,
          null,
        ];

        yPos = drawTableRow(values, compColWidths, yPos, index % 2 === 1, rowColors);
      });

      yPos += 15;

      // ========== SECTION: PHYSICAL STATS SUMMARY ==========
      checkPageBreak(60);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("STATISTIQUES PHYSIQUES", margin, yPos);
      yPos += 10;

      // Speed stats
      const sprintTimes = Object.values(bestSprintByPlayer);
      const cmjHeights = Object.values(bestCmjByPlayer);
      
      if (sprintTimes.length > 0 || cmjHeights.length > 0) {
        const statBoxWidth = (contentWidth - 5) / 2;
        
        if (sprintTimes.length > 0) {
          const avgSprint = sprintTimes.reduce((a, b) => a + b, 0) / sprintTimes.length;
          const bestSprint = Math.min(...sprintTimes);
          
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin, yPos, statBoxWidth, 25, 2, 2, 'F');
          pdf.setTextColor(...colors.dark);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("SPRINT 40M", margin + 5, yPos + 8);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(`Moyenne: ${avgSprint.toFixed(2)}s | Meilleur: ${bestSprint.toFixed(2)}s`, margin + 5, yPos + 18);
          pdf.text(`${sprintTimes.length} joueurs testés`, margin + statBoxWidth - 35, yPos + 18);
        }
        
        if (cmjHeights.length > 0) {
          const avgCmj = cmjHeights.reduce((a, b) => a + b, 0) / cmjHeights.length;
          const maxCmj = Math.max(...cmjHeights);
          
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin + statBoxWidth + 5, yPos, statBoxWidth, 25, 2, 2, 'F');
          pdf.setTextColor(...colors.dark);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("DÉTENTE CMJ", margin + statBoxWidth + 10, yPos + 8);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(`Moyenne: ${avgCmj.toFixed(1)}cm | Max: ${maxCmj.toFixed(1)}cm`, margin + statBoxWidth + 10, yPos + 18);
          pdf.text(`${cmjHeights.length} joueurs testés`, margin + statBoxWidth * 2 - 30, yPos + 18);
        }
        yPos += 30;
      }

      // AWCR Distribution
      checkPageBreak(40);
      if (awcrEntries.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text("Distribution AWCR:", margin, yPos);
        yPos += 8;

        const lowAwcr = awcrEntries.filter(a => (a.awcr || 0) < 0.8).length;
        const barWidth = contentWidth / 3 - 5;
        
        // Low zone bar
        pdf.setFillColor(...colors.warning);
        pdf.roundedRect(margin, yPos, barWidth, 12, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(9);
        pdf.text(`< 0.8: ${lowAwcr} joueurs`, margin + 5, yPos + 8);
        
        // Optimal zone bar
        pdf.setFillColor(...colors.success);
        pdf.roundedRect(margin + barWidth + 5, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`0.8-1.5: ${optimalAwcr} joueurs`, margin + barWidth + 10, yPos + 8);
        
        // High zone bar
        pdf.setFillColor(...colors.danger);
        pdf.roundedRect(margin + (barWidth + 5) * 2, yPos, barWidth, 12, 2, 2, 'F');
        pdf.text(`> 1.5: ${highAwcr} joueurs`, margin + (barWidth + 5) * 2 + 5, yPos + 8);
        
        yPos += 20;
      }

      // Biometrics summary
      checkPageBreak(30);
      const measurements = Object.values(latestMeasurementsByPlayer);
      if (measurements.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text("Données biométriques moyennes:", margin, yPos);
        yPos += 8;

        const heights = measurements.filter(m => m.height_cm).map(m => Number(m.height_cm));
        const weights = measurements.filter(m => m.weight_kg).map(m => Number(m.weight_kg));
        
        pdf.setFillColor(...colors.light);
        pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        
        let bioText = "";
        if (heights.length > 0) {
          bioText += `Taille: ${(heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1)} cm`;
        }
        if (weights.length > 0) {
          if (bioText) bioText += "  |  ";
          bioText += `Poids: ${(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)} kg`;
        }
        pdf.text(bioText, margin + 5, yPos + 10);
        yPos += 20;
      }

      // ========== SECTION: PLAYING TIME ==========
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
      } else {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text("Aucune donnée de temps de jeu disponible", margin, yPos);
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

  // CSV Export functions
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

      // Filter match lineups by category's matches
      const categoryMatchIds = matches.map(m => m.id);
      const filteredLineups = (matchLineupsRes.data || []).filter(l => categoryMatchIds.includes(l.match_id));

      // Build player summary CSV
      const headers = ["Nom", "Position", "Blessures actives", "Fatigue", "Dernier AWCR", "Matchs joués", "Minutes jouées"];
      const rows = players.map(player => {
        const playerInjuries = (injuriesRes.data || []).filter(i => i.player_id === player.id && i.status !== 'healed').length;
        const playerWellness = (wellnessRes.data || []).find(w => w.player_id === player.id);
        const playerAwcr = (awcrRes.data || []).find(a => a.player_id === player.id);
        const playerLineups = filteredLineups.filter(l => l.player_id === player.id);
        const totalMinutes = playerLineups.reduce((sum, l) => sum + (l.minutes_played || 0), 0);
        
        return [
          player.name,
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

      // Build comprehensive player CSV (wellness history)
      const wellnessHeaders = ["Date", "Fatigue", "Sommeil (h)", "Qualité sommeil", "Stress", "Douleurs haut", "Douleurs bas"];
      const wellnessRows = (wellnessRes.data || []).map(w => [
        format(new Date(w.tracking_date), "dd/MM/yyyy"),
        w.general_fatigue || "-",
        w.sleep_duration || "-",
        w.sleep_quality || "-",
        w.stress_level || "-",
        w.soreness_upper_body || "-",
        w.soreness_lower_body || "-",
      ]);

      const csv = generateCsv(wellnessHeaders, wellnessRows);
      downloadCsv(`joueur_${player.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
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

  // Attendance Report Functions
  const generateAttendanceReport = async () => {
    setGeneratingReport("attendance");
    
    try {
      // Fetch attendance data
      const [sessionsRes, attendanceRes] = await Promise.all([
        supabase.from("training_sessions").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
        supabase.from("training_attendance").select("*").eq("category_id", categoryId),
      ]);

      const sessionsData = sessionsRes.data || [];
      const attendanceData = attendanceRes.data || [];

      // Calculate stats per player
      const playerStats = players.map((player) => {
        const playerAttendance = attendanceData.filter((a) => a.player_id === player.id);
        const present = playerAttendance.filter((a) => a.status === "present").length;
        const late = playerAttendance.filter((a) => a.status === "late").length;
        const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
        const absent = playerAttendance.filter((a) => a.status === "absent").length;
        const excused = playerAttendance.filter((a) => a.status === "excused").length;
        const total = playerAttendance.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          ...player,
          present,
          late,
          lateJustified,
          lateUnjustified: late - lateJustified,
          absent,
          excused,
          total,
          rate,
        };
      }).sort((a, b) => b.rate - a.rate);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Header
      let yPos = drawPdfHeader(
        pdf,
        "RAPPORT DE PRÉSENCES",
        `${category?.clubs?.name} - ${category?.name}`,
        `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`
      );

      // Calculate overall stats
      const totalSessions = sessionsData.length;
      const avgRate = playerStats.length
        ? Math.round(playerStats.reduce((acc, p) => acc + p.rate, 0) / playerStats.length)
        : 0;
      const totalLate = playerStats.reduce((acc, p) => acc + p.late, 0);
      const totalAbsent = playerStats.reduce((acc, p) => acc + p.absent, 0);

      // KPI Cards
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 22;

      drawKpiCard(pdf, margin, yPos, cardWidth, cardHeight, String(totalSessions), "SÉANCES", colors.primary);
      drawKpiCard(pdf, margin + cardWidth + 5, yPos, cardWidth, cardHeight, `${avgRate}%`, "TAUX MOYEN", avgRate >= 80 ? colors.success : avgRate >= 60 ? colors.warning : colors.danger);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, String(totalLate), "RETARDS", totalLate > 10 ? colors.warning : colors.success);
      drawKpiCard(pdf, margin + (cardWidth + 5) * 3, yPos, cardWidth, cardHeight, String(totalAbsent), "ABSENCES", totalAbsent > 10 ? colors.danger : colors.success);

      yPos += cardHeight + 15;

      // Player attendance table
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("PRÉSENCES PAR JOUEUR", margin, yPos);
      yPos += 8;

      const attendHeaders = ["Joueur", "Présent", "Retard", "Excusé", "Absent", "Taux"];
      const attendColWidths = [60, 25, 25, 25, 25, 25];
      yPos = drawTableHeaderPdf(pdf, attendHeaders, attendColWidths, yPos, margin, contentWidth);

      const checkPageBreak = (needed: number = 10) => {
        if (yPos + needed > 280) {
          pdf.addPage();
          yPos = 20;
        }
      };

      playerStats.forEach((player, index) => {
        checkPageBreak(10);
        const rateColor = player.rate >= 80 ? colors.success : player.rate >= 60 ? colors.warning : colors.danger;
        yPos = drawTableRowPdf(
          pdf,
          [
            player.name,
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
          [null, colors.success, colors.warning, null, colors.danger, rateColor]
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

      // Calculate stats per player
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
          name: player.name,
          position: player.position || "",
          present,
          late,
          lateJustified,
          lateUnjustified: late - lateJustified,
          absent,
          excused,
          total,
          rate,
        };
      }).sort((a, b) => b.rate - a.rate);

      const headers = ["Joueur", "Position", "Présent", "Retard justifié", "Retard non justifié", "Excusé", "Absent", "Total", "Taux (%)"];
      const rows = playerStats.map((p) => [
        p.name,
        p.position,
        p.present,
        p.lateJustified,
        p.lateUnjustified,
        p.excused,
        p.absent,
        p.total,
        p.rate,
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
              Synthèse globale de l'équipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-1">
              <p className="font-medium">{players.length} joueurs</p>
              <p className="text-muted-foreground text-xs">
                Blessures, wellness, tests physiques, temps de jeu...
              </p>
            </div>
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
              Profil complet avec stats, tests et blessures
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
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Stats et composition d'un match
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
            <p className="text-sm text-muted-foreground">
              {players.length} joueurs suivis
            </p>
            <p className="text-sm">
              Présences, retards justifiés/non-justifiés, absences...
            </p>
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