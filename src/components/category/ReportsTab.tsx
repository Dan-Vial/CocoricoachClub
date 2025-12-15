import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, User, Calendar, Trophy, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

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
      const [measurementsRes, injuriesRes, wellnessRes, speedTestsRes, jumpTestsRes] = await Promise.all([
        supabase.from("player_measurements").select("*").eq("player_id", selectedPlayer).order("measurement_date", { ascending: false }).limit(1),
        supabase.from("injuries").select("*").eq("player_id", selectedPlayer),
        supabase.from("wellness_tracking").select("*").eq("player_id", selectedPlayer).order("tracking_date", { ascending: false }).limit(5),
        supabase.from("speed_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }).limit(3),
        supabase.from("jump_tests").select("*").eq("player_id", selectedPlayer).order("test_date", { ascending: false }).limit(3),
      ]);

      const pdf = new jsPDF();
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.text(`Fiche Joueur - ${player.name}`, 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`${category?.clubs?.name} - ${category?.name}`, 20, yPos);
      yPos += 5;
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
      yPos += 15;

      pdf.setTextColor(0);
      
      // Biometrics
      pdf.setFontSize(14);
      pdf.text("Biométrie", 20, yPos);
      yPos += 8;
      pdf.setFontSize(11);
      
      if (measurementsRes.data && measurementsRes.data.length > 0) {
        const m = measurementsRes.data[0];
        pdf.text(`Taille: ${m.height_cm || '-'} cm`, 25, yPos);
        yPos += 6;
        pdf.text(`Poids: ${m.weight_kg || '-'} kg`, 25, yPos);
        yPos += 6;
        pdf.text(`Date: ${format(new Date(m.measurement_date), "d MMM yyyy", { locale: fr })}`, 25, yPos);
      } else {
        pdf.text("Aucune mesure enregistrée", 25, yPos);
      }
      yPos += 12;

      // Injuries
      pdf.setFontSize(14);
      pdf.text("Blessures", 20, yPos);
      yPos += 8;
      pdf.setFontSize(11);
      
      const activeInjuries = injuriesRes.data?.filter(i => i.status !== 'healed') || [];
      if (activeInjuries.length > 0) {
        activeInjuries.forEach(injury => {
          pdf.text(`• ${injury.injury_type} (${injury.severity})`, 25, yPos);
          yPos += 6;
        });
      } else {
        pdf.text("Aucune blessure active", 25, yPos);
      }
      yPos += 12;

      // Speed Tests
      pdf.setFontSize(14);
      pdf.text("Tests de Vitesse (derniers)", 20, yPos);
      yPos += 8;
      pdf.setFontSize(11);
      
      if (speedTestsRes.data && speedTestsRes.data.length > 0) {
        speedTestsRes.data.forEach(test => {
          if (test.test_type === '40m') {
            pdf.text(`• 40m: ${test.time_40m_seconds}s (${format(new Date(test.test_date), "d MMM", { locale: fr })})`, 25, yPos);
          } else if (test.test_type === '1600m') {
            pdf.text(`• 1600m: ${test.time_1600m_minutes}:${test.time_1600m_seconds} - VMA ${test.vma_kmh} km/h`, 25, yPos);
          }
          yPos += 6;
        });
      } else {
        pdf.text("Aucun test enregistré", 25, yPos);
      }
      yPos += 12;

      // Jump Tests
      pdf.setFontSize(14);
      pdf.text("Tests de Saut (derniers)", 20, yPos);
      yPos += 8;
      pdf.setFontSize(11);
      
      if (jumpTestsRes.data && jumpTestsRes.data.length > 0) {
        jumpTestsRes.data.forEach(test => {
          pdf.text(`• ${test.test_type}: ${test.result_cm} cm (${format(new Date(test.test_date), "d MMM", { locale: fr })})`, 25, yPos);
          yPos += 6;
        });
      } else {
        pdf.text("Aucun test enregistré", 25, yPos);
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
      const [matchesRes, injuriesRes, goalsRes] = await Promise.all([
        supabase.from("matches").select("*").eq("category_id", categoryId).order("match_date"),
        supabase.from("injuries").select("*, players(name)").eq("category_id", categoryId),
        supabase.from("season_goals").select("*").eq("category_id", categoryId).eq("season_year", new Date().getFullYear()),
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

      const pdf = new jsPDF();
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.text(`Bilan de Saison ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text(`${category?.clubs?.name} - ${category?.name}`, 20, yPos);
      yPos += 5;
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
      yPos += 15;

      pdf.setTextColor(0);
      
      // Stats
      pdf.setFontSize(16);
      pdf.text("Statistiques Générales", 20, yPos);
      yPos += 10;
      pdf.setFontSize(12);
      pdf.text(`Effectif: ${players.length} joueurs`, 25, yPos);
      yPos += 7;
      pdf.text(`Matchs joués: ${matchesData.length}`, 25, yPos);
      yPos += 7;
      pdf.text(`Victoires: ${wins} | Nuls: ${draws} | Défaites: ${losses}`, 25, yPos);
      yPos += 7;
      pdf.text(`Blessures: ${injuriesRes.data?.length || 0} au total`, 25, yPos);
      yPos += 15;

      // Goals
      pdf.setFontSize(16);
      pdf.text("Objectifs de Saison", 20, yPos);
      yPos += 10;
      pdf.setFontSize(12);
      
      if (goalsRes.data && goalsRes.data.length > 0) {
        goalsRes.data.forEach(goal => {
          const status = goal.status === 'completed' ? '✓' : goal.status === 'in_progress' ? '→' : '○';
          pdf.text(`${status} ${goal.title} (${goal.progress_percentage || 0}%)`, 25, yPos);
          yPos += 7;
        });
      } else {
        pdf.text("Aucun objectif défini", 25, yPos);
      }
      yPos += 10;

      // Match results
      if (matchesData.length > 0) {
        pdf.setFontSize(16);
        pdf.text("Résultats des Matchs", 20, yPos);
        yPos += 10;
        pdf.setFontSize(11);
        
        matchesData.slice(0, 10).forEach(match => {
          const score = `${match.score_home || '-'} - ${match.score_away || '-'}`;
          const date = format(new Date(match.match_date), "d MMM", { locale: fr });
          pdf.text(`${date}: vs ${match.opponent} (${score})`, 25, yPos);
          yPos += 6;
        });
      }

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
        supabase.from("match_lineups").select("*, players(name)").eq("match_id", selectedMatch),
        supabase.from("player_match_stats").select("*, players(name)").eq("match_id", selectedMatch),
      ]);

      const pdf = new jsPDF();
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.text(`Rapport de Match`, 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(16);
      pdf.text(`vs ${match.opponent}`, 20, yPos);
      yPos += 8;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`${format(new Date(match.match_date), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
      yPos += 5;
      pdf.text(`${match.location || 'Lieu non défini'}`, 20, yPos);
      yPos += 15;

      pdf.setTextColor(0);
      
      // Score
      pdf.setFontSize(24);
      const score = `${match.score_home || '-'} - ${match.score_away || '-'}`;
      pdf.text(score, 20, yPos);
      yPos += 15;

      // Match Stats
      pdf.setFontSize(14);
      pdf.text("Statistiques du Match", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);
      pdf.text(`Temps de jeu effectif: ${match.effective_play_time || '-'} min`, 25, yPos);
      yPos += 6;
      pdf.text(`Séquence la plus longue: ${match.longest_play_sequence || '-'} sec`, 25, yPos);
      yPos += 6;
      pdf.text(`Séquence moyenne: ${match.average_play_sequence || '-'} sec`, 25, yPos);
      yPos += 12;

      // Lineup
      pdf.setFontSize(14);
      pdf.text("Composition", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);
      
      const starters = lineupsRes.data?.filter(l => l.is_starter) || [];
      const subs = lineupsRes.data?.filter(l => !l.is_starter) || [];
      
      if (starters.length > 0) {
        pdf.text("Titulaires:", 25, yPos);
        yPos += 6;
        starters.forEach(p => {
          pdf.text(`  • ${p.players?.name} (${p.minutes_played || 0} min)`, 25, yPos);
          yPos += 5;
        });
      }
      
      if (subs.length > 0) {
        yPos += 3;
        pdf.text("Remplaçants:", 25, yPos);
        yPos += 6;
        subs.forEach(p => {
          pdf.text(`  • ${p.players?.name} (${p.minutes_played || 0} min)`, 25, yPos);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Rapports PDF</h2>
        <p className="text-muted-foreground">Générez et exportez des rapports détaillés</p>
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
            <Button 
              onClick={generateSquadReport} 
              className="w-full"
              disabled={generatingReport === "squad"}
            >
              {generatingReport === "squad" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Générer le PDF
            </Button>
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
            <Button 
              onClick={generatePlayerReport} 
              className="w-full"
              disabled={!selectedPlayer || generatingReport === "player"}
            >
              {generatingReport === "player" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Générer le PDF
            </Button>
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
            <Button 
              onClick={generateSeasonReport} 
              className="w-full"
              disabled={generatingReport === "season"}
            >
              {generatingReport === "season" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Générer le PDF
            </Button>
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
            <Button 
              onClick={generateMatchReport} 
              className="w-full"
              disabled={!selectedMatch || generatingReport === "match"}
            >
              {generatingReport === "match" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Générer le PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}