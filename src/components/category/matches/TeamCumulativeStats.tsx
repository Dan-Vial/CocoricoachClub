import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Minus, Trophy, Target, Shield, Activity, Dumbbell } from "lucide-react";
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

interface MatchScoreData {
  id: string;
  is_home: boolean;
  score_home: number | null;
  score_away: number | null;
}

interface TeamCumulativeStatsProps {
  stats: CumulativeStats[];
  matchesData: MatchData[];
  sportStats: StatField[];
  sportType: string;
  matchesWithScores?: MatchScoreData[];
}

export function TeamCumulativeStats({ stats, matchesData, sportStats, sportType, matchesWithScores = [] }: TeamCumulativeStatsProps) {
  const statCategories = getStatCategories(sportType);

  // Aggregate team totals across all players
  const teamTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const matchCount = Math.max(...stats.map(s => s.matchesPlayed), 1);

    sportStats.forEach(stat => {
      if (stat.computedFrom) return;
      totals[stat.key] = stats.reduce((sum, p) => sum + (p.sportData[stat.key] || 0), 0);
    });

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

  // Aggregate scored / conceded points from matches
  const scoreSummary = useMemo(() => {
    const valid = matchesWithScores.filter(m => m.score_home != null && m.score_away != null);
    if (valid.length === 0) return null;
    let scored = 0, conceded = 0;
    valid.forEach(m => {
      const s = m.is_home ? (m.score_home || 0) : (m.score_away || 0);
      const c = m.is_home ? (m.score_away || 0) : (m.score_home || 0);
      scored += s;
      conceded += c;
    });
    return { scored, conceded, count: valid.length };
  }, [matchesWithScores]);

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
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950 gap-0.5">
        <TrendingUp className="h-3 w-3" />+{value}
      </Badge>
    );
    if (value < 0) return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30 bg-destructive/5 gap-0.5">
        <TrendingDown className="h-3 w-3" />{value}
      </Badge>
    );
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground"><Minus className="h-3 w-3" /></Badge>;
  };

  // Stats that should NOT receive a traffic-light tone (neutral metrics)
  const isNeutralStat = (key: string) =>
    /minutesplayed|playingtime|starts|manofmatch/i.test(key);

  // Sub-group definitions per category. Order matters; first matching group wins.
  // Each group bundles related stats inside a category for clearer reading.
  const subGroupDefs: Record<string, { key: string; label: string; match: (k: string) => boolean }[]> = {
    general: [
      { key: "scrums", label: "Mêlées", match: (k) => /^scrum/i.test(k) },
      { key: "lineouts", label: "Touches", match: (k) => /^lineout/i.test(k) },
    ],
    scoring: [
      { key: "tries", label: "Essais", match: (k) => /^tries$|^tryassists$/i.test(k) },
      { key: "conversions", label: "Transformations", match: (k) => /^conversion/i.test(k) },
      { key: "penalties", label: "Pénalités", match: (k) => /^penalt(y|ies)(scored|attempts)?$/i.test(k) || /^penaltyattempts$|^penaltiesscored$/i.test(k) },
      { key: "drops", label: "Drops", match: (k) => /^drop/i.test(k) },
    ],
  };

  const groupStats = (catKey: string, statsList: StatField[]) => {
    const defs = subGroupDefs[catKey] || [];
    if (defs.length === 0) return [{ key: "_all", label: null as string | null, items: statsList }];
    const buckets: { key: string; label: string | null; items: StatField[] }[] = defs.map(d => ({
      key: d.key, label: d.label, items: [],
    }));
    const others: StatField[] = [];
    statsList.forEach(s => {
      const def = defs.find(d => d.match(s.key));
      if (def) {
        const bucket = buckets.find(b => b.key === def.key)!;
        bucket.items.push(s);
      } else {
        others.push(s);
      }
    });
    const result = buckets.filter(b => b.items.length > 0);
    if (others.length > 0) result.push({ key: "_others", label: result.length > 0 ? "Autres" : null, items: others });
    return result;
  };

  const renderStatTile = (stat: StatField) => {
    const val = teamTotals.totals[stat.key] || 0;
    const avg = teamTotals.matchCount > 0 ? Math.round((val / teamTotals.matchCount) * 10) / 10 : 0;
    const prog = teamProgression[stat.key] || 0;
    const neutral = isNeutralStat(stat.key);
    const lowerIsBetter = /turnover|missed|error|penalt(y|ies)_conceded|fault|loss|interception_conceded/i.test(stat.key);
    const effectiveProg = lowerIsBetter ? -prog : prog;
    let toneClass = "bg-muted/50 border-border/60";
    if (!neutral && matchesData.length >= 2 && !stat.computedFrom) {
      if (effectiveProg > 0) toneClass = "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/15";
      else if (effectiveProg < 0) toneClass = "bg-destructive/10 border-destructive/30";
      else toneClass = "bg-amber-500/10 border-amber-500/30";
    }
    return (
      <div key={stat.key} className={`p-1.5 rounded-md text-center space-y-0 border ${toneClass}`}>
        <p className="text-base font-bold leading-tight">
          {stat.computedFrom ? `${val}%` : val}
        </p>
        <p className="text-[9px] text-muted-foreground leading-tight">{stat.shortLabel}</p>
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {!stat.computedFrom && (
            <span className="text-[9px] text-muted-foreground">Moy {avg}</span>
          )}
          {!neutral && matchesData.length >= 2 && !stat.computedFrom && (
            <ProgressionBadge value={prog} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {statCategories.map(cat => {
        const categoryStats = sportStats.filter(s => s.category === cat.key);
        if (categoryStats.length === 0) return null;
        const isGeneral = cat.key === "general";
        const groups = groupStats(cat.key, categoryStats);
        return (
          <Card key={cat.key} className="border-border/60">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {getCategoryIcon(cat.key)}
                {cat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0 space-y-2">
              {/* Inject scored / conceded tiles at start of "general" category */}
              {isGeneral && scoreSummary && (
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                  <div className="p-1.5 rounded-md text-center space-y-0 border bg-emerald-500/10 border-emerald-500/30">
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{scoreSummary.scored}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Pts marqués</p>
                  </div>
                  <div className="p-1.5 rounded-md text-center space-y-0 border bg-destructive/10 border-destructive/30">
                    <p className="text-base font-bold text-destructive leading-tight">{scoreSummary.conceded}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Pts encaissés</p>
                  </div>
                </div>
              )}
              {(() => {
                const labeledGroups = groups.filter(g => g.label);
                const unlabeledGroups = groups.filter(g => !g.label);
                return (
                  <>
                    {/* Labeled sub-blocks rendered side-by-side */}
                    {labeledGroups.length > 0 && (
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${labeledGroups.length}, minmax(0, 1fr))` }}
                      >
                        {labeledGroups.map(group => (
                          <div
                            key={group.key}
                            className="rounded-md border border-border/50 bg-muted/20 p-1.5 space-y-1"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                              {group.label}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {group.items.map(renderStatTile)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Unlabeled (full-width) groups remain as a single grid */}
                    {unlabeledGroups.map(group => (
                      <div key={group.key}>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                          {group.items.map(renderStatTile)}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
