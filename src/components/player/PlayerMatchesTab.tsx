import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatCategories } from "@/lib/constants/sportStats";
import { useStatPreferences } from "@/hooks/use-stat-preferences";

interface PlayerMatchesTabProps {
  playerId: string;
  categoryId: string;
  playerName: string;
  sportType?: string;
}

export function PlayerMatchesTab({ playerId, categoryId, playerName, sportType = "XV" }: PlayerMatchesTabProps) {
  const { stats: sportStats, isLoading: loadingStats } = useStatPreferences({
    categoryId,
    sportType,
  });
  const statCategories = getStatCategories(sportType);

  const { data: matchStats, isLoading } = useQuery({
    queryKey: ["player_all_match_stats", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_match_stats")
        .select(`
          *,
          matches(id, opponent, match_date, score_home, score_away, is_home)
        `)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lineups } = useQuery({
    queryKey: ["player_lineups", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select(`
          *,
          matches(id, opponent, match_date, is_home)
        `)
        .eq("player_id", playerId);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || loadingStats) {
    return <p className="text-muted-foreground">Chargement des statistiques...</p>;
  }

  // Calculate cumulative stats from sport_data
  const cumulativeStats: Record<string, number> = {};
  
  matchStats?.forEach((stat) => {
    const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};
    
    sportStats.forEach(statField => {
      const value = sportData[statField.key] || 
                   stat[statField.key as keyof typeof stat] || 
                   stat[statField.key.replace(/([A-Z])/g, '_$1').toLowerCase() as keyof typeof stat] || 
                   0;
      
      if (!cumulativeStats[statField.key]) {
        cumulativeStats[statField.key] = 0;
      }
      cumulativeStats[statField.key] += Number(value) || 0;
    });
  });

  const matchesPlayedCount = lineups?.length || 0;

  if (matchesPlayedCount === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{playerName} n'a pas encore participé à une compétition.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get first 4 stats for summary cards
  const summaryStats = sportStats.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{matchesPlayedCount}</p>
              <p className="text-sm text-muted-foreground">Matchs joués</p>
            </div>
          </CardContent>
        </Card>

        {summaryStats.slice(0, 3).map((stat, index) => (
          <Card key={stat.key} className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {cumulativeStats[stat.key] || 0}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cumulative Stats */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Statistiques cumulées - {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={statCategories[0]?.key || "general"} className="w-full">
            <TabsList className={`grid w-full grid-cols-${Math.min(statCategories.length, 4)}`}>
              {statCategories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
              ))}
            </TabsList>

            {statCategories.map(cat => {
              const categoryStats = sportStats.filter(s => s.category === cat.key);
              
              return (
                <TabsContent key={cat.key} value={cat.key}>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {categoryStats.map(stat => (
                      <div key={stat.key} className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{cumulativeStats[stat.key] || 0}</p>
                        <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Match by Match Stats */}
      {matchStats && matchStats.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détail par match - {playerName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Adversaire</TableHead>
                    {sportStats.slice(0, 5).map(stat => (
                      <TableHead key={stat.key} className="text-center">
                        {stat.shortLabel}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchStats.map((stat) => {
                    const match = stat.matches as { id: string; opponent: string; match_date: string; is_home: boolean } | null;
                    const sportData = (stat as { sport_data?: Record<string, number> }).sport_data || {};

                    return (
                      <TableRow key={stat.id}>
                        <TableCell className="whitespace-nowrap">
                          {match?.match_date
                            ? format(new Date(match.match_date), "dd/MM/yyyy", { locale: fr })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {match?.is_home ? "DOM" : "EXT"}
                            </Badge>
                            {match?.opponent || "-"}
                          </div>
                        </TableCell>
                        {sportStats.slice(0, 5).map(statField => {
                          const value = sportData[statField.key] || 
                                       stat[statField.key as keyof typeof stat] ||
                                       stat[statField.key.replace(/([A-Z])/g, '_$1').toLowerCase() as keyof typeof stat] ||
                                       0;
                          return (
                            <TableCell key={statField.key} className="text-center">
                              {Number(value) || 0}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
