import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Link2, Unlink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDroppable } from "@dnd-kit/core";

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  order_index: number;
  method: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  tempo?: string;
  rest_seconds: number;
  group_id?: string;
  group_order?: number;
  notes?: string;
}

interface ProgramSession {
  id: string;
  session_number: number;
  name: string;
  day_of_week?: number;
  exercises: ProgramExercise[];
}

interface ProgramSessionCardProps {
  session: ProgramSession;
  onUpdate: (session: ProgramSession) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const EXERCISE_METHODS = [
  { value: "normal", label: "Normal" },
  { value: "superset", label: "Superset" },
  { value: "triset", label: "Triset" },
  { value: "dropset", label: "Drop Set" },
  { value: "pyramid_up", label: "Pyramide ↑" },
  { value: "pyramid_down", label: "Pyramide ↓" },
  { value: "giant_set", label: "Giant Set" },
  { value: "cluster", label: "Cluster" },
];

export function ProgramSessionCard({
  session,
  onUpdate,
  onDelete,
  canDelete,
}: ProgramSessionCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: session.id,
  });

  const updateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...session.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    onUpdate({ ...session, exercises: newExercises });
  };

  const deleteExercise = (index: number) => {
    const exerciseToDelete = session.exercises[index];
    let newExercises = session.exercises.filter((_, i) => i !== index);

    // If deleting a grouped exercise, update the group
    if (exerciseToDelete.group_id) {
      const groupExercises = newExercises.filter(
        (e) => e.group_id === exerciseToDelete.group_id
      );
      if (groupExercises.length < 2) {
        // Remove grouping if less than 2 exercises remain
        newExercises = newExercises.map((e) =>
          e.group_id === exerciseToDelete.group_id
            ? { ...e, group_id: undefined, group_order: undefined, method: "normal" }
            : e
        );
      } else {
        // Update group orders
        let groupOrder = 1;
        newExercises = newExercises.map((e) =>
          e.group_id === exerciseToDelete.group_id
            ? { ...e, group_order: groupOrder++ }
            : e
        );
      }
    }

    onUpdate({
      ...session,
      exercises: newExercises.map((e, i) => ({ ...e, order_index: i })),
    });
  };

  const linkExercises = (startIndex: number, count: number, method: string) => {
    const groupId = crypto.randomUUID();
    const newExercises = session.exercises.map((ex, i) => {
      if (i >= startIndex && i < startIndex + count) {
        return {
          ...ex,
          method,
          group_id: groupId,
          group_order: i - startIndex + 1,
        };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: newExercises });
  };

  const unlinkExercise = (exercise: ProgramExercise) => {
    const newExercises = session.exercises.map((ex) => {
      if (ex.group_id === exercise.group_id) {
        return { ...ex, group_id: undefined, group_order: undefined, method: "normal" };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: newExercises });
  };

  const getMethodLabel = (method: string) => {
    return EXERCISE_METHODS.find((m) => m.value === method)?.label || method;
  };

  const getGroupInfo = (exercise: ProgramExercise) => {
    if (!exercise.group_id) return null;
    const groupExercises = session.exercises.filter(
      (e) => e.group_id === exercise.group_id
    );
    return {
      total: groupExercises.length,
      isLast: exercise.group_order === groupExercises.length,
    };
  };

  // Get grouped exercises for rendering connected lines
  const groupedExercises = new Map<string, ProgramExercise[]>();
  session.exercises.forEach((ex) => {
    if (ex.group_id) {
      if (!groupedExercises.has(ex.group_id)) {
        groupedExercises.set(ex.group_id, []);
      }
      groupedExercises.get(ex.group_id)!.push(ex);
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg bg-background transition-colors ${
        isOver ? "border-primary border-2 bg-primary/5" : ""
      }`}
    >
      {/* Session header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Input
          value={session.name}
          onChange={(e) => onUpdate({ ...session, name: e.target.value })}
          className="flex-1 h-8 text-sm font-medium"
          placeholder="Nom de la séance"
        />
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Exercises */}
      <div className="p-3 space-y-2 min-h-[80px]">
        {session.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Glissez des exercices ici
          </p>
        ) : (
          session.exercises.map((exercise, index) => {
            const groupInfo = getGroupInfo(exercise);
            const isGrouped = !!exercise.group_id;
            const showConnector =
              isGrouped && exercise.group_order && exercise.group_order > 1;

            return (
              <div key={exercise.id} className="relative">
                {/* Connector for grouped exercises */}
                {showConnector && (
                  <div className="flex items-center gap-2 py-1 ml-4">
                    <div className="w-0.5 h-4 bg-primary -mt-3" />
                    <span className="text-xs text-muted-foreground">↓ enchaîné</span>
                  </div>
                )}

                <div
                  className={`flex flex-col gap-2 p-3 rounded-lg border ${
                    isGrouped ? "border-primary/30 bg-primary/5" : "bg-muted/30"
                  }`}
                >
                  {/* Exercise header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="font-medium flex-1">{exercise.exercise_name}</span>

                    {isGrouped && (
                      <>
                        <Badge className="bg-primary/20 text-primary text-xs">
                          {getMethodLabel(exercise.method)} ({groupInfo?.total} exos)
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkExercise(exercise)}
                          className="h-6 px-2"
                        >
                          <Unlink className="h-3 w-3 mr-1" />
                          {exercise.group_order}/{groupInfo?.total}
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteExercise(index)}
                      className="h-6 w-6 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Exercise parameters */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Méthode</label>
                      <Select
                        value={exercise.method}
                        onValueChange={(value) => {
                          if (["superset", "triset", "giant_set"].includes(value)) {
                            const count = value === "superset" ? 2 : value === "triset" ? 3 : 4;
                            const availableCount = Math.min(
                              count,
                              session.exercises.length - index
                            );
                            if (availableCount >= 2) {
                              linkExercises(index, availableCount, value);
                            }
                          } else {
                            updateExercise(index, "method", value);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXERCISE_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Séries</label>
                      <Input
                        type="number"
                        min={1}
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(index, "sets", parseInt(e.target.value) || 1)
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <Input
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, "reps", e.target.value)}
                        placeholder="10"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">%1RM</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={exercise.percentage_1rm || ""}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "percentage_1rm",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="75"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Show rest only on last exercise of group or for non-grouped */}
                    {(!isGrouped || groupInfo?.isLast) && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Repos{isGrouped ? " bloc" : ""} (s)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={exercise.rest_seconds}
                          onChange={(e) =>
                            updateExercise(
                              index,
                              "rest_seconds",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Tempo field */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Tempo</label>
                    <Input
                      value={exercise.tempo || ""}
                      onChange={(e) => updateExercise(index, "tempo", e.target.value)}
                      placeholder="3-1-2-0"
                      className="h-7 text-xs w-24"
                    />
                  </div>
                </div>

                {/* Rest indicator for grouped exercises */}
                {isGrouped && groupInfo?.isLast && (
                  <div className="flex items-center gap-2 mt-2 ml-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Repos {exercise.rest_seconds}s
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      après le bloc de {groupInfo.total} exercices
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
