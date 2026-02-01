import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  X, 
  Dumbbell, 
  Info, 
  Unlink, 
  Library,
  Timer,
  Repeat,
  Minus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getTrainingStyleConfig, 
  isCardioBlockMethod,
  isDropMethod,
  getMaxExercisesForMethod,
  getMinExercisesForMethod,
} from "@/lib/constants/trainingStyles";
import { getCategoryLabel } from "@/lib/constants/exerciseCategories";

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

interface BlockConfig {
  duration_minutes?: number;
  rounds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  rest_between_rounds?: number;
  emom_interval?: number; // For E2MOM, E3MOM, etc.
  emom_mode?: "single" | "multi"; // 1 exercise per interval vs multiple
  time_cap_minutes?: number; // For "For Time"
}

interface Exercise {
  id?: string;
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  weight_percent_rm: number | null;
  weight_mode: "kg" | "percent_rm";
  rest_seconds: number | null;
  notes: string;
  order_index: number;
  library_exercise_id: string | null;
  set_type: string;
  group_id: string | null;
  group_order?: number;
  drop_sets?: DropSet[];
  cluster_sets?: ClusterSet[];
  tempo?: string;
  target_rpe?: number;
}

interface ExerciseSlot {
  exercise: Exercise | null;
  index: number;
  label?: string;
  sublabel?: string;
}

interface TrainingMethodBlockProps {
  method: string;
  groupId: string;
  exercises: { exercise: Exercise; index: number }[];
  blockConfig: BlockConfig;
  onUpdateExercise: (index: number, field: keyof Exercise, value: any) => void;
  onUpdateMultipleFields: (index: number, updates: Record<string, any>) => void;
  onRemoveExercise: (index: number) => void;
  onAddExerciseToGroup: (groupId: string, method: string) => void;
  onUnlinkGroup: (groupId: string) => void;
  onUpdateBlockConfig: (groupId: string, field: keyof BlockConfig, value: any) => void;
  onSelectFromLibrary: (index: number, libExercise: any) => void;
  filteredLibrary: any[];
  availableCategories: { value: string; label: string }[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showLibraryFor: number | null;
  setShowLibraryFor: (i: number | null) => void;
  onValidate?: () => void;
  onCancel?: () => void;
}

// Get slot labels based on method
function getSlotLabels(method: string, slotIndex: number): { label: string; sublabel?: string } {
  switch (method) {
    case "superset":
      return slotIndex === 0 
        ? { label: "Exercice 1 (agoniste)", sublabel: "Glissez un exercice ici" }
        : { label: "Exercice 2 (antagoniste)", sublabel: "Glissez un exercice ici" };
    case "bulgarian":
      return slotIndex === 0
        ? { label: "Exercice lourd (85-95% 1RM)", sublabel: "Glissez un exercice lourd" }
        : { label: "Exercice léger (explosif)", sublabel: "Glissez un exercice léger" };
    case "triset":
    case "giant_set":
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Glissez un exercice ici" };
    case "biset":
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Glissez un exercice ici" };
    default:
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Glissez un exercice ici" };
  }
}

// Exercise slot component for linkable methods
function ExerciseSlotCard({
  exercise,
  exerciseIndex,
  slotNumber,
  slotLabel,
  slotSublabel,
  styleConfig,
  onUpdateExercise,
  onRemoveExercise,
  onSelectFromLibrary,
  filteredLibrary,
  availableCategories,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: {
  exercise: Exercise | null;
  exerciseIndex: number;
  slotNumber: number;
  slotLabel: string;
  slotSublabel?: string;
  styleConfig: any;
  onUpdateExercise: (index: number, field: keyof Exercise, value: any) => void;
  onRemoveExercise: (index: number) => void;
  onSelectFromLibrary: (index: number, libExercise: any) => void;
  filteredLibrary: any[];
  availableCategories: { value: string; label: string }[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showLibraryFor: number | null;
  setShowLibraryFor: (i: number | null) => void;
}) {
  const hasExercise = exercise && exercise.exercise_name.trim();
  
  return (
    <div className="flex items-start gap-3">
      {/* Number badge */}
      <div 
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0",
          styleConfig.color || "bg-primary"
        )}
      >
        {slotNumber}
      </div>
      
      {/* Slot content */}
      <div className="flex-1">
        <div className={cn(
          "border-2 border-dashed rounded-xl p-4 transition-all",
          hasExercise ? "border-border bg-background" : "border-muted-foreground/30 bg-muted/20"
        )}>
          {hasExercise ? (
            <div className="space-y-3">
              {/* Exercise name */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs shrink-0">{slotLabel}</Badge>
                <Popover
                  open={showLibraryFor === exerciseIndex}
                  onOpenChange={(isOpen) => {
                    setShowLibraryFor(isOpen ? exerciseIndex : null);
                    if (isOpen && exercise) setSearchQuery(exercise.exercise_name);
                  }}
                >
                  <PopoverTrigger asChild>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Nom de l'exercice..."
                        value={exercise.exercise_name}
                        onChange={(e) => {
                          onUpdateExercise(exerciseIndex, "exercise_name", e.target.value);
                          setSearchQuery(e.target.value);
                          setShowLibraryFor(exerciseIndex);
                        }}
                        className="h-9"
                      />
                      {exercise.library_exercise_id && (
                        <Library className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {filteredLibrary.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        Aucun exercice trouvé
                      </div>
                    ) : (
                      filteredLibrary.slice(0, 12).map((libEx) => (
                        <button
                          key={libEx.id}
                          type="button"
                          className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex justify-between items-center"
                          onClick={() => onSelectFromLibrary(exerciseIndex, libEx)}
                        >
                          <span className="truncate pr-2">{libEx.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getCategoryLabel(libEx.category)}
                          </Badge>
                        </button>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveExercise(exerciseIndex)}
                  className="h-8 w-8 text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Sets, Reps, Weight */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Séries</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                    value={exercise.sets || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reps</Label>
                  <Input
                    className="h-8 text-xs"
                    value={exercise.reps || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">%1RM</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="h-8 text-xs"
                    value={exercise.weight_percent_rm || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    value={exercise.rest_seconds || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Dumbbell className="h-5 w-5 mr-2 opacity-50" />
              <span className="text-sm">{slotSublabel || "Glissez un exercice ici"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// EMOM Block Component
function EmomBlock({
  groupId,
  exercises,
  blockConfig,
  styleConfig,
  onUpdateBlockConfig,
  onAddExerciseToGroup,
  onRemoveExercise,
  onUpdateExercise,
  onSelectFromLibrary,
  filteredLibrary,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: TrainingMethodBlockProps & { styleConfig: any }) {
  const emomInterval = blockConfig.emom_interval || 1;
  const duration = blockConfig.duration_minutes || 10;
  const intervals = duration / emomInterval;
  const mode = blockConfig.emom_mode || "single";

  return (
    <div className="space-y-4">
      {/* EMOM Type selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Type d'intervalle</Label>
        <ToggleGroup 
          type="single" 
          value={`e${emomInterval}mom`}
          onValueChange={(v) => {
            if (v) {
              const interval = parseInt(v.replace("e", "").replace("mom", "")) || 1;
              onUpdateBlockConfig(groupId, "emom_interval", interval);
            }
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="e1mom" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            EMOM
          </ToggleGroupItem>
          <ToggleGroupItem value="e2mom" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            E2MOM
          </ToggleGroupItem>
          <ToggleGroupItem value="e3mom" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            E3MOM
          </ToggleGroupItem>
          <ToggleGroupItem value="e4mom" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            E4MOM
          </ToggleGroupItem>
          <ToggleGroupItem value="e5mom" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            E5MOM
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground mt-1">Toutes les {emomInterval > 1 ? `${emomInterval} minutes` : "minutes"}</p>
      </div>

      {/* Mode selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Mode</Label>
        <ToggleGroup 
          type="single" 
          value={mode}
          onValueChange={(v) => v && onUpdateBlockConfig(groupId, "emom_mode", v as "single" | "multi")}
          className="justify-start"
        >
          <ToggleGroupItem value="single" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            1 exercice / intervalle
          </ToggleGroupItem>
          <ToggleGroupItem value="multi" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            Plusieurs exercices enchaînés / intervalle
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Duration config */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Durée</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Durée totale</span>
            <Input
              type="number"
              min="1"
              className="h-8 w-20 text-sm"
              value={duration}
              onChange={(e) => onUpdateBlockConfig(groupId, "duration_minutes", parseInt(e.target.value) || 10)}
            />
            <span className="text-sm">min</span>
          </div>
          <span className="text-muted-foreground">ou</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">Nb intervalles</span>
            <Input
              type="number"
              min="1"
              className="h-8 w-20 text-sm"
              value={intervals}
              onChange={(e) => {
                const newIntervals = parseInt(e.target.value) || 1;
                onUpdateBlockConfig(groupId, "duration_minutes", newIntervals * emomInterval);
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary badge */}
      <div className={cn("px-4 py-2 rounded-lg text-sm", styleConfig.bgColor)}>
        EMOM • {intervals} intervalles × {emomInterval}min = {duration}min
      </div>

      {/* Interval slots */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">Glissez les exercices dans les slots correspondants</p>
        <div className="space-y-4">
          {exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id || index} className="space-y-2">
              <div className="flex items-start gap-3">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 border-2",
                    styleConfig.color || "bg-indigo-500",
                    styleConfig.borderColor
                  )}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="border-2 border-dashed rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Minute {i + 1}</span>
                    </div>
                    <Popover
                      open={showLibraryFor === index}
                      onOpenChange={(isOpen) => {
                        setShowLibraryFor(isOpen ? index : null);
                        if (isOpen) setSearchQuery(exercise.exercise_name);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          placeholder="Nom de l'exercice..."
                          value={exercise.exercise_name}
                          onChange={(e) => {
                            onUpdateExercise(index, "exercise_name", e.target.value);
                            setSearchQuery(e.target.value);
                            setShowLibraryFor(index);
                          }}
                          className="h-9"
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {filteredLibrary.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">Aucun exercice trouvé</div>
                        ) : (
                          filteredLibrary.slice(0, 12).map((libEx) => (
                            <button
                              key={libEx.id}
                              type="button"
                              className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm"
                              onClick={() => onSelectFromLibrary(index, libEx)}
                            >
                              {libEx.name}
                            </button>
                          ))
                        )}
                      </PopoverContent>
                    </Popover>
                    {exercise.exercise_name && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Reps</Label>
                          <Input
                            className="h-8 text-xs"
                            value={exercise.reps || ""}
                            onChange={(e) => onUpdateExercise(index, "reps", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="self-end text-destructive"
                          onClick={() => onRemoveExercise(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 italic ml-4">
                    ↳ Repos jusqu'au prochain EMOM (temps restant de l'intervalle)
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {exercises.length < 10 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onAddExerciseToGroup(groupId, "emom")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un intervalle
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Pyramid Block Component
function PyramidBlock({
  method,
  groupId,
  exercises,
  blockConfig,
  styleConfig,
  onUpdateExercise,
  onUpdateMultipleFields,
  onRemoveExercise,
  onSelectFromLibrary,
  filteredLibrary,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: TrainingMethodBlockProps & { styleConfig: any }) {
  const exercise = exercises[0]?.exercise;
  const exerciseIndex = exercises[0]?.index;
  
  if (!exercise) return null;
  
  const isPyramidUp = method === "pyramid_up";
  const isPyramidDown = method === "pyramid_down";
  const dropSets = exercise.drop_sets || [];
  
  const addSet = () => {
    const newDropSets = [...dropSets];
    const lastSet = newDropSets[newDropSets.length - 1];
    newDropSets.push({
      reps: isPyramidUp ? String(Math.max(parseInt(lastSet?.reps || "10") - 2, 2)) : String(parseInt(lastSet?.reps || "10") + 2),
      percentage: isPyramidUp ? Math.min((lastSet?.percentage || 60) + 5, 100) : Math.max((lastSet?.percentage || 85) - 5, 50),
    });
    onUpdateMultipleFields(exerciseIndex, {
      drop_sets: newDropSets,
      sets: newDropSets.length,
    });
  };
  
  const removeSet = (setIndex: number) => {
    if (dropSets.length <= 2) return;
    const newDropSets = dropSets.filter((_, i) => i !== setIndex);
    onUpdateMultipleFields(exerciseIndex, {
      drop_sets: newDropSets,
      sets: newDropSets.length,
    });
  };
  
  const updateSet = (setIndex: number, field: "reps" | "percentage", value: any) => {
    const newDropSets = [...dropSets];
    newDropSets[setIndex] = { ...newDropSets[setIndex], [field]: value };
    onUpdateExercise(exerciseIndex, "drop_sets", newDropSets);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isPyramidUp ? "Augmentation progressive de la charge" : "Diminution progressive de la charge"}
      </p>

      {/* Exercise slot */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Exercice</Label>
        <div className="border-2 border-dashed rounded-xl p-4">
          <Popover
            open={showLibraryFor === exerciseIndex}
            onOpenChange={(isOpen) => {
              setShowLibraryFor(isOpen ? exerciseIndex : null);
              if (isOpen) setSearchQuery(exercise.exercise_name);
            }}
          >
            <PopoverTrigger asChild>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Glissez un exercice ici"
                  value={exercise.exercise_name}
                  onChange={(e) => {
                    onUpdateExercise(exerciseIndex, "exercise_name", e.target.value);
                    setSearchQuery(e.target.value);
                    setShowLibraryFor(exerciseIndex);
                  }}
                  className="h-9"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {filteredLibrary.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">Aucun exercice trouvé</div>
              ) : (
                filteredLibrary.slice(0, 12).map((libEx) => (
                  <button
                    key={libEx.id}
                    type="button"
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm"
                    onClick={() => onSelectFromLibrary(exerciseIndex, libEx)}
                  >
                    {libEx.name}
                  </button>
                ))
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Series configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-sm font-medium", isPyramidUp ? "text-emerald-600" : "text-teal-600")}>
            Configuration des séries
          </span>
          <Button type="button" variant="outline" size="sm" onClick={addSet} className="h-7">
            <Plus className="h-3 w-3 mr-1" />
            Série
          </Button>
        </div>

        <div className="space-y-2">
          {dropSets.map((set, setIndex) => (
            <div 
              key={setIndex}
              className={cn(
                "rounded-lg p-3 border-2",
                styleConfig.borderColor,
                styleConfig.bgColor
              )}
            >
              <div className="flex items-center gap-3">
                <Badge className={cn("text-white", styleConfig.color)}>
                  Série {setIndex + 1}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Reps</span>
                  <Input
                    className="h-8 w-20 text-sm"
                    value={set.reps}
                    onChange={(e) => updateSet(setIndex, "reps", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">%1RM</span>
                  <Input
                    type="number"
                    min="40"
                    max="100"
                    className="h-8 w-20 text-sm"
                    value={set.percentage}
                    onChange={(e) => updateSet(setIndex, "percentage", parseInt(e.target.value) || 60)}
                  />
                </div>
                {dropSets.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive ml-auto"
                    onClick={() => removeSet(setIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tempo and RPE */}
      <div className="flex items-center gap-4 pt-3 border-t">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tempo</Label>
          <Input
            className="h-8 w-24 text-sm"
            placeholder="3-1-2-0"
            value={exercise.tempo || ""}
            onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">RPE cible</Label>
          <Input
            type="number"
            min="1"
            max="10"
            className="h-8 w-16 text-sm"
            value={exercise.target_rpe || ""}
            onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseInt(e.target.value) || null)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Glissez un exercice depuis la bibliothèque pour appliquer {isPyramidUp ? "Pyramide Montante ↑" : "Pyramide Descendante ↓"}
      </p>
    </div>
  );
}

// Generic cardio block (Circuit, AMRAP, For Time)
function CardioBlock({
  method,
  groupId,
  exercises,
  blockConfig,
  styleConfig,
  onUpdateBlockConfig,
  onAddExerciseToGroup,
  onRemoveExercise,
  onUpdateExercise,
  onSelectFromLibrary,
  filteredLibrary,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: TrainingMethodBlockProps & { styleConfig: any }) {
  const methodLabels: Record<string, string> = {
    circuit: "Exercices du circuit",
    amrap: "Exercices du AMRAP",
    for_time: "Exercices du For Time",
    tabata: "Exercices du Tabata",
  };

  return (
    <div className="space-y-4">
      {/* Exercises list */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">{methodLabels[method] || "Exercices"}</Label>
        <div className="space-y-3">
          {exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id || index} className="flex items-start gap-3">
              <div 
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0",
                  styleConfig.color || "bg-primary"
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 border-2 border-dashed rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Popover
                    open={showLibraryFor === index}
                    onOpenChange={(isOpen) => {
                      setShowLibraryFor(isOpen ? index : null);
                      if (isOpen) setSearchQuery(exercise.exercise_name);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Input
                        placeholder={`Exercice ${i + 1}`}
                        value={exercise.exercise_name}
                        onChange={(e) => {
                          onUpdateExercise(index, "exercise_name", e.target.value);
                          setSearchQuery(e.target.value);
                          setShowLibraryFor(index);
                        }}
                        className="h-8 flex-1"
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      {filteredLibrary.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-muted-foreground">Aucun exercice trouvé</div>
                      ) : (
                        filteredLibrary.slice(0, 12).map((libEx) => (
                          <button
                            key={libEx.id}
                            type="button"
                            className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm"
                            onClick={() => onSelectFromLibrary(index, libEx)}
                          >
                            {libEx.name}
                          </button>
                        ))
                      )}
                    </PopoverContent>
                  </Popover>
                  {exercise.exercise_name && (
                    <Input
                      placeholder="Reps"
                      value={exercise.reps || ""}
                      onChange={(e) => onUpdateExercise(index, "reps", e.target.value)}
                      className="h-8 w-20"
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => onRemoveExercise(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          className="w-full mt-3"
          onClick={() => onAddExerciseToGroup(groupId, method)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un exercice
        </Button>
      </div>

      {/* Method-specific config */}
      <div className="flex items-center gap-4 pt-3 border-t">
        {method === "circuit" && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Tours</Label>
              <Input
                type="number"
                min="1"
                className="h-8 w-16 text-sm"
                value={blockConfig.rounds || 3}
                onChange={(e) => onUpdateBlockConfig(groupId, "rounds", parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Repos entre tours (s)</Label>
              <Input
                type="number"
                min="0"
                className="h-8 w-20 text-sm"
                value={blockConfig.rest_between_rounds || 60}
                onChange={(e) => onUpdateBlockConfig(groupId, "rest_between_rounds", parseInt(e.target.value) || 60)}
              />
            </div>
          </>
        )}
        {method === "amrap" && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Temps de l'AMRAP</Label>
            <Input
              type="number"
              min="1"
              className="h-8 w-16 text-sm"
              value={blockConfig.duration_minutes || 10}
              onChange={(e) => onUpdateBlockConfig(groupId, "duration_minutes", parseInt(e.target.value) || 10)}
            />
            <span className="text-sm">min</span>
          </div>
        )}
        {method === "for_time" && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Time Cap</Label>
            <Input
              type="number"
              min="1"
              className="h-8 w-16 text-sm"
              value={blockConfig.time_cap_minutes || 10}
              onChange={(e) => onUpdateBlockConfig(groupId, "time_cap_minutes", parseInt(e.target.value) || 10)}
            />
            <span className="text-sm">min</span>
          </div>
        )}
        {method === "tabata" && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Work (s)</Label>
              <Input
                type="number"
                min="1"
                className="h-8 w-16 text-sm"
                value={blockConfig.work_seconds || 20}
                onChange={(e) => onUpdateBlockConfig(groupId, "work_seconds", parseInt(e.target.value) || 20)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Rest (s)</Label>
              <Input
                type="number"
                min="0"
                className="h-8 w-16 text-sm"
                value={blockConfig.rest_seconds || 10}
                onChange={(e) => onUpdateBlockConfig(groupId, "rest_seconds", parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Cycles</Label>
              <Input
                type="number"
                min="1"
                className="h-8 w-16 text-sm"
                value={blockConfig.rounds || 8}
                onChange={(e) => onUpdateBlockConfig(groupId, "rounds", parseInt(e.target.value) || 8)}
              />
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Glissez les exercices dans les slots
      </p>
    </div>
  );
}

// Linkable method block (Superset, Biset, Triset, Bulgarian, 5x5)
function LinkableBlock({
  method,
  groupId,
  exercises,
  styleConfig,
  onUpdateExercise,
  onRemoveExercise,
  onAddExerciseToGroup,
  onSelectFromLibrary,
  filteredLibrary,
  availableCategories,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: TrainingMethodBlockProps & { styleConfig: any }) {
  const minExercises = getMinExercisesForMethod(method);
  const maxExercises = getMaxExercisesForMethod(method);
  
  // Build slots based on method requirements
  const slots: ExerciseSlot[] = [];
  for (let i = 0; i < Math.max(minExercises, exercises.length); i++) {
    const exerciseData = exercises[i];
    const labels = getSlotLabels(method, i);
    slots.push({
      exercise: exerciseData?.exercise || null,
      index: exerciseData?.index || -1,
      label: labels.label,
      sublabel: labels.sublabel,
    });
  }

  return (
    <div className="space-y-4">
      {/* Exercise slots */}
      <div className="space-y-4">
        {slots.map((slot, i) => (
          <ExerciseSlotCard
            key={i}
            exercise={slot.exercise}
            exerciseIndex={slot.index}
            slotNumber={i + 1}
            slotLabel={slot.label || `Exercice ${i + 1}`}
            slotSublabel={slot.sublabel}
            styleConfig={styleConfig}
            onUpdateExercise={onUpdateExercise}
            onRemoveExercise={onRemoveExercise}
            onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary}
            availableCategories={availableCategories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor}
            setShowLibraryFor={setShowLibraryFor}
          />
        ))}
      </div>

      {/* Add more exercises if allowed */}
      {exercises.length < maxExercises && exercises.length >= minExercises && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onAddExerciseToGroup(groupId, method)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un exercice
        </Button>
      )}

      {/* Instruction text */}
      <p className="text-sm text-muted-foreground text-center">
        Glissez {minExercises} exercices depuis la bibliothèque
      </p>
    </div>
  );
}

// 5x5 Block Component
function FiveByFiveBlock({
  groupId,
  exercises,
  styleConfig,
  onUpdateExercise,
  onSelectFromLibrary,
  filteredLibrary,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
}: TrainingMethodBlockProps & { styleConfig: any }) {
  const exercise = exercises[0]?.exercise;
  const exerciseIndex = exercises[0]?.index;
  
  if (!exercise) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        5 séries de 5 répétitions à 80-85% 1RM. Repos 3-5 min entre les séries.
      </p>

      {/* Exercise slot */}
      <div className="border-2 border-dashed rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <Popover
            open={showLibraryFor === exerciseIndex}
            onOpenChange={(isOpen) => {
              setShowLibraryFor(isOpen ? exerciseIndex : null);
              if (isOpen) setSearchQuery(exercise.exercise_name);
            }}
          >
            <PopoverTrigger asChild>
              <Input
                placeholder="Glissez un exercice ici"
                value={exercise.exercise_name}
                onChange={(e) => {
                  onUpdateExercise(exerciseIndex, "exercise_name", e.target.value);
                  setSearchQuery(e.target.value);
                  setShowLibraryFor(exerciseIndex);
                }}
                className="h-9"
              />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {filteredLibrary.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">Aucun exercice trouvé</div>
              ) : (
                filteredLibrary.slice(0, 12).map((libEx) => (
                  <button
                    key={libEx.id}
                    type="button"
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm"
                    onClick={() => onSelectFromLibrary(exerciseIndex, libEx)}
                  >
                    {libEx.name}
                  </button>
                ))
              )}
            </PopoverContent>
          </Popover>
        </div>
        
        {exercise.exercise_name && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <span className="text-2xl font-bold text-sky-600">5</span>
              <p className="text-xs text-muted-foreground">Séries</p>
            </div>
            <div className="text-center p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <span className="text-2xl font-bold text-sky-600">5</span>
              <p className="text-xs text-muted-foreground">Reps</p>
            </div>
            <div className="text-center p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Input
                  type="number"
                  min="70"
                  max="100"
                  className="h-8 w-16 text-center font-bold text-sky-600"
                  value={exercise.weight_percent_rm || 80}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || 80)}
                />
                <span className="text-sky-600 font-bold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">1RM</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export component
export function TrainingMethodBlock(props: TrainingMethodBlockProps) {
  const { method, groupId, exercises, blockConfig, onUnlinkGroup, onValidate, onCancel } = props;
  const styleConfig = getTrainingStyleConfig(method);
  const minExercises = getMinExercisesForMethod(method);
  const isComplete = exercises.length >= minExercises && exercises.every(e => e.exercise.exercise_name.trim());

  // Render content based on method type
  const renderContent = () => {
    switch (method) {
      case "emom":
        return <EmomBlock {...props} styleConfig={styleConfig} />;
      case "pyramid_up":
      case "pyramid_down":
      case "pyramid_full":
        return <PyramidBlock {...props} styleConfig={styleConfig} />;
      case "circuit":
      case "amrap":
      case "for_time":
      case "tabata":
        return <CardioBlock {...props} styleConfig={styleConfig} />;
      case "five_by_five":
        return <FiveByFiveBlock {...props} styleConfig={styleConfig} />;
      case "superset":
      case "biset":
      case "triset":
      case "giant_set":
      case "bulgarian":
        return <LinkableBlock {...props} styleConfig={styleConfig} />;
      default:
        return <LinkableBlock {...props} styleConfig={styleConfig} />;
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5",
        styleConfig.borderColor,
        styleConfig.bgColor
      )}
    >
      {/* Block header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge className={cn("text-white text-sm px-3 py-1", styleConfig.color)}>
            {styleConfig.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {exercises.filter(e => e.exercise.exercise_name.trim()).length}/{minExercises} exercices
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          )}
          {onValidate && isComplete && (
            <Button 
              type="button" 
              size="sm"
              className={cn("text-white", styleConfig.color)}
              onClick={onValidate}
            >
              {method === "superset" || method === "biset" || method === "triset" || method === "giant_set" || method === "bulgarian" 
                ? "Valider le bloc" 
                : "Valider"}
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{styleConfig.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUnlinkGroup(groupId)}
            className="h-7 text-xs text-destructive"
          >
            <Unlink className="h-3 w-3 mr-1" />
            Dissoudre
          </Button>
        </div>
      </div>

      {/* Block content */}
      {renderContent()}

      {/* Completion indicator */}
      {isComplete && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 pt-4 mt-4 border-t">
          <Check className="h-4 w-4" />
          Bloc configuré
        </div>
      )}
    </div>
  );
}
