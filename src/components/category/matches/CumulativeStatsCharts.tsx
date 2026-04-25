import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { BarChart3, TrendingUp, Users, Trophy, Target, Shield, Activity, Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatCategories, type StatField } from "@/lib/constants/sportStats";

interface MatchData {
  matchId: string;
  matchLabel: string;
  matchDate: string;
  players: Record<string, {
    playerName: string;
    sportData: Record<string, number>;
  }>;
}

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
}

interface CumulativeStatsChartsProps {
  stats: CumulativeStats[];
  matchesData: MatchData[];
  sportStats: StatField[];
  selectedMatchIds: string[];
  sportType?: string;
  /** Optional: only used for athletics. Maps a playerId to the list of category keys (disciplines)
   * the athlete is registered in. When provided, the comparison/evolution/progression charts only
   * include athletes whose disciplines match the currently selected stat category. */
  playerDisciplineMap?: Record<string, string[]>;
}

const getCategoryIcon = (catKey: string) => {
  switch (catKey) {
    case "scoring": return <Trophy className="h-3.5 w-3.5" />;
    case "attack": return <Target className="h-3.5 w-3.5" />;
    case "defense": return <Shield className="h-3.5 w-3.5" />;
    case "general": return <Activity className="h-3.5 w-3.5" />;
    default: return <Dumbbell className="h-3.5 w-3.5" />;
  }
};

export function CumulativeStatsCharts({ stats, matchesData, sportStats, selectedMatchIds, sportType = "XV", playerDisciplineMap }: CumulativeStatsChartsProps) {
  const statCategories = getStatCategories(sportType);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStat, setSelectedStat] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Set default category
  useEffect(() => {
    if (!selectedCategory && statCategories.length > 0) {
      setSelectedCategory(statCategories[0].key);
    }
  }, [statCategories, selectedCategory]);

  // Get numeric stats for the selected category
  const categoryStats = useMemo(() => 
    sportStats.filter(s => s.category === selectedCategory && !s.computedFrom && s.type !== "percentage"),
    [sportStats, selectedCategory]
  );

  // Reset selected stat when category changes
  useEffect(() => {
    if (categoryStats.length > 0) {
      setSelectedStat(categoryStats[0].key);
    } else {
      setSelectedStat("");
    }
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeStat = selectedStat || categoryStats[0]?.key || "";
  const activeStatField = sportStats.find(s => s.key === activeStat);

  // Top players for bar chart
  const top5 = useMemo(() => {
    if (!activeStat) return [];
    return [...stats]
      .sort((a, b) => (b.sportData[activeStat] || 0) - (a.sportData[activeStat] || 0))
      .slice(0, 8)
      .map(p => ({
        name: p.playerName.split(" ").map((n, i) => i === 0 ? n[0] + "." : n).join(" "),
        fullName: p.playerName,
        value: p.sportData[activeStat] || 0,
        avg: p.matchesPlayed > 0 ? Math.round(((p.sportData[activeStat] || 0) / p.matchesPlayed) * 10) / 10 : 0,
      }));
  }, [stats, activeStat]);

  // Evolution data per match
  const evolutionData = useMemo(() => {
    if (!activeStat || matchesData.length === 0) return [];
    const activePlayers = selectedPlayers.length > 0 
      ? selectedPlayers 
      : stats.slice(0, 3).map(s => s.playerId);
    return matchesData.map(match => {
      const point: Record<string, string | number> = { match: match.matchLabel, date: match.matchDate };
      activePlayers.forEach(pid => {
        const player = match.players[pid];
        const pName = player?.playerName || stats.find(s => s.playerId === pid)?.playerName || pid;
        point[pName] = player?.sportData[activeStat] || 0;
      });
      return point;
    });
  }, [matchesData, activeStat, selectedPlayers, stats]);

  const playerNames = useMemo(() => {
    const activePlayers = selectedPlayers.length > 0 
      ? selectedPlayers 
      : stats.slice(0, 3).map(s => s.playerId);
    return activePlayers.map(pid => stats.find(s => s.playerId === pid)?.playerName || pid);
  }, [selectedPlayers, stats]);

  // Diff data
  const diffData = useMemo(() => {
    if (!activeStat || matchesData.length < 2) return [];
    const first = matchesData[0];
    const last = matchesData[matchesData.length - 1];
    return stats
      .filter(p => first.players[p.playerId] || last.players[p.playerId])
      .map(p => {
        const firstVal = first.players[p.playerId]?.sportData[activeStat] || 0;
        const lastVal = last.players[p.playerId]?.sportData[activeStat] || 0;
        const diff = lastVal - firstVal;
        const pct = firstVal > 0 ? Math.round((diff / firstVal) * 100) : (lastVal > 0 ? 100 : 0);
        return {
          name: p.playerName.split(" ").map((n, i) => i === 0 ? n[0] + "." : n).join(" "),
          fullName: p.playerName, first: firstVal, last: lastVal, diff, pct,
        };
      })
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 10);
  }, [stats, matchesData, activeStat]);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2, 160 60% 45%))",
    "hsl(var(--chart-3, 30 80% 55%))",
    "hsl(var(--chart-4, 280 65% 60%))",
    "hsl(var(--chart-5, 340 75% 55%))",
  ];

  if (stats.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Category + Stat selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {statCategories.map(cat => (
              <SelectItem key={cat.key} value={cat.key}>
                <span className="flex items-center gap-2">
                  {getCategoryIcon(cat.key)}
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categoryStats.length > 0 && (
          <Select value={activeStat} onValueChange={setSelectedStat}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Statistique" />
            </SelectTrigger>
            <SelectContent>
              {categoryStats.map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {matchesData.length >= 2 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            {matchesData.length} matchs comparés
          </Badge>
        )}
      </div>

      {categoryStats.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Aucune statistique numérique dans cette catégorie.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison" className="gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Comparaison
            </TabsTrigger>
            <TabsTrigger value="evolution" className="gap-1" disabled={matchesData.length < 2}>
              <TrendingUp className="h-3.5 w-3.5" />
              Évolution
            </TabsTrigger>
            <TabsTrigger value="diff" className="gap-1" disabled={matchesData.length < 2}>
              <Users className="h-3.5 w-3.5" />
              +/- Progression
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Top joueurs — {activeStatField?.label || activeStat}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top5} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name === "value" ? "Total" : "Moy/match"]}
                        labelFormatter={(label) => top5.find(t => t.name === label)?.fullName || label}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="avg" name="Moy/match" fill="hsl(var(--primary) / 0.4)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolution">
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Évolution — {activeStatField?.label || activeStat}
                  </CardTitle>
                  <div className="flex gap-1 flex-wrap">
                    {stats.slice(0, 6).map((p, i) => {
                      const isActive = selectedPlayers.length === 0 ? i < 3 : selectedPlayers.includes(p.playerId);
                      return (
                        <Badge key={p.playerId} variant={isActive ? "default" : "outline"}
                          className="cursor-pointer text-xs h-6"
                          onClick={() => {
                            setSelectedPlayers(prev => {
                              if (prev.length === 0) {
                                const top3 = stats.slice(0, 3).map(s => s.playerId);
                                return top3.includes(p.playerId) ? top3.filter(id => id !== p.playerId) : [...top3, p.playerId];
                              }
                              return prev.includes(p.playerId) ? prev.filter(id => id !== p.playerId) : [...prev, p.playerId];
                            });
                          }}
                        >
                          {p.playerName.split(" ")[0]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="match" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      {playerNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diff">
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Progression — {activeStatField?.label || activeStat}
                  <span className="text-xs text-muted-foreground ml-2">
                    (du {matchesData[0]?.matchLabel} au {matchesData[matchesData.length - 1]?.matchLabel})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diffData.map((p) => (
                    <div key={p.fullName} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50">
                      <span className="text-sm font-medium w-32 truncate">{p.fullName}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-muted-foreground w-10 text-right">{p.first}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full transition-all ${p.diff >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Math.abs(p.pct), 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10">{p.last}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-[100px] justify-end">
                        <Badge variant="outline" className={`text-xs font-mono ${p.diff > 0 ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' : p.diff < 0 ? 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950' : 'text-muted-foreground'}`}>
                          {p.diff > 0 ? '+' : ''}{p.diff}
                        </Badge>
                        <Badge variant="outline" className={`text-xs font-mono ${p.pct > 0 ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950' : p.pct < 0 ? 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950' : 'text-muted-foreground'}`}>
                          {p.pct > 0 ? '+' : ''}{p.pct}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {diffData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sélectionnez au moins 2 matchs pour voir la progression
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
