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
        supabase.from("wellness_tracking").select("*").eq("category_id", categoryId).order("tracking_date", { ascending: false }),
        supabase.from("awcr_tracking").select("*").eq("category_id", categoryId).order("session_date", { ascending: false }),
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

      // Helper to add new page if needed
      const checkPageBreak = (needed: number = 25) => {
        if (yPos + needed > 280) {
          pdf.addPage();
          yPos = 20;
        }
      };

      // Header
      pdf.setFontSize(20);
      pdf.text("Vue d'Ensemble de l'Effectif", 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text(`${category?.clubs?.name} - ${category?.name}`, 20, yPos);
      yPos += 5;
      pdf.text(`Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
      yPos += 15;
      pdf.setTextColor(0);

      // 1. Composition de l'effectif
      pdf.setFontSize(16);
      pdf.text("1. Composition de l'effectif", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      pdf.text(`Nombre total de joueurs: ${players.length}`, 25, yPos);
      yPos += 6;

      // Position distribution
      const positionGroups: Record<string, number> = {};
      players.forEach(p => {
        const pos = p.position || "Non défini";
        positionGroups[pos] = (positionGroups[pos] || 0) + 1;
      });
      
      pdf.text("Répartition par poste:", 25, yPos);
      yPos += 6;
      Object.entries(positionGroups).forEach(([pos, count]) => {
        pdf.text(`  • ${pos}: ${count} joueur${count > 1 ? 's' : ''}`, 25, yPos);
        yPos += 5;
      });
      yPos += 8;

      // 2. Bilan médical / Blessures
      checkPageBreak(40);
      pdf.setFontSize(16);
      pdf.text("2. Bilan Médical", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      const allInjuries = injuriesRes.data || [];
      const activeInjuries = allInjuries.filter(i => i.status === 'active');
      const recoveringInjuries = allInjuries.filter(i => i.status === 'recovering');
      const healedInjuries = allInjuries.filter(i => i.status === 'healed');

      pdf.text(`Blessures actives: ${activeInjuries.length}`, 25, yPos);
      yPos += 6;
      pdf.text(`En réathlétisation: ${recoveringInjuries.length}`, 25, yPos);
      yPos += 6;
      pdf.text(`Guéries (historique): ${healedInjuries.length}`, 25, yPos);
      yPos += 8;

      // Injury type distribution
      const injuryTypes: Record<string, number> = {};
      allInjuries.forEach(i => {
        injuryTypes[i.injury_type] = (injuryTypes[i.injury_type] || 0) + 1;
      });
      
      if (Object.keys(injuryTypes).length > 0) {
        pdf.text("Types de blessures les plus fréquents:", 25, yPos);
        yPos += 6;
        Object.entries(injuryTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([type, count]) => {
            pdf.text(`  • ${type}: ${count}`, 25, yPos);
            yPos += 5;
          });
        yPos += 5;
      }

      // Players with most injuries
      const injuriesByPlayer: Record<string, number> = {};
      allInjuries.forEach(i => {
        const name = i.players?.name || 'Inconnu';
        injuriesByPlayer[name] = (injuriesByPlayer[name] || 0) + 1;
      });
      
      const frequentlyInjured = Object.entries(injuriesByPlayer)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]);
      
      if (frequentlyInjured.length > 0) {
        pdf.text("Joueurs les plus touchés (≥2 blessures):", 25, yPos);
        yPos += 6;
        frequentlyInjured.slice(0, 5).forEach(([name, count]) => {
          pdf.text(`  • ${name}: ${count} blessures`, 25, yPos);
          yPos += 5;
        });
      }
      yPos += 8;

      // 3. État physique / Wellness
      checkPageBreak(50);
      pdf.setFontSize(16);
      pdf.text("3. État Physique Global", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      // Latest wellness by player
      const latestWellnessByPlayer: Record<string, typeof wellnessRes.data[0]> = {};
      (wellnessRes.data || []).forEach(w => {
        if (!latestWellnessByPlayer[w.player_id]) {
          latestWellnessByPlayer[w.player_id] = w;
        }
      });

      const wellnessEntries = Object.values(latestWellnessByPlayer);
      if (wellnessEntries.length > 0) {
        const avgSleepQuality = wellnessEntries.reduce((sum, w) => sum + w.sleep_quality, 0) / wellnessEntries.length;
        const avgFatigue = wellnessEntries.reduce((sum, w) => sum + w.general_fatigue, 0) / wellnessEntries.length;
        const avgStress = wellnessEntries.reduce((sum, w) => sum + w.stress_level, 0) / wellnessEntries.length;
        const avgSorenessUpper = wellnessEntries.reduce((sum, w) => sum + w.soreness_upper_body, 0) / wellnessEntries.length;
        const avgSorenessLower = wellnessEntries.reduce((sum, w) => sum + w.soreness_lower_body, 0) / wellnessEntries.length;

        pdf.text(`Qualité de sommeil moyenne: ${avgSleepQuality.toFixed(1)}/5`, 25, yPos);
        yPos += 6;
        pdf.text(`Fatigue générale moyenne: ${avgFatigue.toFixed(1)}/5`, 25, yPos);
        yPos += 6;
        pdf.text(`Niveau de stress moyen: ${avgStress.toFixed(1)}/5`, 25, yPos);
        yPos += 6;
        pdf.text(`Courbatures haut du corps: ${avgSorenessUpper.toFixed(1)}/5`, 25, yPos);
        yPos += 6;
        pdf.text(`Courbatures bas du corps: ${avgSorenessLower.toFixed(1)}/5`, 25, yPos);
        yPos += 6;

        // Players with pain
        const playersWithPain = wellnessEntries.filter(w => w.has_specific_pain);
        pdf.text(`Joueurs signalant une douleur: ${playersWithPain.length}/${wellnessEntries.length}`, 25, yPos);
      } else {
        pdf.text("Aucune donnée de wellness disponible", 25, yPos);
      }
      yPos += 10;

      // AWCR data
      const latestAwcrByPlayer: Record<string, typeof awcrRes.data[0]> = {};
      (awcrRes.data || []).forEach(a => {
        if (!latestAwcrByPlayer[a.player_id]) {
          latestAwcrByPlayer[a.player_id] = a;
        }
      });

      const awcrEntries = Object.values(latestAwcrByPlayer);
      if (awcrEntries.length > 0) {
        const avgAwcr = awcrEntries.filter(a => a.awcr).reduce((sum, a) => sum + (a.awcr || 0), 0) / awcrEntries.filter(a => a.awcr).length;
        const highAwcr = awcrEntries.filter(a => (a.awcr || 0) > 1.5).length;
        const lowAwcr = awcrEntries.filter(a => (a.awcr || 0) < 0.8).length;
        const optimalAwcr = awcrEntries.filter(a => (a.awcr || 0) >= 0.8 && (a.awcr || 0) <= 1.5).length;

        pdf.text(`AWCR moyen: ${avgAwcr.toFixed(2)}`, 25, yPos);
        yPos += 6;
        pdf.text(`Zone optimale (0.8-1.5): ${optimalAwcr} joueurs`, 25, yPos);
        yPos += 6;
        pdf.text(`Zone haute (>1.5): ${highAwcr} joueurs (risque blessure)`, 25, yPos);
        yPos += 6;
        pdf.text(`Zone basse (<0.8): ${lowAwcr} joueurs (désentraînement)`, 25, yPos);
      }
      yPos += 10;

      // 4. Tests Physiques
      checkPageBreak(60);
      pdf.setFontSize(16);
      pdf.text("4. Tests Physiques", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      // Speed tests - 40m
      const sprintTests = (speedTestsRes.data || []).filter(t => t.test_type === '40m' && t.time_40m_seconds);
      if (sprintTests.length > 0) {
        // Best per player
        const bestSprintByPlayer: Record<string, number> = {};
        sprintTests.forEach(t => {
          const playerId = t.player_id;
          if (!bestSprintByPlayer[playerId] || t.time_40m_seconds! < bestSprintByPlayer[playerId]) {
            bestSprintByPlayer[playerId] = t.time_40m_seconds!;
          }
        });
        
        const times = Object.values(bestSprintByPlayer);
        const avgSprint = times.reduce((a, b) => a + b, 0) / times.length;
        const bestSprint = Math.min(...times);
        
        pdf.text(`Sprint 40m (${times.length} joueurs testés):`, 25, yPos);
        yPos += 6;
        pdf.text(`  • Moyenne: ${avgSprint.toFixed(2)}s`, 25, yPos);
        yPos += 5;
        pdf.text(`  • Meilleur temps: ${bestSprint.toFixed(2)}s`, 25, yPos);
        yPos += 8;
      }

      // VMA tests
      const vmaTests = (speedTestsRes.data || []).filter(t => t.test_type === '1600m' && t.vma_kmh);
      if (vmaTests.length > 0) {
        const latestVmaByPlayer: Record<string, number> = {};
        vmaTests.forEach(t => {
          if (!latestVmaByPlayer[t.player_id]) {
            latestVmaByPlayer[t.player_id] = t.vma_kmh!;
          }
        });
        
        const vmas = Object.values(latestVmaByPlayer);
        const avgVma = vmas.reduce((a, b) => a + b, 0) / vmas.length;
        const maxVma = Math.max(...vmas);
        
        pdf.text(`VMA (${vmas.length} joueurs testés):`, 25, yPos);
        yPos += 6;
        pdf.text(`  • Moyenne: ${avgVma.toFixed(1)} km/h`, 25, yPos);
        yPos += 5;
        pdf.text(`  • Maximum: ${maxVma.toFixed(1)} km/h`, 25, yPos);
        yPos += 8;
      }

      // Jump tests
      const jumpData = jumpTestsRes.data || [];
      const cmjTests = jumpData.filter(t => t.test_type === 'CMJ');
      const sqjTests = jumpData.filter(t => t.test_type === 'SQJ');

      if (cmjTests.length > 0) {
        const bestCmjByPlayer: Record<string, number> = {};
        cmjTests.forEach(t => {
          if (!bestCmjByPlayer[t.player_id] || t.result_cm > bestCmjByPlayer[t.player_id]) {
            bestCmjByPlayer[t.player_id] = t.result_cm;
          }
        });
        
        const heights = Object.values(bestCmjByPlayer);
        const avgCmj = heights.reduce((a, b) => a + b, 0) / heights.length;
        const maxCmj = Math.max(...heights);
        
        pdf.text(`Détente verticale CMJ (${heights.length} joueurs):`, 25, yPos);
        yPos += 6;
        pdf.text(`  • Moyenne: ${avgCmj.toFixed(1)} cm`, 25, yPos);
        yPos += 5;
        pdf.text(`  • Maximum: ${maxCmj.toFixed(1)} cm`, 25, yPos);
        yPos += 8;
      }

      // 5. Temps de jeu
      checkPageBreak(40);
      pdf.setFontSize(16);
      pdf.text("5. Temps de Jeu", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      const lineups = matchLineupsRes.data || [];
      const matchesByPlayer: Record<string, { matches: number; minutes: number; name: string }> = {};
      
      lineups.forEach(l => {
        if (!matchesByPlayer[l.player_id]) {
          matchesByPlayer[l.player_id] = { matches: 0, minutes: 0, name: l.players?.name || 'Inconnu' };
        }
        matchesByPlayer[l.player_id].matches += 1;
        matchesByPlayer[l.player_id].minutes += l.minutes_played || 0;
      });

      const playerStats = Object.values(matchesByPlayer);
      if (playerStats.length > 0) {
        const avgMatches = playerStats.reduce((sum, p) => sum + p.matches, 0) / playerStats.length;
        const avgMinutes = playerStats.reduce((sum, p) => sum + p.minutes, 0) / playerStats.length;
        
        pdf.text(`Matchs joués (moyenne): ${avgMatches.toFixed(1)} par joueur`, 25, yPos);
        yPos += 6;
        pdf.text(`Minutes jouées (moyenne): ${avgMinutes.toFixed(0)} par joueur`, 25, yPos);
        yPos += 8;

        // Top 5 time on field
        const sortedByMinutes = [...playerStats].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
        if (sortedByMinutes.length > 0) {
          pdf.text("Top 5 temps de jeu:", 25, yPos);
          yPos += 6;
          sortedByMinutes.forEach((p, i) => {
            pdf.text(`  ${i + 1}. ${p.name}: ${p.minutes} min (${p.matches} matchs)`, 25, yPos);
            yPos += 5;
          });
        }
      } else {
        pdf.text("Aucune donnée de temps de jeu disponible", 25, yPos);
      }
      yPos += 10;

      // 6. Données biométriques
      checkPageBreak(40);
      pdf.setFontSize(16);
      pdf.text("6. Données Biométriques", 20, yPos);
      yPos += 10;
      pdf.setFontSize(11);

      // Latest measurements by player
      const latestMeasurementsByPlayer: Record<string, typeof measurementsRes.data[0]> = {};
      (measurementsRes.data || []).forEach(m => {
        if (!latestMeasurementsByPlayer[m.player_id]) {
          latestMeasurementsByPlayer[m.player_id] = m;
        }
      });

      const measurements = Object.values(latestMeasurementsByPlayer);
      if (measurements.length > 0) {
        const heights = measurements.filter(m => m.height_cm).map(m => Number(m.height_cm));
        const weights = measurements.filter(m => m.weight_kg).map(m => Number(m.weight_kg));
        
        if (heights.length > 0) {
          const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
          pdf.text(`Taille moyenne: ${avgHeight.toFixed(1)} cm`, 25, yPos);
          yPos += 6;
        }
        
        if (weights.length > 0) {
          const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
          pdf.text(`Poids moyen: ${avgWeight.toFixed(1)} kg`, 25, yPos);
          yPos += 6;
        }
      }

      // Body composition
      const latestBodyCompByPlayer: Record<string, typeof bodyCompRes.data[0]> = {};
      (bodyCompRes.data || []).forEach(b => {
        if (!latestBodyCompByPlayer[b.player_id]) {
          latestBodyCompByPlayer[b.player_id] = b;
        }
      });

      const bodyCompEntries = Object.values(latestBodyCompByPlayer);
      if (bodyCompEntries.length > 0) {
        const bodyFats = bodyCompEntries.filter(b => b.body_fat_percentage).map(b => Number(b.body_fat_percentage));
        const muscleMasses = bodyCompEntries.filter(b => b.muscle_mass_kg).map(b => Number(b.muscle_mass_kg));
        
        if (bodyFats.length > 0) {
          const avgBodyFat = bodyFats.reduce((a, b) => a + b, 0) / bodyFats.length;
          pdf.text(`Masse grasse moyenne: ${avgBodyFat.toFixed(1)}%`, 25, yPos);
          yPos += 6;
        }
        
        if (muscleMasses.length > 0) {
          const avgMuscleMass = muscleMasses.reduce((a, b) => a + b, 0) / muscleMasses.length;
          pdf.text(`Masse musculaire moyenne: ${avgMuscleMass.toFixed(1)} kg`, 25, yPos);
        }
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