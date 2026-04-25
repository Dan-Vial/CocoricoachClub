import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, TrendingUp, TrendingDown, Minus, Trophy, Target, Shield, Activity, Dumbbell } from "lucide-react";
import type { StatField } from "@/lib/constants/sportStats";
import { getStatCategories } from "@/lib/constants/sportStats";
import { groupStatsByTheme } from "@/lib/statSubGroups";

// Convert seconds to "M'SS" minutes display (e.g., 71 → "1'11", 223 → "3'43")
function formatSecondsToMinutes(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}'${secs.toString().padStart(2, "0")}`;
}

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
  effective_play_time?: number | null;
  longest_play_sequence?: number | null;
  average_play_sequence?: number | null;
}

interface TeamCumulativeStatsProps {
  stats: CumulativeStats[];
  matchesData: MatchData[];
  sportStats: StatField[];
  sportType: string;
  matchesWithScores?: MatchScoreData[];
  /** Optional override for displayed categories — used to hide athletics disciplines no athlete competes in. */
  statCategoriesOverride?: { key: string; label: string }[];
  /** Athletics only: map playerId → set of stat-category keys (ath_lancers, ath_haies…) the player is registered in. */
  playerCategoryMap?: Record<string, Set<string>>;
}

// Lower-is-better keys (rankings, times). For these, "team value" = best (MIN) and "Moy" = mean of player values.
const LOWER_IS_BETTER_TEAM_KEYS = new Set([
  "finalRanking", "ranking", "categoryRanking", "placement",
  "time", "finalTime", "final_time_seconds", "runTime", "splitTime",
  "split50", "split100", "turnTime", "reactionTime", "gapToFirst", "avgPace",
]);

export function TeamCumulativeStats({ stats, matchesData, sportStats, sportType, matchesWithScores = [], statCategoriesOverride, playerCategoryMap }: TeamCumulativeStatsProps) {
  const statCategories = statCategoriesOverride ?? getStatCategories(sportType);

  const isAthletics = (sportType || "").toLowerCase().includes("athl");

  // Helper: returns the subset of players relevant for a given category key.
  // Athletics: filter by playerCategoryMap (only athletes registered in that discipline).
  // Other sports: full team.
  const getScopedStats = (catKey: string): CumulativeStats[] => {
    if (!isAthletics || !playerCategoryMap || catKey === "ath_general") return stats;
    return stats.filter(p => playerCategoryMap[p.playerId]?.has(catKey));
  };

  // Compute totals for a scoped subset of players (per-category for athletics).
  const computeCategoryTotals = (scoped: CumulativeStats[]) => {
    const totals: Record<string, number> = {};
    const means: Record<string, number> = {}; // mean of player values (for Moy on rank-type stats)
    const matchCount = Math.max(...scoped.map(s => s.matchesPlayed), 1);

    sportStats.forEach(stat => {
      if (stat.computedFrom) return;
      if (LOWER_IS_BETTER_TEAM_KEYS.has(stat.key)) {
        // Headline = best (MIN) of player values > 0; Moy = mean of player values > 0
        const vals = scoped.map(p => p.sportData[stat.key] || 0).filter(v => v > 0);
        totals[stat.key] = vals.length > 0 ? Math.min(...vals) : 0;
        means[stat.key] = vals.length > 0
          ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
          : 0;
      } else {
        totals[stat.key] = scoped.reduce((sum, p) => sum + (p.sportData[stat.key] || 0), 0);
      }
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

    return { totals, means, matchCount };
  };

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

  // Aggregate effective play time / longest sequence / average sequence
  // Always render the three tiles when at least one match is selected, so coaches
  // see the slot (with "—" when no value has been entered yet).
  const playTimeSummary = useMemo(() => {
    if (matchesWithScores.length === 0) return null;

    // Accept any non-null numeric value (including 0) so saved data is always reflected.
    const epts = matchesWithScores
      .map(m => m.effective_play_time)
      .filter((v): v is number => typeof v === "number");
    const longs = matchesWithScores
      .map(m => m.longest_play_sequence)
      .filter((v): v is number => typeof v === "number");
    const avgs = matchesWithScores
      .map(m => m.average_play_sequence)
      .filter((v): v is number => typeof v === "number");

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

    return {
      effectivePlayTime: avg(epts),
      longestSequence: longs.length > 0 ? Math.max(...longs) : null,
      averageSequence: avg(avgs),
      count: matchesWithScores.length,
      filledEpt: epts.length,
      filledLong: longs.length,
      filledAvg: avgs.length,
    };
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

  // Use shared sub-group helper (same logic as PlayerCumulativeStats and stats input)
  const groupStats = (catKey: string, statsList: StatField[]) => groupStatsByTheme(catKey, statsList);

  const renderStatTile = (
    stat: StatField,
    catTotals: { totals: Record<string, number>; means: Record<string, number>; matchCount: number },
    opts?: { large?: boolean },
  ) => {
    const large = opts?.large;
    const val = catTotals.totals[stat.key] || 0;
    const isLowerBetter = LOWER_IS_BETTER_TEAM_KEYS.has(stat.key);
    const avg = isLowerBetter
      ? (catTotals.means[stat.key] || 0)
      : (catTotals.matchCount > 0 ? Math.round((val / catTotals.matchCount) * 10) / 10 : 0);
    const prog = teamProgression[stat.key] || 0;
    const neutral = isNeutralStat(stat.key);
    const lowerIsBetter = isLowerBetter || /turnover|missed|error|penalt(y|ies)_conceded|fault|loss|interception_conceded/i.test(stat.key);
    const effectiveProg = lowerIsBetter ? -prog : prog;
    let toneClass = "bg-muted/50 border-border/60";
    if (!neutral && matchesData.length >= 2 && !stat.computedFrom) {
      if (effectiveProg > 0) toneClass = "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/15";
      else if (effectiveProg < 0) toneClass = "bg-destructive/10 border-destructive/30";
      else toneClass = "bg-amber-500/10 border-amber-500/30";
    }
    const displayVal = stat.computedFrom ? `${val}%` : (val === 0 && isLowerBetter ? "—" : val);
    return (
      <Tooltip key={stat.key}>
        <TooltipTrigger asChild>
          <div
            className={`${large ? "p-2.5" : "p-1.5"} rounded-md text-center space-y-0 border ${toneClass}`}
          >
            <p className={`${large ? "text-xl" : "text-base"} font-bold leading-tight`}>
              {displayVal}
            </p>
            <p className={`${large ? "text-[11px]" : "text-[9px]"} text-muted-foreground leading-tight`}>{stat.shortLabel}</p>
            <div className="flex items-center justify-center gap-0.5 flex-wrap">
              {!stat.computedFrom && (
                <span className={`${large ? "text-[10px]" : "text-[9px]"} text-muted-foreground`}>
                  Moy {avg === 0 && isLowerBetter ? "—" : avg}
                </span>
              )}
              {!neutral && matchesData.length >= 2 && !stat.computedFrom && (
                <ProgressionBadge value={prog} />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold">{stat.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="space-y-3">
      {statCategories.map(cat => {
        const categoryStats = sportStats.filter(s => s.category === cat.key);
        if (categoryStats.length === 0) return null;
        const isGeneral = cat.key === "general";
        const groups = groupStats(cat.key, categoryStats);
        const scoped = getScopedStats(cat.key);
        const catTotals = computeCategoryTotals(scoped);
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
              {/* Inject team play-time tiles (TJE / Séq. max / Séq. moy.) in "general" category */}
              {isGeneral && playTimeSummary && (
                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                  <div className="p-1.5 rounded-md text-center space-y-0 border bg-sky-500/10 border-sky-500/30">
                    <p className="text-base font-bold text-sky-600 dark:text-sky-400 leading-tight">
                      {playTimeSummary.effectivePlayTime != null ? playTimeSummary.effectivePlayTime : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Tps de jeu effectif (min)</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      {playTimeSummary.filledEpt > 0 ? `Moy / ${playTimeSummary.filledEpt} match${playTimeSummary.filledEpt > 1 ? "s" : ""}` : "Non renseigné"}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-md text-center space-y-0 border bg-violet-500/10 border-violet-500/30">
                    <p className="text-base font-bold text-violet-600 dark:text-violet-400 leading-tight">
                      {playTimeSummary.longestSequence != null ? formatSecondsToMinutes(playTimeSummary.longestSequence) : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Séquence la + longue (min)</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      {playTimeSummary.filledLong > 0 ? "Record équipe" : "Non renseigné"}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-md text-center space-y-0 border bg-amber-500/10 border-amber-500/30">
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">
                      {playTimeSummary.averageSequence != null ? formatSecondsToMinutes(playTimeSummary.averageSequence) : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Séquence moyenne (min)</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      {playTimeSummary.filledAvg > 0 ? `Moy / ${playTimeSummary.filledAvg} match${playTimeSummary.filledAvg > 1 ? "s" : ""}` : "Non renseigné"}
                    </p>
                  </div>
                </div>
              )}

              {(() => {
                const labeledGroups = groups.filter(g => g.label);
                const unlabeledGroups = groups.filter(g => !g.label);
                return (
                  <>
                    {/* Labeled sub-blocks rendered side-by-side, color-coded by theme */}
                    {labeledGroups.length > 0 && (
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${labeledGroups.length}, minmax(0, 1fr))` }}
                      >
                        {labeledGroups.map(group => (
                          <div
                            key={group.key}
                            className={`rounded-md border p-1.5 space-y-1 ${group.color?.ring || "border-border/50"} ${group.color?.soft || "bg-muted/20"}`}
                          >
                            <p className={`text-[10px] font-semibold uppercase tracking-wide px-0.5 ${group.color?.accent || "text-muted-foreground"}`}>
                              {group.label}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {group.items.map(s => renderStatTile(s, { large: true }))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Unlabeled (full-width) groups remain as a single grid */}
                    {unlabeledGroups.map(group => (
                      <div key={group.key}>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                          {group.items.map(s => renderStatTile(s))}
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
