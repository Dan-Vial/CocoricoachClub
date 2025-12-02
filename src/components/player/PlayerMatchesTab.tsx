import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlayerMatchesTabProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

export function PlayerMatchesTab({ playerId, categoryId, playerName }: PlayerMatchesTabProps) {
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

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement des statistiques...</p>;
  }

  // Calculate cumulative stats
  const cumulativeStats = matchStats?.reduce(
    (acc, stat) => {
      acc.matchesPlayed += 1;
      acc.tries += stat.tries || 0;
      acc.conversions += stat.conversions || 0;
      acc.penaltiesScored += stat.penalties_scored || 0;
      acc.dropGoals += stat.drop_goals || 0;
      acc.tackles += stat.tackles || 0;
      acc.tacklesMissed += stat.tackles_missed || 0;
      acc.defensiveRecoveries += stat.defensive_recoveries || 0;
      acc.carries += stat.carries || 0;
      acc.metersGained += stat.meters_gained || 0;
      acc.offloads += stat.offloads || 0;
      acc.turnoversWon += stat.turnovers_won || 0;
      acc.breakthroughs += stat.breakthroughs || 0;
      acc.totalContacts += stat.total_contacts || 0;
      acc.yellowCards += stat.yellow_cards || 0;
      acc.redCards += stat.red_cards || 0;
      return acc;
    },
    {
      matchesPlayed: 0,
      tries: 0,
      conversions: 0,
      penaltiesScored: 0,
      dropGoals: 0,
      tackles: 0,
      tacklesMissed: 0,
      defensiveRecoveries: 0,
      carries: 0,
      metersGained: 0,
      offloads: 0,
      turnoversWon: 0,
      breakthroughs: 0,
      totalContacts: 0,
      yellowCards: 0,
      redCards: 0,
    }
  ) || {
    matchesPlayed: 0,
    tries: 0,
    conversions: 0,
    penaltiesScored: 0,
    dropGoals: 0,
    tackles: 0,
    tacklesMissed: 0,
    defensiveRecoveries: 0,
    carries: 0,
    metersGained: 0,
    offloads: 0,
    turnoversWon: 0,
    breakthroughs: 0,
    totalContacts: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const totalPoints =
    cumulativeStats.tries * 5 +
    cumulativeStats.conversions * 2 +
    cumulativeStats.penaltiesScored * 3 +
    cumulativeStats.dropGoals * 3;

  const tackleSuccess =
    cumulativeStats.tackles + cumulativeStats.tacklesMissed > 0
      ? Math.round(
          (cumulativeStats.tackles /
            (cumulativeStats.tackles + cumulativeStats.tacklesMissed)) *
            100
        )
      : 0;

  const matchesPlayedCount = lineups?.length || 0;

  if (matchesPlayedCount === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{playerName} n'a pas encore participé à un match.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Points marqués</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{cumulativeStats.tackles}</p>
              <p className="text-sm text-muted-foreground">Plaquages ({tackleSuccess}%)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{cumulativeStats.metersGained}</p>
              <p className="text-sm text-muted-foreground">Mètres gagnés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Stats */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Statistiques cumulées - {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.tries}</p>
              <p className="text-xs text-muted-foreground">Essais</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.conversions}</p>
              <p className="text-xs text-muted-foreground">Transfo.</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.penaltiesScored}</p>
              <p className="text-xs text-muted-foreground">Pénalités</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.carries}</p>
              <p className="text-xs text-muted-foreground">Ballons portés</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.breakthroughs}</p>
              <p className="text-xs text-muted-foreground">Franchissements</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.offloads}</p>
              <p className="text-xs text-muted-foreground">Offloads</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.turnoversWon}</p>
              <p className="text-xs text-muted-foreground">Turnovers gagnés</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.defensiveRecoveries}</p>
              <p className="text-xs text-muted-foreground">Ballons récup.</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{cumulativeStats.totalContacts}</p>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </div>
          </div>
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
                    <TableHead className="text-center">Essais</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Plaquages</TableHead>
                    <TableHead className="text-center">Mètres</TableHead>
                    <TableHead className="text-center">Cartons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchStats.map((stat) => {
                    const match = stat.matches as any;
                    const points =
                      (stat.tries || 0) * 5 +
                      (stat.conversions || 0) * 2 +
                      (stat.penalties_scored || 0) * 3 +
                      (stat.drop_goals || 0) * 3;

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
                        <TableCell className="text-center font-medium">
                          {stat.tries || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={points > 0 ? "default" : "secondary"}>
                            {points}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {stat.tackles || 0}
                          {stat.tackles_missed ? (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({stat.tackles_missed} ratés)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">{stat.meters_gained || 0}</TableCell>
                        <TableCell className="text-center">
                          {stat.yellow_cards ? (
                            <span className="text-yellow-500 mr-1">🟨 {stat.yellow_cards}</span>
                          ) : null}
                          {stat.red_cards ? (
                            <span className="text-red-500">🟥 {stat.red_cards}</span>
                          ) : null}
                          {!stat.yellow_cards && !stat.red_cards && "-"}
                        </TableCell>
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
