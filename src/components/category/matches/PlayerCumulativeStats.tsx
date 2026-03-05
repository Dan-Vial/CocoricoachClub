import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Trophy, Target, Shield, Timer, Activity, Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatsForSport, getStatCategories, type StatField } from "@/lib/constants/sportStats";

interface PlayerCumulativeStatsProps {
  categoryId: string;
  sportType?: string;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
}

export function PlayerCumulativeStats({ categoryId, sportType = "XV" }: PlayerCumulativeStatsProps) {
  const sportStats = getStatsForSport(sportType);
  const statCategories = getStatCategories(sportType);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["cumulative_player_stats", categoryId, sportType],
    queryFn: async () => {
      // Get all matches for this category
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id")
        .eq("category_id", categoryId);
      
      if (matchesError) throw matchesError;
      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map(m => m.id);

      // Get all player stats for these matches
      const { data: playerStats, error: statsError } = await supabase
        .from("player_match_stats")
        .select(`
          *,
          players(id, name)
        `)
        .in("match_id", matchIds);

      if (statsError) throw statsError;
      if (!playerStats) return [];

      // Aggregate stats by player
      const aggregated: Record<string, CumulativeStats> = {};

      playerStats.forEach((stat) => {
        const player = stat.players as { id: string; name: string } | null;
        const playerId = stat.player_id;
        const playerName = player?.name || "Athlète inconnu";

        if (!aggregated[playerId]) {
          aggregated[playerId] = {
            playerId,
            playerName,
            matchesPlayed: 0,
            sportData: {},
          };
        }

        const p = aggregated[playerId];
        p.matchesPlayed += 1;

        // Aggregate sport-specific stats from sport_data JSONB
        const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
        
        sportStats.forEach(statField => {
          // Skip auto-computed percentage stats during aggregation
          if (statField.computedFrom) return;
          
          const value = sportData[statField.key] || 
                       stat[statField.key as keyof typeof stat] || 
                       stat[statField.key.replace(/([A-Z])/g, '_$1').toLowerCase() as keyof typeof stat] || 
                       0;
          
          if (!p.sportData[statField.key]) {
            p.sportData[statField.key] = 0;
          }
          p.sportData[statField.key] += Number(value) || 0;
        });
      });

      // Now compute percentage stats from aggregated totals
      Object.values(aggregated).forEach(p => {
        sportStats.forEach(statField => {
          if (statField.computedFrom) {
            const { successKey, totalKey, failureKey } = statField.computedFrom;
            const success = p.sportData[successKey] || 0;
            const total = totalKey 
              ? (p.sportData[totalKey] || 0)
              : success + (p.sportData[failureKey!] || 0);
            p.sportData[statField.key] = total > 0 ? Math.round((success / total) * 100) : 0;
          }
        });
      });

      return Object.values(aggregated);
    },
  });

  if (isLoading) {
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

  // Get top performers based on first scoring stat available
  const scoringStats = sportStats.filter(s => s.category === "scoring");
  const attackStats = sportStats.filter(s => s.category === "attack");
  const defenseStats = sportStats.filter(s => s.category === "defense");

  const topScoringStatKey = scoringStats[0]?.key;
  const topAttackStatKey = attackStats[0]?.key;
  const topDefenseStatKey = defenseStats[0]?.key;

  const topScorers = topScoringStatKey 
    ? [...stats].sort((a, b) => (b.sportData[topScoringStatKey] || 0) - (a.sportData[topScoringStatKey] || 0)).slice(0, 3)
    : [];
  const topAttackers = topAttackStatKey
    ? [...stats].sort((a, b) => (b.sportData[topAttackStatKey] || 0) - (a.sportData[topAttackStatKey] || 0)).slice(0, 3)
    : [];
  const topDefenders = topDefenseStatKey
    ? [...stats].sort((a, b) => (b.sportData[topDefenseStatKey] || 0) - (a.sportData[topDefenseStatKey] || 0)).slice(0, 3)
    : [];

  const getCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "scoring": return <Trophy className="h-4 w-4 text-primary" />;
      case "attack": return <Target className="h-4 w-4 text-primary" />;
      case "defense": return <Shield className="h-4 w-4 text-primary" />;
      case "general": return <Activity className="h-4 w-4 text-primary" />;
      default: return <Dumbbell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top performers cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topScoringStatKey && scoringStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Top {scoringStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topScorers.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topScoringStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {topAttackStatKey && attackStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Top {attackStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topAttackers.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topAttackStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {topDefenseStatKey && defenseStats[0] && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Top {defenseStats[0].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topDefenders.map((p, i) => (
                <div key={p.playerId} className="flex justify-between items-center">
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    {p.playerName}
                  </span>
                  <span className="font-bold text-primary">{p.sportData[topDefenseStatKey] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed stats table */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques détaillées par athlète
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
                          {categoryStats.slice(0, 6).map(stat => (
                            <TableHead key={stat.key} className="text-center">
                              {stat.shortLabel}
                            </TableHead>
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
                              {categoryStats.slice(0, 6).map(stat => (
                                <TableCell key={stat.key} className="text-center">
                                  {stat.computedFrom 
                                    ? `${p.sportData[stat.key] || 0}%`
                                    : (p.sportData[stat.key] || 0)
                                  }
                                </TableCell>
                              ))}
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
    </div>
  );
}
