import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Trash2, BarChart3, CalendarPlus, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { RugbyFieldSVG } from "@/components/rugby/RugbyFieldSVG";
import { getPositionLabel } from "@/lib/utils/kickingFieldZones";
import { RUGBY_PRECISION_EXERCISES, EXERCISE_CATEGORIES, BUTEUR_EXERCISES, ZONE_KICK_EXERCISES, type RugbyPrecisionExerciseMode } from "@/lib/constants/rugbyPrecisionExercises";
import { cn } from "@/lib/utils";
import { LineoutFieldSVG, aggregateLineoutStats, type LineoutZone } from "@/components/rugby/LineoutFieldSVG";

interface PrecisionFieldTrackerProps {
  categoryId: string;
  sessionId?: string;
  sessionDate?: string;
}

// Legacy positions kept for backward compat only
const LINEOUT_POSITIONS = [
  { key: "devant", label: "Devant", y: 20, description: "2-4m du lanceur" },
  { key: "milieu", label: "Milieu", y: 50, description: "6-8m du lanceur" },
  { key: "fond", label: "Fond", y: 80, description: "12-15m du lanceur" },
];

export function PrecisionFieldTracker({ categoryId, sessionId: propSessionId, sessionDate: propSessionDate }: PrecisionFieldTrackerProps) {
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [exerciseType, setExerciseType] = useState<string>(RUGBY_PRECISION_EXERCISES[0].value);
  const [kickingSide, setKickingSide] = useState<"left" | "right">("right");
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [clickLabel, setClickLabel] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attempts, setAttempts] = useState<string>("1");
  const [successes, setSuccesses] = useState<string>("0");
  const [pendingKickType, setPendingKickType] = useState<string | null>(null);
  // Zone kicks: two-click flow
  const [zoneKickOrigin, setZoneKickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [zoneKickStep, setZoneKickStep] = useState<"origin" | "target">("origin");

  const currentExercise = RUGBY_PRECISION_EXERCISES.find(e => e.value === exerciseType);
  const currentMode: RugbyPrecisionExerciseMode = currentExercise?.mode || "kicking";
  const currentCategory = EXERCISE_CATEGORIES.find(c => c.exercises.some(e => e.value === exerciseType));

  const { data: players = [] } = useQuery({
    queryKey: ["players-precision-field", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Check if there are active training sessions today (fallback when no sessionId prop)
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["today-training-sessions", categoryId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date")
        .eq("category_id", categoryId)
        .eq("session_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !propSessionId,
  });

  const activeSessionId = propSessionId || (todaySessions.length > 0 ? todaySessions[0].id : null);
  const activeSessionDate = propSessionDate || (todaySessions.length > 0 ? todaySessions[0].session_date : format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [] } = useQuery({
    queryKey: ["precision-field-entries", categoryId, selectedPlayerId, exerciseType],
    queryFn: async () => {
      let query = supabase
        .from("precision_training")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (selectedPlayerId) query = query.eq("player_id", selectedPlayerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Buteur kick direct save
  const saveButeurKick = async (success: boolean) => {
    if (!clickPos || !selectedPlayerId || !activeSessionId) return;
    try {
      const { error } = await supabase.from("precision_training").insert({
        player_id: selectedPlayerId,
        category_id: categoryId,
        training_session_id: activeSessionId,
        exercise_label: clickLabel,
        attempts: 1,
        successes: success ? 1 : 0,
        session_date: activeSessionDate,
        zone_x: clickPos.x,
        zone_y: clickPos.y,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["precision-field-entries"] });
      queryClient.invalidateQueries({ queryKey: ["precision-training-stats"] });
      setDialogOpen(false);
      setClickPos(null);
      toast.success(success ? "✅ Réussi !" : "❌ Raté");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Zone/lineout save
  const addEntry = useMutation({
    mutationFn: async (data: { x: number; y: number; label?: string }) => {
      if (!selectedPlayerId) throw new Error("Sélectionnez un joueur");
      if (!activeSessionId) throw new Error("Aucune séance aujourd'hui");
      const att = parseInt(attempts) || 0;
      const suc = parseInt(successes) || 0;
      if (att <= 0) throw new Error("Le nombre de tentatives doit être > 0");
      if (suc > att) throw new Error("Les réussites ne peuvent pas dépasser les tentatives");

      const lineoutZone = (window as any).__pendingLineoutZone as LineoutZone | undefined;
      const insertData: any = {
        player_id: selectedPlayerId,
        category_id: categoryId,
        training_session_id: activeSessionId,
        exercise_label: data.label || clickLabel,
        attempts: att,
        successes: suc,
        session_date: activeSessionDate,
        zone_x: data.x,
        zone_y: data.y,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-field-entries"] });
      queryClient.invalidateQueries({ queryKey: ["precision-training-stats"] });
      setDialogOpen(false);
      setClickPos(null);
      setClickLabel("");
      setAttempts("1");
      setSuccesses("0");
      setZoneKickOrigin(null);
      setZoneKickStep("origin");
      toast.success("Exercice enregistré !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("precision_training").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-field-entries"] });
      queryClient.invalidateQueries({ queryKey: ["precision-training-stats"] });
      toast.success("Entrée supprimée");
    },
  });

  // Buteur kick markers
  const kickMarkers = useMemo(() => {
    return entries
      .filter((e: any) => e.zone_x != null && e.zone_y != null && BUTEUR_EXERCISES.some(b => e.exercise_label?.startsWith(b.label)))
      .map((e: any) => ({
        x: e.zone_x,
        y: e.zone_y,
        success: (e.successes || 0) > 0,
        kickType: BUTEUR_EXERCISES.find(b => e.exercise_label?.startsWith(b.label))?.value || "penalty",
      }));
  }, [entries]);

  // Zone stats for non-buteur
  const zoneStats = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number; x: number; y: number }>();
    entries
      .filter((e: any) => e.zone_x != null && e.zone_y != null && !BUTEUR_EXERCISES.some(b => e.exercise_label?.startsWith(b.label)))
      .forEach((e: any) => {
        const zoneKey = `${Math.round(e.zone_x / 15) * 15}-${Math.round(e.zone_y / 15) * 15}`;
        const prev = map.get(zoneKey) || { attempts: 0, successes: 0, x: Math.round(e.zone_x / 15) * 15, y: Math.round(e.zone_y / 15) * 15 };
        prev.attempts += e.attempts || 0;
        prev.successes += e.successes || 0;
        map.set(zoneKey, prev);
      });
    return Array.from(map.values());
  }, [entries]);

  const lineoutZoneStats = useMemo(() => {
    return aggregateLineoutStats(entries as any[]);
  }, [entries]);

  const totalAttempts = entries.reduce((s: number, e: any) => s + (e.attempts || 0), 0);
  const totalSuccesses = entries.reduce((s: number, e: any) => s + (e.successes || 0), 0);
  const globalRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

  const handleButeurClick = (xPct: number, yPct: number) => {
    if (isViewer) return;
    if (!selectedPlayerId) { toast.error("Sélectionnez d'abord un joueur"); return; }
    if (!activeSessionId) { toast.error("Aucune séance planifiée aujourd'hui"); return; }
    const posLabel = getPositionLabel(xPct, yPct, goalsOnRight);
    const exLabel = currentExercise?.label || exerciseType;
    setClickPos({ x: xPct, y: yPct });
    setClickLabel(`${exLabel} - ${posLabel}`);
    setPendingKickType(exerciseType);
    setDialogOpen(true);
  };

  // Get fixed origin position for specific zone kick exercises
  const getFixedOrigin = (): { x: number; y: number } | null => {
    if (!currentExercise || currentMode !== "zone_kicks") return null;
    const centerY = 50;
    if (currentExercise.value === "kickoff") {
      return { x: 50, y: centerY };
    }
    if (currentExercise.value === "goal_line_restart") {
      // Try line is at field line pct 0.95 (right) or 0.05 (left)
      const pct = goalsOnRight ? 0.95 : 0.05;
      return { x: (20 + pct * 560) / 600 * 100, y: centerY };
    }
    if (currentExercise.value === "22m_restart") {
      // 22m line is at field line pct 0.73 (right) or 0.27 (left)
      const pct = goalsOnRight ? 0.73 : 0.27;
      return { x: (20 + pct * 560) / 600 * 100, y: centerY };
    }
    return null;
  };

  const handleZoneKickClick = (xPct: number, yPct: number) => {
    if (isViewer) return;
    if (!selectedPlayerId) { toast.error("Sélectionnez d'abord un joueur"); return; }
    if (!activeSessionId) { toast.error("Aucune séance planifiée aujourd'hui"); return; }
    const fixedOrigin = getFixedOrigin();

    if (fixedOrigin) {
      // Fixed origin: every click is a target
      const posLabel = getPositionLabel(xPct, yPct, goalsOnRight);
      const originLabel = getPositionLabel(fixedOrigin.x, fixedOrigin.y, goalsOnRight);
      const exLabel = currentExercise?.label || exerciseType;
      setZoneKickOrigin(fixedOrigin);
      setClickPos({ x: xPct, y: yPct });
      setClickLabel(`${exLabel} - De: ${originLabel} → Cible: ${posLabel}`);
      setPendingKickType(null);
      setAttempts("1");
      setSuccesses("0");
      setDialogOpen(true);
    } else if (zoneKickStep === "origin") {
      setZoneKickOrigin({ x: xPct, y: yPct });
      setZoneKickStep("target");
      toast.info("📍 Position de frappe enregistrée. Cliquez maintenant sur la zone ciblée.");
    } else {
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
  };

  const handleLineoutZoneClick = (zone: LineoutZone) => {
    if (isViewer || !selectedPlayerId || !activeSessionId) return;
    const exLabel = currentExercise?.label || exerciseType;
    // Store distance/height in clickPos for save; use y as legacy compat
    const legacyY = zone.distanceKey === "devant" ? 20 : zone.distanceKey === "milieu" ? 50 : 80;
    setClickPos({ x: 50, y: legacyY });
    setClickLabel(`${exLabel} - ${zone.label}`);
    setPendingKickType(null);
    setAttempts("1");
    setSuccesses("0");
    // Store lineout zone info for save
    (window as any).__pendingLineoutZone = zone;
    setDialogOpen(true);
  };

  const goalsOnRight = kickingSide === "right";

  // No session warning
  if (!activeSessionId && !isViewer) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="py-8 text-center space-y-3">
          <CalendarPlus className="h-10 w-10 mx-auto text-amber-600" />
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">Aucune séance planifiée aujourd'hui</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Pour enregistrer des exercices de précision, créez d'abord une séance d'entraînement avec un thème « Précision » dans le menu <strong>Planification</strong>.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 justify-center">
            <Info className="h-3.5 w-3.5" />
            Les stats de précision sont automatiquement rattachées à la séance du jour.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active session info */}
      {activeSessionId && todaySessions[0] && (
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary rounded-lg px-3 py-2">
          <CalendarPlus className="h-4 w-4" />
          <span>Séance active : <strong>Séance du {format(new Date(todaySessions[0].session_date), "dd/MM/yyyy", { locale: fr })}</strong></span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Joueur</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
            <SelectContent>
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {[p.first_name, p.name].filter(Boolean).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Catégorie</Label>
          <Select value={currentExercise?.category || "buteur"} onValueChange={(cat) => {
            const first = EXERCISE_CATEGORIES.find(c => c.key === cat)?.exercises[0];
            if (first) setExerciseType(first.value);
          }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXERCISE_CATEGORIES.map(cat => (
                <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {currentMode !== "kicking" && (
          <div className="space-y-1">
            <Label className="text-xs">Type d'exercice</Label>
            <Select value={exerciseType} onValueChange={setExerciseType}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXERCISE_CATEGORIES.find(c => c.key === currentExercise?.category)?.exercises.map(et => (
                  <SelectItem key={et.value} value={et.value}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: et.color }} />
                      {et.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {(currentMode === "kicking" || currentMode === "zone_kicks") && (
          <div className="space-y-1">
            <Label className="text-xs">Côté</Label>
            <div className="flex gap-2">
              <Button variant={kickingSide === "left" ? "default" : "outline"} size="sm" onClick={() => setKickingSide("left")} className="text-xs">← Gauche</Button>
              <Button variant={kickingSide === "right" ? "default" : "outline"} size="sm" onClick={() => setKickingSide("right")} className="text-xs">Droite →</Button>
            </div>
          </div>
        )}
      </div>

      {/* Buteur: inline exercise type selector (all 3 on same line) */}
      {currentMode === "kicking" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground mr-1">Type de tir :</Label>
          {BUTEUR_EXERCISES.map(b => {
            const isActive = exerciseType === b.value;
            const ShapeIcon = b.shape === "circle" ? "●" : b.shape === "square" ? "■" : "◆";
            return (
              <Button
                key={b.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1.5 h-8"
                style={isActive ? { backgroundColor: b.color, borderColor: b.color } : {}}
                onClick={() => setExerciseType(b.value)}
              >
                <span style={{ color: isActive ? "white" : b.color }}>{ShapeIcon}</span>
                {b.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{globalRate}%</p>
            <p className="text-sm text-muted-foreground">Réussite globale</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalSuccesses}/{totalAttempts}</p>
            <p className="text-sm text-muted-foreground">Réussites / Tentatives</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{entries.length}</p>
            <p className="text-sm text-muted-foreground">Exercices enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* ====== BUTEUR MODE ====== */}
      {currentMode === "kicking" && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Buteur — Cliquez sur le terrain pour enregistrer chaque tir
            </CardTitle>
            {!selectedPlayerId && !isViewer && (
              <p className="text-xs text-muted-foreground">Sélectionnez un joueur pour commencer</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="relative w-full max-w-3xl mx-auto">
              <RugbyFieldSVG
                goalsOnRight={goalsOnRight}
                onClick={handleButeurClick}
                showCursorTracker
              >
                {kickMarkers.map((kick, i) => {
                  const cx = (kick.x / 100) * 600;
                  const cy = (kick.y / 100) * 400;
                  const exDef = BUTEUR_EXERCISES.find(b => b.value === kick.kickType);
                  const fill = kick.success ? "#22c55e" : "#ef4444";
                  const stroke = exDef?.color || "#f97316";
                  const r = 8;
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
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs">
              {BUTEUR_EXERCISES.map(b => (
                <span key={b.value} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> Réussi</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Raté</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== ZONE KICKS MODE ====== */}
      {currentMode === "zone_kicks" && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              Coups de pied de zone
            </CardTitle>
            {/* Inline exercise type buttons */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {ZONE_KICK_EXERCISES.map(ex => {
                const isActive = exerciseType === ex.value;
                return (
                  <Button
                    key={ex.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="text-xs gap-1.5 h-7"
                    style={isActive ? { backgroundColor: ex.color, borderColor: ex.color } : {}}
                    onClick={() => { setExerciseType(ex.value); setZoneKickOrigin(null); setZoneKickStep("origin"); }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? "white" : ex.color }} />
                    {ex.label}
                  </Button>
                );
              })}
            </div>
            {/* Instruction banner */}
            <div className={cn(
              "flex items-center gap-2 text-xs px-3 py-2 rounded-md mt-2",
              getFixedOrigin() 
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300/50"
                : zoneKickStep === "origin"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300/50"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300/50"
            )}>
              {getFixedOrigin() ? (
                <>🎯 <strong>{currentExercise?.label}</strong> : le départ est fixe sur la ligne — cliquez sur la <strong>zone ciblée</strong></>
              ) : zoneKickStep === "origin" ? (
                <>📍 <strong>Étape 1</strong> : cliquez sur la <strong>position de frappe</strong> du joueur</>
              ) : (
                <>🎯 <strong>Étape 2</strong> : cliquez sur la <strong>zone ciblée</strong></>
              )}
              {zoneKickStep === "target" && !getFixedOrigin() && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => { setZoneKickOrigin(null); setZoneKickStep("origin"); }}>
                  ↩ Annuler
                </Button>
              )}
            </div>
            {!selectedPlayerId && !isViewer && (
              <p className="text-xs text-destructive font-medium mt-1">⚠ Sélectionnez un joueur pour commencer</p>
            )}
            {!getFixedOrigin() && (
              <div className="flex items-center gap-2 text-xs mt-1">
                <Badge variant={zoneKickStep === "origin" ? "default" : "secondary"} className="text-[10px]">
                  1. Frappe {zoneKickStep === "target" ? "✓" : ""}
                </Badge>
                <span>→</span>
                <Badge variant={zoneKickStep === "target" ? "default" : "outline"} className="text-[10px]">
                  2. Cible
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="relative w-full max-w-3xl mx-auto">
              <RugbyFieldSVG
                goalsOnRight={goalsOnRight}
                onClick={handleZoneKickClick}
                showCursorTracker
              >
                {/* Origin marker - fixed or user-set */}
                {(() => {
                  const origin = getFixedOrigin() || zoneKickOrigin;
                  if (!origin) return null;
                  const ox = (origin.x / 100) * 600;
                  const oy = (origin.y / 100) * 400;
                  const isFixed = !!getFixedOrigin();
                  return (
                    <g>
                      {isFixed && (
                        <line x1={ox} y1={10} x2={ox} y2={390} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />
                      )}
                      <circle cx={ox} cy={oy} r={12} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 2" opacity={0.9} />
                      <circle cx={ox} cy={oy} r={3} fill="#f59e0b" opacity={0.9} />
                      <text x={ox} y={oy - 16} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
                        {isFixed ? currentExercise?.label?.toUpperCase() : "FRAPPE"}
                      </text>
                    </g>
                  );
                })()}
                {/* Zone stats */}
                {zoneStats.map((zone, i) => {
                  const cx = (zone.x / 100) * 600;
                  const cy = (zone.y / 100) * 400;
                  const rate = zone.attempts > 0 ? Math.round((zone.successes / zone.attempts) * 100) : 0;
                  const color = rate >= 75 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.7} stroke="white" strokeWidth="2" />
                      <text x={cx} y={cy - 2} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{rate}%</text>
                      <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize="7" opacity={0.9}>{zone.successes}/{zone.attempts}</text>
                    </g>
                  );
                })}
              </RugbyFieldSVG>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== LINEOUT MODE ====== */}
      {currentMode === "lineout" && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Touche — Cliquez sur la zone de lancer
            </CardTitle>
            {!selectedPlayerId && !isViewer && (
              <p className="text-xs text-muted-foreground">Sélectionnez un joueur pour commencer</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-3xl mx-auto">
              <LineoutFieldSVG
                onZoneClick={handleLineoutZoneClick}
                zoneStats={lineoutZoneStats}
                disabled={isViewer || !selectedPlayerId}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent entries list */}
      {entries.length > 0 && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Historique ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {entries.slice(0, 50).map((e: any) => {
                const player = e.players as { name: string; first_name?: string } | null;
                const rate = e.attempts > 0 ? Math.round((e.successes / e.attempts) * 100) : 0;
                const rateColor = rate >= 75 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-600";
                return (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold ${rateColor}`}>{rate}%</div>
                      <div>
                        <p className="text-sm font-medium">{e.exercise_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {player ? [player.first_name, player.name].filter(Boolean).join(" ") : ""}
                          {` • ${e.successes}/${e.attempts}`}
                          {` • ${format(new Date(e.session_date), "dd/MM/yy", { locale: fr })}`}
                        </p>
                      </div>
                    </div>
                    {!isViewer && (
                      <Button variant="ghost" size="sm" onClick={() => deleteEntry.mutate(e.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Buteur - success/fail */}
      {pendingKickType && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle>{clickLabel}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3">
              <Button
                className="flex-1 h-20 text-xl bg-green-600 hover:bg-green-700 text-white"
                onClick={() => saveButeurKick(true)}
              >
                ✅ Réussi
              </Button>
              <Button
                className="flex-1 h-20 text-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={() => saveButeurKick(false)}
              >
                ❌ Raté
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Zone/Lineout - enter attempts & successes */}
      {!pendingKickType && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Enregistrer — {clickLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tentatives</Label>
                  <Input type="number" min="1" value={attempts} onChange={e => setAttempts(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Réussites</Label>
                  <Input type="number" min="0" max={attempts} value={successes} onChange={e => setSuccesses(e.target.value)} />
                </div>
              </div>
              {parseInt(attempts) > 0 && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(((parseInt(successes) || 0) / (parseInt(attempts) || 1)) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Taux de réussite</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => clickPos && addEntry.mutate({ ...clickPos, label: clickLabel })} disabled={addEntry.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
