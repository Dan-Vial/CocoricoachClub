import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingDown, TrendingUp, Minus, Info } from "lucide-react";
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
    for (let i = 0; i < 10; i++) {
      let strikes = 0, spares = 0, opens = 0, totalFirstPins = 0;
      let singlePinCount = 0, singlePinConverted = 0;
      
      gamesWithFrames.forEach(game => {
        const frame = game.frames![i];
        if (!frame || frame.throws.length === 0) return;
        
        const firstThrow = frame.throws[0];
        totalFirstPins += firstThrow?.pins || 0;

        if (firstThrow?.value === "X") {
          strikes++;
        } else if (i < 9) {
          // Check single pin spare opportunity
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
      const spareOpportunities = total - strikes;
      stats.push({
        frameNumber: i + 1,
        strikeCount: strikes,
        spareCount: spares,
        openCount: opens,
        singlePinCount,
        singlePinConverted,
        totalGames: total,
        strikeRate: total > 0 ? (strikes / total) * 100 : 0,
        spareRate: spareOpportunities > 0 ? Math.min(100, (spares / spareOpportunities) * 100) : 0,
        openRate: spareOpportunities > 0 ? Math.min(100, (opens / spareOpportunities) * 100) : 0,
        singlePinConvRate: singlePinCount > 0 ? (singlePinConverted / singlePinCount) * 100 : 0,
        avgFirstThrowPins: total > 0 ? totalFirstPins / total : 0,
      });
    }
    return stats;
  }, [gamesWithFrames]);

  const bestFrame = useMemo(() => {
    if (frameStats.length === 0) return null;
    return frameStats.reduce((best, f) => f.strikeRate > best.strikeRate ? f : best);
  }, [frameStats]);

  const worstFrame = useMemo(() => {
    if (frameStats.length === 0) return null;
    return frameStats.reduce((worst, f) => f.strikeRate < worst.strikeRate ? f : worst);
  }, [frameStats]);

  const thirds = useMemo(() => {
    if (frameStats.length === 0) return null;
    const start = frameStats.slice(0, 3);
    const mid = frameStats.slice(3, 7);
    const end = frameStats.slice(7, 10);
    
    const avgRate = (frames: FrameStats[], key: keyof FrameStats) => 
      frames.reduce((s, f) => s + (f[key] as number), 0) / frames.length;

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

    return {
      start: computePhase(start, "Début (1-3)"),
      mid: computePhase(mid, "Milieu (4-7)"),
      end: computePhase(end, "Fin (8-10)"),
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
      {/* Partie analysis: début/milieu/fin */}
      {thirds && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Performance par phase de partie
              <Badge variant="secondary" className="text-xs">{gamesWithFrames.length} parties</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[thirds.start, thirds.mid, thirds.end].map((phase, idx) => {
                const isHighest = phase.strikeRate === Math.max(thirds.start.strikeRate, thirds.mid.strikeRate, thirds.end.strikeRate);
                const isLowest = phase.strikeRate === Math.min(thirds.start.strikeRate, thirds.mid.strikeRate, thirds.end.strikeRate);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-center ${
                      isHighest ? "border-green-300 bg-green-50 dark:bg-green-900/20" :
                      isLowest ? "border-red-300 bg-red-50 dark:bg-red-900/20" :
                      "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isHighest && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {isLowest && <TrendingDown className="h-3 w-3 text-red-600" />}
                      {!isHighest && !isLowest && <Minus className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs font-medium">{phase.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${isHighest ? "text-green-600" : isLowest ? "text-red-600" : ""}`}>
                      {phase.strikeRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      % Strike
                      <StatInfoIcon text="Le % de strikes correspond au pourcentage de frames où le premier lancer abat les 10 quilles." />
                    </p>
                    <div className="mt-2 space-y-0.5 text-[10px]">
                      <div className="flex justify-center items-center gap-0.5">
                        <span>Spare: {phase.spareRate.toFixed(0)}%</span>
                        <StatInfoIcon text="Le % Spare correspond au pourcentage de frames fermées lorsque le premier lancer n'est pas un strike." />
                      </div>
                      <div className="flex justify-center items-center gap-0.5">
                        <span>Open: {phase.openRate.toFixed(0)}%</span>
                        <StatInfoIcon text="Le % Open correspond au pourcentage de frames non fermées lorsque le premier lancer n'est pas un strike." />
                      </div>
                      <div className="flex justify-center items-center gap-0.5">
                        <span>QS: {phase.singlePinConvRate.toFixed(0)}%</span>
                        <StatInfoIcon text="Le % de quilles seules converties correspond au pourcentage de spares réussis lorsqu'il ne reste qu'une seule quille après le premier lancer." />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center italic">
              {thirds.start.strikeRate > thirds.end.strikeRate + 5
                ? "📈 Meilleur en début de partie, performance qui baisse en fin"
                : thirds.end.strikeRate > thirds.start.strikeRate + 5
                ? "📈 Meilleur en fin de partie, monte en puissance"
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
            % Strike par frame
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {frameStats.map(f => {
              const isBest = bestFrame && f.frameNumber === bestFrame.frameNumber;
              const isWorst = worstFrame && f.frameNumber === worstFrame.frameNumber;
              return (
                <div key={f.frameNumber} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">
                    Frame {f.frameNumber}
                    {isBest && <span className="ml-1 text-green-600">★</span>}
                    {isWorst && <span className="ml-1 text-red-600">▼</span>}
                  </div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${f.strikeRate}%` }}
                      title={`Strike: ${f.strikeRate.toFixed(1)}%`}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${f.spareRate}%` }}
                      title={`Spare: ${f.spareRate.toFixed(1)}%`}
                    />
                    <div
                      className="h-full bg-red-400/50 transition-all"
                      style={{ width: `${f.openRate}%` }}
                      title={`Open: ${f.openRate.toFixed(1)}%`}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-bold">{f.strikeRate.toFixed(0)}%</span>
                    <span className="text-[10px] text-muted-foreground ml-1">X</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              Strike
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              Spare
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-400/50" />
              Open
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
