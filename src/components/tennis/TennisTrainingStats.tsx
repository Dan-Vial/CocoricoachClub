import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, CalendarIcon, Users, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TENNIS_STATS } from "@/lib/constants/sportStats";

interface TennisTrainingStatsProps {
  categoryId: string;
}

interface TrainingMatchData {
  matchId: string;
  matchDate: string;
  opponent: string;
  playerId: string;
  playerName: string;
  stats: Record<string, number>;
}

export function TennisTrainingStats({ categoryId }: TennisTrainingStatsProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  // Fetch training matches and their stats
  const { data: trainingData, isLoading } = useQuery({
    queryKey: ["tennis_training_stats", categoryId],
    queryFn: async () => {
      // Get training matches
      const { data: matches } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .eq("category_id", categoryId)
        .eq("event_type", "training")
        .order("match_date", { ascending: false });

      if (!matches || matches.length === 0) return [];

      const matchIds = matches.map((m) => m.id);

      // Get player_match_stats for these matches
      const { data: stats } = await supabase
        .from("player_match_stats")
        .select("*, players(id, name, first_name)")
        .in("match_id", matchIds);

      const result: TrainingMatchData[] = [];

      for (const stat of stats || []) {
        const match = matches.find((m) => m.id === stat.match_id);
        const player = stat.players as any;
        const statData = (stat.stats as Record<string, number>) || {};

        result.push({
          matchId: stat.match_id,
          matchDate: match?.match_date || "",
          opponent: match?.opponent || "",
          playerId: stat.player_id,
          playerName: player
            ? [player.first_name, player.name].filter(Boolean).join(" ")
            : "Athlète",
          stats: statData,
        });
      }

      return result;
    },
  });

  // Get unique players
  const players = useMemo(() => {
    if (!trainingData) return [];
    const map = new Map<string, string>();
    trainingData.forEach((d) => map.set(d.playerId, d.playerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trainingData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!trainingData) return [];
    return trainingData.filter((d) => {
      if (selectedPlayerId !== "all" && d.playerId !== selectedPlayerId) return false;
      if (dateFrom && isBefore(new Date(d.matchDate), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(d.matchDate), endOfDay(dateTo))) return false;
      return true;
    });
  }, [trainingData, selectedPlayerId, dateFrom, dateTo]);

  // Compute averages per player
  const playerAverages = useMemo(() => {
    const grouped = new Map<string, TrainingMatchData[]>();
    filteredData.forEach((d) => {
      const arr = grouped.get(d.playerId) || [];
      arr.push(d);
      grouped.set(d.playerId, arr);
    });

    return Array.from(grouped.entries()).map(([playerId, entries]) => {
      const playerName = entries[0].playerName;
      const count = entries.length;

      // Compute averages for key stats
      const avgStats: Record<string, number> = {};
      const keyStats = [
        "aces", "doubleFaults", "winners", "unforcedErrors",
        "firstServePercentage", "setsWon", "gamesWon",
        "breakPointsWon", "breakPointConversion",
        "serviceHoldPercentage", "returnPointsPercentage",
        "netSuccessPercentage",
      ];

      keyStats.forEach((key) => {
        const sum = entries.reduce((s, e) => s + (e.stats[key] || 0), 0);
        avgStats[key] = Math.round((sum / count) * 10) / 10;
      });

      return { playerId, playerName, matchCount: count, avgStats };
    });
  }, [filteredData]);

  // Key stat definitions for display
  const displayStats = [
    { key: "aces", label: "Aces", icon: "🎯" },
    { key: "doubleFaults", label: "Dbl Fautes", icon: "❌" },
    { key: "winners", label: "Winners", icon: "💥" },
    { key: "unforcedErrors", label: "Fautes directes", icon: "⚠️" },
    { key: "firstServePercentage", label: "% 1ère balle", icon: "📊", suffix: "%" },
    { key: "breakPointConversion", label: "% Break", icon: "🔑", suffix: "%" },
    { key: "serviceHoldPercentage", label: "% Hold", icon: "🛡️", suffix: "%" },
    { key: "returnPointsPercentage", label: "% Retour", icon: "↩️", suffix: "%" },
  ];

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Chargement...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Athlète</label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les athlètes</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Du</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Au</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No data */}
      {filteredData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun match d'entraînement avec statistiques trouvé.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Créez un match d'entraînement depuis l'onglet Compétition, saisissez les stats, puis retrouvez-les ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Player averages */}
      {playerAverages.length > 0 && (
        <div className="space-y-4">
          {playerAverages.map((player) => (
            <Card key={player.playerId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {player.playerName}
                  </CardTitle>
                  <Badge variant="secondary">
                    {player.matchCount} match{player.matchCount > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {displayStats.map((stat) => (
                    <div
                      key={stat.key}
                      className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center"
                    >
                      <span className="text-lg">{stat.icon}</span>
                      <span className="text-xl font-bold mt-1">
                        {player.avgStats[stat.key] ?? 0}
                        {stat.suffix || ""}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Match detail list */}
      {filteredData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Détail par match ({filteredData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Joueur</th>
                    <th className="text-center py-2 px-1">Aces</th>
                    <th className="text-center py-2 px-1">DF</th>
                    <th className="text-center py-2 px-1">Win.</th>
                    <th className="text-center py-2 px-1">FD</th>
                    <th className="text-center py-2 px-1">% 1ère</th>
                    <th className="text-center py-2 px-1">% Break</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((d, i) => (
                    <tr key={`${d.matchId}-${d.playerId}-${i}`} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2 text-muted-foreground">
                        {d.matchDate ? format(new Date(d.matchDate), "dd/MM/yy") : "—"}
                      </td>
                      <td className="py-2 px-2 font-medium">{d.playerName}</td>
                      <td className="text-center py-2 px-1">{d.stats.aces || 0}</td>
                      <td className="text-center py-2 px-1">{d.stats.doubleFaults || 0}</td>
                      <td className="text-center py-2 px-1">{d.stats.winners || 0}</td>
                      <td className="text-center py-2 px-1">{d.stats.unforcedErrors || 0}</td>
                      <td className="text-center py-2 px-1">
                        {d.stats.firstServePercentage ? `${d.stats.firstServePercentage}%` : "—"}
                      </td>
                      <td className="text-center py-2 px-1">
                        {d.stats.breakPointConversion ? `${d.stats.breakPointConversion}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
