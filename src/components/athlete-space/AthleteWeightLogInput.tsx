import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Lock, Plus, Trash2, Zap } from "lucide-react";
import { resolveSessionExerciseRows } from "@/lib/utils/sessionExercises";

export type WeightLogQuickEntry = {
  mode: "quick";
  weight: string;
  sets: string;
  reps: string;
};

export type WeightLogDetailedEntry = {
  mode: "detailed";
  series: Array<{ weight: string; reps: string }>;
};

// Auto mode for special methods (drop set, cluster, rest-pause, pyramid).
// Each sub-entry has its own weight + reps. Read-only structure (count fixed by prescription).
export type WeightLogSpecialEntry = {
  mode: "special";
  method: string; // drop_set, cluster, rest_pause, pyramid_up, pyramid_down, pyramid_full
  series: Array<{ weight: string; reps: string; label?: string }>;
};

export type WeightLogEntry = WeightLogQuickEntry | WeightLogDetailedEntry | WeightLogSpecialEntry;

export type WeightLogState = Record<string, WeightLogEntry>;

interface Props {
  sessionId: string;
  playerId: string;
  value: WeightLogState;
  onChange: (next: WeightLogState) => void;
}

const SPECIAL_AUTO_METHODS = new Set([
  "drop_set",
  "cluster",
  "rest_pause",
  "pyramid_up",
  "pyramid_down",
  "pyramid_full",
]);

const METHOD_LABELS: Record<string, string> = {
  drop_set: "Drop Set",
  cluster: "Cluster",
  rest_pause: "Rest-Pause",
  pyramid_up: "Pyramide ↑",
  pyramid_down: "Pyramide ↓",
  pyramid_full: "Pyramide complète",
};

/**
 * Build the initial special series from the prescribed drop_sets / cluster_sets
 * stored on the gym_session_exercises row.
 */
function buildSpecialSeries(
  method: string,
  baseWeight: number | null,
  dropSets: Array<{ reps: string | number; percentage: number }> | null,
  clusterSets: Array<{ reps: number; rest_seconds: number }> | null,
): WeightLogSpecialEntry["series"] {
  if (method === "cluster" && clusterSets && clusterSets.length > 0) {
    return clusterSets.map((s, i) => ({
      weight: baseWeight ? String(baseWeight) : "",
      reps: String(s.reps ?? ""),
      label: `Cluster ${i + 1}`,
    }));
  }

  if (method === "rest_pause") {
    // Default 3 mini-sets at the same weight; user adjusts reps.
    return Array.from({ length: 3 }, (_, i) => ({
      weight: baseWeight ? String(baseWeight) : "",
      reps: "",
      label: i === 0 ? "Set" : `Reprise ${i}`,
    }));
  }

  // Drop set / pyramid: use prescribed drop_sets; weight = baseWeight * percentage / 100
  if (dropSets && dropSets.length > 0) {
    return dropSets.map((s, i) => {
      const w = baseWeight ? Math.round((baseWeight * (s.percentage / 100)) * 10) / 10 : null;
      return {
        weight: w ? String(w) : "",
        reps: String(s.reps ?? ""),
        label:
          method === "drop_set"
            ? i === 0 ? "Charge max" : `Drop ${i}`
            : `Niveau ${i + 1}`,
      };
    });
  }

  // Fallback for drop_set without prescription: 3 drops of -20% each
  if (method === "drop_set") {
    return Array.from({ length: 3 }, (_, i) => {
      const w = baseWeight ? Math.round((baseWeight * (1 - i * 0.2)) * 10) / 10 : null;
      return {
        weight: w ? String(w) : "",
        reps: "",
        label: i === 0 ? "Charge max" : `Drop ${i} (−${i * 20}%)`,
      };
    });
  }

  return [{ weight: baseWeight ? String(baseWeight) : "", reps: "", label: "Série" }];
}

export function AthleteWeightLogInput({ sessionId, playerId, value, onChange }: Props) {
  // Fetch prescribed exercises (now includes set_type, method, drop_sets, cluster_sets)
  const { data: rawExercises = [] } = useQuery({
    queryKey: ["athlete-weight-log-exercises", sessionId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", sessionId)
        .or(`player_id.eq.${playerId},player_id.is.null`)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!playerId,
  });

  const exercises = useMemo(
    () => resolveSessionExerciseRows(rawExercises, playerId),
    [rawExercises, playerId],
  );

  const { data: existingLogs = [] } = useQuery({
    queryKey: ["athlete-weight-log-existing", sessionId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_exercise_logs")
        .select("exercise_name, actual_weight_kg, actual_sets, actual_reps")
        .eq("training_session_id", sessionId)
        .eq("player_id", playerId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!playerId,
  });

  const existingByName = useMemo(() => {
    const map = new Map<string, { weight: number; sets: number | null; reps: number | null }>();
    existingLogs.forEach((l) => {
      map.set(l.exercise_name, {
        weight: Number(l.actual_weight_kg),
        sets: l.actual_sets,
        reps: l.actual_reps,
      });
    });
    return map;
  }, [existingLogs]);

  const gymExercises = useMemo(() => {
    const seen = new Set<string>();
    return exercises.filter((e: any) => {
      if (!e.exercise_name) return false;
      if (seen.has(e.exercise_name)) return false;
      seen.add(e.exercise_name);
      return true;
    });
  }, [exercises]);

  // Initialize entries — choose mode based on method
  useEffect(() => {
    if (gymExercises.length === 0) return;
    const next: WeightLogState = { ...value };
    let mutated = false;
    gymExercises.forEach((ex: any) => {
      if (existingByName.has(ex.exercise_name)) return;
      if (next[ex.exercise_name]) return;

      const method = (ex.method || ex.set_type || "normal") as string;
      const baseWeight = ex.weight_kg ? Number(ex.weight_kg) : null;

      if (SPECIAL_AUTO_METHODS.has(method)) {
        next[ex.exercise_name] = {
          mode: "special",
          method,
          series: buildSpecialSeries(
            method,
            baseWeight,
            ex.drop_sets as any,
            ex.cluster_sets as any,
          ),
        };
      } else {
        // Pre-fill with prescribed values; fall back to 3×10 so the athlete only has the weight to enter.
        next[ex.exercise_name] = {
          mode: "quick",
          weight: ex.weight_kg ? String(ex.weight_kg) : "",
          sets: ex.sets ? String(ex.sets) : "3",
          reps: ex.reps ? String(ex.reps) : "10",
        };
      }
      mutated = true;
    });
    if (mutated) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymExercises.map((e: any) => e.exercise_name).join("|"), existingByName.size]);

  const updateEntry = (exerciseName: string, entry: WeightLogEntry) => {
    onChange({ ...value, [exerciseName]: entry });
  };

  const toggleMode = (exerciseName: string, prescribedSets?: number | null) => {
    const current = value[exerciseName];
    if (!current || current.mode === "special") return;
    if (current.mode === "quick") {
      const setsNum = parseInt(current.sets) || prescribedSets || 3;
      updateEntry(exerciseName, {
        mode: "detailed",
        series: Array.from({ length: setsNum }, () => ({
          weight: current.weight,
          reps: current.reps,
        })),
      });
    } else {
      const firstSerie = current.series[0] || { weight: "", reps: "" };
      updateEntry(exerciseName, {
        mode: "quick",
        weight: firstSerie.weight,
        sets: String(current.series.length),
        reps: firstSerie.reps,
      });
    }
  };

  if (gymExercises.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Mes charges soulevées</Label>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {gymExercises.length} exercice{gymExercises.length > 1 ? "s" : ""}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Renseigne ce que tu as réellement soulevé pour alimenter ton tonnage.
      </p>

      {gymExercises.map((ex: any) => {
        const existing = existingByName.get(ex.exercise_name);
        const entry = value[ex.exercise_name];
        const method = (ex.method || ex.set_type || "normal") as string;
        const isSpecial = SPECIAL_AUTO_METHODS.has(method);

        if (existing) {
          return (
            <div
              key={ex.exercise_name}
              className="flex items-center gap-2 rounded-md border border-muted bg-muted/40 p-2 opacity-70"
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium flex-1 truncate">{ex.exercise_name}</span>
              <Badge variant="secondary" className="text-[10px]">
                ✓ {existing.weight}kg {existing.sets ?? "–"}×{existing.reps ?? "–"}
              </Badge>
            </div>
          );
        }

        if (!entry) return null;

        return (
          <div key={ex.exercise_name} className="rounded-md border border-border bg-card p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium truncate">{ex.exercise_name}</span>
                {isSpecial && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-warning/50 text-warning">
                    <Zap className="h-2.5 w-2.5" />
                    {METHOD_LABELS[method] || method}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {ex.sets && ex.reps && !isSpecial && (
                  <span className="text-[10px] text-muted-foreground">
                    Prescrit : {ex.sets}×{ex.reps}
                    {ex.weight_kg ? ` @${ex.weight_kg}kg` : ""}
                  </span>
                )}
                {!isSpecial && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMode(ex.exercise_name, ex.sets)}
                    className="h-6 px-2 text-[10px]"
                  >
                    {entry.mode === "quick" ? "Détaillé" : "Rapide"}
                  </Button>
                )}
              </div>
            </div>

            {entry.mode === "quick" && (
              <QuickModeRow
                entry={entry}
                onChange={(e) => updateEntry(ex.exercise_name, e)}
              />
            )}

            {entry.mode === "detailed" && (
              <DetailedModeRows
                entry={entry}
                onChange={(e) => updateEntry(ex.exercise_name, e)}
              />
            )}

            {entry.mode === "special" && (
              <SpecialModeRows
                entry={entry}
                onChange={(e) => updateEntry(ex.exercise_name, e)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============= Sub-components =============

function QuickModeRow({
  entry,
  onChange,
}: {
  entry: WeightLogQuickEntry;
  onChange: (next: WeightLogQuickEntry) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Input
        type="number"
        step="0.5"
        placeholder="kg"
        className="h-8 w-16 text-xs"
        value={entry.weight}
        onChange={(e) => onChange({ ...entry, weight: e.target.value })}
      />
      <span className="text-xs text-muted-foreground">kg</span>
      <Input
        type="number"
        placeholder="Séries"
        className="h-8 w-16 text-xs ml-2"
        value={entry.sets}
        onChange={(e) => onChange({ ...entry, sets: e.target.value })}
      />
      <span className="text-xs text-muted-foreground">×</span>
      <Input
        type="number"
        placeholder="Reps"
        className="h-8 w-16 text-xs"
        value={entry.reps}
        onChange={(e) => onChange({ ...entry, reps: e.target.value })}
      />
      <span className="text-xs text-muted-foreground">reps</span>
    </div>
  );
}

function DetailedModeRows({
  entry,
  onChange,
}: {
  entry: WeightLogDetailedEntry;
  onChange: (next: WeightLogDetailedEntry) => void;
}) {
  return (
    <div className="space-y-1.5">
      {entry.series.map((serie, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-12 shrink-0">
            Série {idx + 1}
          </span>
          <Input
            type="number"
            step="0.5"
            placeholder="kg"
            className="h-7 w-16 text-xs"
            value={serie.weight}
            onChange={(e) => {
              const next = [...entry.series];
              next[idx] = { ...next[idx], weight: e.target.value };
              onChange({ ...entry, series: next });
            }}
          />
          <span className="text-[10px] text-muted-foreground">kg ×</span>
          <Input
            type="number"
            placeholder="reps"
            className="h-7 w-20 text-xs"
            value={serie.reps}
            onChange={(e) => {
              const next = [...entry.series];
              next[idx] = { ...next[idx], reps: e.target.value };
              onChange({ ...entry, series: next });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => {
              if (entry.series.length <= 1) return;
              onChange({ ...entry, series: entry.series.filter((_, i) => i !== idx) });
            }}
            disabled={entry.series.length <= 1}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-[11px] w-full"
        onClick={() => {
          const last = entry.series[entry.series.length - 1] || { weight: "", reps: "" };
          onChange({ ...entry, series: [...entry.series, { ...last }] });
        }}
      >
        <Plus className="h-3 w-3 mr-1" />
        Ajouter une série
      </Button>
    </div>
  );
}

function SpecialModeRows({
  entry,
  onChange,
}: {
  entry: WeightLogSpecialEntry;
  onChange: (next: WeightLogSpecialEntry) => void;
}) {
  const helpText: Record<string, string> = {
    drop_set: "Charge max → drops à charge dégressive jusqu'à l'échec.",
    cluster: "Mini-séries entrecoupées de courtes pauses, charge identique.",
    rest_pause: "Set principal jusqu'à l'échec, puis reprises courtes après pause de 15 s.",
    pyramid_up: "Charge croissante × reps décroissantes.",
    pyramid_down: "Charge décroissante × reps croissantes.",
    pyramid_full: "Pyramide ascendante puis descendante.",
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground italic">
        {helpText[entry.method] || "Saisis le poids et les reps de chaque sous-série."}
      </p>
      {entry.series.map((serie, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">
            {serie.label || `Set ${idx + 1}`}
          </span>
          <Input
            type="number"
            step="0.5"
            placeholder="kg"
            className="h-7 w-16 text-xs"
            value={serie.weight}
            onChange={(e) => {
              const next = [...entry.series];
              next[idx] = { ...next[idx], weight: e.target.value };
              onChange({ ...entry, series: next });
            }}
          />
          <span className="text-[10px] text-muted-foreground">kg ×</span>
          <Input
            type="number"
            placeholder="reps"
            className="h-7 w-20 text-xs"
            value={serie.reps}
            onChange={(e) => {
              const next = [...entry.series];
              next[idx] = { ...next[idx], reps: e.target.value };
              onChange({ ...entry, series: next });
            }}
          />
          {entry.method !== "cluster" && entry.method.indexOf("pyramid") === -1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={() => {
                if (entry.series.length <= 1) return;
                onChange({ ...entry, series: entry.series.filter((_, i) => i !== idx) });
              }}
              disabled={entry.series.length <= 1}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}
      {(entry.method === "drop_set" || entry.method === "rest_pause") && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px] w-full"
          onClick={() => {
            const last = entry.series[entry.series.length - 1] || { weight: "", reps: "" };
            const labelPrefix = entry.method === "drop_set" ? "Drop" : "Reprise";
            onChange({
              ...entry,
              series: [
                ...entry.series,
                { ...last, label: `${labelPrefix} ${entry.series.length}` },
              ],
            });
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter {entry.method === "drop_set" ? "un drop" : "une reprise"}
        </Button>
      )}
    </div>
  );
}

/**
 * Convert a WeightLogState into rows ready for upsert into athlete_exercise_logs.
 * Special modes (drop set, cluster, rest-pause, pyramid) compute exact tonnage from each sub-series.
 */
export function buildWeightLogRecords(
  state: WeightLogState,
  ctx: { playerId: string; categoryId: string; trainingSessionId: string },
): Array<{
  player_id: string;
  category_id: string;
  training_session_id: string;
  exercise_name: string;
  actual_weight_kg: number;
  actual_sets: number;
  actual_reps: number;
}> {
  // NOTE: `tonnage` is a GENERATED column in DB (weight × sets × reps).
  // We must NOT include it in the insert payload — Postgres will reject the row otherwise.
  const out: ReturnType<typeof buildWeightLogRecords> = [];

  Object.entries(state).forEach(([exerciseName, entry]) => {
    if (entry.mode === "quick") {
      const weight = parseFloat(entry.weight);
      const sets = parseInt(entry.sets);
      const reps = parseInt(entry.reps);
      if (!weight || !sets || !reps) return;
      out.push({
        player_id: ctx.playerId,
        category_id: ctx.categoryId,
        training_session_id: ctx.trainingSessionId,
        exercise_name: exerciseName,
        actual_weight_kg: weight,
        actual_sets: sets,
        actual_reps: reps,
      });
      return;
    }

    // detailed OR special (drop set / cluster / rest-pause / pyramid): aggregate exactly per sub-set
    const series = entry.mode === "detailed" ? entry.series : entry.series;
    let totalTonnage = 0;
    let totalReps = 0;
    let validSeries = 0;
    series.forEach((s) => {
      const w = parseFloat(s.weight);
      const r = parseInt(s.reps);
      if (!w || !r) return;
      totalTonnage += w * r;
      totalReps += r;
      validSeries += 1;
    });
    if (validSeries === 0 || totalReps === 0) return;
    // Reconstruct an "equivalent weight" so that weight × sets × reps = totalTonnage in DB.
    // We use sets=1, reps=totalReps and weight=totalTonnage/totalReps to keep the generated
    // tonnage exact even for drop sets / clusters where the real volume ≠ avg×sets×reps.
    const equivalentWeight = Math.round((totalTonnage / totalReps) * 100) / 100;
    out.push({
      player_id: ctx.playerId,
      category_id: ctx.categoryId,
      training_session_id: ctx.trainingSessionId,
      exercise_name: exerciseName,
      actual_weight_kg: equivalentWeight,
      actual_sets: 1,
      actual_reps: totalReps,
    });
  });

  return out;
}

/**
 * Count how many gym exercises in the state still have no usable weight/reps entered.
 * Used to warn the athlete before validating their RPE.
 */
export function countIncompleteWeightLogs(state: WeightLogState): number {
  let incomplete = 0;
  Object.values(state).forEach((entry) => {
    if (entry.mode === "quick") {
      const w = parseFloat(entry.weight);
      const s = parseInt(entry.sets);
      const r = parseInt(entry.reps);
      if (!w || !s || !r) incomplete += 1;
      return;
    }
    const hasAny = entry.series.some((sr) => parseFloat(sr.weight) > 0 && parseInt(sr.reps) > 0);
    if (!hasAny) incomplete += 1;
  });
  return incomplete;
}
