import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Trash2, RotateCcw } from "lucide-react";

interface KickAttempt {
  id: string;
  x: number;
  y: number;
  kickType: string;
  success: boolean;
}

interface MatchKickingFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  playerId: string;
  onComplete: (stats: {
    conversions: number;
    conversionAttempts: number;
    penaltiesScored: number;
    penaltyAttempts: number;
    dropGoals: number;
    dropAttempts: number;
    points: number;
  }) => void;
  /** Pre-existing kicks to initialize from (optional) */
  initialKicks?: KickAttempt[];
}

const TYPE_LABELS: Record<string, string> = {
  conversion: "Transformation",
  penalty: "Pénalité",
  drop: "Drop",
};

const TYPE_POINTS: Record<string, number> = {
  conversion: 2,
  penalty: 3,
  drop: 3,
};

let nextId = 1;

export function MatchKickingFieldDialog({
  open,
  onOpenChange,
  playerName,
  onComplete,
  initialKicks = [],
}: MatchKickingFieldDialogProps) {
  const [kicks, setKicks] = useState<KickAttempt[]>(initialKicks);
  const [kickType, setKickType] = useState<string>("conversion");
  const [kickingSide, setKickingSide] = useState<"left" | "right">("right");
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  // Reset state when dialog opens
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setKicks(initialKicks);
    setPendingPos(null);
  }
  if (open !== lastOpen) setLastOpen(open);

  const stats = useMemo(() => {
    const s = {
      conversions: 0,
      conversionAttempts: 0,
      penaltiesScored: 0,
      penaltyAttempts: 0,
      dropGoals: 0,
      dropAttempts: 0,
      points: 0,
    };
    kicks.forEach((k) => {
      if (k.kickType === "conversion") {
        s.conversionAttempts++;
        if (k.success) { s.conversions++; s.points += 2; }
      } else if (k.kickType === "penalty") {
        s.penaltyAttempts++;
        if (k.success) { s.penaltiesScored++; s.points += 3; }
      } else if (k.kickType === "drop") {
        s.dropAttempts++;
        if (k.success) { s.dropGoals++; s.points += 3; }
      }
    });
    return s;
  }, [kicks]);

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPendingPos({ x, y });
  };

  const confirmKick = (success: boolean) => {
    if (!pendingPos) return;
    setKicks((prev) => [
      ...prev,
      { id: `k${nextId++}`, x: pendingPos.x, y: pendingPos.y, kickType, success },
    ]);
    setPendingPos(null);
  };

  const removeKick = (id: string) => {
    setKicks((prev) => prev.filter((k) => k.id !== id));
  };

  const handleValidate = () => {
    onComplete(stats);
    onOpenChange(false);
  };

  const goalsOnRight = kickingSide === "right";

  const kicksByType = useMemo(() => {
    const result: Record<string, { total: number; success: number }> = {};
    kicks.forEach((k) => {
      if (!result[k.kickType]) result[k.kickType] = { total: 0, success: 0 };
      result[k.kickType].total++;
      if (k.success) result[k.kickType].success++;
    });
    return result;
  }, [kicks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Tirs au but — {playerName}
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center flex-shrink-0">
          <Select value={kickType} onValueChange={setKickType}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conversion">Transformation</SelectItem>
              <SelectItem value="penalty">Pénalité</SelectItem>
              <SelectItem value="drop">Drop</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={kickingSide === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => setKickingSide("left")}
              className="text-xs h-8"
            >
              ← Gauche
            </Button>
            <Button
              variant={kickingSide === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => setKickingSide("right")}
              className="text-xs h-8"
            >
              Droite →
            </Button>
          </div>
          {kicks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 gap-1 text-muted-foreground"
              onClick={() => setKicks([])}
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Stats summary */}
        {kicks.length > 0 && (
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {Object.entries(kicksByType).map(([type, data]) => (
              <Badge key={type} variant="secondary" className="text-xs gap-1">
                {TYPE_LABELS[type]}: {data.success}/{data.total}
                ({data.total > 0 ? Math.round((data.success / data.total) * 100) : 0}%)
              </Badge>
            ))}
            <Badge variant="default" className="text-xs">
              {stats.points} pts
            </Badge>
          </div>
        )}

        {/* Rugby field */}
        <div className="relative w-full max-w-2xl mx-auto flex-shrink-0">
          <svg
            viewBox="0 0 600 400"
            className="w-full border-2 border-primary/20 rounded-lg cursor-crosshair bg-emerald-700/90 dark:bg-emerald-900/80"
            onClick={handleFieldClick}
          >
            <rect x="20" y="10" width="560" height="380" fill="none" stroke="white" strokeWidth="2" opacity={0.6} />
            {goalsOnRight ? (
              <>
                <line x1="580" y1="170" x2="580" y2="230" stroke="white" strokeWidth="5" opacity={0.9} />
                <rect x="565" y="170" width="15" height="60" fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
                <line x1="540" y1="10" x2="540" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="540" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>En-but</text>
                <line x1="440" y1="10" x2="440" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
                <text x="440" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>22m</text>
                <line x1="340" y1="10" x2="340" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
                <line x1="240" y1="10" x2="240" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="240" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
                <text x="340" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                <polygon points="570,200 555,190 555,210" fill="white" opacity={0.3} />
              </>
            ) : (
              <>
                <line x1="20" y1="170" x2="20" y2="230" stroke="white" strokeWidth="5" opacity={0.9} />
                <rect x="20" y="170" width="15" height="60" fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
                <line x1="60" y1="10" x2="60" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="60" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>En-but</text>
                <line x1="160" y1="10" x2="160" y2="390" stroke="white" strokeWidth="1.5" opacity={0.5} />
                <text x="160" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>22m</text>
                <line x1="260" y1="10" x2="260" y2="390" stroke="white" strokeWidth="1" strokeDasharray="5 5" opacity={0.4} />
                <line x1="360" y1="10" x2="360" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="360" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
                <text x="260" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                <polygon points="30,200 45,190 45,210" fill="white" opacity={0.3} />
              </>
            )}
            <circle cx="300" cy="200" r="25" fill="none" stroke="white" strokeWidth="1" opacity={0.3} />

            {/* Existing kicks */}
            {kicks.map((k) => {
              const cx = (k.x / 100) * 600;
              const cy = (k.y / 100) * 400;
              const typeColor = k.kickType === "conversion" ? "#3b82f6" : k.kickType === "penalty" ? "#f59e0b" : "#8b5cf6";
              return (
                <g key={k.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); removeKick(k.id); }}>
                  <circle
                    cx={cx} cy={cy} r={12}
                    fill={k.success ? "#22c55e" : "#ef4444"}
                    opacity={0.85}
                    stroke={typeColor}
                    strokeWidth="3"
                  />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                    {k.success ? "✓" : "✗"}
                  </text>
                </g>
              );
            })}

            {/* Pending position marker */}
            {pendingPos && (
              <circle
                cx={(pendingPos.x / 100) * 600}
                cy={(pendingPos.y / 100) * 400}
                r={14}
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="4 4"
                opacity={0.9}
              />
            )}
          </svg>

          {/* Confirm buttons overlay */}
          {pendingPos && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-background/95 p-3 rounded-xl shadow-lg border">
              <p className="text-xs text-muted-foreground self-center mr-2">
                {TYPE_LABELS[kickType]}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => confirmKick(false)}
              >
                ✗ Raté
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => confirmKick(true)}
              >
                ✓ Réussi
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingPos(null)}
              >
                Annuler
              </Button>
            </div>
          )}
        </div>

        {/* Kick history */}
        {kicks.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[120px]">
            <div className="space-y-1">
              {[...kicks].reverse().map((k) => (
                <div key={k.id} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${k.success ? "bg-green-500" : "bg-red-500"}`} />
                    <span>{TYPE_LABELS[k.kickType]}</span>
                    <span className="text-muted-foreground">
                      {k.success ? `+${TYPE_POINTS[k.kickType]} pts` : "raté"}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeKick(k.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center flex-shrink-0">
          Cliquez sur le terrain pour placer un tir • Cliquez sur un tir existant pour le supprimer
        </p>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleValidate} className="gap-1">
            Valider les tirs ({kicks.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
