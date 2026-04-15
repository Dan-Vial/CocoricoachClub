import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Target, TrendingUp, Droplets, Filter } from "lucide-react";
import { getOilCategory, parseOilRatio, type OilCategoryType } from "@/lib/constants/bowlingOilPatterns";
import { getStatColor } from "@/lib/bowling/statColors";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingGameData {
  roundId: string;
  matchId: string;
  playerId: string;
  playerName: string;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  score: number;
  strikes: number;
  spares: number;
  strikePercentage: number;
  sparePercentage: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
  pocketCount: number;
  pocketPercentage: number;
  singlePinCount: number;
  singlePinConverted: number;
  singlePinConversionRate: number;
  frames?: FrameData[];
  trackPockets?: boolean;
}

interface BowlingOilPatternStatsProps {
  games: BowlingGameData[];
  categoryId: string;
}

function ColoredStatRow({ label, value, statType, percentage }: { label: string; value: string; statType?: "pocket" | "strike" | "spare" | "singlePin" | "firstBallGte8"; percentage?: number }) {
  if (statType && percentage !== undefined) {
    const color = getStatColor(statType, percentage);
    const isNoire2 = color.text.includes("text-red");
    const textClass = isNoire2 ? "text-red-600 font-extrabold" : "text-white";
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`font-bold px-2.5 py-0.5 rounded ${color.bg} ${textClass} text-sm`}>{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

const OIL_CATEGORY_BADGES: Record<OilCategoryType, { label: string; className: string }> = {
  sport: {
    label: "🔴 Sportif",
    className: "bg-red-500/15 text-red-600 border-red-500 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500",
  },
  challenge: {
    label: "🔵 Challenge",
    className: "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400",
  },
  recreation: {
    label: "🟢 Récréatif",
    className: "bg-green-100 text-green-800 border-green-400 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400",
  },
};

interface MatchOilInfo {
  matchId: string;
  matchLabel: string;
  matchDate: string;
  oilRatio: string | null;
  oilCategory: OilCategoryType | null;
  oilCategoryLabel: string | null;
  patternName: string | null;
}

export function BowlingOilPatternStats({ games, categoryId }: BowlingOilPatternStatsProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string> | null>(null); // null = not yet initialized
  const [filterByOilType, setFilterByOilType] = useState<OilCategoryType | null>(null);

  // Get unique match IDs
  const uniqueMatchIds = useMemo(() => [...new Set(games.map(g => g.matchId))], [games]);

  // Fetch oil patterns for all matches
  const { data: matchOilData } = useQuery({
    queryKey: ["bowling_oil_patterns_for_matches", categoryId, uniqueMatchIds],
    queryFn: async () => {
      if (uniqueMatchIds.length === 0) return [];

      const { data: oilPatterns } = await supabase
        .from("bowling_oil_patterns")
        .select("id, name, match_id, oil_ratio")
        .in("match_id", uniqueMatchIds);

      const oilMap = new Map<string, { name: string; oil_ratio: string | null }>();
      (oilPatterns || []).forEach((op: any) => {
        if (op.match_id) oilMap.set(op.match_id, { name: op.name, oil_ratio: op.oil_ratio });
      });

      // Build match info
      const matchInfos: MatchOilInfo[] = [];
      const seen = new Set<string>();
      for (const g of games) {
        if (seen.has(g.matchId)) continue;
        seen.add(g.matchId);
        const oil = oilMap.get(g.matchId);
        const cat = oil ? getOilCategory(oil.oil_ratio) : null;
        matchInfos.push({
          matchId: g.matchId,
          matchLabel: g.matchOpponent,
          matchDate: g.matchDate,
          oilRatio: oil?.oil_ratio || null,
          oilCategory: cat?.type || null,
          oilCategoryLabel: cat?.label || null,
          patternName: oil?.name || null,
        });
      }
      return matchInfos.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
    },
    enabled: uniqueMatchIds.length > 0,
  });

  // Determine active match IDs based on filters
  const activeMatchIds = useMemo(() => {
    if (filterByOilType && matchOilData) {
      return new Set(matchOilData.filter(m => m.oilCategory === filterByOilType).map(m => m.matchId));
    }
    if (selectedMatchIds.size > 0) return selectedMatchIds;
    // Default: all matches
    return new Set(uniqueMatchIds);
  }, [filterByOilType, selectedMatchIds, matchOilData, uniqueMatchIds]);

  const filteredGames = useMemo(() => games.filter(g => activeMatchIds.has(g.matchId)), [games, activeMatchIds]);

  // Compute cumulative stats for filtered games
  const stats = useMemo(() => {
    if (filteredGames.length === 0) return null;
    const totalGames = filteredGames.length;
    const totalScore = filteredGames.reduce((s, g) => s + g.score, 0);
    const totalStrikes = filteredGames.reduce((s, g) => s + g.strikes, 0);
    const totalSpares = filteredGames.reduce((s, g) => s + g.spares, 0);
    const totalOpenFrames = filteredGames.reduce((s, g) => s + g.openFrames, 0);
    const totalSplits = filteredGames.reduce((s, g) => s + g.splitCount, 0);
    const totalSplitsConverted = filteredGames.reduce((s, g) => s + g.splitConverted, 0);
    const pocketGames = filteredGames.filter(g => g.trackPockets !== false);
    const totalPocket = pocketGames.reduce((s, g) => s + g.pocketCount, 0);
    const hasPocketData = pocketGames.length > 0;
    const totalSinglePin = filteredGames.reduce((s, g) => s + g.singlePinCount, 0);
    const totalSinglePinConverted = filteredGames.reduce((s, g) => s + g.singlePinConverted, 0);
    const highGame = Math.max(...filteredGames.map(g => g.score));
    const lowGame = Math.min(...filteredGames.map(g => g.score));
    const avgScore = totalScore / totalGames;
    const avgStrikeRate = filteredGames.reduce((s, g) => s + g.strikePercentage, 0) / totalGames;
    const avgSpareRate = filteredGames.reduce((s, g) => s + g.sparePercentage, 0) / totalGames;
    const avgPocketRate = hasPocketData
      ? pocketGames.reduce((s, g) => s + g.pocketPercentage, 0) / pocketGames.length
      : 0;
    const totalFrames = totalGames * 10;
    const openFramePercentage = totalFrames > 0 ? (totalOpenFrames / totalFrames) * 100 : 0;

    let totalFBGte8 = 0;
    let totalFBGte8Opp = 0;
    filteredGames.forEach(g => {
      if (g.frames) {
        g.frames.forEach((frame, fi) => {
          const isTenth = fi === 9;
          frame.throws.forEach((t, ti) => {
            if (t.value === "") return;
            const isFirst = ti === 0 || (isTenth && (
              (ti === 1 && frame.throws[0]?.value === "X") ||
              (ti === 2 && (frame.throws[1]?.value === "X" || frame.throws[1]?.value === "/"))
            ));
            if (!isFirst) return;
            const isLast = isTenth && ti === 2 && (
              (frame.throws[0]?.value === "X" && frame.throws[1]?.value === "X") ||
              (frame.throws[0]?.value !== "X" && frame.throws[1]?.value === "/")
            );
            if (isLast) return;
            totalFBGte8Opp++;
            if (t.pins >= 8) totalFBGte8++;
          });
        });
      }
    });
    const firstBallGte8Percentage = totalFBGte8Opp > 0 ? (totalFBGte8 / totalFBGte8Opp) * 100 : 0;

    return {
      totalGames, totalScore, highGame, lowGame, avgScore,
      totalStrikes, totalSpares, totalOpenFrames,
      totalSplits, totalSplitsConverted,
      totalPocket, totalSinglePin, totalSinglePinConverted,
      avgStrikeRate, avgSpareRate, avgPocketRate, hasPocketData,
      openFramePercentage,
      splitConversionRate: totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0,
      singlePinConversionRate: totalSinglePin > 0 ? (totalSinglePinConverted / totalSinglePin) * 100 : 0,
      firstBallGte8Percentage,
    };
  }, [filteredGames]);

  const toggleMatch = (matchId: string) => {
    setFilterByOilType(null);
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const selectOilType = (type: OilCategoryType) => {
    setSelectedMatchIds(new Set());
    setFilterByOilType(prev => prev === type ? null : type);
  };

  const clearFilters = () => {
    setFilterByOilType(null);
    setSelectedMatchIds(new Set());
  };

  const hasActiveFilter = filterByOilType !== null || selectedMatchIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Filter section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrer par type de huilage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Oil type quick filters */}
          <div className="flex flex-wrap gap-2">
            {(["sport", "challenge", "recreation"] as OilCategoryType[]).map(type => {
              const badge = OIL_CATEGORY_BADGES[type];
              const count = matchOilData?.filter(m => m.oilCategory === type).length || 0;
              return (
                <Button
                  key={type}
                  variant={filterByOilType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectOilType(type)}
                  className="gap-1.5"
                  disabled={count === 0}
                >
                  {badge.label}
                  <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>
                </Button>
              );
            })}
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Tout afficher
              </Button>
            )}
          </div>

          {/* Individual match selection */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Ou sélectionner les compétitions individuellement :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {(matchOilData || []).map(m => {
                const cat = m.oilCategory ? OIL_CATEGORY_BADGES[m.oilCategory] : null;
                const isChecked = filterByOilType
                  ? m.oilCategory === filterByOilType
                  : selectedMatchIds.size === 0 || selectedMatchIds.has(m.matchId);
                return (
                  <label
                    key={m.matchId}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleMatch(m.matchId)}
                      disabled={filterByOilType !== null}
                    />
                    <span className="truncate flex-1">{m.matchLabel}</span>
                    {m.oilRatio && (
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${cat?.className || ""}`}>
                        {m.oilRatio} {m.oilCategoryLabel ? `• ${m.oilCategoryLabel}` : ""}
                      </Badge>
                    )}
                    {!m.oilRatio && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                        Pas de huilage
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-sm">
          <Droplets className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            {filterByOilType
              ? `Huilage ${OIL_CATEGORY_BADGES[filterByOilType].label}`
              : `${selectedMatchIds.size} compétition(s) sélectionnée(s)`}
            {" "}— <span className="font-medium text-foreground">{filteredGames.length} parties</span>
          </span>
        </div>
      )}

      {/* Stats display */}
      {stats ? (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.totalGames}</p>
                  <p className="text-xs text-muted-foreground">Parties</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.avgScore.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Moyenne</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{stats.highGame}</p>
                  <p className="text-xs text-muted-foreground">Partie haute</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">{stats.lowGame}</p>
                  <p className="text-xs text-muted-foreground">Partie basse</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed stats + Reference side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Statistiques détaillées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ColoredStatRow label="% Strikes" value={`${stats.avgStrikeRate.toFixed(1)}%`} statType="strike" percentage={stats.avgStrikeRate} />
                <ColoredStatRow label="% Spares" value={`${stats.avgSpareRate.toFixed(1)}%`} statType="spare" percentage={stats.avgSpareRate} />
                {stats.hasPocketData && <ColoredStatRow label="% Poches" value={`${stats.avgPocketRate.toFixed(1)}%`} statType="pocket" percentage={stats.avgPocketRate} />}
                <ColoredStatRow label="% Quilles seules" value={`${stats.singlePinConversionRate.toFixed(1)}%`} statType="singlePin" percentage={stats.singlePinConversionRate} />
                <ColoredStatRow label="% Conversion splits" value={`${stats.splitConversionRate.toFixed(1)}%`} />
                <ColoredStatRow label="% Boules ≥8" value={`${stats.firstBallGte8Percentage.toFixed(1)}%`} statType="firstBallGte8" percentage={stats.firstBallGte8Percentage} />
                <div>
                  <ColoredStatRow label="% Frames non fermées" value={`${stats.openFramePercentage.toFixed(1)}%`} />
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                    Frames où ni strike ni spare n'a été réalisé.
                  </p>
                </div>
                <div className="border-t pt-2 mt-2" />
                <ColoredStatRow label="Strikes total" value={String(stats.totalStrikes)} />
                <ColoredStatRow label="Spares total" value={String(stats.totalSpares)} />
                <ColoredStatRow label="Splits" value={String(stats.totalSplits)} />
                <ColoredStatRow label="Frames non fermées" value={String(stats.totalOpenFrames)} />
              </CardContent>
            </Card>

            {/* Performance reference */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Référentiel de performance
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1.5 border font-semibold text-muted-foreground">Niveau</th>
                      <th className="p-1.5 border font-semibold text-muted-foreground">Poches</th>
                      <th className="p-1.5 border font-semibold text-muted-foreground">Strikes</th>
                      <th className="p-1.5 border font-semibold text-muted-foreground">Spares</th>
                      <th className="p-1.5 border font-semibold text-muted-foreground">9/</th>
                      <th className="p-1.5 border font-semibold text-muted-foreground">≥8</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Orange", bg: "bg-orange-700", text: "text-white", pocket: "<50%", strike: "<20%", spare: "<50%", single: "<70%", fb8: "<50%" },
                      { label: "Verte 1", bg: "bg-green-400", text: "text-green-950", pocket: "50-60%", strike: "20-30%", spare: "50-60%", single: "70-75%", fb8: "50-65%" },
                      { label: "Verte 2", bg: "bg-green-600", text: "text-white", pocket: "60-65%", strike: "30-35%", spare: "60-70%", single: "75-80%", fb8: "65-75%" },
                      { label: "Verte 3", bg: "bg-green-900", text: "text-white", pocket: "65-70%", strike: "35-40%", spare: "70-80%", single: "80-85%", fb8: "75-85%" },
                      { label: "Bleue 1", bg: "bg-blue-700", text: "text-white", pocket: "70-75%", strike: "40-45%", spare: "80-85%", single: "85-90%", fb8: "85-88%" },
                      { label: "Bleue 2", bg: "bg-blue-800", text: "text-white", pocket: "75-80%", strike: "45-50%", spare: "85-90%", single: "90-95%", fb8: "85-88%" },
                      { label: "Noire 1", bg: "bg-gray-900", text: "text-white", pocket: "80-85%", strike: "50-55%", spare: "90-95%", single: "95-99%", fb8: "88-92%" },
                      { label: "Noire 2", bg: "bg-black", text: "text-red-600", pocket: "≥85%", strike: "≥55%", spare: "≥95%", single: "100%", fb8: "≥92%" },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className={`p-1.5 border ${row.bg} ${row.text} font-bold`}>{row.label}</td>
                        <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.pocket}</td>
                        <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.strike}</td>
                        <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.spare}</td>
                        <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.single}</td>
                        <td className={`p-1.5 border ${row.bg} ${row.text}`}>{row.fb8}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Score evolution */}
          {filteredGames.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Évolution des scores
                  {filterByOilType && (
                    <Badge variant="outline" className={`text-xs ml-2 ${OIL_CATEGORY_BADGES[filterByOilType].className}`}>
                      {OIL_CATEGORY_BADGES[filterByOilType].label}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-center gap-[3px] h-40">
                  {filteredGames.map((game) => {
                    const minBase = 100;
                    const maxScore = Math.max(...filteredGames.map(g => g.score), 300);
                    const range = maxScore - minBase;
                    const clampedScore = Math.max(game.score, minBase);
                    const height = range > 0 ? ((clampedScore - minBase) / range) * 100 : 50;

                    const getBarColor = (score: number) => {
                      if (score >= 240) return "bg-yellow-400";
                      if (score >= 210) return "bg-green-600";
                      if (score >= 180) return "bg-green-400";
                      if (score >= 151) return "bg-orange-500";
                      return "bg-red-500";
                    };

                    return (
                      <div
                        key={game.roundId}
                        className={`${getBarColor(game.score)} rounded-t hover:opacity-80 transition-colors relative group`}
                        style={{ height: `${Math.max(height, 5)}%`, width: "12px", maxWidth: "20px" }}
                        title={`${game.matchOpponent} - Partie ${game.roundNumber}: ${game.score}`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {game.score}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 border-t pt-2 flex items-center justify-center gap-3 flex-wrap text-[9px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" />&lt;150</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-500" />151-179</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-400" />180-209</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-600" />210-239</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-400" />240+</div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  {filteredGames.length} parties • Survol pour détails
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="bg-gradient-card">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Aucune partie correspondant aux filtres sélectionnés.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
