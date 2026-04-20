import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Trash2, RotateCcw, MapPin, BarChart3 } from "lucide-react";
import { getPositionLabel, computeZoneStats } from "@/lib/utils/kickingFieldZones";
import { RugbyFieldSVG } from "@/components/rugby/RugbyFieldSVG";

export interface KickAttempt {
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
    kicks: KickAttempt[];
  }) => void;
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
  const [showZones, setShowZones] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setKicks(initialKicks);
    setPendingPos(null);
  }
  if (open !== lastOpen) setLastOpen(open);

  const goalsOnRight = kickingSide === "right";

  const stats = useMemo(() => {
    const s = { conversions: 0, conversionAttempts: 0, penaltiesScored: 0, penaltyAttempts: 0, dropGoals: 0, dropAttempts: 0, points: 0 };
    kicks.forEach((k) => {
      if (k.kickType === "conversion") { s.conversionAttempts++; if (k.success) { s.conversions++; s.points += 2; } }
      else if (k.kickType === "penalty") { s.penaltyAttempts++; if (k.success) { s.penaltiesScored++; s.points += 3; } }
      else if (k.kickType === "drop") { s.dropAttempts++; if (k.success) { s.dropGoals++; s.points += 3; } }
    });
    return s;
  }, [kicks]);

  const confirmKick = (success: boolean) => {
    if (!pendingPos) return;
    setKicks((prev) => [...prev, { id: `k${nextId++}`, x: pendingPos.x, y: pendingPos.y, kickType, success }]);
    setPendingPos(null);
  };

  const removeKick = (id: string) => setKicks((prev) => prev.filter((k) => k.id !== id));

  const handleValidate = () => { onComplete({ ...stats, kicks }); onOpenChange(false); };

  const kicksByType = useMemo(() => {
    const result: Record<string, { total: number; success: number }> = {};
    kicks.forEach((k) => {
      if (!result[k.kickType]) result[k.kickType] = { total: 0, success: 0 };
      result[k.kickType].total++;
      if (k.success) result[k.kickType].success++;
    });
    return result;
  }, [kicks]);

  const zoneStats = useMemo(() => computeZoneStats(kicks, goalsOnRight), [kicks, goalsOnRight]);
  const pendingLabel = pendingPos ? getPositionLabel(pendingPos.x, pendingPos.y, goalsOnRight) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col overflow-hidden p-0">
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Tirs au but — {playerName}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 min-h-0">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center flex-shrink-0">
            <Select value={kickType} onValueChange={setKickType}>
              <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conversion">Transformation</SelectItem>
                <SelectItem value="penalty">Pénalité</SelectItem>
                <SelectItem value="drop">Drop</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button variant={kickingSide === "left" ? "default" : "outline"} size="sm" onClick={() => setKickingSide("left")} className="text-xs h-8">← Gauche</Button>
              <Button variant={kickingSide === "right" ? "default" : "outline"} size="sm" onClick={() => setKickingSide("right")} className="text-xs h-8">Droite →</Button>
            </div>
            {kicks.length > 0 && (
              <>
                <Button variant={showZones ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => setShowZones(!showZones)}>
                  <BarChart3 className="h-3 w-3" />Zones
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-8 gap-1 text-muted-foreground" onClick={() => setKicks([])}>
                  <RotateCcw className="h-3 w-3" />Réinitialiser
                </Button>
              </>
            )}
          </div>

          {/* Stats summary */}
          {kicks.length > 0 && (
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {Object.entries(kicksByType).map(([type, data]) => (
                <Badge key={type} variant="secondary" className="text-xs gap-1">
                  {TYPE_LABELS[type]}: {data.success}/{data.total} ({data.total > 0 ? Math.round((data.success / data.total) * 100) : 0}%)
                </Badge>
              ))}
              <Badge variant="default" className="text-xs">{stats.points} pts</Badge>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
              <span>Transformation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="#f59e0b" strokeWidth="2" /></svg>
              <span>Pénalité</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14"><polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#8b5cf6" strokeWidth="2" /></svg>
              <span>Drop</span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-3 h-3 rounded-full bg-green-500" /> Réussi
              <div className="w-3 h-3 rounded-full bg-red-500" /> Raté
            </div>
          </div>

          {/* Rugby field */}
          <div className="relative w-full max-w-2xl mx-auto flex-shrink-0">
            <RugbyFieldSVG
              goalsOnRight={goalsOnRight}
              onClick={(x, y) => setPendingPos({ x, y })}
              zoneStats={zoneStats}
              showZones={showZones}
              showCursorTracker
            >
              {/* Existing kicks - different shapes per type */}
              {kicks.map((k) => {
                const cx = (k.x / 100) * 600;
                const cy = (k.y / 100) * 400;
                const fillColor = k.success ? "#22c55e" : "#ef4444";
                const strokeColor = k.kickType === "conversion" ? "#3b82f6" : k.kickType === "penalty" ? "#f59e0b" : "#8b5cf6";
                return (
                  <g key={k.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); removeKick(k.id); }}>
                    {k.kickType === "conversion" ? (
                      /* Circle for conversions */
                      <circle cx={cx} cy={cy} r={12} fill={fillColor} opacity={0.85} stroke={strokeColor} strokeWidth="3" />
                    ) : k.kickType === "penalty" ? (
                      /* Square for penalties */
                      <rect x={cx - 10} y={cy - 10} width={20} height={20} rx={3} fill={fillColor} opacity={0.85} stroke={strokeColor} strokeWidth="3" />
                    ) : (
                      /* Diamond for drops */
                      <polygon points={`${cx},${cy - 12} ${cx + 12},${cy} ${cx},${cy + 12} ${cx - 12},${cy}`} fill={fillColor} opacity={0.85} stroke={strokeColor} strokeWidth="3" />
                    )}
                    <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{k.success ? "✓" : "✗"}</text>
                  </g>
                );
              })}
              {/* Pending */}
              {pendingPos && (
                <circle cx={(pendingPos.x / 100) * 600} cy={(pendingPos.y / 100) * 400} r={14} fill="none" stroke="white" strokeWidth="3" strokeDasharray="4 4" opacity={0.9} />
              )}
            </RugbyFieldSVG>

            {/* Confirm overlay */}
            {pendingPos && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-background/95 p-3 rounded-xl shadow-lg border max-w-[95%]">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" /><span>{pendingLabel}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <p className="text-xs text-muted-foreground mr-1">{TYPE_LABELS[kickType]}</p>
                  <Button variant="destructive" size="sm" className="gap-1" onClick={() => confirmKick(false)}>✗ Raté</Button>
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmKick(true)}>✓ Réussi</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingPos(null)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>

          {/* Zone stats table */}
          {showZones && zoneStats.length > 0 && (
            <div className="rounded-lg border overflow-hidden flex-shrink-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-1.5 text-left font-medium">Distance</th>
                    <th className="px-2 py-1.5 text-left font-medium">Position</th>
                    <th className="px-2 py-1.5 text-center font-medium">Réussis</th>
                    <th className="px-2 py-1.5 text-center font-medium">Total</th>
                    <th className="px-2 py-1.5 text-center font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneStats.map((z) => (
                    <tr key={z.zoneKey} className="border-t border-border/50">
                      <td className="px-2 py-1">{z.distLabel}</td>
                      <td className="px-2 py-1">{z.latLabel}</td>
                      <td className="px-2 py-1 text-center font-medium text-green-600">{z.success}</td>
                      <td className="px-2 py-1 text-center">{z.total}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`font-bold ${z.rate >= 70 ? "text-green-600" : z.rate >= 40 ? "text-amber-500" : "text-red-500"}`}>{z.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kick history */}
          {kicks.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto max-h-[120px]">
              <div className="space-y-1">
                {[...kicks].reverse().map((k) => {
                  const posLabel = getPositionLabel(k.x, k.y, goalsOnRight);
                  return (
                    <div key={k.id} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${k.success ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="flex-shrink-0">{TYPE_LABELS[k.kickType]}</span>
                        <span className="text-muted-foreground truncate">{posLabel}</span>
                        <span className="text-muted-foreground flex-shrink-0">{k.success ? `+${TYPE_POINTS[k.kickType]} pts` : "raté"}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => removeKick(k.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center flex-shrink-0">
            Cliquez sur le terrain pour placer un tir • Cliquez sur un tir existant pour le supprimer
          </p>
        </div>

        <div className="flex-shrink-0 border-t px-6 py-4 flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleValidate} className="gap-1">✓ Valider les tirs ({kicks.length})</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
