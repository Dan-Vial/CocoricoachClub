import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { RUGBY_PRECISION_EXERCISES, type RugbyPrecisionExerciseMode } from "@/lib/constants/rugbyPrecisionExercises";
import { RugbyFieldSVG } from "@/components/rugby/RugbyFieldSVG";
import { getPositionLabel } from "@/lib/utils/kickingFieldZones";

interface AthletePrecisionFieldInputProps {
  playerId: string;
  categoryId: string;
  sessionId: string;
  onEntryAdded?: () => void;
  initialExerciseType?: string | null;
}

const ZONE_GRID = [
  { row: 0, col: 0, label: "Zone 1" }, { row: 0, col: 1, label: "Zone 2" }, { row: 0, col: 2, label: "Zone 3" }, { row: 0, col: 3, label: "Zone 4" },
  { row: 1, col: 0, label: "Zone 5" }, { row: 1, col: 1, label: "Zone 6" }, { row: 1, col: 2, label: "Zone 7" }, { row: 1, col: 3, label: "Zone 8" },
  { row: 2, col: 0, label: "Zone 9" }, { row: 2, col: 1, label: "Zone 10" }, { row: 2, col: 2, label: "Zone 11" }, { row: 2, col: 3, label: "Zone 12" },
];

const LINEOUT_POSITIONS = [
  { key: "devant", label: "Devant", y: 20, description: "2-4m du lanceur" },
  { key: "milieu", label: "Milieu", y: 50, description: "6-8m du lanceur" },
  { key: "fond", label: "Fond", y: 80, description: "12-15m du lanceur" },
];

export function AthletePrecisionFieldInput({
  playerId,
  categoryId,
  sessionId,
  onEntryAdded,
  initialExerciseType,
}: AthletePrecisionFieldInputProps) {
  const queryClient = useQueryClient();
  const [exerciseType, setExerciseType] = useState(initialExerciseType || RUGBY_PRECISION_EXERCISES[0].value);
  const [kickingSide, setKickingSide] = useState<"left" | "right">("right");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [clickLabel, setClickLabel] = useState("");
  const [attempts, setAttempts] = useState("1");
  const [successes, setSuccesses] = useState("0");
  const [saving, setSaving] = useState(false);
  const [savedEntries, setSavedEntries] = useState<Array<{ label: string; attempts: number; successes: number }>>([]);

  const currentMode = (RUGBY_PRECISION_EXERCISES.find(e => e.value === exerciseType)?.mode || "field") as RugbyPrecisionExerciseMode;
  const goalsOnRight = kickingSide === "right";

  useEffect(() => {
    if (!initialExerciseType) return;
    const hasMatchingOption = RUGBY_PRECISION_EXERCISES.some((exercise) => exercise.value === initialExerciseType);
    if (hasMatchingOption) {
      setExerciseType(initialExerciseType);
    }
  }, [initialExerciseType]);

  // Load existing entries for this session today
  const { data: existingEntries = [] } = useQuery({
    queryKey: ["athlete-precision-entries", categoryId, playerId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precision_training")
        .select("*")
        .eq("category_id", categoryId)
        .eq("player_id", playerId)
        .eq("training_session_id", sessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const allEntries = useMemo(() => {
    const combined = [
      ...existingEntries.map((e: any) => ({ label: e.exercise_label, attempts: e.attempts, successes: e.successes })),
      ...savedEntries,
    ];
    return combined;
  }, [existingEntries, savedEntries]);

  const totalAttempts = allEntries.reduce((s, e) => s + e.attempts, 0);
  const totalSuccesses = allEntries.reduce((s, e) => s + e.successes, 0);
  const globalRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

  const handleFieldClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const yPct = y;
    let distLabel = "";
    if (yPct < 20) distLabel = "10m";
    else if (yPct < 40) distLabel = "22m";
    else if (yPct < 65) distLabel = "40m";
    else distLabel = "50m";
    const xPct = x;
    let sideLabel = "";
    if (xPct < 35) sideLabel = "Gauche";
    else if (xPct > 65) sideLabel = "Droite";
    else sideLabel = "Centre";

    setClickPos({ x, y });
    setClickLabel(`${exerciseType} - ${sideLabel} ${distLabel}`);
    setAttempts("1");
    setSuccesses("0");
    setDialogOpen(true);
  }, [exerciseType]);

  const handleZoneClick = (row: number, col: number, label: string) => {
    setClickPos({ x: col, y: row });
    setClickLabel(`${exerciseType} - ${label}`);
    setAttempts("1");
    setSuccesses("0");
    setDialogOpen(true);
  };

  const handleLineoutClick = (position: typeof LINEOUT_POSITIONS[0]) => {
    setClickPos({ x: 50, y: position.y });
    setClickLabel(`${exerciseType} - ${position.label}`);
    setAttempts("1");
    setSuccesses("0");
    setDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!clickPos) return;
    const att = parseInt(attempts) || 0;
    const suc = parseInt(successes) || 0;
    if (att <= 0) { toast.error("Tentatives > 0"); return; }
    if (suc > att) { toast.error("Réussites ≤ tentatives"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("precision_training").insert({
        player_id: playerId,
        category_id: categoryId,
        training_session_id: sessionId,
        exercise_label: clickLabel,
        attempts: att,
        successes: suc,
        session_date: format(new Date(), "yyyy-MM-dd"),
        zone_x: clickPos.x,
        zone_y: clickPos.y,
      });
      if (error) throw error;

      setSavedEntries(prev => [...prev, { label: clickLabel, attempts: att, successes: suc }]);
      queryClient.invalidateQueries({ queryKey: ["athlete-precision-entries"] });
      setDialogOpen(false);
      setClickPos(null);
      toast.success("Tir enregistré !");
      onEntryAdded?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  // Zone grid stats from existing entries
  const zoneStats = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    existingEntries.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
      const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
      prev.attempts += e.attempts || 0;
      prev.successes += e.successes || 0;
      map.set(zoneKey, prev);
    });
    return Array.from(map.values());
  }, [existingEntries]);

  const zoneGridStats = useMemo(() => {
    const map: Record<string, { attempts: number; successes: number }> = {};
    existingEntries.forEach((e: any) => {
      if (e.zone_x == null || e.zone_y == null) return;
      const key = `${e.zone_x}-${e.zone_y}`;
      if (!map[key]) map[key] = { attempts: 0, successes: 0 };
      map[key].attempts += e.attempts || 0;
      map[key].successes += e.successes || 0;
    });
    return map;
  }, [existingEntries]);

  const lineoutStats = useMemo(() => {
    const map: Record<string, { attempts: number; successes: number }> = {};
    LINEOUT_POSITIONS.forEach(p => { map[p.key] = { attempts: 0, successes: 0 }; });
    existingEntries.forEach((e: any) => {
      if (e.zone_y == null) return;
      const key = LINEOUT_POSITIONS.find(p => p.y === e.zone_y)?.key;
      if (key && map[key]) {
        map[key].attempts += e.attempts || 0;
        map[key].successes += e.successes || 0;
      }
    });
    return map;
  }, [existingEntries]);

  const getZoneGridStat = (row: number, col: number) => {
    const key = `${col}-${row}`;
    return zoneGridStats[key] || { attempts: 0, successes: 0 };
  };

  return (
    <div className="space-y-3 rounded-lg border border-accent/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Entraînement de précision</span>
      </div>

      {/* Exercise type selector */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[150px]">
          <Label className="text-xs">Type d'exercice</Label>
          <Select value={exerciseType} onValueChange={setExerciseType}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUGBY_PRECISION_EXERCISES.map(et => (
                <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {currentMode === "field" && (
          <div className="flex gap-1">
            <Button variant={kickingSide === "left" ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => setKickingSide("left")}>← G</Button>
            <Button variant={kickingSide === "right" ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => setKickingSide("right")}>D →</Button>
          </div>
        )}
      </div>

      {/* Stats summary */}
      {totalAttempts > 0 && (
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="font-mono">{globalRate}%</Badge>
          <Badge variant="secondary" className="font-mono">{totalSuccesses}/{totalAttempts}</Badge>
          <Badge variant="secondary">{allEntries.length} tir{allEntries.length > 1 ? "s" : ""}</Badge>
        </div>
      )}

      {/* FIELD MODE */}
      {currentMode === "field" && (
        <div className="relative w-full">
          <p className="text-xs text-muted-foreground mb-1">Clique sur le terrain pour enregistrer un tir</p>
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
                <text x="340" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                <line x1="240" y1="10" x2="240" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="240" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
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
                <text x="260" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>40m</text>
                <line x1="360" y1="10" x2="360" y2="390" stroke="white" strokeWidth="2" opacity={0.6} />
                <text x="360" y="400" textAnchor="middle" fill="white" fontSize="9" opacity={0.5}>50m</text>
                <polygon points="30,200 45,190 45,210" fill="white" opacity={0.3} />
              </>
            )}
            <circle cx="300" cy="200" r="25" fill="none" stroke="white" strokeWidth="1" opacity={0.3} />
            {zoneStats.map((zone, i) => {
              const cx = (zone.x / 100) * 600;
              const cy = (zone.y / 100) * 400;
              const rate = zone.attempts > 0 ? Math.round((zone.successes / zone.attempts) * 100) : 0;
              const color = rate >= 75 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.7} stroke="white" strokeWidth="2" />
                  <text x={cx} y={cy - 1} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{rate}%</text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="white" fontSize="6" opacity={0.9}>{zone.successes}/{zone.attempts}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ZONE GRID MODE */}
      {currentMode === "zone" && (
        <div className="w-full">
          <p className="text-xs text-muted-foreground mb-1">Clique sur une zone</p>
          <div className="bg-emerald-700/90 dark:bg-emerald-900/80 rounded-lg border-2 border-primary/20 p-2">
            <div className="grid grid-cols-4 gap-1">
              {ZONE_GRID.map((zone, i) => {
                const stat = getZoneGridStat(zone.row, zone.col);
                const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : -1;
                const bgColor = rate < 0 ? "bg-white/10 hover:bg-white/20" :
                  rate >= 75 ? "bg-green-500/60" : rate >= 50 ? "bg-yellow-500/60" : "bg-red-500/60";
                return (
                  <button
                    key={i}
                    className={`${bgColor} border border-white/30 rounded p-2 min-h-[60px] flex flex-col items-center justify-center transition-all cursor-pointer`}
                    onClick={() => handleZoneClick(zone.row, zone.col, zone.label)}
                  >
                    <span className="text-white/60 text-[10px] font-medium">{zone.label}</span>
                    {stat.attempts > 0 ? (
                      <>
                        <span className="text-white text-lg font-bold">{rate}%</span>
                        <span className="text-white/80 text-[10px]">{stat.successes}/{stat.attempts}</span>
                      </>
                    ) : (
                      <span className="text-white/40 text-[10px]">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LINEOUT MODE */}
      {currentMode === "lineout" && (
        <div className="w-full">
          <p className="text-xs text-muted-foreground mb-1">Clique sur la zone de lancer</p>
          <div className="bg-emerald-700/90 dark:bg-emerald-900/80 rounded-lg border-2 border-primary/20 p-3">
            <div className="border-t-4 border-white/70 w-full mb-3" />
            <span className="text-white/60 text-[10px] block text-center mb-3">Ligne de touche</span>
            <div className="space-y-2">
              {LINEOUT_POSITIONS.map(pos => {
                const stat = lineoutStats[pos.key] || { attempts: 0, successes: 0 };
                const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : -1;
                const bgColor = rate < 0 ? "bg-white/10 hover:bg-white/20" :
                  rate >= 75 ? "bg-green-500/50" : rate >= 50 ? "bg-yellow-500/50" : "bg-red-500/50";
                return (
                  <button
                    key={pos.key}
                    className={`${bgColor} w-full border border-white/30 rounded-lg p-3 flex items-center justify-between transition-all cursor-pointer`}
                    onClick={() => handleLineoutClick(pos)}
                  >
                    <div>
                      <span className="text-white font-semibold text-sm">{pos.label}</span>
                      <span className="text-white/60 text-xs ml-2">{pos.description}</span>
                    </div>
                    {stat.attempts > 0 ? (
                      <div className="text-right">
                        <span className="text-white font-bold">{rate}%</span>
                        <span className="text-white/70 text-xs ml-1">{stat.successes}/{stat.attempts}</span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-xs">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent entries for this session */}
      {allEntries.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Tirs enregistrés :</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {allEntries.slice(0, 10).map((entry, i) => {
              const rate = entry.attempts > 0 ? Math.round((entry.successes / entry.attempts) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                  <span className="truncate flex-1">{entry.label}</span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="font-mono">{entry.successes}/{entry.attempts}</span>
                    <Badge variant={rate >= 75 ? "default" : rate >= 50 ? "secondary" : "destructive"} className="text-[10px] px-1">
                      {rate}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog for entering attempts/successes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{clickLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tentatives</Label>
              <Input type="number" min={1} value={attempts} onChange={e => setAttempts(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Réussites</Label>
              <Input type="number" min={0} value={successes} onChange={e => setSuccesses(e.target.value)} className="h-9" />
            </div>
            {parseInt(attempts) > 0 && parseInt(successes) >= 0 && parseInt(successes) <= parseInt(attempts) && (
              <p className="text-xs text-muted-foreground">
                Taux : {Math.round((parseInt(successes) / parseInt(attempts)) * 100)}%
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSaveEntry} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {saving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
