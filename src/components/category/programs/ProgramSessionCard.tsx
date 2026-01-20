import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Link2, Unlink, Plus, Minus, FlaskConical, ChevronDown } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TEST_CATEGORIES, getTestLabel } from "@/lib/constants/testCategories";
import { isErgCategory } from "@/lib/constants/exerciseCategories";

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

// Erg-specific data structure for cardio machines
interface ErgData {
  duration_seconds?: number;
  distance_meters?: number;
  calories?: number;
  watts?: number;
  rpm?: number;
  stroke_rate?: number; // For rower
}

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  exercise_category?: string; // Category to detect erg exercises
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
  // Erg-specific fields
  erg_data?: ErgData;
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

const EXERCISE_METHODS = [
  { value: "normal", label: "Normal", description: "Exécution classique" },
  { value: "biset", label: "Biset (2)", description: "2 exercices enchaînés sans repos" },
  { value: "superset", label: "Superset (2)", description: "2 exercices enchaînés sans repos (agoniste/antagoniste)" },
  { value: "triset", label: "Triset (3)", description: "3 exercices enchaînés sans repos" },
  { value: "giant_set", label: "Giant Set (4+)", description: "4+ exercices enchaînés sans repos" },
  { value: "dropset", label: "Drop Set", description: "Séries avec réduction de charge sans repos" },
  { value: "pyramid_up", label: "Pyramide ↑", description: "Charge augmente, reps diminuent" },
  { value: "pyramid_down", label: "Pyramide ↓", description: "Charge diminue, reps augmentent" },
  { value: "cluster", label: "Cluster", description: "Mini-séries avec micro-repos (10-20s)" },
];

const LINKABLE_METHODS = ["biset", "superset", "triset", "giant_set"];
const DROP_METHODS = ["dropset", "pyramid_up", "pyramid_down"];

const DAYS_OF_WEEK = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
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

  const getMaxCountForMethod = (method: string): number => {
    switch (method) {
      case "biset": return 2;
      case "superset": return 2;
      case "triset": return 3;
      case "giant_set": return 10; // Arbitrary large number
      default: return 2;
    }
  };

  const startLinking = (index: number, method: string) => {
    const maxCount = getMaxCountForMethod(method);
    setLinkingFrom({ index, method, maxCount });
    setSelectedForLinking([index]);
  };

  const toggleExerciseForLinking = (targetIndex: number) => {
    if (!linkingFrom) return;
    
    const exercise = session.exercises[targetIndex];
    if (exercise.group_id) return; // Already in a group
    
    if (selectedForLinking.includes(targetIndex)) {
      // Don't allow removing the original exercise
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
    setLinkingFrom(null);
    setSelectedForLinking([]);
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
    const sets = exercise.sets || 4;
    const basePercentage = exercise.percentage_1rm || 75;
    const baseReps = parseInt(exercise.reps) || 10;
    
    let dropSets: DropSet[] = [];
    
    if (method === "dropset") {
      // Dropset: même reps, charge diminue de 10-15% à chaque série
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps),
        percentage: Math.max(basePercentage - (i * 12), 40),
      }));
    } else if (method === "pyramid_up") {
      // Pyramide montante: charge augmente, reps diminuent
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(Math.max(baseReps - (i * 2), 2)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
    } else if (method === "pyramid_down") {
      // Pyramide descendante: charge diminue, reps augmentent
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps + (i * 2)),
        percentage: Math.max(basePercentage - (i * 5), 50),
      }));
    }
    
    updateMultipleFields(index, {
      method,
      sets: dropSets.length,
      drop_sets: dropSets,
    });
  };

  const initClusterSets = (index: number) => {
    const exercise = session.exercises[index];
    const totalReps = parseInt(exercise.reps) || 12;
    const numClusters = 4;
    const repsPerCluster = Math.ceil(totalReps / numClusters);
    
    // Cluster: mini-séries avec micro-repos
    const clusterSets: ClusterSet[] = Array.from({ length: numClusters }, () => ({
      reps: repsPerCluster,
      rest_seconds: 15,
    }));
    
    updateMultipleFields(index, {
      method: "cluster",
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
        rm_test_type: "squat_1rm", // Default to squat 1RM
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
    // Determine reps based on test type
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
    return EXERCISE_METHODS.find((m) => m.value === method)?.label || method;
  };

  const getMethodDescription = (method: string) => {
    return EXERCISE_METHODS.find((m) => m.value === method)?.description || "";
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
    const exercise = session.exercises[index];
    return !exercise.group_id;
  };

  const isDropMethod = (method: string) => DROP_METHODS.includes(method);
  const isClusterMethod = (method: string) => method === "cluster";

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
        <div className="p-3 bg-primary/10 border-b space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary font-medium">
              Mode liaison: {getMethodLabel(linkingFrom.method)}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedForLinking.length}/{linkingFrom.maxCount} exercices
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez sur les exercices à lier (max {linkingFrom.maxCount})
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={confirmLinking}
              disabled={selectedForLinking.length < 2}
            >
              <Link2 className="h-3 w-3 mr-1" />
              Lier ({selectedForLinking.length})
            </Button>
            <Button variant="outline" size="sm" onClick={cancelLinking}>
              Annuler
            </Button>
          </div>
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
            const showConnector = isGrouped && exercise.group_order && exercise.group_order > 1;
            const isInDropMode = isDropMethod(exercise.method);
            const isInClusterMode = isClusterMethod(exercise.method);
            const isSelected = selectedForLinking.includes(index);

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
                  className={`flex flex-col gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                    isGrouped 
                      ? "border-primary/50 bg-primary/5" 
                      : linkingFrom && isLinkable(index)
                        ? isSelected
                          ? "border-primary border-2 bg-primary/20"
                          : "border-primary border-dashed hover:bg-primary/10"
                        : exercise.is_rm_test
                          ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20"
                          : "bg-muted/30"
                  }`}
                  onClick={() => {
                    if (linkingFrom && isLinkable(index)) {
                      toggleExerciseForLinking(index);
                    }
                  }}
                >
                  {/* Exercise header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="font-medium flex-1">{exercise.exercise_name}</span>

                    {exercise.is_rm_test && (
                      <Badge className="bg-orange-500 text-white text-xs">
                        <FlaskConical className="h-3 w-3 mr-1" />
                        Test: {getTestTypeLabel(exercise.rm_test_type || "")}
                      </Badge>
                    )}

                    {isGrouped && (
                      <>
                        <Badge className="bg-primary/20 text-primary text-xs">
                          {getMethodLabel(exercise.method)} ({groupInfo?.total})
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

                    {(isInDropMode || isInClusterMode) && !isGrouped && (
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
                      {/* Check if this is an erg exercise */}
                      {isErgCategory(exercise.exercise_category || "") ? (
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

                          {/* Show stroke rate only for rower */}
                          {(exercise.exercise_category === "rowerg" || exercise.exercise_name.toLowerCase().includes("row")) && (
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

                          {/* Rest for erg exercises */}
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Repos (s)</label>
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
                        </div>
                      ) : (
                        // Standard sets/reps inputs
                        <div className="grid grid-cols-6 gap-2">
                          <div className="space-y-1 col-span-2">
                            <label className="text-xs text-muted-foreground">Méthode</label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Select
                                      value={exercise.method}
                                      onValueChange={(value) => {
                                        if (LINKABLE_METHODS.includes(value)) {
                                          startLinking(index, value);
                                        } else if (DROP_METHODS.includes(value)) {
                                          initDropSets(index, value);
                                        } else if (value === "cluster") {
                                          initClusterSets(index);
                                        } else {
                                          updateMultipleFields(index, {
                                            method: value,
                                            drop_sets: undefined,
                                            cluster_sets: undefined,
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {EXERCISE_METHODS.map((method) => (
                                          <SelectItem key={method.value} value={method.value}>
                                            <div className="flex flex-col">
                                              <span>{method.label}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {method.description}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getMethodDescription(exercise.method)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {!isInDropMode && !isInClusterMode && (
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
                      )}
                    </>
                  )}

                  {/* Drop sets / Pyramid configuration */}
                  {isInDropMode && exercise.drop_sets && (
                    <div className="mt-2 space-y-2 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {exercise.method === "dropset" && "Drop Set - Même reps, charge décroissante"}
                          {exercise.method === "pyramid_up" && "Pyramide Montante - ↑ charge, ↓ reps"}
                          {exercise.method === "pyramid_down" && "Pyramide Descendante - ↓ charge, ↑ reps"}
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
                            <div className="flex items-center gap-1">
                              <Input
                                value={dropSet.reps}
                                onChange={(e) => updateDropSet(index, setIndex, "reps", e.target.value)}
                                className="h-7 text-xs"
                                placeholder="10"
                              />
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

                  {/* Cluster sets configuration */}
                  {isInClusterMode && exercise.cluster_sets && (
                    <div className="mt-2 space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          Cluster - Mini-séries avec micro-repos (10-20s)
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
                      
                      {/* %1RM and final rest for cluster */}
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
                              updateExercise(
                                index,
                                "rest_seconds",
                                parseInt(e.target.value) || 0
                              )
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
