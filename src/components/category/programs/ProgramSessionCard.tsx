import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Link2, Unlink, Plus, Minus, FlaskConical, Check, Info, ChevronUp, ChevronDown, Library } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDroppable } from "@dnd-kit/core";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TEST_CATEGORIES } from "@/lib/constants/testCategories";
import { isErgCategory, isSledCategory, isRunningCategory, isBodyweightCategory, getCategoryLabel } from "@/lib/constants/exerciseCategories";
import { cn } from "@/lib/utils";
import { TrainingMethodSelect } from "@/components/category/sessions/TrainingMethodSelect";
import {
  TRAINING_STYLES,
  getTrainingStyleConfig,
  isLinkableMethod,
  isDropMethod as checkIsDropMethod,
  isClusterMethod as checkIsClusterMethod,
  isVbtMethod as checkIsVbtMethod,
  getMaxExercisesForMethod,
  LINKABLE_METHODS,
  DROP_METHODS,
  CLUSTER_METHODS,
} from "@/lib/constants/trainingStyles";

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

interface ErgData {
  duration_seconds?: number;
  distance_meters?: number;
  calories?: number;
  watts?: number;
  rpm?: number;
  stroke_rate?: number;
}

interface RunningData {
  distance_meters?: number;
  duration_seconds?: number;
  vma_percentage?: number;
  pace_kmh?: number;
  pace_ms?: number;
  pace_min_km?: number; // min/km pace
  intervals?: number;
  interval_distance_m?: number;
  interval_duration_s?: number;
  recovery_time_s?: number;
  recovery_distance_m?: number;
  elevation_gain_m?: number;
}

interface BodyweightData {
  additional_weight_kg?: number; // optional added weight for weighted calisthenics
}

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  exercise_category?: string;
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
  cluster_sets?: ClusterSet[];
  is_rm_test?: boolean;
  rm_test_type?: string;
  erg_data?: ErgData;
  running_data?: RunningData;
  bodyweight_data?: BodyweightData;
  target_velocity?: number; // VBT - target velocity in m/s
  target_force_newton?: number | null; // Force in Newton
}

interface ProgramSession {
  id: string;
  session_number: number;
  name: string;
  day_of_week?: number;
  scheduled_day?: number;
  exercises: ProgramExercise[];
}

interface ProgramSessionCardProps {
  session: ProgramSession;
  onUpdate: (session: ProgramSession) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

// Group exercises by group_id for visual grouping
interface ExerciseGroup {
  groupId: string | null;
  exercises: { exercise: ProgramExercise; index: number }[];
  method: string;
}

export function ProgramSessionCard({
  session,
  onUpdate,
  onDelete,
  canDelete,
}: ProgramSessionCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: session.id,
  });
  const [linkingFrom, setLinkingFrom] = useState<{index: number, method: string, maxCount: number} | null>(null);
  const [selectedForLinking, setSelectedForLinking] = useState<number[]>([]);

  // Reset linking state when exercises change
  useEffect(() => {
    if (linkingFrom) {
      const stillValid = session.exercises[linkingFrom.index];
      if (!stillValid) {
        setLinkingFrom(null);
        setSelectedForLinking([]);
      }
    }
  }, [session.exercises]);

  // Organize exercises into groups for rendering
  const exerciseGroups = useMemo(() => {
    const groups: ExerciseGroup[] = [];
    const processedGroupIds = new Set<string>();

    session.exercises.forEach((exercise, index) => {
      if (exercise.group_id) {
        if (!processedGroupIds.has(exercise.group_id)) {
          processedGroupIds.add(exercise.group_id);
          const groupExercises = session.exercises
            .map((ex, idx) => ({ exercise: ex, index: idx }))
            .filter(({ exercise: ex }) => ex.group_id === exercise.group_id)
            .sort((a, b) => (a.exercise.group_order || 0) - (b.exercise.group_order || 0));
          
          groups.push({
            groupId: exercise.group_id,
            exercises: groupExercises,
            method: exercise.method,
          });
        }
      } else {
        groups.push({
          groupId: null,
          exercises: [{ exercise, index }],
          method: exercise.method,
        });
      }
    });

    return groups;
  }, [session.exercises]);

  const updateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...session.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    onUpdate({ ...session, exercises: newExercises });
  };

  const updateMultipleFields = (index: number, updates: Record<string, any>) => {
    const newExercises = [...session.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
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

  // Move exercise or block up/down
  const moveExerciseOrBlock = (groupIndex: number, direction: "up" | "down") => {
    const newGroups = [...exerciseGroups];
    const targetIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newGroups.length) return;
    
    // Swap the groups
    [newGroups[groupIndex], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[groupIndex]];
    
    // Flatten back to exercises and update order_index
    let orderIndex = 0;
    const newExercises: ProgramExercise[] = [];
    
    newGroups.forEach((group) => {
      group.exercises.forEach(({ exercise }) => {
        newExercises.push({
          ...exercise,
          order_index: orderIndex++,
        });
      });
    });
    
    onUpdate({ ...session, exercises: newExercises });
  };

  const getMaxCountForMethod = (method: string): number => {
    return getMaxExercisesForMethod(method);
  };

  const startLinking = (index: number, method: string) => {
    const maxCount = getMaxCountForMethod(method);
    setLinkingFrom({ index, method, maxCount });
    setSelectedForLinking([index]);
    // Update the exercise method immediately so the select reflects the chosen method
    const newExercises = [...session.exercises];
    newExercises[index] = { ...newExercises[index], method };
    onUpdate({ ...session, exercises: newExercises });
  };

  const toggleExerciseForLinking = (targetIndex: number) => {
    if (!linkingFrom) return;
    
    const exercise = session.exercises[targetIndex];
    if (exercise.group_id) return;
    
    if (selectedForLinking.includes(targetIndex)) {
      if (targetIndex === linkingFrom.index) return;
      setSelectedForLinking(prev => prev.filter(i => i !== targetIndex));
    } else {
      if (selectedForLinking.length < linkingFrom.maxCount) {
        setSelectedForLinking(prev => [...prev, targetIndex]);
      }
    }
  };

  const confirmLinking = () => {
    if (!linkingFrom || selectedForLinking.length < 2) return;
    
    const { method } = linkingFrom;
    const groupId = crypto.randomUUID();
    const sortedIndices = [...selectedForLinking].sort((a, b) => a - b);
    
    const newExercises = session.exercises.map((ex, i) => {
      const groupIndex = sortedIndices.indexOf(i);
      if (groupIndex !== -1) {
        return {
          ...ex,
          method,
          group_id: groupId,
          group_order: groupIndex + 1,
        };
      }
      return ex;
    });
    
    onUpdate({ ...session, exercises: newExercises });
    setLinkingFrom(null);
    setSelectedForLinking([]);
  };

  const cancelLinking = () => {
    // Reset method back to normal for all selected exercises
    if (linkingFrom) {
      selectedForLinking.forEach(i => {
        updateExercise(i, "method", "normal");
      });
    }
    setLinkingFrom(null);
    setSelectedForLinking([]);
  };

  const unlinkGroup = (groupId: string) => {
    const newExercises = session.exercises.map((ex) => {
      if (ex.group_id === groupId) {
        return { ...ex, group_id: undefined, group_order: undefined, method: "normal" };
      }
      return ex;
    });
    onUpdate({ ...session, exercises: newExercises });
  };

  const initDropSets = (index: number, method: string) => {
    const exercise = session.exercises[index];
    const sets = exercise.sets || 4;
    const basePercentage = exercise.percentage_1rm || 75;
    const baseReps = parseInt(exercise.reps) || 10;
    
    let dropSets: DropSet[] = [];
    
    if (method === "drop_set") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps),
        percentage: Math.max(basePercentage - (i * 12), 40),
      }));
    } else if (method === "pyramid_up") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(Math.max(baseReps - (i * 2), 2)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
    } else if (method === "pyramid_down") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps + (i * 2)),
        percentage: Math.max(basePercentage - (i * 5), 50),
      }));
    } else if (method === "pyramid_full") {
      const halfSets = Math.ceil(sets / 2);
      const upPhase = Array.from({ length: halfSets }, (_, i) => ({
        reps: String(Math.max(baseReps - (i * 2), 2)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
      const downPhase = Array.from({ length: sets - halfSets }, (_, i) => ({
        reps: String(Math.max(baseReps - (halfSets - 2 - i) * 2, 2)),
        percentage: Math.min(basePercentage + (halfSets - 2 - i) * 5, 100),
      }));
      dropSets = [...upPhase, ...downPhase];
    }
    
    updateMultipleFields(index, {
      method,
      sets: dropSets.length,
      drop_sets: dropSets,
    });
  };

  const initClusterSets = (index: number, method: string) => {
    const exercise = session.exercises[index];
    const totalReps = parseInt(exercise.reps) || 12;
    const numClusters = 4;
    const repsPerCluster = Math.ceil(totalReps / numClusters);
    
    const clusterSets: ClusterSet[] = Array.from({ length: numClusters }, () => ({
      reps: repsPerCluster,
      rest_seconds: method === "rest_pause" ? 15 : 10,
    }));
    
    updateMultipleFields(index, {
      method,
      cluster_sets: clusterSets,
    });
  };

  const updateDropSet = (exerciseIndex: number, setIndex: number, field: keyof DropSet, value: any) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    dropSets[setIndex] = { ...dropSets[setIndex], [field]: value };
    updateExercise(exerciseIndex, "drop_sets", dropSets);
  };

  const updateClusterSet = (exerciseIndex: number, setIndex: number, field: keyof ClusterSet, value: any) => {
    const exercise = session.exercises[exerciseIndex];
    const clusterSets = [...(exercise.cluster_sets || [])];
    clusterSets[setIndex] = { ...clusterSets[setIndex], [field]: value };
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  const addDropSet = (exerciseIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    const lastSet = dropSets[dropSets.length - 1];
    dropSets.push({
      reps: lastSet?.reps || "10",
      percentage: Math.max((lastSet?.percentage || 70) - 10, 40),
    });
    updateMultipleFields(exerciseIndex, {
      drop_sets: dropSets,
      sets: dropSets.length,
    });
  };

  const addClusterSet = (exerciseIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const clusterSets = [...(exercise.cluster_sets || [])];
    const lastSet = clusterSets[clusterSets.length - 1];
    clusterSets.push({
      reps: lastSet?.reps || 3,
      rest_seconds: lastSet?.rest_seconds || 15,
    });
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  const removeDropSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const dropSets = (exercise.drop_sets || []).filter((_, i) => i !== setIndex);
    updateMultipleFields(exerciseIndex, {
      drop_sets: dropSets,
      sets: dropSets.length,
    });
  };

  const removeClusterSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = session.exercises[exerciseIndex];
    const clusterSets = (exercise.cluster_sets || []).filter((_, i) => i !== setIndex);
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  const toggleRmTest = (index: number, isTest: boolean) => {
    if (isTest) {
      updateMultipleFields(index, {
        is_rm_test: true,
        rm_test_type: "squat_1rm",
        method: "normal",
        sets: 1,
        reps: "1",
      });
    } else {
      updateMultipleFields(index, {
        is_rm_test: false,
        rm_test_type: undefined,
        sets: 3,
        reps: "10",
      });
    }
  };

  const setTestType = (index: number, testType: string) => {
    let reps = "1";
    if (testType.includes("3rm")) reps = "3";
    else if (testType.includes("5rm")) reps = "5";
    else if (testType.includes("max_")) reps = "max";
    
    updateMultipleFields(index, {
      rm_test_type: testType,
      reps,
    });
  };

  const getTestTypeLabel = (testType: string) => {
    for (const category of TEST_CATEGORIES) {
      const test = category.tests.find((t) => t.value === testType);
      if (test) return test.label;
    }
    return testType;
  };

  const getMethodLabel = (method: string) => {
    return getTrainingStyleConfig(method).label || method;
  };

  const getMethodDescription = (method: string) => {
    return getTrainingStyleConfig(method).description || "";
  };

  const isLinkable = (index: number) => {
    if (!linkingFrom) return false;
    const exercise = session.exercises[index];
    return !exercise.group_id;
  };

  const isInDropMode = (method: string) => checkIsDropMethod(method);
  const isInClusterMode = (method: string) => checkIsClusterMethod(method);
  const isInVbtMode = (method: string) => checkIsVbtMethod(method);

  // Render a single exercise card
  const renderExerciseCard = (
    exercise: ProgramExercise,
    index: number,
    isGrouped: boolean,
    exerciseNumber?: number
  ) => {
    const isSelected = selectedForLinking.includes(index);
    const styleConfig = getTrainingStyleConfig(exercise.method);
    const dropMode = isInDropMode(exercise.method);
    const clusterMode = isInClusterMode(exercise.method);
    const vbtMode = isInVbtMode(exercise.method);

    const getExerciseStyle = () => {
      if (linkingFrom && isLinkable(index)) {
        const linkStyle = getTrainingStyleConfig(linkingFrom.method);
        return isSelected
          ? cn("border-2", linkStyle.borderColor, linkStyle.bgColor)
          : cn("border-2 border-dashed", linkStyle.borderColor, "hover:opacity-80");
      }
      if (exercise.is_rm_test) {
        return "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20";
      }
      if (dropMode || clusterMode) {
        return cn("border", styleConfig.borderColor, styleConfig.bgColor);
      }
      return "bg-background border-border";
    };

    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-3 rounded-lg border transition-all",
          getExerciseStyle(),
          linkingFrom && isLinkable(index) && "cursor-pointer"
        )}
        onClick={() => {
          if (linkingFrom && isLinkable(index)) {
            toggleExerciseForLinking(index);
          }
        }}
      >
        {/* Exercise header */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          {isGrouped && exerciseNumber && (
            <Badge className={cn("text-white text-xs", styleConfig.color || "bg-primary")}>
              Exercice {exerciseNumber}
            </Badge>
          )}
          
          <span className="font-medium flex-1">{exercise.exercise_name}</span>

          {exercise.is_rm_test && (
            <Badge className="bg-amber-500 text-white text-xs">
              <FlaskConical className="h-3 w-3 mr-1" />
              Test: {getTestTypeLabel(exercise.rm_test_type || "")}
            </Badge>
          )}

          {!isGrouped && (dropMode || clusterMode || vbtMode) && (
            <Badge className={cn("text-white text-xs", styleConfig.color || "bg-primary")}>
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

        {/* RM Test toggle */}
        <div className="flex items-center gap-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`rm-test-${exercise.id}`}
              checked={exercise.is_rm_test || false}
              onCheckedChange={(checked) => toggleRmTest(index, !!checked)}
            />
            <Label htmlFor={`rm-test-${exercise.id}`} className="text-xs cursor-pointer">
              Test RM
            </Label>
          </div>
          {exercise.is_rm_test && (
            <Select
              value={exercise.rm_test_type || "squat_1rm"}
              onValueChange={(v) => setTestType(index, v)}
            >
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Choisir un test..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {TEST_CATEGORIES.map((category) => (
                  <SelectGroup key={category.value}>
                    <SelectLabel className="text-xs font-semibold bg-muted/50">
                      {category.label}
                    </SelectLabel>
                    {category.tests.map((test) => (
                      <SelectItem key={test.value} value={test.value} className="text-xs">
                        {test.label} {test.unit && `(${test.unit})`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Exercise parameters */}
        {!exercise.is_rm_test && (
          <>
            {isSledCategory(exercise.exercise_category || "") ? (
              // Sled-specific inputs (distance in meters)
              <div className="grid grid-cols-4 gap-2">
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
                  <label className="text-xs text-muted-foreground">Distance (m)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.distance_meters || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="25"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">%1RM / Poids</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.percentage_1rm || ""}
                    onChange={(e) =>
                      updateExercise(index, "percentage_1rm", e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="50"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Repos (s)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.rest_seconds}
                    onChange={(e) =>
                      updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : isErgCategory(exercise.exercise_category || "") ? (
              // Erg-specific inputs
              <div className="grid grid-cols-6 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Temps (s)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.duration_seconds || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        duration_seconds: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="300"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Distance (m)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.distance_meters || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="2000"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Calories</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.calories || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        calories: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="50"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Watts</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.watts || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        watts: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="150"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">RPM</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.erg_data?.rpm || ""}
                    onChange={(e) =>
                      updateExercise(index, "erg_data", {
                        ...exercise.erg_data,
                        rpm: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="80"
                    className="h-8 text-sm"
                  />
                </div>

                {(exercise.exercise_category === "ergo_rowerg" || exercise.exercise_name.toLowerCase().includes("row")) && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Stroke/min</label>
                    <Input
                      type="number"
                      min={0}
                      value={exercise.erg_data?.stroke_rate || ""}
                      onChange={(e) =>
                        updateExercise(index, "erg_data", {
                          ...exercise.erg_data,
                          stroke_rate: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="28"
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Repos (s)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.rest_seconds}
                    onChange={(e) =>
                      updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : isRunningCategory(exercise.exercise_category || "") ? (
              // Running-specific inputs: km/h, temps, distance, min/km
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Allure (km/h)</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={exercise.running_data?.pace_kmh || ""}
                      onChange={(e) => {
                        const kmh = e.target.value ? parseFloat(e.target.value) : undefined;
                        // Auto-calculate min/km from km/h (60 / km/h = min/km)
                        const minKm = kmh && kmh > 0 ? parseFloat((60 / kmh).toFixed(2)) : undefined;
                        updateExercise(index, "running_data", {
                          ...exercise.running_data,
                          pace_kmh: kmh,
                          pace_min_km: minKm,
                        });
                      }}
                      placeholder="12.5"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Allure (min/km)</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={exercise.running_data?.pace_min_km || ""}
                      onChange={(e) => {
                        const minKm = e.target.value ? parseFloat(e.target.value) : undefined;
                        // Auto-calculate km/h from min/km (60 / min/km = km/h)
                        const kmh = minKm && minKm > 0 ? parseFloat((60 / minKm).toFixed(1)) : undefined;
                        updateExercise(index, "running_data", {
                          ...exercise.running_data,
                          pace_min_km: minKm,
                          pace_kmh: kmh,
                        });
                      }}
                      placeholder="4.8"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Distance (m)</label>
                    <Input
                      type="number"
                      min={0}
                      value={exercise.running_data?.distance_meters || ""}
                      onChange={(e) =>
                        updateExercise(index, "running_data", {
                          ...exercise.running_data,
                          distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="5000"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Durée (min)</label>
                    <Input
                      type="number"
                      min={0}
                      value={exercise.running_data?.duration_seconds ? Math.round(exercise.running_data.duration_seconds / 60) : ""}
                      onChange={(e) =>
                        updateExercise(index, "running_data", {
                          ...exercise.running_data,
                          duration_seconds: e.target.value ? parseInt(e.target.value) * 60 : undefined,
                        })
                      }
                      placeholder="30"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">% VMA</label>
                    <Input
                      type="number"
                      min={0}
                      max={130}
                      value={exercise.running_data?.vma_percentage || ""}
                      onChange={(e) =>
                        updateExercise(index, "running_data", {
                          ...exercise.running_data,
                          vma_percentage: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="85"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                {/* Interval-specific fields for VMA/Fractionné/Sprint */}
                {(exercise.exercise_category === "running_fractionne" || 
                  exercise.exercise_category === "running_vma" ||
                  exercise.exercise_category === "running_sprint") && (
                  <div className="grid grid-cols-5 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Répétitions</label>
                      <Input
                        type="number"
                        min={1}
                        value={exercise.running_data?.intervals || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            intervals: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="8"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Dist./rep (m)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.interval_distance_m || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            interval_distance_m: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="400"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Durée/rep (s)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.interval_duration_s || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            interval_duration_s: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="60"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Récup (s)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.recovery_time_s || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            recovery_time_s: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="60"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Récup (m)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.recovery_distance_m || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            recovery_distance_m: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="200"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {/* Hill running specific: elevation gain */}
                {exercise.exercise_category === "running_cote" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Distance (m)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.distance_meters || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="100"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Dénivelé (m)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.elevation_gain_m || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            elevation_gain_m: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="30"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {/* Continuous running specific: total distance */}
                {(exercise.exercise_category === "running_ef" || 
                  exercise.exercise_category === "running_seuil" ||
                  exercise.exercise_category === "running_tempo" ||
                  exercise.exercise_category === "running_recup" ||
                  exercise.exercise_category === "running_fartlek") && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Distance totale (m)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.running_data?.distance_meters || ""}
                        onChange={(e) =>
                          updateExercise(index, "running_data", {
                            ...exercise.running_data,
                            distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="5000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Repos (s)</label>
                      <Input
                        type="number"
                        min={0}
                        value={exercise.rest_seconds}
                        onChange={(e) =>
                          updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : isBodyweightCategory(exercise.exercise_category || "") ? (
              // Bodyweight-specific inputs: séries, reps, poids additionnel optionnel
              <div className="grid grid-cols-5 gap-2">
                {!isGrouped && (
                   <div className="space-y-1 col-span-1">
                     <label className="text-xs text-muted-foreground">Méthode</label>
                     <TrainingMethodSelect
                       value={exercise.method}
                       onValueChange={(value) => {
                         if (LINKABLE_METHODS.includes(value)) {
                           startLinking(index, value);
                         } else if (DROP_METHODS.includes(value)) {
                           initDropSets(index, value);
                         } else if (CLUSTER_METHODS.includes(value)) {
                           initClusterSets(index, value);
                         } else {
                           updateMultipleFields(index, {
                             method: value,
                             drop_sets: undefined,
                             cluster_sets: undefined,
                           });
                         }
                       }}
                       triggerClassName="h-8 text-xs"
                     />
                   </div>
                 )}
                
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
                  <label className="text-xs text-muted-foreground">Lest (+kg)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={exercise.bodyweight_data?.additional_weight_kg || ""}
                    onChange={(e) =>
                      updateExercise(index, "bodyweight_data", {
                        ...exercise.bodyweight_data,
                        additional_weight_kg: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Repos (s)</label>
                  <Input
                    type="number"
                    min={0}
                    value={exercise.rest_seconds}
                    onChange={(e) =>
                      updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
               <div className="grid grid-cols-6 gap-2">
                 {!isGrouped && (
                   <div className="space-y-1 col-span-2">
                     <label className="text-xs text-muted-foreground">Méthode</label>
                     <TrainingMethodSelect
                       value={exercise.method}
                       onValueChange={(value) => {
                         if (LINKABLE_METHODS.includes(value)) {
                           startLinking(index, value);
                         } else if (DROP_METHODS.includes(value)) {
                           initDropSets(index, value);
                         } else if (CLUSTER_METHODS.includes(value)) {
                           initClusterSets(index, value);
                         } else {
                           updateMultipleFields(index, {
                             method: value,
                             drop_sets: undefined,
                             cluster_sets: undefined,
                           });
                         }
                       }}
                       showColorDot={true}
                       triggerClassName="h-8 text-xs"
                     />
                   </div>
                 )}

                {!dropMode && !clusterMode && (
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
                      <label className="text-xs text-muted-foreground">{vbtMode ? "Kg" : "%1RM"}</label>
                      <Input
                        type="number"
                        min={0}
                        max={vbtMode ? undefined : 100}
                        step={vbtMode ? "0.5" : "1"}
                        value={vbtMode ? (exercise.percentage_1rm || "") : (exercise.percentage_1rm || "")}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "percentage_1rm",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder={vbtMode ? "60" : "75"}
                        className="h-8 text-sm"
                      />
                    </div>

                    {!isGrouped && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Repos (s)</label>
                        <Input
                          type="number"
                          min={0}
                          value={exercise.rest_seconds}
                          onChange={(e) =>
                            updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    {/* VBT toggle - available on all methods */}
                    <div className="col-span-full flex items-center gap-2 mt-1 flex-wrap">
                      <button
                        type="button"
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          exercise.target_velocity != null
                            ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                            : "bg-muted border-border text-muted-foreground hover:border-emerald-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (exercise.target_velocity != null) {
                            updateExercise(index, "target_velocity", null);
                          } else {
                            updateExercise(index, "target_velocity", 0.75);
                          }
                        }}
                      >
                        ⚡ VBT
                      </button>
                      {exercise.target_velocity != null && (
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-muted-foreground whitespace-nowrap">Vitesse (m/s)</label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={exercise.target_velocity || ""}
                            onChange={(e) =>
                              updateExercise(
                                index,
                                "target_velocity",
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            placeholder="0.75"
                            className="h-7 text-xs w-20"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      {/* Force (N) toggle */}
                      <button
                        type="button"
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          exercise.target_force_newton != null
                            ? "bg-amber-100 border-amber-400 text-amber-700"
                            : "bg-muted border-border text-muted-foreground hover:border-amber-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (exercise.target_force_newton != null) {
                            updateExercise(index, "target_force_newton", null);
                          } else {
                            updateExercise(index, "target_force_newton", 0);
                          }
                        }}
                      >
                        💪 Force
                      </button>
                      {exercise.target_force_newton != null && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={exercise.target_force_newton || ""}
                            onChange={(e) =>
                              updateExercise(
                                index,
                                "target_force_newton",
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            placeholder="500"
                            className="h-7 text-xs w-24"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-[10px] text-muted-foreground">N</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Drop sets / Pyramid configuration */}
        {dropMode && exercise.drop_sets && (
          <div className="mt-2 space-y-2 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {exercise.method === "drop_set" && "Drop Set - Même reps, charge décroissante"}
                {exercise.method === "pyramid_up" && "Pyramide Montante - ↑ charge, ↓ reps"}
                {exercise.method === "pyramid_down" && "Pyramide Descendante - ↓ charge, ↑ reps"}
                {exercise.method === "pyramid_full" && "Pyramide Complète ↑↓"}
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
                Série
              </Button>
            </div>
            
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium mb-1">
                <span>Set</span>
                <span>% 1RM</span>
                <span>Reps</span>
                <span></span>
              </div>
              {exercise.drop_sets.map((dropSet, setIndex) => (
                <div key={setIndex} className="grid grid-cols-4 gap-2 items-center bg-background/50 p-2 rounded">
                  <span className="text-xs font-medium">Set {setIndex + 1}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={dropSet.percentage}
                      onChange={(e) => updateDropSet(index, setIndex, "percentage", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                    <span className="text-xs">%</span>
                  </div>
                  <Input
                    value={dropSet.reps}
                    onChange={(e) => updateDropSet(index, setIndex, "reps", e.target.value)}
                    className="h-7 text-xs"
                    placeholder="10"
                  />
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

        {/* Cluster sets configuration */}
        {clusterMode && exercise.cluster_sets && (
          <div className="mt-2 space-y-2 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {exercise.method === "cluster" && "Cluster - Mini-séries avec micro-repos"}
                {exercise.method === "rest_pause" && "Rest-Pause - Séries à l'échec avec pauses"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  addClusterSet(index);
                }}
                className="h-6 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Mini-série
              </Button>
            </div>
            
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium mb-1">
                <span>Mini-série</span>
                <span>Reps</span>
                <span>Micro-repos</span>
                <span></span>
              </div>
              {exercise.cluster_sets.map((clusterSet, setIndex) => (
                <div key={setIndex} className="grid grid-cols-4 gap-2 items-center bg-background/50 p-2 rounded">
                  <span className="text-xs font-medium">#{setIndex + 1}</span>
                  <Input
                    type="number"
                    value={clusterSet.reps}
                    onChange={(e) => updateClusterSet(index, setIndex, "reps", parseInt(e.target.value) || 1)}
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={clusterSet.rest_seconds}
                      onChange={(e) => updateClusterSet(index, setIndex, "rest_seconds", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                    <span className="text-xs">s</span>
                  </div>
                  {exercise.cluster_sets!.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClusterSet(index, setIndex);
                      }}
                      className="h-6 w-6 text-destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
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
                  placeholder="85"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Repos final (s)</label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.rest_seconds}
                  onChange={(e) =>
                    updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tempo field */}
        {!exercise.is_rm_test && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <label className="text-xs text-muted-foreground">Tempo</label>
            <Input
              value={exercise.tempo || ""}
              onChange={(e) => updateExercise(index, "tempo", e.target.value)}
              placeholder="3-1-2-0"
              className="h-7 text-xs w-24"
            />
          </div>
        )}
      </div>
    );
  };

  // Render a group of exercises with colored container
  const renderExerciseGroup = (group: ExerciseGroup, groupIndex: number, totalGroups: number) => {
    const canMoveUp = groupIndex > 0;
    const canMoveDown = groupIndex < totalGroups - 1;

    // Move buttons component
    const MoveButtons = () => (
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            moveExerciseOrBlock(groupIndex, "up");
          }}
          disabled={!canMoveUp}
          className="h-6 w-6 hover:bg-muted"
          title="Monter"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            moveExerciseOrBlock(groupIndex, "down");
          }}
          disabled={!canMoveDown}
          className="h-6 w-6 hover:bg-muted"
          title="Descendre"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );

    if (!group.groupId) {
      // Single ungrouped exercise with move buttons
      const { exercise, index } = group.exercises[0];
      return (
        <div key={`single-${index}`} className="flex items-start gap-2">
          <MoveButtons />
          <div className="flex-1">
            {renderExerciseCard(exercise, index, false)}
          </div>
        </div>
      );
    }

    // Grouped exercises with colored container and move buttons
    const styleConfig = getTrainingStyleConfig(group.method);
    const maxExercises = getMaxExercisesForMethod(group.method);
    const lastExercise = group.exercises[group.exercises.length - 1];

    return (
      <div key={group.groupId} className="flex items-start gap-2">
        <MoveButtons />
        <div
          className={cn(
            "flex-1 rounded-xl border-2 p-4 space-y-3",
            styleConfig.borderColor,
            styleConfig.bgColor
          )}
        >
        {/* Group header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={cn("text-white text-sm px-3 py-1", styleConfig.color)}>
              {styleConfig.label}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {group.exercises.length}/{maxExercises} exercices
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{styleConfig.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unlinkGroup(group.groupId!)}
              className="h-7 text-xs"
            >
              <Unlink className="h-3 w-3 mr-1" />
              Annuler
            </Button>
          </div>
        </div>

        {/* Group exercises */}
        <div className="space-y-2">
          {group.exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id}>
              {renderExerciseCard(exercise, index, true, i + 1)}
            </div>
          ))}
        </div>

        {/* Group completion message */}
        {group.exercises.length >= 2 && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 pt-2">
            <Check className="h-4 w-4" />
            Bloc complet ! Configurez les paramètres puis validez.
          </div>
        )}

        {/* Rest after group */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <label className="text-xs text-muted-foreground">Repos après le bloc (s)</label>
          <Input
            type="number"
            min={0}
            value={lastExercise.exercise.rest_seconds}
            onChange={(e) =>
              updateExercise(lastExercise.index, "rest_seconds", parseInt(e.target.value) || 0)
            }
            className="h-8 text-sm w-24"
          />
        </div>
        </div>
      </div>
    );
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
        <Select
          value={session.scheduled_day?.toString() || ""}
          onValueChange={(v) => onUpdate({ ...session, scheduled_day: v ? parseInt(v) : undefined })}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue placeholder="Jour" />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map((day) => (
              <SelectItem key={day.value} value={day.value.toString()}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <div className={cn(
          "p-3 border-b space-y-2",
          getTrainingStyleConfig(linkingFrom.method).bgColor
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-white", getTrainingStyleConfig(linkingFrom.method).color)}>
                {getMethodLabel(linkingFrom.method)}
              </Badge>
              <span className="text-sm font-medium">
                {selectedForLinking.length}/{linkingFrom.maxCount} exercices
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {session.exercises.filter((ex, i) => !ex.group_id && !selectedForLinking.includes(i)).length === 0 && selectedForLinking.length < 2
              ? "Ajoutez un exercice ci-dessous pour compléter le bloc"
              : `Cliquez sur les exercices à lier ensemble (max ${linkingFrom.maxCount})`
            }
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={confirmLinking}
              disabled={selectedForLinking.length < 2}
              className={cn("text-white", getTrainingStyleConfig(linkingFrom.method).color)}
            >
              <Link2 className="h-3 w-3 mr-1" />
              Valider le bloc
            </Button>
            {selectedForLinking.length < linkingFrom.maxCount && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newExercise: ProgramExercise = {
                    id: crypto.randomUUID(),
                    exercise_name: "Nouvel exercice",
                    order_index: session.exercises.length,
                    method: "normal",
                    sets: 3,
                    reps: "10",
                    rest_seconds: 90,
                  };
                  const newExercises = [...session.exercises, newExercise];
                  const newIndex = newExercises.length - 1;
                  onUpdate({ ...session, exercises: newExercises });
                  setSelectedForLinking(prev => [...prev, newIndex]);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un exercice
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={cancelLinking}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Exercises */}
      <div className="p-3 space-y-3 min-h-[80px]">
        {session.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Glissez des exercices ici
          </p>
        ) : (
          exerciseGroups.map((group, idx) => renderExerciseGroup(group, idx, exerciseGroups.length))
        )}
      </div>
    </div>
  );
}
