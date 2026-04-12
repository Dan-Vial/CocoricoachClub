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
import { RUGBY_PRECISION_EXERCISES, EXERCISE_CATEGORIES, BUTEUR_EXERCISES, type RugbyPrecisionExerciseMode } from "@/lib/constants/rugbyPrecisionExercises";
import { RugbyFieldSVG } from "@/components/rugby/RugbyFieldSVG";
import { getPositionLabel } from "@/lib/utils/kickingFieldZones";
import { LineoutFieldSVG, aggregateLineoutStats, type LineoutZone } from "@/components/rugby/LineoutFieldSVG";

interface AthletePrecisionFieldInputProps {
  playerId: string;
  categoryId: string;
  sessionId: string;
  onEntryAdded?: () => void;
  initialExerciseType?: string | null;
}

// Legacy positions
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
  // For buteur mode: pending kick result
  const [pendingKickType, setPendingKickType] = useState<string | null>(null);
  // For zone kicks: two-click flow (origin then target)
  const [zoneKickOrigin, setZoneKickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [zoneKickStep, setZoneKickStep] = useState<"origin" | "target">("origin");

  const currentExercise = RUGBY_PRECISION_EXERCISES.find(e => e.value === exerciseType);
  const currentMode: RugbyPrecisionExerciseMode = currentExercise?.mode || "kicking";
  const currentCategory = EXERCISE_CATEGORIES.find(c => c.exercises.some(e => e.value === exerciseType));
  const goalsOnRight = kickingSide === "right";

  useEffect(() => {
    if (!initialExerciseType) return;
    const hasMatchingOption = RUGBY_PRECISION_EXERCISES.some((exercise) => exercise.value === initialExerciseType);
    if (hasMatchingOption) {
      setExerciseType(initialExerciseType);
    }
  }, [initialExerciseType]);

  // Load existing entries for this session
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

  // Buteur mode: click = instant record with success/fail dialog
  const handleButeurClick = useCallback((xPct: number, yPct: number) => {
    const posLabel = getPositionLabel(xPct, yPct, goalsOnRight);
    const exLabel = currentExercise?.label || exerciseType;
    setClickPos({ x: xPct, y: yPct });
    setClickLabel(`${exLabel} - ${posLabel}`);
    setPendingKickType(exerciseType);
    setDialogOpen(true);
  }, [exerciseType, goalsOnRight, currentExercise]);

  // Zone kicks mode: TWO-CLICK flow - first origin, then target
  const handleZoneKickClick = useCallback((xPct: number, yPct: number) => {
    if (zoneKickStep === "origin") {
      // First click: record kick origin
      setZoneKickOrigin({ x: xPct, y: yPct });
      setZoneKickStep("target");
      toast.info("📍 Position de frappe enregistrée. Clique maintenant sur la zone ciblée.");
    } else {
      // Second click: record target zone and open dialog
      const posLabel = getPositionLabel(xPct, yPct, goalsOnRight);
      const originLabel = getPositionLabel(zoneKickOrigin!.x, zoneKickOrigin!.y, goalsOnRight);
      const exLabel = currentExercise?.label || exerciseType;
      setClickPos({ x: xPct, y: yPct });
      setClickLabel(`${exLabel} - De: ${originLabel} → Cible: ${posLabel}`);
      setPendingKickType(null);
      setAttempts("1");
      setSuccesses("0");
      setDialogOpen(true);
    }
  }, [exerciseType, goalsOnRight, currentExercise, zoneKickStep, zoneKickOrigin]);

  const handleLineoutZoneClick = (zone: LineoutZone) => {
    const exLabel = currentExercise?.label || exerciseType;
    const legacyY = zone.distanceKey === "devant" ? 20 : zone.distanceKey === "milieu" ? 50 : 80;
    setClickPos({ x: 50, y: legacyY });
    setClickLabel(`${exLabel} - ${zone.label}`);
    setPendingKickType(null);
    setAttempts("1");
    setSuccesses("0");
    (window as any).__pendingLineoutZone = zone;
    setDialogOpen(true);
  };

  // Save buteur kick (1 attempt, success or fail)
  const saveButeurKick = async (success: boolean) => {
    if (!clickPos) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("precision_training").insert({
        player_id: playerId,
        category_id: categoryId,
        training_session_id: sessionId,
        exercise_label: clickLabel,
        attempts: 1,
        successes: success ? 1 : 0,
        session_date: format(new Date(), "yyyy-MM-dd"),
        zone_x: clickPos.x,
        zone_y: clickPos.y,
      });
      if (error) throw error;

      setSavedEntries(prev => [...prev, { label: clickLabel, attempts: 1, successes: success ? 1 : 0 }]);
      queryClient.invalidateQueries({ queryKey: ["athlete-precision-entries"] });
      setDialogOpen(false);
      setClickPos(null);
      toast.success(success ? "✅ Réussi !" : "❌ Raté");
      onEntryAdded?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  // Save zone/lineout entry (multiple attempts)
  const handleSaveEntry = async () => {
    if (!clickPos) return;
    const att = parseInt(attempts) || 0;
    const suc = parseInt(successes) || 0;
    if (att <= 0) { toast.error("Tentatives > 0"); return; }
    if (suc > att) { toast.error("Réussites ≤ tentatives"); return; }

    setSaving(true);
    try {
      const lineoutZone = (window as any).__pendingLineoutZone as LineoutZone | undefined;
      const insertData: any = {
        player_id: playerId,
        category_id: categoryId,
        training_session_id: sessionId,
        exercise_label: clickLabel,
        attempts: att,
        successes: suc,
        session_date: format(new Date(), "yyyy-MM-dd"),
        zone_x: clickPos.x,
        zone_y: clickPos.y,
      };
      // Add kick origin for zone kicks
      if (zoneKickOrigin) {
        insertData.kick_origin_x = zoneKickOrigin.x;
        insertData.kick_origin_y = zoneKickOrigin.y;
      }
      if (lineoutZone) {
        insertData.lineout_distance = lineoutZone.distanceKey;
        insertData.lineout_height = lineoutZone.heightKey;
      }
      const { error } = await supabase.from("precision_training").insert(insertData);
      if (error) throw error;
      (window as any).__pendingLineoutZone = undefined;

      setSavedEntries(prev => [...prev, { label: clickLabel, attempts: att, successes: suc }]);
      queryClient.invalidateQueries({ queryKey: ["athlete-precision-entries"] });
      setDialogOpen(false);
      setClickPos(null);
      setZoneKickOrigin(null);
      setZoneKickStep("origin");
      toast.success("Enregistré !");
      onEntryAdded?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  // Buteur kick markers from entries
  const kickMarkers = useMemo(() => {
    return existingEntries
      .filter((e: any) => e.zone_x != null && e.zone_y != null && BUTEUR_EXERCISES.some(b => e.exercise_label?.startsWith(b.label)))
      .map((e: any) => ({
        x: e.zone_x,
        y: e.zone_y,
        success: (e.successes || 0) > 0,
        kickType: BUTEUR_EXERCISES.find(b => e.exercise_label?.startsWith(b.label))?.value || "penalty",
      }));
  }, [existingEntries]);

  // Zone stats for non-buteur modes
  const zoneStats = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    existingEntries
      .filter((e: any) => e.zone_x != null && e.zone_y != null && !BUTEUR_EXERCISES.some(b => e.exercise_label?.startsWith(b.label)))
      .forEach((e: any) => {
        const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
        const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
        prev.attempts += e.attempts || 0;
        prev.successes += e.successes || 0;
        map.set(zoneKey, prev);
      });
    return Array.from(map.values());
  }, [existingEntries]);

  const lineoutZoneStats = useMemo(() => {
    return aggregateLineoutStats(existingEntries as any[]);
  }, [existingEntries]);

  return (
    <div className="space-y-3 rounded-lg border border-accent/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Entraînement de précision</span>
      </div>

      {/* Exercise type selector - grouped */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[150px]">
          <Label className="text-xs">Type d'exercice</Label>
          <Select value={exerciseType} onValueChange={setExerciseType}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</div>
                  {cat.exercises.map(et => (
                    <SelectItem key={et.value} value={et.value}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: et.color }} />
                        {et.label}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(currentMode === "kicking" || currentMode === "zone_kicks") && (
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

      {/* BUTEUR MODE - click-by-click like match stats */}
      {currentMode === "kicking" && (
        <div className="relative w-full">
          <p className="text-xs text-muted-foreground mb-1">
            Clique sur le terrain — chaque clic = 1 tir ({currentExercise?.label})
          </p>
          <RugbyFieldSVG
            goalsOnRight={goalsOnRight}
            onClick={handleButeurClick}
            showCursorTracker
          >
            {/* Show kick markers with distinct shapes */}
            {kickMarkers.map((kick, i) => {
              const cx = 20 + (kick.x / 100) * 560;
              const cy = 10 + (kick.y / 100) * 380;
              const exDef = BUTEUR_EXERCISES.find(b => b.value === kick.kickType);
              const fill = kick.success ? "#22c55e" : "#ef4444";
              const stroke = exDef?.color || "#f97316";
              const r = 7;
              if (exDef?.shape === "circle") {
                return <circle key={i} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} />;
              }
              if (exDef?.shape === "square") {
                return <rect key={i} x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} rx={2} />;
              }
              return (
                <polygon key={i}
                  points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                  fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} />
              );
            })}
          </RugbyFieldSVG>
          {/* Buteur legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center text-[10px]">
            {BUTEUR_EXERCISES.map(b => (
              <span key={b.value} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                {b.label}
              </span>
            ))}
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Réussi</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Raté</span>
          </div>
        </div>
      )}

      {/* ZONE KICKS MODE - click on target zone, enter attempts */}
      {currentMode === "zone_kicks" && (
        <div className="relative w-full">
          <p className="text-xs text-muted-foreground mb-1">
            Clique sur la zone visée — entre le nombre de tirs ({currentExercise?.label})
          </p>
          <RugbyFieldSVG
            goalsOnRight={goalsOnRight}
            onClick={handleZoneKickClick}
            showCursorTracker
          >
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
          </RugbyFieldSVG>
        </div>
      )}

      {/* LINEOUT MODE */}
      {currentMode === "lineout" && (
        <div className="w-full">
          <p className="text-xs text-muted-foreground mb-1">Clique sur la zone de lancer</p>
          <LineoutFieldSVG
            onZoneClick={handleLineoutZoneClick}
            zoneStats={lineoutZoneStats}
          />
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

      {/* Dialog - Buteur mode: simple success/fail buttons */}
      {pendingKickType && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">{clickLabel}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3">
              <Button
                className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700"
                onClick={() => saveButeurKick(true)}
                disabled={saving}
              >
                ✅ Réussi
              </Button>
              <Button
                className="flex-1 h-16 text-lg bg-red-600 hover:bg-red-700"
                onClick={() => saveButeurKick(false)}
                disabled={saving}
              >
                ❌ Raté
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog - Zone/Lineout mode: attempts + successes */}
      {!pendingKickType && (
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
                <p className="text-center text-lg font-bold text-primary">
                  {Math.round((parseInt(successes) / parseInt(attempts)) * 100)}%
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
      )}
    </div>
  );
}
