import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Activity, Heart, AlertTriangle, Battery, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface AvailabilityScoreTabProps {
  categoryId: string;
}

interface PlayerAvailability {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  position: string | null;
  awcrScore: number;
  wellnessScore: number;
  injuryScore: number;
  fatigueScore: number;
  overallScore: number;
  status: 'available' | 'limited' | 'unavailable';
  factors: string[];
}

export function AvailabilityScoreTab({ categoryId }: AvailabilityScoreTabProps) {
  const today = new Date();
  const weekAgo = subDays(today, 7);

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ["availability-scores", categoryId],
    queryFn: async () => {
      // Get all players
      const { data: players } = await supabase
        .from("players")
        .select("id, first_name, name, avatar_url, position")
        .eq("category_id", categoryId);

      if (!players) return [];

      // Get latest AWCR data
      const { data: awcrData } = await supabase
        .from("awcr_tracking")
        .select("player_id, awcr")
        .eq("category_id", categoryId)
        .gte("session_date", format(weekAgo, "yyyy-MM-dd"))
        .order("session_date", { ascending: false });

      // Get latest wellness data
      const { data: wellnessData } = await supabase
        .from("wellness_tracking")
        .select("player_id, sleep_quality, general_fatigue, stress_level, soreness_upper_body, soreness_lower_body")
        .eq("category_id", categoryId)
        .gte("tracking_date", format(weekAgo, "yyyy-MM-dd"))
        .order("tracking_date", { ascending: false });

      // Get active injuries
      const { data: injuries } = await supabase
        .from("injuries")
        .select("player_id, status, severity")
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"]);

      // Calculate availability for each player
      return players.map(player => {
        const playerAwcr = awcrData?.find(a => a.player_id === player.id);
        const playerWellness = wellnessData?.find(w => w.player_id === player.id);
        const playerInjury = injuries?.find(i => i.player_id === player.id);

        const factors: string[] = [];

        // AWCR Score (0-100)
        let awcrScore = 100;
        if (playerAwcr?.awcr) {
          const awcr = playerAwcr.awcr;
          if (awcr >= 0.8 && awcr <= 1.3) {
            awcrScore = 100;
          } else if (awcr < 0.8) {
            awcrScore = Math.max(0, 100 - (0.8 - awcr) * 150);
            factors.push(`AWCR faible (${awcr.toFixed(2)})`);
          } else {
            awcrScore = Math.max(0, 100 - (awcr - 1.3) * 80);
            factors.push(`AWCR élevé (${awcr.toFixed(2)})`);
          }
        }

        // Wellness Score (0-100)
        let wellnessScore = 100;
        if (playerWellness) {
          const sleepScore = (6 - playerWellness.sleep_quality) * 20;
          const fatigueScore = (6 - playerWellness.general_fatigue) * 20;
          const stressScore = (6 - playerWellness.stress_level) * 20;
          const sorenessScore = (12 - playerWellness.soreness_upper_body - playerWellness.soreness_lower_body) * 10;
          
          wellnessScore = Math.min(100, (sleepScore + fatigueScore + stressScore + sorenessScore) / 4);
          
          if (playerWellness.sleep_quality >= 4) factors.push("Sommeil insuffisant");
          if (playerWellness.general_fatigue >= 4) factors.push("Fatigue élevée");
          if (playerWellness.stress_level >= 4) factors.push("Stress élevé");
          if (playerWellness.soreness_upper_body >= 4 || playerWellness.soreness_lower_body >= 4) {
            factors.push("Douleurs musculaires");
          }
        }

        // Injury Score (0-100)
        let injuryScore = 100;
        if (playerInjury) {
          if (playerInjury.status === "active") {
            const sev = playerInjury.severity as string;
            injuryScore = (sev === "severe" || sev === "grave") ? 0 : (sev === "moderate" || sev === "modérée") ? 20 : 40;
            factors.push(`Blessure ${(sev === "severe" || sev === "grave") ? "grave" : (sev === "moderate" || sev === "modérée") ? "modérée" : "légère"}`);
          } else {
            injuryScore = 70;
            factors.push("En réathlétisation");
          }
        }

        // Fatigue Score (based on wellness)
        let fatigueScore = 100;
        if (playerWellness) {
          fatigueScore = Math.max(0, 100 - (playerWellness.general_fatigue - 1) * 25);
        }

        // Overall Score (weighted average)
        const overallScore = Math.round(
          (awcrScore * 0.25 + wellnessScore * 0.25 + injuryScore * 0.35 + fatigueScore * 0.15)
        );

        // Determine status
        let status: 'available' | 'limited' | 'unavailable' = 'available';
        if (overallScore < 50 || injuryScore === 0) {
          status = 'unavailable';
        } else if (overallScore < 75) {
          status = 'limited';
        }

        return {
          playerId: player.id,
          playerName: player.first_name ? `${player.first_name} ${player.name}` : player.name,
          avatarUrl: player.avatar_url,
          position: player.position,
          awcrScore: Math.round(awcrScore),
          wellnessScore: Math.round(wellnessScore),
          injuryScore: Math.round(injuryScore),
          fatigueScore: Math.round(fatigueScore),
          overallScore,
          status,
          factors
        } as PlayerAvailability;
      }).sort((a, b) => b.overallScore - a.overallScore);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Disponible</Badge>;
      case 'limited':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Limité</Badge>;
      case 'unavailable':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Indisponible</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="bg-gradient-card">
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = {
    available: availabilityData?.filter(p => p.status === 'available').length || 0,
    limited: availabilityData?.filter(p => p.status === 'limited').length || 0,
    unavailable: availabilityData?.filter(p => p.status === 'unavailable').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card border-green-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{stats.limited}</p>
              <p className="text-sm text-muted-foreground">Disponibilité limitée</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.unavailable}</p>
              <p className="text-sm text-muted-foreground">Indisponibles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Cards */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Score de Disponibilité
          </CardTitle>
          <CardDescription>
            Score global combinant AWCR, wellness, blessures et fatigue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availabilityData?.map(player => (
              <Card key={player.playerId} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={player.avatarUrl || undefined} />
                      <AvatarFallback>{player.playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.playerName}</p>
                      <p className="text-sm text-muted-foreground">{player.position || "Position non définie"}</p>
                    </div>
                    {getStatusBadge(player.status)}
                  </div>

                  {/* Overall Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Score Global</span>
                      <span className={`text-lg font-bold ${
                        player.overallScore >= 80 ? 'text-green-400' :
                        player.overallScore >= 60 ? 'text-yellow-400' :
                        player.overallScore >= 40 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {player.overallScore}%
                      </span>
                    </div>
                    <Progress value={player.overallScore} className={getScoreColor(player.overallScore)} />
                  </div>

                  {/* Sub-scores */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span>AWCR: {player.awcrScore}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-400" />
                      <span>Wellness: {player.wellnessScore}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <span>Blessure: {player.injuryScore}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-green-400" />
                      <span>Fatigue: {player.fatigueScore}%</span>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {player.factors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Facteurs de risque:</p>
                      <div className="flex flex-wrap gap-1">
                        {player.factors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
