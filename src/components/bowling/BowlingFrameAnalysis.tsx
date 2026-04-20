import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingGameData {
  roundId: string;
  score: number;
  strikes: number;
  frames?: FrameData[];
}

interface BowlingFrameAnalysisProps {
  games: BowlingGameData[];
}

interface FrameStats {
  frameNumber: number;
  label: string;
  strikeCount: number;
  spareCount: number;
  openCount: number;
  singlePinCount: number;
  singlePinConverted: number;
  totalGames: number;
  strikeRate: number;
  spareRate: number;
  openRate: number;
  singlePinConvRate: number;
  avgFirstThrowPins: number;
}

function StatInfoIcon({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground cursor-help inline-block ml-0.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BowlingFrameAnalysis({ games }: BowlingFrameAnalysisProps) {
  const gamesWithFrames = useMemo(() => games.filter(g => g.frames && g.frames.length === 10), [games]);

  const frameStats = useMemo((): FrameStats[] => {
    if (gamesWithFrames.length === 0) return [];

    const stats: FrameStats[] = [];

    // Frames 1–9: standard analysis
    for (let i = 0; i < 9; i++) {
      let strikes = 0, spares = 0, opens = 0, totalFirstPins = 0;
      let singlePinCount = 0, singlePinConverted = 0;

      gamesWithFrames.forEach(game => {
        const frame = game.frames![i];
        if (!frame || frame.throws.length === 0) return;

        const firstThrow = frame.throws[0];
        totalFirstPins += firstThrow?.pins || 0;

        if (firstThrow?.value === "X") {
          strikes++;
        } else {
          // Spare opportunity
          const pinsLeft = 10 - (firstThrow?.pins || 0);
          if (pinsLeft === 1) {
            singlePinCount++;
            if (frame.throws[1]?.value === "/") {
              singlePinConverted++;
            }
          }
          if (frame.throws[1]?.value === "/") {
            spares++;
          } else {
            // ALL non-strike non-spare = open (including unconverted splits)
            opens++;
          }
        }
      });

      const total = gamesWithFrames.length;
      stats.push({
        frameNumber: i + 1,
        label: `Frame ${i + 1}`,
        strikeCount: strikes,
        spareCount: spares,
        openCount: opens,
        singlePinCount,
        singlePinConverted,
        totalGames: total,
        strikeRate: total > 0 ? (strikes / total) * 100 : 0,
        spareRate: total > 0 ? (spares / total) * 100 : 0,
        openRate: total > 0 ? (opens / total) * 100 : 0,
        singlePinConvRate: singlePinCount > 0 ? (singlePinConverted / singlePinCount) * 100 : 0,
        avgFirstThrowPins: total > 0 ? totalFirstPins / total : 0,
      });
    }

    // Frame 10: 1st throw of the 10th frame
    {
      let strikes = 0, spares = 0, opens = 0, totalFirstPins = 0;
      let singlePinCount = 0, singlePinConverted = 0;

      gamesWithFrames.forEach(game => {
        const frame = game.frames![9];
        if (!frame || frame.throws.length === 0) return;

        const firstThrow = frame.throws[0];
        totalFirstPins += firstThrow?.pins || 0;

        if (firstThrow?.value === "X") {
          strikes++;
        } else {
          const pinsLeft = 10 - (firstThrow?.pins || 0);
          if (pinsLeft === 1) {
            singlePinCount++;
            if (frame.throws[1]?.value === "/") {
              singlePinConverted++;
            }
          }
          if (frame.throws[1]?.value === "/") {
            spares++;
          } else {
            opens++;
          }
        }
      });

      const total = gamesWithFrames.length;
      stats.push({
        frameNumber: 10,
        label: "Frame 10",
        strikeCount: strikes,
        spareCount: spares,
        openCount: opens,
        singlePinCount,
        singlePinConverted,
        totalGames: total,
        strikeRate: total > 0 ? (strikes / total) * 100 : 0,
        spareRate: total > 0 ? (spares / total) * 100 : 0,
        openRate: total > 0 ? (opens / total) * 100 : 0,
        singlePinConvRate: singlePinCount > 0 ? (singlePinConverted / singlePinCount) * 100 : 0,
        avgFirstThrowPins: total > 0 ? totalFirstPins / total : 0,
      });
    }

    // Frame 11: 2nd throw of 10th frame (only when 1st was a strike)
    {
      let eligible = 0, strikes = 0, spares = 0, opens = 0;

      gamesWithFrames.forEach(game => {
        const frame = game.frames![9];
        if (!frame || frame.throws.length < 2) return;
        const firstThrow = frame.throws[0];
        // Frame 11 only exists if the 1st throw was a strike
        if (firstThrow?.value !== "X") return;

        eligible++;
        const secondThrow = frame.throws[1];
        if (secondThrow?.value === "X") {
          strikes++;
        } else if (frame.throws.length >= 3 && frame.throws[2]?.value === "/") {
          spares++;
        } else {
          opens++;
        }
      });

      if (eligible > 0) {
        stats.push({
          frameNumber: 11,
          label: "Frame 11",
          strikeCount: strikes,
          spareCount: spares,
          openCount: opens,
          singlePinCount: 0,
          singlePinConverted: 0,
          totalGames: eligible,
          strikeRate: (strikes / eligible) * 100,
          spareRate: (spares / eligible) * 100,
          openRate: (opens / eligible) * 100,
          singlePinConvRate: 0,
          avgFirstThrowPins: 0,
        });
      }
    }

    // Frame 12: 3rd throw of 10th frame (only when both 1st and 2nd were strikes)
    // No 13th throw exists, so non-strikes cannot be converted — only Strike vs Non-Strike
    {
      let eligible = 0, strikes = 0, nonStrikes = 0;

      gamesWithFrames.forEach(game => {
        const frame = game.frames![9];
        if (!frame || frame.throws.length < 3) return;
        if (frame.throws[0]?.value !== "X" || frame.throws[1]?.value !== "X") return;

        eligible++;
        const thirdThrow = frame.throws[2];
        if (thirdThrow?.value === "X") {
          strikes++;
        } else {
          // Count as spare (non-strike but no conversion opportunity — not an "open")
          nonStrikes++;
        }
      });

      if (eligible > 0) {
        stats.push({
          frameNumber: 12,
          label: "Frame 12",
          strikeCount: strikes,
          spareCount: nonStrikes, // non-strikes counted as "other" shown in spare color, not open
          openCount: 0, // no opens possible — no 13th throw to fail conversion
          singlePinCount: 0,
          singlePinConverted: 0,
          totalGames: eligible,
          strikeRate: (strikes / eligible) * 100,
          spareRate: (nonStrikes / eligible) * 100,
          openRate: 0,
          singlePinConvRate: 0,
          avgFirstThrowPins: 0,
        });
      }
    }

    return stats;
  }, [gamesWithFrames]);

  const bestFrame = useMemo(() => {
    if (frameStats.length === 0) return null;
    // Only consider frames 1-10 for best/worst
    const main = frameStats.filter(f => f.frameNumber <= 10);
    return main.reduce((best, f) => f.strikeRate > best.strikeRate ? f : best);
  }, [frameStats]);

  const worstFrame = useMemo(() => {
    if (frameStats.length === 0) return null;
    const main = frameStats.filter(f => f.frameNumber <= 10);
    return main.reduce((worst, f) => f.strikeRate < worst.strikeRate ? f : worst);
  }, [frameStats]);

  const phases = useMemo(() => {
    if (frameStats.length === 0) return null;
    const allFrames = frameStats;
    const start = allFrames.filter(f => f.frameNumber >= 1 && f.frameNumber <= 3);
    const mid = allFrames.filter(f => f.frameNumber >= 4 && f.frameNumber <= 6);
    const end = allFrames.filter(f => f.frameNumber >= 7 && f.frameNumber <= 9);
    const moneyTime = allFrames.filter(f => f.frameNumber >= 10 && f.frameNumber <= 12);

    const avgRate = (frames: FrameStats[], key: keyof FrameStats) =>
      frames.length > 0 ? frames.reduce((s, f) => s + (f[key] as number), 0) / frames.length : 0;

    const computePhase = (frames: FrameStats[], label: string) => ({
      label,
      strikeRate: avgRate(frames, "strikeRate"),
      spareRate: avgRate(frames, "spareRate"),
      openRate: avgRate(frames, "openRate"),
      singlePinConvRate: (() => {
        const totalSP = frames.reduce((s, f) => s + f.singlePinCount, 0);
        const convSP = frames.reduce((s, f) => s + f.singlePinConverted, 0);
        return totalSP > 0 ? (convSP / totalSP) * 100 : 0;
      })(),
    });

    const frame10 = allFrames.filter(f => f.frameNumber === 10);
    const frame11 = allFrames.filter(f => f.frameNumber === 11);
    const frame12 = allFrames.filter(f => f.frameNumber === 12);

    return {
      start: computePhase(start, "Début (1-3)"),
      mid: computePhase(mid, "Milieu (4-6)"),
      end: computePhase(end, "Fin (7-9)"),
      frame10: computePhase(frame10, "Frame 10"),
      frame11: computePhase(frame11, "Frame 11"),
      frame12: computePhase(frame12, "Frame 12"),
      moneyTime: computePhase(moneyTime, "Money Time (10-12)"),
    };
  }, [frameStats]);

  if (gamesWithFrames.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée de frames disponible.</p>
            <p className="text-sm mt-2">L'analyse par frame nécessite des parties saisies avec la feuille de score.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Phase analysis */}
      {phases && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Performance par phase de partie
              <Badge variant="secondary" className="text-xs">{gamesWithFrames.length} parties</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const phaseCards = [
                { phase: phases.start, type: "normal" },
                { phase: phases.mid, type: "normal" },
                { phase: phases.end, type: "normal" },
                { phase: phases.frame10, type: "frame" },
                { phase: phases.frame11, type: "frame" },
                { phase: phases.frame12, type: "frame" },
                { phase: phases.moneyTime, type: "gold" },
              ];
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {phaseCards.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-border bg-card text-center">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <span className="text-sm font-semibold">{item.phase.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{item.phase.strikeRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">% Strike</p>
                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">Spare</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.spareRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">Open</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.openRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">QS</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.singlePinConvRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {phaseCards.slice(3).map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border text-center ${
                          item.type === "gold"
                            ? "bg-gradient-to-br from-yellow-400/30 via-amber-300/20 to-yellow-500/30 border-yellow-500/50 ring-2 ring-yellow-500/40"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <span className="text-sm font-semibold">
                            {item.type === "gold" ? "🎯 " : ""}{item.phase.label}
                          </span>
                        </div>
                        <p className={`text-3xl font-bold ${item.type === "gold" ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                          {item.phase.strikeRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">% Strike</p>
                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">Spare</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.spareRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">Open</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.openRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-muted-foreground">QS</span>
                            <span className="font-bold text-foreground text-lg">{item.phase.singlePinConvRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
            <p className="text-xs text-muted-foreground mt-3 text-center italic">
              {phases.start.strikeRate > phases.moneyTime.strikeRate + 5
                ? "📈 Meilleur en début de partie, performance qui baisse en Money Time"
                : phases.moneyTime.strikeRate > phases.start.strikeRate + 5
                ? "📈 Monte en puissance, meilleur en Money Time"
                : "📊 Performance régulière tout au long de la partie"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Frame by frame details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Répartition par frame
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {frameStats.map(f => {
              const isBest = bestFrame && f.frameNumber === bestFrame.frameNumber;
              const isWorst = worstFrame && f.frameNumber === worstFrame.frameNumber;
              const total = f.totalGames;
              const strikePercent = total > 0 ? (f.strikeCount / total) * 100 : 0;
              const sparePercent = total > 0 ? (f.spareCount / total) * 100 : 0;
              const openPercent = total > 0 ? (f.openCount / total) * 100 : 0;

              const isBonus = f.frameNumber > 10;

              return (
                <div key={f.frameNumber} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium flex items-center gap-1">
                    <span className={isBonus ? "text-muted-foreground italic" : ""}>
                      {f.label}
                    </span>
                    {isBest && <span className="text-primary">★</span>}
                    {isWorst && <span className="text-destructive">▼</span>}
                  </div>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden flex relative">
                    {strikePercent > 0 && (
                      <div
                        className="h-full bg-yellow-500 transition-all flex items-center justify-center overflow-visible relative"
                        style={{ width: `${strikePercent}%`, minWidth: strikePercent > 0 ? '28px' : undefined }}
                      >
                         <span className="text-sm font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] whitespace-nowrap">{strikePercent.toFixed(0)}%</span>
                       </div>
                     )}
                     {f.frameNumber < 12 && sparePercent > 0 && (
                       <div
                         className="h-full bg-emerald-500 transition-all flex items-center justify-center overflow-visible relative"
                         style={{ width: `${sparePercent}%`, minWidth: sparePercent > 0 ? '28px' : undefined }}
                       >
                         <span className="text-sm font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] whitespace-nowrap">{sparePercent.toFixed(0)}%</span>
                       </div>
                     )}
                     {openPercent > 0 && (
                       <div
                         className="h-full bg-rose-500 transition-all flex items-center justify-center overflow-visible relative"
                         style={{ width: `${openPercent}%`, minWidth: openPercent > 0 ? '28px' : undefined }}
                       >
                         <span className="text-sm font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] whitespace-nowrap">{openPercent.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="w-24 text-right flex items-center justify-end gap-1">
                    <span className="text-sm font-bold">{strikePercent.toFixed(0)}%</span>
                    <span className="text-[10px] text-muted-foreground">X</span>
                    {isBonus && (
                      <span className="text-[10px] text-muted-foreground ml-1">({total})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              Strike
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              Spare
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-rose-500" />
              Open
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
            Chaque frame totalise 100% (Strike + Spare + Open). Frames 11-12 : lancers bonus de la 10ème frame.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
