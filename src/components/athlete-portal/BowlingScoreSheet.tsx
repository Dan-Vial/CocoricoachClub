import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Target, TrendingUp, Percent, Save, X } from "lucide-react";

interface ThrowData {
  value: string; // "X", "/", "0"-"9", "-" (miss)
  pins: number;
  isPocket: boolean;
  isSplit: boolean;
  isSinglePin: boolean;
  isSinglePinConverted: boolean;
}

interface FrameData {
  throws: ThrowData[];
  score: number | null;
  cumulativeScore: number | null;
}

interface BowlingStats {
  totalScore: number;
  strikes: number;
  spares: number;
  splitCount: number;
  splitConverted: number;
  splitOnLastThrow: number;
  singlePinCount: number;
  singlePinConverted: number;
  pocketCount: number;
  totalThrows: number;
  strikePercentage: number;
  sparePercentage: number;
  splitPercentage: number;
  singlePinPercentage: number;
  singlePinConversionRate: number;
  pocketPercentage: number;
  openFrames: number;
}

interface BowlingScoreSheetProps {
  onSave: (stats: BowlingStats, frames: FrameData[]) => void;
  onCancel: () => void;
  initialFrames?: FrameData[];
}

const createEmptyFrame = (): FrameData => ({
  throws: [],
  score: null,
  cumulativeScore: null,
});

const createEmptyThrow = (): ThrowData => ({
  value: "",
  pins: 0,
  isPocket: false,
  isSplit: false,
  isSinglePin: false,
  isSinglePinConverted: false,
});

export function BowlingScoreSheet({ onSave, onCancel, initialFrames }: BowlingScoreSheetProps) {
  const [frames, setFrames] = useState<FrameData[]>(() => 
    initialFrames || Array.from({ length: 10 }, () => createEmptyFrame())
  );
  const [stats, setStats] = useState<BowlingStats>({
    totalScore: 0,
    strikes: 0,
    spares: 0,
    splitCount: 0,
    splitConverted: 0,
    splitOnLastThrow: 0,
    singlePinCount: 0,
    singlePinConverted: 0,
    pocketCount: 0,
    totalThrows: 0,
    strikePercentage: 0,
    sparePercentage: 0,
    splitPercentage: 0,
    singlePinPercentage: 0,
    singlePinConversionRate: 0,
    pocketPercentage: 0,
    openFrames: 0,
  });

  // Calculate score for a frame
  const calculateFrameScore = useCallback((frameIndex: number, allFrames: FrameData[]): number | null => {
    const frame = allFrames[frameIndex];
    if (!frame.throws.length) return null;

    const isTenthFrame = frameIndex === 9;

    if (isTenthFrame) {
      // 10th frame: sum all pins directly
      return frame.throws.reduce((sum, t) => sum + t.pins, 0);
    }

    const firstThrow = frame.throws[0];
    const secondThrow = frame.throws[1];

    if (!firstThrow) return null;

    // Strike
    if (firstThrow.value === "X") {
      // Need next two throws for bonus
      let bonus1: number | null = null;
      let bonus2: number | null = null;

      const nextFrame = allFrames[frameIndex + 1];
      if (nextFrame?.throws[0]) {
        bonus1 = nextFrame.throws[0].pins;
        if (nextFrame.throws[0].value === "X" && frameIndex < 8) {
          // Strike in next frame, need to look at frame after
          const frameAfter = allFrames[frameIndex + 2];
          if (frameAfter?.throws[0]) {
            bonus2 = frameAfter.throws[0].pins;
          }
        } else if (nextFrame.throws[1]) {
          bonus2 = nextFrame.throws[1].pins;
        }
      }

      if (bonus1 !== null && bonus2 !== null) {
        return 10 + bonus1 + bonus2;
      }
      return null; // Can't calculate yet
    }

    if (!secondThrow) return null;

    // Spare
    if (secondThrow.value === "/") {
      const nextFrame = allFrames[frameIndex + 1];
      if (nextFrame?.throws[0]) {
        return 10 + nextFrame.throws[0].pins;
      }
      return null; // Can't calculate yet
    }

    // Open frame
    return firstThrow.pins + secondThrow.pins;
  }, []);

  // Calculate cumulative scores
  const calculateAllScores = useCallback((allFrames: FrameData[]): FrameData[] => {
    const updatedFrames = [...allFrames];
    let cumulativeScore = 0;

    for (let i = 0; i < 10; i++) {
      const frameScore = calculateFrameScore(i, updatedFrames);
      updatedFrames[i] = {
        ...updatedFrames[i],
        score: frameScore,
        cumulativeScore: frameScore !== null ? cumulativeScore + frameScore : null,
      };
      if (frameScore !== null) {
        cumulativeScore += frameScore;
      }
    }

    return updatedFrames;
  }, [calculateFrameScore]);

  // Calculate statistics
  const calculateStats = useCallback((allFrames: FrameData[]): BowlingStats => {
    let strikes = 0;
    let spares = 0;
    let splitCount = 0;
    let splitConverted = 0;
    let splitOnLastThrow = 0;
    let singlePinCount = 0;
    let singlePinConverted = 0;
    let pocketCount = 0;
    let totalThrows = 0;
    let openFrames = 0;
    let firstThrowCount = 0;
    let spareOpportunities = 0;

    allFrames.forEach((frame, frameIndex) => {
      const isTenthFrame = frameIndex === 9;
      
      frame.throws.forEach((throwData, throwIndex) => {
        if (throwData.value === "") return;
        
        totalThrows++;
        
        if (throwData.isPocket) {
          pocketCount++;
        }

        // Count strikes
        if (throwData.value === "X") {
          strikes++;
          if (!isTenthFrame || throwIndex === 0) {
            firstThrowCount++;
          }
        }

        // Count spares (not including the original strike throws)
        if (throwData.value === "/") {
          spares++;
          spareOpportunities++;
          
          // Check if this spare was a split conversion
          const previousThrow = frame.throws[throwIndex - 1];
          if (previousThrow?.isSplit) {
            splitConverted++;
          }
        }

        // Count splits - exclude 11th and 12th throws (10th frame bonus throws after strikes)
        if (throwData.isSplit) {
          if (isTenthFrame && throwIndex >= 1) {
            // In 10th frame, if previous throws are strikes, this is a bonus throw
            const previousThrows = frame.throws.slice(0, throwIndex);
            const hasStrikeSequence = previousThrows.every(t => t.value === "X");
            if (hasStrikeSequence) {
              splitOnLastThrow++;
            } else {
              splitCount++;
            }
          } else {
            splitCount++;
          }
        }

        // Count single pins
        if (throwData.isSinglePin) {
          singlePinCount++;
          if (throwData.isSinglePinConverted) {
            singlePinConverted++;
          }
        }
      });

      // Count open frames (frames 1-9)
      if (!isTenthFrame && frame.throws.length >= 2) {
        const first = frame.throws[0];
        const second = frame.throws[1];
        if (first.value !== "X" && second.value !== "/") {
          openFrames++;
          spareOpportunities++;
        }
      }

      // For frames with first throw that's not a strike, it's a spare opportunity
      if (!isTenthFrame && frame.throws[0] && frame.throws[0].value !== "X") {
        // Already counted in open frames or spares
      }
    });

    // Calculate last frame cumulative score as total
    const totalScore = allFrames[9].cumulativeScore || 0;

    // Calculate percentages
    const strikePercentage = firstThrowCount > 0 ? (strikes / 12) * 100 : 0;
    
    // Spare % = (spares + splits convertis) / opportunités de spare
    const effectiveSpares = spares; // spares already excludes splits that weren't converted
    const totalSpareOpportunities = Math.max(0, 10 - strikes + (strikes > 10 ? 2 : 0));
    const sparePercentage = totalSpareOpportunities > 0 
      ? ((effectiveSpares) / totalSpareOpportunities) * 100 
      : 0;

    const splitPercentage = splitCount > 0 
      ? (splitConverted / splitCount) * 100 
      : 0;

    const singlePinPercentage = totalThrows > 0 
      ? (singlePinCount / totalThrows) * 100 
      : 0;

    const singlePinConversionRate = singlePinCount > 0 
      ? (singlePinConverted / singlePinCount) * 100 
      : 0;

    const pocketPercentage = firstThrowCount > 0 
      ? (pocketCount / firstThrowCount) * 100 
      : 0;

    return {
      totalScore,
      strikes,
      spares,
      splitCount,
      splitConverted,
      splitOnLastThrow,
      singlePinCount,
      singlePinConverted,
      pocketCount,
      totalThrows,
      strikePercentage: Math.round(strikePercentage * 10) / 10,
      sparePercentage: Math.round(sparePercentage * 10) / 10,
      splitPercentage: Math.round(splitPercentage * 10) / 10,
      singlePinPercentage: Math.round(singlePinPercentage * 10) / 10,
      singlePinConversionRate: Math.round(singlePinConversionRate * 10) / 10,
      pocketPercentage: Math.round(pocketPercentage * 10) / 10,
      openFrames,
    };
  }, []);

  // Update stats when frames change
  useEffect(() => {
    const updatedFrames = calculateAllScores(frames);
    setStats(calculateStats(updatedFrames));
  }, [frames, calculateAllScores, calculateStats]);

  // Handle throw input
  const handleThrowInput = (frameIndex: number, throwIndex: number, value: string) => {
    const upperValue = value.toUpperCase();
    
    // Validate input
    if (upperValue !== "" && 
        upperValue !== "X" && 
        upperValue !== "/" && 
        !/^[0-9]$/.test(upperValue) &&
        upperValue !== "-") {
      return;
    }

    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      const frame = { ...newFrames[frameIndex] };
      const throws = [...frame.throws];

      // Ensure throws array has enough elements
      while (throws.length <= throwIndex) {
        throws.push(createEmptyThrow());
      }

      const currentThrow = { ...throws[throwIndex] };
      currentThrow.value = upperValue;

      // Calculate pins based on value
      if (upperValue === "X") {
        currentThrow.pins = 10;
      } else if (upperValue === "/") {
        // Spare: 10 minus previous pins in this frame
        const previousPins = throws.slice(0, throwIndex).reduce((sum, t) => sum + t.pins, 0);
        currentThrow.pins = 10 - previousPins;
      } else if (upperValue === "-" || upperValue === "") {
        currentThrow.pins = 0;
      } else {
        currentThrow.pins = parseInt(upperValue) || 0;
      }

      throws[throwIndex] = currentThrow;
      frame.throws = throws;
      newFrames[frameIndex] = frame;

      return calculateAllScores(newFrames);
    });
  };

  // Handle checkbox changes
  const handleCheckboxChange = (
    frameIndex: number, 
    throwIndex: number, 
    field: "isPocket" | "isSplit" | "isSinglePin" | "isSinglePinConverted"
  ) => {
    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      const frame = { ...newFrames[frameIndex] };
      const throws = [...frame.throws];

      if (throws[throwIndex]) {
        throws[throwIndex] = {
          ...throws[throwIndex],
          [field]: !throws[throwIndex][field],
        };
        frame.throws = throws;
        newFrames[frameIndex] = frame;
      }

      return newFrames;
    });
  };

  // Get max throws for a frame
  const getMaxThrows = (frameIndex: number): number => {
    if (frameIndex < 9) return 2;
    
    // 10th frame can have up to 3 throws
    const frame = frames[frameIndex];
    if (!frame.throws.length) return 3;
    
    const first = frame.throws[0];
    if (first?.value === "X") return 3;
    
    if (frame.throws.length >= 2) {
      const second = frame.throws[1];
      if (second?.value === "/" || first?.value === "X") return 3;
    }
    
    return 2;
  };

  // Check if throw is editable
  const isThrowEditable = (frameIndex: number, throwIndex: number): boolean => {
    const frame = frames[frameIndex];
    
    // First throw is always editable
    if (throwIndex === 0) return true;
    
    // For frames 1-9
    if (frameIndex < 9) {
      // Second throw only available if first wasn't a strike
      if (throwIndex === 1) {
        return frame.throws[0]?.value !== "X";
      }
      return false;
    }
    
    // 10th frame logic
    if (throwIndex === 1) return true; // Always have 2nd throw in 10th
    if (throwIndex === 2) {
      const first = frame.throws[0];
      const second = frame.throws[1];
      return first?.value === "X" || second?.value === "/" || second?.value === "X";
    }
    
    return false;
  };

  const handleSave = () => {
    onSave(stats, frames);
  };

  return (
    <div className="space-y-6">
      {/* Score Sheet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Feuille de Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="flex gap-1 pb-4 min-w-max">
              {frames.map((frame, frameIndex) => (
                <div
                  key={frameIndex}
                  className={`border rounded-lg ${frameIndex === 9 ? "w-32" : "w-24"} shrink-0`}
                >
                  {/* Frame number */}
                  <div className="text-center text-xs font-medium bg-muted py-1 rounded-t-lg border-b">
                    Frame {frameIndex + 1}
                  </div>
                  
                  {/* Throw inputs */}
                  <div className="flex justify-center gap-0.5 p-1">
                    {Array.from({ length: getMaxThrows(frameIndex) }).map((_, throwIndex) => {
                      const throwData = frame.throws[throwIndex];
                      const editable = isThrowEditable(frameIndex, throwIndex);
                      
                      return (
                        <div key={throwIndex} className="relative">
                          <Input
                            type="text"
                            maxLength={1}
                            value={throwData?.value || ""}
                            onChange={(e) => handleThrowInput(frameIndex, throwIndex, e.target.value)}
                            disabled={!editable}
                            className={`w-8 h-8 text-center text-sm font-bold p-0 uppercase ${
                              throwData?.value === "X" 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                                : throwData?.value === "/" 
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : ""
                            }`}
                            placeholder="-"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Cumulative score */}
                  <div className="text-center text-lg font-bold py-2 border-t bg-muted/50">
                    {frame.cumulativeScore ?? "-"}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Total Score Display */}
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-primary/10 rounded-xl px-8 py-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Score Total</div>
                <div className="text-4xl font-bold text-primary">{stats.totalScore}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Throw Details - Pocket, Split, Single Pin */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Détails des lancers</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="space-y-3 min-w-max">
              {frames.map((frame, frameIndex) => (
                <div key={frameIndex} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium text-muted-foreground shrink-0">
                    Frame {frameIndex + 1}
                  </div>
                  <div className="flex gap-4">
                    {frame.throws.map((throwData, throwIndex) => {
                      if (!throwData.value) return null;
                      
                      const isBonusThrow = frameIndex === 9 && throwIndex >= 1 && 
                        frame.throws.slice(0, throwIndex).every(t => t.value === "X");
                      
                      return (
                        <div 
                          key={throwIndex} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 min-w-[200px]"
                        >
                          <Badge variant="outline" className="shrink-0">
                            L{throwIndex + 1}: {throwData.value}
                          </Badge>
                          
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`pocket-${frameIndex}-${throwIndex}`}
                              checked={throwData.isPocket}
                              onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isPocket")}
                            />
                            <Label htmlFor={`pocket-${frameIndex}-${throwIndex}`} className="text-xs">
                              Poche
                            </Label>
                          </div>

                          {throwData.value !== "X" && throwData.value !== "/" && (
                            <>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`split-${frameIndex}-${throwIndex}`}
                                  checked={throwData.isSplit}
                                  onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isSplit")}
                                  disabled={isBonusThrow}
                                />
                                <Label 
                                  htmlFor={`split-${frameIndex}-${throwIndex}`} 
                                  className={`text-xs ${isBonusThrow ? "text-muted-foreground line-through" : ""}`}
                                >
                                  Split{isBonusThrow ? " (exclu)" : ""}
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`single-${frameIndex}-${throwIndex}`}
                                  checked={throwData.isSinglePin}
                                  onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isSinglePin")}
                                />
                                <Label htmlFor={`single-${frameIndex}-${throwIndex}`} className="text-xs">
                                  Quille seule
                                </Label>
                              </div>

                              {throwData.isSinglePin && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`single-conv-${frameIndex}-${throwIndex}`}
                                    checked={throwData.isSinglePinConverted}
                                    onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isSinglePinConverted")}
                                  />
                                  <Label htmlFor={`single-conv-${frameIndex}-${throwIndex}`} className="text-xs text-green-600">
                                    Convertie
                                  </Label>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistiques calculées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <StatBox 
              label="% Strikes" 
              value={`${stats.strikePercentage}%`}
              detail={`${stats.strikes} strikes`}
            />
            <StatBox 
              label="% Spares" 
              value={`${stats.sparePercentage}%`}
              detail={`${stats.spares} spares (hors splits)`}
            />
            <StatBox 
              label="% Splits conv." 
              value={`${stats.splitPercentage}%`}
              detail={`${stats.splitConverted}/${stats.splitCount} splits`}
              note={stats.splitOnLastThrow > 0 ? `+${stats.splitOnLastThrow} exclu(s)` : undefined}
            />
            <StatBox 
              label="% Quilles seules" 
              value={`${stats.singlePinPercentage}%`}
              detail={`${stats.singlePinCount} situations`}
            />
            <StatBox 
              label="% QS converties" 
              value={`${stats.singlePinConversionRate}%`}
              detail={`${stats.singlePinConverted}/${stats.singlePinCount}`}
            />
            <StatBox 
              label="% Boules en poche" 
              value={`${stats.pocketPercentage}%`}
              detail={`${stats.pocketCount} lancers`}
            />
            <StatBox 
              label="Open frames" 
              value={stats.openFrames.toString()}
              detail="frames sans strike/spare"
            />
            <StatBox 
              label="Score total" 
              value={stats.totalScore.toString()}
              detail="points"
              highlight
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  detail: string;
  note?: string;
  highlight?: boolean;
}

function StatBox({ label, value, detail, note, highlight }: StatBoxProps) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-primary/20 border border-primary/30" : "bg-background border"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
      {note && <div className="text-xs text-orange-600 dark:text-orange-400">{note}</div>}
    </div>
  );
}
