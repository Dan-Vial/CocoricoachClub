import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Link2, Unlink, Plus, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDroppable } from "@dnd-kit/core";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DropSet {
  reps: string;
  percentage: number;
}

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
  drop_sets?: DropSet[];
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
  { value: "superset", label: "Superset (2)" },
  { value: "triset", label: "Triset (3)" },
  { value: "giant_set", label: "Giant Set (4+)" },
  { value: "dropset", label: "Drop Set" },
  { value: "pyramid_up", label: "Pyramide ↑" },
  { value: "pyramid_down", label: "Pyramide ↓" },
  { value: "cluster", label: "Cluster" },
];

const LINKABLE_METHODS = ["superset", "triset", "giant_set"];
const DROP_METHODS = ["dropset", "pyramid_up", "pyramid_down"];

export function ProgramSessionCard({
  session,
  onUpdate,
  onDelete,
  canDelete,
}: ProgramSessionCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: session.id,
  });
  const [linkingFrom, setLinkingFrom] = useState<{index: number, method: string} | null>(null);

  const updateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...session.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    onUpdate({ ...session, exercises: newExercises });
  };

  const deleteExercise = (index: number) => {
    const exerciseToDelete = session.exercises[index];
    let newExercises = session.exercises.filter((_, i) => i !== index);

    if (exerciseToDelete.group_id) {
      const groupExercises = newExercises.filter(
        (e) => e.group_id === exerciseToDelete.group_id
      );
      if (groupExercises.length < 2) {
        newExercises = newExercises.map((e) =>
          e.group_id === exerciseToDelete.group_id
            ? { ...e, group_id: undefined, group_order: undefined, method: "normal" }
            : e
        );
      } else {
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

  const startLinking = (index: number, method: string) => {
    setLinkingFrom({ index, method });
  };

  const linkToExercise = (targetIndex: number) => {
    if (!linkingFrom) return;
    
    const { index: startIndex, method } = linkingFrom;
    const minIndex = Math.min(startIndex, targetIndex);
    const maxIndex = Math.max(startIndex, targetIndex);
    
    const groupId = crypto.randomUUID();
    const newExercises = session.exercises.map((ex, i) => {
      if (i >= minIndex && i <= maxIndex) {
        return {
          ...ex,
          method,
          group_id: groupId,
          group_order: i - minIndex + 1,
        };
      }
      return ex;
    });
    
    onUpdate({ ...session, exercises: newExercises });
    setLinkingFrom(null);
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

  const initDropSets = (index: number, method: string) => {
    const exercise = session.exercises[index];
    const sets = exercise.sets || 3;
    const basePercentage = exercise.percentage_1rm || 75;
    const baseReps = exercise.reps || "10";
    
    let dropSets: DropSet[] = [];
    
    if (method === "dropset") {
      // Dropset: même reps, charge diminue
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: baseReps,
        percentage: Math.max(basePercentage - (i * 10), 40),
      }));
    } else if (method === "pyramid_up") {
      // Pyramide montante: charge augmente, reps diminuent
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(Math.max(parseInt(baseReps) - (i * 2), 3)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
    } else if (method === "pyramid_down") {
      // Pyramide descendante: charge diminue, reps augmentent
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(parseInt(baseReps) + (i * 2)),
        percentage: Math.max(basePercentage - (i * 5), 50),
      }));
    }
    
    updateExercise(index, "drop_sets", dropSets);
    updateExercise(index, "method", method);
  };

  const updateDropSet = (exerciseIndex: number, setIndex: number, field: keyof DropSet, value: any) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    dropSets[setIndex] = { ...dropSets[setIndex], [field]: value };
    updateExercise(exerciseIndex, "drop_sets", dropSets);
  };

  const addDropSet = (exerciseIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    const lastSet = dropSets[dropSets.length - 1];
    dropSets.push({
      reps: lastSet?.reps || "10",
      percentage: Math.max((lastSet?.percentage || 70) - 10, 40),
    });
    updateExercise(exerciseIndex, "drop_sets", dropSets);
    updateExercise(exerciseIndex, "sets", dropSets.length);
  };

  const removeDropSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = (exercise.drop_sets || []).filter((_, i) => i !== setIndex);
    updateExercise(exerciseIndex, "drop_sets", dropSets);
    updateExercise(exerciseIndex, "sets", dropSets.length);
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
      isFirst: exercise.group_order === 1,
    };
  };

  const isLinkable = (index: number) => {
    if (!linkingFrom) return false;
    if (index === linkingFrom.index) return false;
    const exercise = session.exercises[index];
    return !exercise.group_id;
  };

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

      {/* Linking mode indicator */}
      {linkingFrom && (
        <div className="p-2 bg-primary/10 border-b flex items-center justify-between">
          <span className="text-sm text-primary">
            Cliquez sur un exercice pour le lier en {getMethodLabel(linkingFrom.method)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setLinkingFrom(null)}>
            Annuler
          </Button>
        </div>
      )}

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
            const isDropMethod = DROP_METHODS.includes(exercise.method);

            return (
              <div key={exercise.id} className="relative">
                {/* Connector for grouped exercises */}
                {showConnector && (
                  <div className="flex items-center gap-2 py-1 ml-4">
                    <div className="w-0.5 h-4 bg-primary -mt-3" />
                    <span className="text-xs text-primary font-medium">+ enchaîné (pas de repos)</span>
                  </div>
                )}

                <div
                  className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                    isGrouped 
                      ? "border-primary/50 bg-primary/5" 
                      : linkingFrom && isLinkable(index)
                        ? "border-primary border-dashed cursor-pointer hover:bg-primary/10"
                        : "bg-muted/30"
                  }`}
                  onClick={() => {
                    if (linkingFrom && isLinkable(index)) {
                      linkToExercise(index);
                    }
                  }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            unlinkExercise(exercise);
                          }}
                          className="h-6 px-2"
                        >
                          <Unlink className="h-3 w-3 mr-1" />
                          Délier
                        </Button>
                      </>
                    )}

                    {isDropMethod && (
                      <Badge className="bg-orange-500/20 text-orange-600 text-xs">
                        {getMethodLabel(exercise.method)}
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteExercise(index);
                      }}
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
                          if (LINKABLE_METHODS.includes(value)) {
                            // Pour superset/triset, on active le mode liaison
                            startLinking(index, value);
                          } else if (DROP_METHODS.includes(value)) {
                            // Pour dropset/pyramide, on initialise les sets
                            initDropSets(index, value);
                          } else {
                            updateExercise(index, "method", value);
                            updateExercise(index, "drop_sets", undefined);
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

                    {!isDropMethod && (
                      <>
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
                      </>
                    )}

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

                  {/* Drop sets / Pyramid configuration */}
                  {isDropMethod && exercise.drop_sets && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {exercise.method === "dropset" && "Configuration Drop Set"}
                          {exercise.method === "pyramid_up" && "Pyramide Montante (↑ charge, ↓ reps)"}
                          {exercise.method === "pyramid_down" && "Pyramide Descendante (↓ charge, ↑ reps)"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addDropSet(index);
                          }}
                          className="h-6 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Ajouter set
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        {exercise.drop_sets.map((dropSet, setIndex) => (
                          <div key={setIndex} className="flex items-center gap-2 bg-background/50 p-2 rounded">
                            <span className="text-xs font-medium w-12">Set {setIndex + 1}</span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={dropSet.percentage}
                                onChange={(e) => updateDropSet(index, setIndex, "percentage", parseInt(e.target.value) || 0)}
                                className="h-7 w-16 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            <span className="text-xs text-muted-foreground">×</span>
                            <div className="flex items-center gap-1">
                              <Input
                                value={dropSet.reps}
                                onChange={(e) => updateDropSet(index, setIndex, "reps", e.target.value)}
                                className="h-7 w-16 text-xs"
                                placeholder="10"
                              />
                              <span className="text-xs text-muted-foreground">reps</span>
                            </div>
                            {exercise.drop_sets!.length > 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeDropSet(index, setIndex);
                                }}
                                className="h-6 w-6 text-destructive"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
