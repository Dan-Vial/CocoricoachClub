import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Minus, Trophy, Target, Shield, Activity, Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import type { StatField } from "@/lib/constants/sportStats";
import { getStatCategories } from "@/lib/constants/sportStats";

interface CumulativeStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  sportData: Record<string, number>;
}

interface MatchData {
  matchId: string;
  matchLabel: string;
  matchDate: string;
  players: Record<string, {
    playerName: string;
    sportData: Record<string, number>;
  }>;
}

interface TeamCumulativeStatsProps {
  stats: CumulativeStats[];
  matchesData: MatchData[];
  sportStats: StatField[];
  sportType: string;
}

export function TeamCumulativeStats({ stats, matchesData, sportStats, sportType }: TeamCumulativeStatsProps) {
  const statCategories = getStatCategories(sportType);

  // Aggregate team totals across all players
  const teamTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const matchCount = Math.max(...stats.map(s => s.matchesPlayed), 1);

    sportStats.forEach(stat => {
      if (stat.computedFrom) return;
      totals[stat.key] = stats.reduce((sum, p) => sum + (p.sportData[stat.key] || 0), 0);
    });

    // Compute percentage stats
    sportStats.forEach(stat => {
      if (stat.computedFrom) {
        const { successKey, totalKey, failureKey } = stat.computedFrom;
        const success = totals[successKey] || 0;
        const total = totalKey
          ? (totals[totalKey] || 0)
          : success + (totals[failureKey!] || 0);
        totals[stat.key] = total > 0 ? Math.round((success / total) * 100) : 0;
      }
    });

    return { totals, matchCount };
  }, [stats, sportStats]);

  // Team per-match evolution
  const teamEvolution = useMemo(() => {
    if (matchesData.length < 2) return [];
    return matchesData.map(match => {
      const row: Record<string, string | number> = { match: match.matchLabel };
      sportStats.forEach(stat => {
        if (stat.computedFrom) return;
        const teamVal = Object.values(match.players).reduce(
          (sum, p) => sum + (p.sportData[stat.key] || 0), 0
        );
        row[stat.key] = teamVal;
      });
      return row;
    });
  }, [matchesData, sportStats]);

  // Team progression: first match team total vs last match team total
  const teamProgression = useMemo(() => {
    if (matchesData.length < 2) return {};
    const first = matchesData[0];
    const last = matchesData[matchesData.length - 1];
    const prog: Record<string, number> = {};
    sportStats.forEach(stat => {
      if (stat.computedFrom) return;
      const firstVal = Object.values(first.players).reduce((s, p) => s + (p.sportData[stat.key] || 0), 0);
      const lastVal = Object.values(last.players).reduce((s, p) => s + (p.sportData[stat.key] || 0), 0);
      prog[stat.key] = lastVal - firstVal;
    });
    return prog;
  }, [matchesData, sportStats]);

  const getCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "scoring": return <Trophy className="h-4 w-4 text-primary" />;
      case "attack": return <Target className="h-4 w-4 text-primary" />;
      case "defense": return <Shield className="h-4 w-4 text-primary" />;
      case "general": return <Activity className="h-4 w-4 text-primary" />;
      default: return <Dumbbell className="h-4 w-4 text-primary" />;
    }
  };

  const ProgressionBadge = ({ value }: { value: number }) => {
    if (value > 0) return (
      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950 gap-0.5">
        <TrendingUp className="h-3 w-3" />+{value}
      </Badge>
    );
    if (value < 0) return (
      <Badge variant="outline" className="text-xs text-destructive border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950 gap-0.5">
        <TrendingDown className="h-3 w-3" />{value}
      </Badge>
    );
    return <Badge variant="outline" className="text-xs text-muted-foreground"><Minus className="h-3 w-3" /></Badge>;
  };

  // Radar chart data for team overview — normalize to 0-100 scale per category
  const radarData = useMemo(() => {
    const rawValues = statCategories.map(cat => {
      const catStats = sportStats.filter(s => s.category === cat.key && !s.computedFrom);
      const total = catStats.length > 0
        ? catStats.reduce((sum, s) => sum + (teamTotals.totals[s.key] || 0), 0)
        : 0;
      return { category: cat.label, rawValue: total };
    });
    const maxVal = Math.max(...rawValues.map(v => v.rawValue), 1);
    return rawValues.map(v => ({
      category: v.category,
      value: Math.round((v.rawValue / maxVal) * 100),
      rawValue: v.rawValue,
    }));
  }, [statCategories, sportStats, teamTotals]);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Vue d'ensemble équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" opacity={0.3} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="Équipe" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Tooltip formatter={(value: number, _name: string, props: any) => [props.payload.rawValue, "Total"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={statCategories[0]?.key || "general"} className="w-full">
        <TabsList className={`grid w-full grid-cols-${Math.min(statCategories.length, 4)}`}>
          {statCategories.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="gap-1 text-xs">
              {getCategoryIcon(cat.key)}
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {statCategories.map(cat => {
          const categoryStats = sportStats.filter(s => s.category === cat.key);
          return (
            <TabsContent key={cat.key} value={cat.key}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categoryStats.map(stat => {
                  const val = teamTotals.totals[stat.key] || 0;
                  const avg = teamTotals.matchCount > 0 ? Math.round((val / teamTotals.matchCount) * 10) / 10 : 0;
                  const prog = teamProgression[stat.key] || 0;
                  return (
                    <div key={stat.key} className="p-3 bg-muted/50 rounded-lg text-center space-y-1">
                      <p className="text-2xl font-bold">
                        {stat.computedFrom ? `${val}%` : val}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                      <div className="flex items-center justify-center gap-2">
                        {!stat.computedFrom && (
                          <span className="text-xs text-muted-foreground">Moy: {avg}</span>
                        )}
                        {matchesData.length >= 2 && !stat.computedFrom && (
                          <ProgressionBadge value={prog} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
