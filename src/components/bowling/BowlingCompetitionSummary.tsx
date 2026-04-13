import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Trophy, Circle, TrendingUp, Zap, Info, MessageSquareText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Round, BowlingBlock } from "./BowlingBlockManager";
import { getStatTextColor, getStatColor } from "@/lib/bowling/statColors";
import { BOWLING_COMPETITION_CATEGORIES, BOWLING_PHASES } from "./BowlingBlockManager";

interface BowlingCompetitionSummaryProps {
  rounds: Round[];
  blocks: BowlingBlock[];
  playerName: string;
  getBallName?: (ballId: string) => string;
}

interface DetailedStats {
  games: number;
  totalPins: number;
  average: number;
  high: number;
  low: number;
  avgStrikeRate: number;
  avgSpareRate: number;
  singlePinConvRate: number;
  splitConvRate: number;
  pocketPct: number;
  hasPocketData: boolean;
}

interface BlockDetailedStats extends DetailedStats {
  block: BowlingBlock;
  blockIndex: number;
}

interface BallStats {
  ballId: string;
  ballName: string;
  gamesUsed: number;
  framesUsed: number;
  strikes: number;
  strikeRate: number;
}

function StatTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground inline-block ml-1 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function computeDetailedStats(roundsWithScores: Round[], blocks?: BowlingBlock[]): DetailedStats | null {
  const total = roundsWithScores.length;
  if (total === 0) return null;
  const totalPins = roundsWithScores.reduce((s, r) => s + (r.stats["gameScore"] || 0), 0);
  const high = Math.max(...roundsWithScores.map(r => r.stats["gameScore"] || 0));
  const low = Math.min(...roundsWithScores.map(r => r.stats["gameScore"] || 0));
  const avg = totalPins / total;
  const avgStrikeRate = roundsWithScores.reduce((s, r) => s + (r.stats["strikePercentage"] || 0), 0) / total;
  const avgSpareRate = roundsWithScores.reduce((s, r) => s + (r.stats["sparePercentage"] || 0), 0) / total;

  const totalSP = roundsWithScores.reduce((s, r) => s + (r.stats["singlePinCount"] || 0), 0);
  const convertedSP = roundsWithScores.reduce((s, r) => s + (r.stats["singlePinConverted"] || 0), 0);
  const totalSplits = roundsWithScores.reduce((s, r) => s + (r.stats["splitCount"] || 0), 0);
  const totalSplitsConverted = roundsWithScores.reduce((s, r) => s + (r.stats["splitConverted"] || 0), 0);

  // Only compute pocket stats from rounds in blocks with trackPockets enabled
  const pocketBlockIds = blocks
    ? new Set(blocks.filter(b => b.trackPockets !== false).map(b => b.id))
    : null;
  const pocketRounds = pocketBlockIds
    ? roundsWithScores.filter(r => r.blockId && pocketBlockIds.has(r.blockId))
    : roundsWithScores;
  const hasPocketData = pocketRounds.length > 0;
  const pocketPct = hasPocketData
    ? pocketRounds.reduce((s, r) => s + (r.stats["pocketPercentage"] || 0), 0) / pocketRounds.length
    : 0;

  return {
    games: total,
    totalPins,
    average: avg,
    high,
    low,
    avgStrikeRate,
    avgSpareRate,
    singlePinConvRate: totalSP > 0 ? (convertedSP / totalSP) * 100 : 0,
    splitConvRate: totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0,
    pocketPct,
    hasPocketData,
  };
}

function StatsGrid({ stats, compact = false }: { stats: DetailedStats; compact?: boolean }) {
  const items = [
    { label: "High", value: String(stats.high), bgClass: null as string | null, statType: null as string | null },
    { label: "Low", value: String(stats.low), bgClass: null, statType: null },
    { label: "Moy", value: stats.average.toFixed(1), bgClass: null, statType: null },
    { label: "% Strike", value: `${stats.avgStrikeRate.toFixed(1)}%`, bgClass: getStatColor("strike", stats.avgStrikeRate).bg, statType: getStatColor("strike", stats.avgStrikeRate).text },
    { label: "% Spare", value: `${stats.avgSpareRate.toFixed(1)}%`, bgClass: getStatColor("spare", stats.avgSpareRate).bg, statType: getStatColor("spare", stats.avgSpareRate).text },
    { label: "% QS conv.", value: `${stats.singlePinConvRate.toFixed(0)}%`, bgClass: getStatColor("singlePin", stats.singlePinConvRate).bg, statType: getStatColor("singlePin", stats.singlePinConvRate).text },
    { label: "% Split conv.", value: `${stats.splitConvRate.toFixed(0)}%`, bgClass: null, statType: null },
  ];

  const getTextClass = (item: typeof items[0]) => {
    if (!item.bgClass) return "";
    if (item.statType?.includes("text-red")) return "text-red-600 font-extrabold";
    return "text-white";
  };

  if (compact) {
    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {items.map(item => (
          <div key={item.label} className={`p-1 rounded ${item.bgClass ? `${item.bgClass} ${getTextClass(item)}` : "bg-muted/50"}`}>
            <p className="text-xs font-bold">{item.value}</p>
            <p className={`text-[8px] leading-tight ${item.bgClass ? "opacity-80" : "text-muted-foreground"}`}>{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {items.map(item => (
        <div key={item.label} className={`p-2 rounded-lg ${item.bgClass ? `${item.bgClass} ${getTextClass(item)}` : "border"}`}>
          <p className="text-lg font-bold">{item.value}</p>
          <p className={`text-[10px] ${item.bgClass ? "opacity-80" : "text-muted-foreground"}`}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function BowlingCompetitionSummary({
  rounds,
  blocks,
  playerName,
  getBallName,
}: BowlingCompetitionSummaryProps) {
  const allRoundsWithScores = rounds.filter(r => (r.stats["gameScore"] || 0) > 0);
  const total = allRoundsWithScores.length;

  const overall = useMemo(() => computeDetailedStats(allRoundsWithScores, blocks), [allRoundsWithScores, blocks]);

  // Stats per block
  const blockStats: BlockDetailedStats[] = useMemo(() => {
    return blocks.map((block, idx) => {
      const blockRounds = allRoundsWithScores.filter(r => r.blockId === block.id);
      const stats = computeDetailedStats(blockRounds, [block]);
      if (!stats) {
        return { block, blockIndex: idx, games: 0, totalPins: 0, average: 0, high: 0, low: 0, avgStrikeRate: 0, avgSpareRate: 0, singlePinConvRate: 0, splitConvRate: 0, pocketPct: 0, hasPocketData: block.trackPockets !== false };
      }
      return { ...stats, block, blockIndex: idx };
    }).filter(b => b.games > 0);
  }, [blocks, allRoundsWithScores]);

  // Stats per ball
  const ballStats: BallStats[] = useMemo(() => {
    const ballMap = new Map<string, { games: Set<number>; frames: number; strikes: number }>();
    
    allRoundsWithScores.forEach(round => {
      if (!round.ballData) return;
      if (round.ballData.mode === "simple" && round.ballData.ballId) {
        const id = round.ballData.ballId;
        if (!ballMap.has(id)) ballMap.set(id, { games: new Set(), frames: 0, strikes: 0 });
        const entry = ballMap.get(id)!;
        entry.games.add(round.round_number);
        entry.frames += 10;
        entry.strikes += round.stats["strikes"] || 0;
      } else if (round.ballData.mode === "advanced" && round.ballData.frameBalls) {
        round.ballData.frameBalls.forEach((ballId, frameIdx) => {
          if (!ballId) return;
          if (!ballMap.has(ballId)) ballMap.set(ballId, { games: new Set(), frames: 0, strikes: 0 });
          const entry = ballMap.get(ballId)!;
          entry.games.add(round.round_number);
          entry.frames += 1;
          if (round.bowlingFrames && round.bowlingFrames[frameIdx]) {
            const frame = round.bowlingFrames[frameIdx];
            if (frame.throws[0]?.value === "X") entry.strikes += 1;
          }
        });
      }
    });

    return Array.from(ballMap.entries()).map(([ballId, data]) => ({
      ballId,
      ballName: getBallName ? getBallName(ballId) : ballId,
      gamesUsed: data.games.size,
      framesUsed: data.frames,
      strikes: data.strikes,
      strikeRate: data.frames > 0 ? (data.strikes / data.frames) * 100 : 0,
    })).sort((a, b) => b.framesUsed - a.framesUsed);
  }, [allRoundsWithScores, getBallName]);

  if (total === 0 || !overall) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune partie enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global competition header */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Vue d'ensemble — {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main KPIs */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold text-primary">{total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Parties</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 text-center">
              <p className="text-2xl font-bold text-amber-600">{overall.high}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">High Game</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-2xl font-bold text-blue-600">{overall.average.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Moyenne</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold">{overall.totalPins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Pins</p>
            </div>
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
            <div className={`p-2 rounded-lg ${getStatColor("strike", overall.avgStrikeRate).bg}`}>
              <p className={`text-lg font-bold ${getStatColor("strike", overall.avgStrikeRate).text.includes("text-red") ? "text-red-600" : "text-white"}`}>{overall.avgStrikeRate.toFixed(1)}%</p>
              <p className="text-[9px] text-white opacity-80">% Strike</p>
            </div>
            <div className={`p-2 rounded-lg ${getStatColor("spare", overall.avgSpareRate).bg}`}>
              <p className={`text-lg font-bold ${getStatColor("spare", overall.avgSpareRate).text.includes("text-red") ? "text-red-600" : "text-white"}`}>{overall.avgSpareRate.toFixed(1)}%</p>
              <p className="text-[9px] text-white opacity-80">% Spare</p>
            </div>
            <div className={`p-2 rounded-lg ${getStatColor("singlePin", overall.singlePinConvRate).bg}`}>
              <p className={`text-lg font-bold ${getStatColor("singlePin", overall.singlePinConvRate).text.includes("text-red") ? "text-red-600" : "text-white"}`}>{overall.singlePinConvRate.toFixed(0)}%</p>
              <p className="text-[9px] text-white opacity-80">% QS conv.</p>
            </div>
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold text-orange-600">{overall.splitConvRate.toFixed(0)}%</p>
              <p className="text-[9px] text-muted-foreground">% Split conv.</p>
            </div>
            {overall.hasPocketData && (
              <div className={`p-2 rounded-lg ${getStatColor("pocket", overall.pocketPct).bg}`}>
                <p className={`text-lg font-bold ${getStatColor("pocket", overall.pocketPct).text.includes("text-red") ? "text-red-600" : "text-white"}`}>{overall.pocketPct.toFixed(0)}%</p>
                <p className="text-[9px] text-white opacity-80">% Pocket</p>
              </div>
            )}
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold text-red-500">{overall.low}</p>
              <p className="text-[9px] text-muted-foreground">Low Game</p>
            </div>
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold">{overall.totalPins}</p>
              <p className="text-[9px] text-muted-foreground">Total Pins</p>
            </div>
          </div>

          {/* All games list */}
          <div className="space-y-0.5">
            {allRoundsWithScores
              .sort((a, b) => a.round_number - b.round_number)
              .map((round, i) => (
                <div key={round.round_number} className="flex items-center justify-between px-2 py-1 rounded text-xs bg-muted/30">
                  <span className="text-muted-foreground">Partie {i + 1}</span>
                  <span className="font-mono font-bold">{round.stats["gameScore"]}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats per block */}
      {blockStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Statistiques par bloc
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockStats.map((bs) => {
              const catLabel = BOWLING_COMPETITION_CATEGORIES.find(c => c.value === bs.block.bowlingCategory)?.label;
              const phaseLabel = BOWLING_PHASES.find(p => p.value === bs.block.phase)?.label;

              return (
                <div key={bs.block.id} className="p-3 rounded-lg border space-y-2">
                  {/* Block header */}
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">Bloc {bs.blockIndex + 1}</span>
                      {catLabel && <Badge variant="secondary" className="text-xs">{catLabel}</Badge>}
                      {phaseLabel && <Badge variant="outline" className="text-xs">{phaseLabel}</Badge>}
                      {bs.block.opponent_name && (
                        <span className="text-xs text-muted-foreground">vs {bs.block.opponent_name}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">{bs.games} partie{bs.games > 1 ? "s" : ""}</Badge>
                  </div>

                  {/* Block KPIs - same stats as overview */}
                  <StatsGrid stats={bs} compact />

                  {/* Individual games in block */}
                  <div className="space-y-0.5">
                    {allRoundsWithScores
                      .filter(r => r.blockId === bs.block.id)
                      .sort((a, b) => a.round_number - b.round_number)
                      .map((round, i) => (
                        <div key={round.round_number} className="flex items-center justify-between px-2 py-1 rounded text-xs bg-muted/30">
                          <span className="text-muted-foreground">Partie {i + 1}</span>
                          <span className="font-mono font-bold">{round.stats["gameScore"]}</span>
                        </div>
                      ))}
                  </div>

                  {/* Debriefing if exists */}
                  {bs.block.debriefing && (
                    <div className="p-2 rounded border border-primary/10 bg-primary/5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquareText className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-semibold uppercase text-primary">Débriefing</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-line">{bs.block.debriefing}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats per ball */}
      {ballStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Circle className="h-4 w-4 text-primary fill-primary" />
              Statistiques par boule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ballStats.map(bs => (
                <div key={bs.ballId} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{bs.ballName}</p>
                    <p className="text-xs text-muted-foreground">
                      {bs.gamesUsed} partie{bs.gamesUsed > 1 ? "s" : ""} · {bs.framesUsed} frames
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-amber-600">{bs.strikes}</p>
                      <p className="text-[10px] text-muted-foreground">Strikes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{bs.strikeRate.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">% Strike</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
