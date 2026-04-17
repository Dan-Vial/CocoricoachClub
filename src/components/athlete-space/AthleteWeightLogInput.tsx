import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Lock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export type WeightLogEntry = WeightLogQuickEntry | WeightLogDetailedEntry;

export type WeightLogState = Record<string, WeightLogEntry>;

interface Props {
  sessionId: string;
  playerId: string;
  value: WeightLogState;
  onChange: (next: WeightLogState) => void;
}

/**
 * Athlete-side input for actual weights lifted during a gym session.
 * - Pre-fills exercises prescribed in the session
 * - Locks (greys out) exercises already logged by staff to avoid duplicates
 * - Quick mode (avg weight/reps × sets) or detailed mode (series-by-series)
 */
export function AthleteWeightLogInput({ sessionId, playerId, value, onChange }: Props) {
  // Fetch prescribed exercises for the session (staff prescription is null player_id; athlete-specific overrides exist too)
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

  // Fetch existing logs for THIS athlete on this session — these are read-only (already filled by staff or earlier)
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

  // Filter to gym/strength exercises only (skip placeholder rows without sets/reps prescription)
  const gymExercises = useMemo(() => {
    const seen = new Set<string>();
    return exercises.filter((e) => {
      if (!e.exercise_name) return false;
      if (seen.has(e.exercise_name)) return false;
      seen.add(e.exercise_name);
      return true;
    });
  }, [exercises]);

  // Initialize entries for new exercises (default = quick mode, prefilled with prescribed sets/reps)
  useEffect(() => {
    if (gymExercises.length === 0) return;
    const next: WeightLogState = { ...value };
    let mutated = false;
    gymExercises.forEach((ex) => {
      if (existingByName.has(ex.exercise_name)) return; // locked
      if (!next[ex.exercise_name]) {
        next[ex.exercise_name] = {
          mode: "quick",
          weight: ex.weight_kg ? String(ex.weight_kg) : "",
          sets: ex.sets ? String(ex.sets) : "",
          reps: ex.reps ? String(ex.reps) : "",
        };
        mutated = true;
      }
    });
    if (mutated) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymExercises.map((e) => e.exercise_name).join("|"), existingByName.size]);

  const updateEntry = (exerciseName: string, entry: WeightLogEntry) => {
    onChange({ ...value, [exerciseName]: entry });
  };

  const toggleMode = (exerciseName: string, prescribedSets?: number | null) => {
    const current = value[exerciseName];
    if (!current) return;
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

      {gymExercises.map((ex) => {
        const existing = existingByName.get(ex.exercise_name);
        const entry = value[ex.exercise_name];

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
              </div>
              <div className="flex items-center gap-2">
                {ex.sets && ex.reps && (
                  <span className="text-[10px] text-muted-foreground">
                    Prescrit : {ex.sets}×{ex.reps}
                    {ex.weight_kg ? ` @${ex.weight_kg}kg` : ""}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMode(ex.exercise_name, ex.sets)}
                  className="h-6 px-2 text-[10px]"
                >
                  {entry.mode === "quick" ? "Détaillé" : "Rapide"}
                </Button>
              </div>
            </div>

            {entry.mode === "quick" ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  placeholder="kg"
                  className="h-8 w-16 text-xs"
                  value={entry.weight}
                  onChange={(e) =>
                    updateEntry(ex.exercise_name, { ...entry, weight: e.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">kg</span>
                <Input
                  type="number"
                  placeholder="Séries"
                  className="h-8 w-16 text-xs ml-2"
                  value={entry.sets}
                  onChange={(e) =>
                    updateEntry(ex.exercise_name, { ...entry, sets: e.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  placeholder="Reps"
                  className="h-8 w-16 text-xs"
                  value={entry.reps}
                  onChange={(e) =>
                    updateEntry(ex.exercise_name, { ...entry, reps: e.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">reps</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {entry.series.map((serie, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground w-8 shrink-0">
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
                        updateEntry(ex.exercise_name, { ...entry, series: next });
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
                        updateEntry(ex.exercise_name, { ...entry, series: next });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => {
                        if (entry.series.length <= 1) return;
                        const next = entry.series.filter((_, i) => i !== idx);
                        updateEntry(ex.exercise_name, { ...entry, series: next });
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
                    updateEntry(ex.exercise_name, {
                      ...entry,
                      series: [...entry.series, { ...last }],
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une série
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Convert a WeightLogState into rows ready for upsert into athlete_exercise_logs.
 * In detailed mode, we aggregate by averaging weight (weighted by reps) and summing sets.
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
  tonnage: number;
}> {
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
        tonnage: weight * sets * reps,
      });
    } else {
      // detailed: compute total tonnage from each serie, derive avg weight & total reps
      let totalTonnage = 0;
      let totalReps = 0;
      let validSeries = 0;
      entry.series.forEach((s) => {
        const w = parseFloat(s.weight);
        const r = parseInt(s.reps);
        if (!w || !r) return;
        totalTonnage += w * r;
        totalReps += r;
        validSeries += 1;
      });
      if (validSeries === 0 || totalReps === 0) return;
      const avgWeight = Math.round((totalTonnage / totalReps) * 10) / 10;
      const avgReps = Math.round(totalReps / validSeries);
      out.push({
        player_id: ctx.playerId,
        category_id: ctx.categoryId,
        training_session_id: ctx.trainingSessionId,
        exercise_name: exerciseName,
        actual_weight_kg: avgWeight,
        actual_sets: validSeries,
        actual_reps: avgReps,
        tonnage: totalTonnage,
      });
    }
  });

  return out;
}
