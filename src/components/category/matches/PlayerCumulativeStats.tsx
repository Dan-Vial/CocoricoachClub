import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Trophy, Target, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerCumulativeStatsProps {
  categoryId: string;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  tries: number;
  conversions: number;
  penaltiesScored: number;
  dropGoals: number;
  totalPoints: number;
  tackles: number;
  tacklesMissed: number;
  tackleSuccess: number;
  carries: number;
  metersGained: number;
  offloads: number;
  turnoversWon: number;
  yellowCards: number;
  redCards: number;
}

export function PlayerCumulativeStats({ categoryId }: PlayerCumulativeStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["cumulative_player_stats", categoryId],
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
        const playerName = player?.name || "Joueur inconnu";

        if (!aggregated[playerId]) {
          aggregated[playerId] = {
            playerId,
            playerName,
            matchesPlayed: 0,
            tries: 0,
            conversions: 0,
            penaltiesScored: 0,
            dropGoals: 0,
            totalPoints: 0,
            tackles: 0,
            tacklesMissed: 0,
            tackleSuccess: 0,
            carries: 0,
            metersGained: 0,
            offloads: 0,
            turnoversWon: 0,
            yellowCards: 0,
            redCards: 0,
          };
        }

        const p = aggregated[playerId];
        p.matchesPlayed += 1;
        p.tries += stat.tries || 0;
        p.conversions += stat.conversions || 0;
        p.penaltiesScored += stat.penalties_scored || 0;
        p.dropGoals += stat.drop_goals || 0;
        p.tackles += stat.tackles || 0;
        p.tacklesMissed += stat.tackles_missed || 0;
        p.carries += stat.carries || 0;
        p.metersGained += stat.meters_gained || 0;
        p.offloads += stat.offloads || 0;
        p.turnoversWon += stat.turnovers_won || 0;
        p.yellowCards += stat.yellow_cards || 0;
        p.redCards += stat.red_cards || 0;
      });

      // Calculate derived stats
      Object.values(aggregated).forEach((p) => {
        p.totalPoints = (p.tries * 5) + (p.conversions * 2) + (p.penaltiesScored * 3) + (p.dropGoals * 3);
        const totalTackles = p.tackles + p.tacklesMissed;
        p.tackleSuccess = totalTackles > 0 ? Math.round((p.tackles / totalTackles) * 100) : 0;
      });

      return Object.values(aggregated).sort((a, b) => b.totalPoints - a.totalPoints);
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

  const topScorers = [...stats].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
  const topTacklers = [...stats].sort((a, b) => b.tackles - a.tackles).slice(0, 3);
  const topCarriers = [...stats].sort((a, b) => b.metersGained - a.metersGained).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top performers cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Meilleurs marqueurs
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
                <span className="font-bold text-yellow-500">{p.totalPoints} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Meilleurs plaqueurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topTacklers.map((p, i) => (
              <div key={p.playerId} className="flex justify-between items-center">
                <span className="text-sm">
                  <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                    {i + 1}
                  </Badge>
                  {p.playerName}
                </span>
                <span className="font-bold text-blue-500">{p.tackles}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Meilleurs porteurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCarriers.map((p, i) => (
              <div key={p.playerId} className="flex justify-between items-center">
                <span className="text-sm">
                  <Badge variant="outline" className="mr-2 w-5 h-5 p-0 justify-center">
                    {i + 1}
                  </Badge>
                  {p.playerName}
                </span>
                <span className="font-bold text-green-500">{p.metersGained} m</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed stats table */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques détaillées par joueur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scoring" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scoring">Points</TabsTrigger>
              <TabsTrigger value="attack">Attaque</TabsTrigger>
              <TabsTrigger value="defense">Défense</TabsTrigger>
            </TabsList>

            <TabsContent value="scoring">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="text-center">Matchs</TableHead>
                      <TableHead className="text-center">Essais</TableHead>
                      <TableHead className="text-center">Transfo.</TableHead>
                      <TableHead className="text-center">Pénalités</TableHead>
                      <TableHead className="text-center">Drops</TableHead>
                      <TableHead className="text-center font-bold">Total pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((p) => (
                      <TableRow key={p.playerId}>
                        <TableCell className="font-medium">{p.playerName}</TableCell>
                        <TableCell className="text-center">{p.matchesPlayed}</TableCell>
                        <TableCell className="text-center">{p.tries}</TableCell>
                        <TableCell className="text-center">{p.conversions}</TableCell>
                        <TableCell className="text-center">{p.penaltiesScored}</TableCell>
                        <TableCell className="text-center">{p.dropGoals}</TableCell>
                        <TableCell className="text-center font-bold text-primary">{p.totalPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="attack">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="text-center">Matchs</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Mètres</TableHead>
                      <TableHead className="text-center">Moy./match</TableHead>
                      <TableHead className="text-center">Offloads</TableHead>
                      <TableHead className="text-center">Turnovers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...stats].sort((a, b) => b.metersGained - a.metersGained).map((p) => (
                      <TableRow key={p.playerId}>
                        <TableCell className="font-medium">{p.playerName}</TableCell>
                        <TableCell className="text-center">{p.matchesPlayed}</TableCell>
                        <TableCell className="text-center">{p.carries}</TableCell>
                        <TableCell className="text-center">{p.metersGained}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {p.matchesPlayed > 0 ? Math.round(p.metersGained / p.matchesPlayed) : 0}
                        </TableCell>
                        <TableCell className="text-center">{p.offloads}</TableCell>
                        <TableCell className="text-center">{p.turnoversWon}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="defense">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="text-center">Matchs</TableHead>
                      <TableHead className="text-center">Plaquages</TableHead>
                      <TableHead className="text-center">Ratés</TableHead>
                      <TableHead className="text-center">% Réussite</TableHead>
                      <TableHead className="text-center">🟨</TableHead>
                      <TableHead className="text-center">🟥</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...stats].sort((a, b) => b.tackles - a.tackles).map((p) => (
                      <TableRow key={p.playerId}>
                        <TableCell className="font-medium">{p.playerName}</TableCell>
                        <TableCell className="text-center">{p.matchesPlayed}</TableCell>
                        <TableCell className="text-center">{p.tackles}</TableCell>
                        <TableCell className="text-center">{p.tacklesMissed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.tackleSuccess >= 80 ? "default" : p.tackleSuccess >= 60 ? "secondary" : "destructive"}>
                            {p.tackleSuccess}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{p.yellowCards}</TableCell>
                        <TableCell className="text-center">{p.redCards}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
