import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, User, Calendar, Trophy, Loader2 } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Rapports PDF</h2>
        <p className="text-muted-foreground">Générez et exportez des rapports détaillés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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