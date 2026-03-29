import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Trophy, Circle, TrendingUp, Zap } from "lucide-react";
import type { Round, BowlingBlock } from "./BowlingBlockManager";
import { BOWLING_COMPETITION_CATEGORIES, BOWLING_PHASES } from "./BowlingBlockManager";

interface BowlingCompetitionSummaryProps {
  rounds: Round[];
  blocks: BowlingBlock[];
  playerName: string;
  getBallName?: (ballId: string) => string;
}

interface BlockStats {
  block: BowlingBlock;
  blockIndex: number;
  games: number;
  totalPins: number;
  average: number;
  high: number;
  low: number;
  strikes: number;
  spares: number;
  avgStrikeRate: number;
  avgSpareRate: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
}

interface BallStats {
  ballId: string;
  ballName: string;
  gamesUsed: number;
  framesUsed: number;
  totalPins: number;
  strikes: number;
  strikeRate: number;
}

export function BowlingCompetitionSummary({
  rounds,
  blocks,
  playerName,
  getBallName,
}: BowlingCompetitionSummaryProps) {
  const allRoundsWithScores = rounds.filter(r => (r.stats["gameScore"] || 0) > 0);
  const total = allRoundsWithScores.length;

  // Overall stats
  const overall = useMemo(() => {
    if (total === 0) return null;
    const totalPins = allRoundsWithScores.reduce((s, r) => s + (r.stats["gameScore"] || 0), 0);
    const high = Math.max(...allRoundsWithScores.map(r => r.stats["gameScore"] || 0));
    const low = Math.min(...allRoundsWithScores.map(r => r.stats["gameScore"] || 0));
    const avg = totalPins / total;
    const totalStrikes = allRoundsWithScores.reduce((s, r) => s + (r.stats["strikes"] || 0), 0);
    const totalSpares = allRoundsWithScores.reduce((s, r) => s + (r.stats["spares"] || 0), 0);
    const avgStrikeRate = allRoundsWithScores.reduce((s, r) => s + (r.stats["strikePercentage"] || 0), 0) / total;
    const avgSpareRate = allRoundsWithScores.reduce((s, r) => s + (r.stats["sparePercentage"] || 0), 0) / total;
    const totalOpen = allRoundsWithScores.reduce((s, r) => s + (r.stats["openFrames"] || 0), 0);
    const totalSplits = allRoundsWithScores.reduce((s, r) => s + (r.stats["splitCount"] || 0), 0);
    const totalSplitsConverted = allRoundsWithScores.reduce((s, r) => s + (r.stats["splitConverted"] || 0), 0);
    const totalSP = allRoundsWithScores.reduce((s, r) => s + (r.stats["singlePinCount"] || 0), 0);
    const convertedSP = allRoundsWithScores.reduce((s, r) => s + (r.stats["singlePinConverted"] || 0), 0);
    const pocketCount = allRoundsWithScores.reduce((s, r) => s + (r.stats["pocketCount"] || 0), 0);
    const pocketPct = allRoundsWithScores.reduce((s, r) => s + (r.stats["pocketPercentage"] || 0), 0) / total;

    return {
      totalPins, high, low, avg, totalStrikes, totalSpares,
      avgStrikeRate, avgSpareRate, totalOpen, totalSplits, totalSplitsConverted,
      totalSP, convertedSP, pocketCount, pocketPct,
      splitConvRate: totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0,
      spConvRate: totalSP > 0 ? (convertedSP / totalSP) * 100 : 0,
    };
  }, [allRoundsWithScores, total]);

  // Stats per block
  const blockStats: BlockStats[] = useMemo(() => {
    return blocks.map((block, idx) => {
      const blockRounds = allRoundsWithScores.filter(r => r.blockId === block.id);
      if (blockRounds.length === 0) {
        return { block, blockIndex: idx, games: 0, totalPins: 0, average: 0, high: 0, low: 0, strikes: 0, spares: 0, avgStrikeRate: 0, avgSpareRate: 0, openFrames: 0, splitCount: 0, splitConverted: 0 };
      }
      const totalPins = blockRounds.reduce((s, r) => s + (r.stats["gameScore"] || 0), 0);
      const high = Math.max(...blockRounds.map(r => r.stats["gameScore"] || 0));
      const low = Math.min(...blockRounds.map(r => r.stats["gameScore"] || 0));
      return {
        block,
        blockIndex: idx,
        games: blockRounds.length,
        totalPins,
        average: totalPins / blockRounds.length,
        high,
        low,
        strikes: blockRounds.reduce((s, r) => s + (r.stats["strikes"] || 0), 0),
        spares: blockRounds.reduce((s, r) => s + (r.stats["spares"] || 0), 0),
        avgStrikeRate: blockRounds.reduce((s, r) => s + (r.stats["strikePercentage"] || 0), 0) / blockRounds.length,
        avgSpareRate: blockRounds.reduce((s, r) => s + (r.stats["sparePercentage"] || 0), 0) / blockRounds.length,
        openFrames: blockRounds.reduce((s, r) => s + (r.stats["openFrames"] || 0), 0),
        splitCount: blockRounds.reduce((s, r) => s + (r.stats["splitCount"] || 0), 0),
        splitConverted: blockRounds.reduce((s, r) => s + (r.stats["splitConverted"] || 0), 0),
      };
    }).filter(b => b.games > 0);
  }, [blocks, allRoundsWithScores]);

  // Stats per ball
  const ballStats: BallStats[] = useMemo(() => {
    const ballMap = new Map<string, { games: Set<number>; frames: number; strikes: number; totalFirstThrow: number }>();
    
    allRoundsWithScores.forEach(round => {
      if (!round.ballData) return;
      
      if (round.ballData.mode === "simple" && round.ballData.ballId) {
        const id = round.ballData.ballId;
        if (!ballMap.has(id)) ballMap.set(id, { games: new Set(), frames: 0, strikes: 0, totalFirstThrow: 0 });
        const entry = ballMap.get(id)!;
        entry.games.add(round.round_number);
        entry.frames += 10;
        entry.strikes += round.stats["strikes"] || 0;
      } else if (round.ballData.mode === "advanced" && round.ballData.frameBalls) {
        round.ballData.frameBalls.forEach((ballId, frameIdx) => {
          if (!ballId) return;
          if (!ballMap.has(ballId)) ballMap.set(ballId, { games: new Set(), frames: 0, strikes: 0, totalFirstThrow: 0 });
          const entry = ballMap.get(ballId)!;
          entry.games.add(round.round_number);
          entry.frames += 1;
          // Check if this frame was a strike
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
      totalPins: 0, // Would need frame-level data
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
              <p className="text-2xl font-bold text-blue-600">{overall.avg.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Moyenne</p>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <p className="text-2xl font-bold">{overall.totalPins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Pins</p>
            </div>
          </div>

          {/* Strikes & Spares */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-600">{overall.totalStrikes}</p>
                  <p className="text-xs text-muted-foreground">Strikes</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-amber-600">{overall.avgStrikeRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Moy. %</p>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{overall.totalSpares}</p>
                  <p className="text-xs text-muted-foreground">Spares</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-600">{overall.avgSpareRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Moy. %</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced stats row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold text-orange-600">{overall.totalSplits}</p>
              <p className="text-[10px] text-muted-foreground">Splits</p>
              <p className="text-xs font-medium">{overall.splitConvRate.toFixed(0)}% conv.</p>
            </div>
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold">{overall.totalOpen}</p>
              <p className="text-[10px] text-muted-foreground">Open Frames</p>
            </div>
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold">{overall.spConvRate.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">Conv. QS</p>
              <p className="text-xs text-muted-foreground">{overall.convertedSP}/{overall.totalSP}</p>
            </div>
            <div className="p-2 rounded-lg border">
              <p className="text-lg font-bold">{overall.pocketPct.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">Pocket</p>
              <p className="text-xs text-muted-foreground">{overall.pocketCount} total</p>
            </div>
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
              const splitRate = bs.splitCount > 0 ? ((bs.splitConverted / bs.splitCount) * 100).toFixed(0) : "—";

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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{bs.games} partie{bs.games > 1 ? "s" : ""}</Badge>
                    </div>
                  </div>
                  {/* Block KPIs */}
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <div className="p-1.5 rounded bg-muted/50">
                      <p className="text-sm font-bold">{bs.average.toFixed(1)}</p>
                      <p className="text-[9px] text-muted-foreground">Moy</p>
                    </div>
                    <div className="p-1.5 rounded bg-amber-500/10">
                      <p className="text-sm font-bold text-amber-600">{bs.high}</p>
                      <p className="text-[9px] text-muted-foreground">High</p>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      <p className="text-sm font-bold">{bs.avgStrikeRate.toFixed(1)}%</p>
                      <p className="text-[9px] text-muted-foreground">Strikes</p>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      <p className="text-sm font-bold">{bs.avgSpareRate.toFixed(1)}%</p>
                      <p className="text-[9px] text-muted-foreground">Spares</p>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      <p className="text-sm font-bold">{bs.openFrames}</p>
                      <p className="text-[9px] text-muted-foreground">Open</p>
                    </div>
                  </div>
                  {/* Individual games in block */}
                  <div className="space-y-0.5">
                    {allRoundsWithScores
                      .filter(r => r.blockId === bs.block.id)
                      .sort((a, b) => a.round_number - b.round_number)
                      .map((round, i) => (
                        <div key={round.round_number} className="flex items-center justify-between px-2 py-1 rounded text-xs bg-muted/30">
                          <span className="text-muted-foreground">Partie {i + 1}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold">{round.stats["gameScore"]}</span>
                            <span className="text-muted-foreground">
                              {round.stats["strikes"] || 0}X / {round.stats["spares"] || 0}/
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
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
