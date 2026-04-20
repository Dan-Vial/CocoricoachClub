import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionWeightLogTabProps {
  sessionId: string;
  categoryId: string;
  playersToShow: Array<{ id: string; name: string; first_name: string | null; avatar_url: string | null }>;
  weightLogs: Record<string, Record<string, { weight: string; sets: string; reps: string }>>;
  onWeightLogChange: (playerId: string, exerciseName: string, field: "weight" | "sets" | "reps", value: string) => void;
}

export function SessionWeightLogTab({
  sessionId,
  categoryId,
  playersToShow,
  weightLogs,
  onWeightLogChange,
}: SessionWeightLogTabProps) {
  // Fetch exercises for this session
  const { data: exercises } = useQuery({
    queryKey: ["session-exercises-for-weight", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", sessionId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Fetch existing logs
  const { data: existingLogs } = useQuery({
    queryKey: ["athlete-exercise-logs", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_exercise_logs")
        .select("*")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Get unique exercises (deduplicate by name since exercises are per-player in gym_session_exercises)
  const uniqueExercises = exercises
    ? Array.from(
        new Map(
          exercises.map((e) => [
            e.exercise_name,
            {
              name: e.exercise_name,
              category: e.exercise_category,
              sets: e.sets,
              reps: e.reps,
              weight_kg: e.weight_kg,
            },
          ])
        ).values()
      )
    : [];

  const existingLogMap = new Map<string, any>();
  existingLogs?.forEach((log) => {
    existingLogMap.set(`${log.player_id}_${log.exercise_name}`, log);
  });

  if (uniqueExercises.length === 0) {
    return (
      <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 bg-primary/5 text-center">
        <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucun exercice de musculation dans cette séance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Saisissez les charges réelles utilisées par chaque athlète.
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 280px)" }}>
        <div className="space-y-4">
          {uniqueExercises.map((exercise) => (
            <div
              key={exercise.name}
              className="border rounded-xl p-3 space-y-2 bg-card"
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{exercise.name}</span>
                {exercise.category && (
                  <Badge variant="outline" className="text-xs">
                    {exercise.category}
                  </Badge>
                )}
                {exercise.sets && exercise.reps && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Prescrit: {exercise.sets}×{exercise.reps}
                    {exercise.weight_kg ? ` @${exercise.weight_kg}kg` : ""}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {playersToShow.map((player) => {
                  const existing = existingLogMap.get(`${player.id}_${exercise.name}`);
                  const logValues = weightLogs[player.id]?.[exercise.name];

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border",
                        existing
                          ? "border-muted bg-muted/60 opacity-70"
                          : logValues?.weight
                            ? "border-primary/30 bg-primary/5"
                            : "border-border"
                      )}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(player.first_name || player.name).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate flex-1 min-w-0">
                        {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                      </span>

                      {existing ? (
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          ✓ {existing.actual_weight_kg}kg {existing.actual_sets}×{existing.actual_reps}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="kg"
                            className="h-8 w-16 text-sm px-2"
                            value={logValues?.weight || ""}
                            onChange={(e) =>
                              onWeightLogChange(player.id, exercise.name, "weight", e.target.value)
                            }
                          />
                          <Input
                            type="number"
                            placeholder="S"
                            className="h-8 w-14 text-sm px-2"
                            value={logValues?.sets || exercise.sets?.toString() || ""}
                            onChange={(e) =>
                              onWeightLogChange(player.id, exercise.name, "sets", e.target.value)
                            }
                          />
                          <span className="text-xs text-muted-foreground">×</span>
                          <Input
                            type="number"
                            placeholder="R"
                            className="h-8 w-14 text-sm px-2"
                            value={logValues?.reps || exercise.reps?.toString() || ""}
                            onChange={(e) =>
                              onWeightLogChange(player.id, exercise.name, "reps", e.target.value)
                            }
                          />
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
    </div>
  );
}
