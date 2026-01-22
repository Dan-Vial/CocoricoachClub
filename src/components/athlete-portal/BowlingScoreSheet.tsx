import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Save, X } from "lucide-react";

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

    allFrames.forEach((frame, frameIndex) => {
      const isTenthFrame = frameIndex === 9;
      
      frame.throws.forEach((throwData, throwIndex) => {
        if (throwData.value === "") return;
        
        totalThrows++;
        
        // Pocket count - only on "first throws" of frames
        // In 10th frame: throw 0, throw 1 if throw 0 was strike, throw 2 if throw 1 was strike
        const isFirstThrowContext = isPocketAllowed(frameIndex, throwIndex, frame);
        if (throwData.isPocket && isFirstThrowContext) {
          pocketCount++;
        }

        // Count strikes
        if (throwData.value === "X") {
          strikes++;
          if (!isTenthFrame || throwIndex === 0) {
            firstThrowCount++;
          } else if (isTenthFrame && throwIndex === 1) {
            // 2nd throw of 10th frame being a strike counts as first throw context
            firstThrowCount++;
          } else if (isTenthFrame && throwIndex === 2 && frame.throws[1]?.value === "X") {
            // 3rd throw after 2nd was strike counts as first throw context
            firstThrowCount++;
          }
        }

        // Count spares (not including the original strike throws)
        if (throwData.value === "/") {
          spares++;
          
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

        // Count single pins - ONLY on first throw of each frame where result = 9 (leaving 1 pin)
        // The logic: first throw = 9 pins means 1 pin left = single pin situation
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
        }
      }
    });

    // Calculate last frame cumulative score as total
    const totalScore = allFrames[9].cumulativeScore || 0;

    // First throw contexts count (for pocket %)
    // Frames 1-9: 1 each = 9, plus up to 3 in 10th frame depending on strikes
    let pocketOpportunities = 9; // frames 1-9
    const tenthFrame = allFrames[9];
    pocketOpportunities++; // 1st throw of 10th
    if (tenthFrame.throws[0]?.value === "X") pocketOpportunities++; // 2nd throw after strike
    if (tenthFrame.throws[1]?.value === "X") pocketOpportunities++; // 3rd throw after strike

    // Calculate percentages
    const strikePercentage = (strikes / 12) * 100;
    
    // Spare % = (spares + splits convertis) / opportunités de spare
    const totalSpareOpportunities = Math.max(0, 10 - strikes + (strikes > 10 ? 2 : 0));
    const sparePercentage = totalSpareOpportunities > 0 
      ? ((spares) / totalSpareOpportunities) * 100 
      : 0;

    const splitPercentage = splitCount > 0 
      ? (splitConverted / splitCount) * 100 
      : 0;

    // Single pin % = how many first throws resulted in 9 pins (single pin situation)
    // Single pin conversion rate = of those, how many were converted
    const singlePinPercentage = pocketOpportunities > 0 
      ? (singlePinCount / pocketOpportunities) * 100 
      : 0;

    const singlePinConversionRate = singlePinCount > 0 
      ? (singlePinConverted / singlePinCount) * 100 
      : 0;

    const pocketPercentage = pocketOpportunities > 0 
      ? (pocketCount / pocketOpportunities) * 100 
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

  // Helper: Check if pocket checkbox is allowed for this throw
  const isPocketAllowed = (frameIndex: number, throwIndex: number, frame: FrameData): boolean => {
    const isTenthFrame = frameIndex === 9;
    
    // Frames 1-9: only first throw
    if (!isTenthFrame) {
      return throwIndex === 0;
    }
    
    // 10th frame:
    // - 1st throw: always allowed
    // - 2nd throw: only if 1st was a strike (fresh pins)
    // - 3rd throw: only if 2nd was a strike (fresh pins)
    if (throwIndex === 0) return true;
    if (throwIndex === 1) return frame.throws[0]?.value === "X";
    if (throwIndex === 2) return frame.throws[1]?.value === "X";
    
    return false;
  };

  // Helper: Check if single pin situation applies (first throw = 9 pins)
  const isSinglePinAllowed = (frameIndex: number, throwIndex: number, frame: FrameData): boolean => {
    // Same logic as pocket - only on "first throw" contexts
    if (!isPocketAllowed(frameIndex, throwIndex, frame)) return false;
    
    // And the throw value must be "9" (leaving 1 pin)
    const throwData = frame.throws[throwIndex];
    return throwData?.value === "9";
  };

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

  // Get cell background color based on throw value
  const getThrowCellStyle = (value: string): string => {
    // Use semantic tokens only (no hard-coded colors)
    if (value === "X") return "bg-primary text-primary-foreground font-bold";
    if (value === "/") return "bg-secondary text-secondary-foreground font-bold";
    if (value === "" || value === "-") return "bg-muted/50";
    return "bg-accent text-accent-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Classic Bowling Score Sheet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Feuille de Score
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            {/* Classic scoresheet table */}
            <table className="min-w-max border-collapse border-2 border-foreground/30 mx-auto">
              <thead>
                <tr>
                  <th className="border border-foreground/20 bg-muted px-2 py-1 text-xs font-medium w-8"></th>
                  {frames.map((_, frameIndex) => (
                    <th 
                      key={frameIndex} 
                      className={`border border-foreground/20 bg-muted px-1 py-1 text-xs font-bold text-center ${
                        frameIndex === 9 ? "min-w-[90px]" : "min-w-[60px]"
                      }`}
                      colSpan={1}
                    >
                      {frameIndex + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Throws row - small boxes at top right of each cell */}
                <tr>
                  <td className="border border-foreground/20 bg-muted/50 text-xs font-medium text-center px-1">
                    Joueur
                  </td>
                  {frames.map((frame, frameIndex) => {
                    const maxThrows = getMaxThrows(frameIndex);
                    const isTenth = frameIndex === 9;
                    
                    return (
                      <td 
                        key={frameIndex} 
                        className="border border-foreground/20 p-0 relative h-16"
                      >
                        {/* Throw boxes at top */}
                        <div className={`absolute top-0 right-0 flex ${isTenth ? "" : ""}`}>
                          {Array.from({ length: maxThrows }).map((_, throwIndex) => {
                            const throwData = frame.throws[throwIndex];
                            const editable = isThrowEditable(frameIndex, throwIndex);
                            const value = throwData?.value || "";
                            
                            // For regular frames, first throw takes more space, second is in corner
                            const isFirstThrow = throwIndex === 0;
                            const boxSize = isTenth 
                              ? "w-[30px] h-[28px]" 
                              : isFirstThrow 
                                ? "w-[30px] h-[28px]" 
                                : "w-[28px] h-[28px]";
                            
                            return (
                              <div 
                                key={throwIndex} 
                                className={`${boxSize} border-l border-b border-foreground/20 ${
                                  throwIndex === 0 && !isTenth ? "border-l-0" : ""
                                }`}
                              >
                                <Input
                                  type="text"
                                  maxLength={1}
                                  value={value}
                                  onChange={(e) => handleThrowInput(frameIndex, throwIndex, e.target.value)}
                                  disabled={!editable}
                                  className={`w-full h-full text-center text-sm font-bold p-0 uppercase rounded-none border-0 focus:ring-1 focus:ring-primary ${getThrowCellStyle(value)}`}
                                  placeholder=""
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Cumulative score - centered at bottom */}
                        <div className="absolute bottom-1 left-0 right-0 text-center text-lg font-bold">
                          {frame.cumulativeScore ?? ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Score Display */}
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-primary/10 rounded-xl px-8 py-4 border border-primary/20">
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-medium">Score Total</div>
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
          <div className="overflow-x-auto">
            <div className="space-y-3 min-w-max">
              {frames.map((frame, frameIndex) => (
                <div key={frameIndex} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium text-muted-foreground shrink-0">
                    Frame {frameIndex + 1}
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {frame.throws.map((throwData, throwIndex) => {
                      if (!throwData.value) return null;
                      
                      const pocketAllowed = isPocketAllowed(frameIndex, throwIndex, frame);
                      const isBonusThrow = frameIndex === 9 && throwIndex >= 1 && 
                        frame.throws.slice(0, throwIndex).every(t => t.value === "X");
                      
                      return (
                        <div 
                          key={throwIndex} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <Badge variant="outline" className="shrink-0">
                            L{throwIndex + 1}: {throwData.value}
                          </Badge>
                          
                          {/* Pocket checkbox - only on first throw contexts */}
                          {pocketAllowed && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`pocket-${frameIndex}-${throwIndex}`}
                                checked={throwData.isPocket}
                                onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isPocket")}
                              />
                              <Label htmlFor={`pocket-${frameIndex}-${throwIndex}`} className="text-xs">
                                Boule en poche
                              </Label>
                            </div>
                          )}

                          {/* Split checkbox - only on first throw of each frame */}
                          {throwIndex === 0 && throwData.value !== "X" && throwData.value !== "/" && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`split-${frameIndex}-${throwIndex}`}
                                checked={throwData.isSplit}
                                onCheckedChange={() => handleCheckboxChange(frameIndex, throwIndex, "isSplit")}
                              />
                              <Label 
                                htmlFor={`split-${frameIndex}-${throwIndex}`} 
                                className="text-xs"
                              >
                                Split
                              </Label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}
