import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Trophy, Target, Shield, Activity, Dumbbell, Filter, CheckSquare, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getStatsForSport, getStatCategories, type StatField } from "@/lib/constants/sportStats";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlayerCumulativeStatsProps {
  categoryId: string;
  sportType?: string;
}

interface MatchInfo {
  id: string;
  match_date: string;
  opponent: string;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
}

export function PlayerCumulativeStats({ categoryId, sportType = "XV" }: PlayerCumulativeStatsProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const sportStats = getStatsForSport(sportType);
  const statCategories = getStatCategories(sportType);

  // Fetch all matches that have stats data for this category
  const { data: allMatches = [] } = useQuery({
    queryKey: ["matches-list-cumulative", categoryId],
    queryFn: async () => {
      // Get match IDs that have player stats
      const { data: statsMatchIds, error: statsError } = await supabase
        .from("player_match_stats")
        .select("match_id")
        .in("match_id", 
          (await supabase
            .from("matches")
            .select("id")
            .eq("category_id", categoryId)
          ).data?.map(m => m.id) || []
        );
      if (statsError) throw statsError;
      
      const uniqueMatchIds = [...new Set((statsMatchIds || []).map(s => s.match_id))];
      if (uniqueMatchIds.length === 0) return [] as MatchInfo[];

      const { data, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .in("id", uniqueMatchIds)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return (data || []) as MatchInfo[];
    },
  });

  // Determine which match IDs to use (all or selected)
  const activeMatchIds = useMemo(() => {
    if (selectedMatchIds.length === 0) return allMatches.map(m => m.id);
    return selectedMatchIds;
  }, [selectedMatchIds, allMatches]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["cumulative_player_stats", categoryId, sportType, activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];

      // Get all player stats for selected matches
      const { data: playerStats, error: statsError } = await supabase
        .from("player_match_stats")
        .select(`
          *,
          players(id, name, first_name)
        `)
        .in("match_id", activeMatchIds);

      if (statsError) throw statsError;
      if (!playerStats) return [];

      // Aggregate stats by player
      const aggregated: Record<string, CumulativeStats> = {};

      playerStats.forEach((stat) => {
        const player = stat.players as { id: string; name: string; first_name?: string } | null;
        const playerId = stat.player_id;
        const playerName = player
          ? [player.first_name, player.name].filter(Boolean).join(" ")
          : "Athlète inconnu";

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
          if (statField.computedFrom) return;
          
          const value = sportData[statField.key] || 
                       stat[statField.key as keyof typeof stat] || 
                       0;
          
          if (!p.sportData[statField.key]) {
            p.sportData[statField.key] = 0;
          }
          p.sportData[statField.key] += Number(value) || 0;
        });
      });

      // Compute percentage stats from aggregated totals
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
    enabled: activeMatchIds.length > 0,
  });

  const toggleMatch = (matchId: string) => {
    setSelectedMatchIds(prev => {
      // If currently "all selected" (empty array), switch to "all except this one"
      if (prev.length === 0) {
        return allMatches.filter(m => m.id !== matchId).map(m => m.id);
      }
      if (prev.includes(matchId)) {
        const newSelection = prev.filter(id => id !== matchId);
        // If nothing left selected, go back to "all"
        return newSelection.length === 0 ? [] : newSelection;
      }
      return [...prev, matchId];
    });
  };

  const selectAllMatches = () => setSelectedMatchIds([]);
  const clearSelection = () => setSelectedMatchIds(allMatches.map(m => m.id));

  const selectedCount = selectedMatchIds.length === 0 ? allMatches.length : selectedMatchIds.length;

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

  // Get top performers
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
      {/* Match filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrer les matchs
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {selectedCount}/{allMatches.length}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">Sélectionner les matchs</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choisissez les matchs à inclure dans le cumul
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllMatches}>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Tous
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedMatchIds([])}>
                  Réinitialiser
                </Button>
              </div>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-1">
                {allMatches.map(match => {
                  const isSelected = selectedMatchIds.length === 0 || selectedMatchIds.includes(match.id);
                  return (
                    <button
                      key={match.id}
                      onClick={() => toggleMatch(match.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-muted ${
                        isSelected ? 'bg-primary/5' : 'opacity-50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          vs {match.opponent || "Adversaire inconnu"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(match.match_date), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {allMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun match</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {selectedMatchIds.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Trophy className="h-3 w-3" />
            {selectedMatchIds.length} match{selectedMatchIds.length > 1 ? 's' : ''} sélectionné{selectedMatchIds.length > 1 ? 's' : ''}
          </Badge>
        )}
        {selectedMatchIds.length === 0 && allMatches.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            Tous les matchs ({allMatches.length})
          </Badge>
        )}
      </div>

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
