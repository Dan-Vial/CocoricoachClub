import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  isVbtMethod,
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
  emom_interval?: number;
  emom_mode?: string;
  time_cap_minutes?: number;
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
  contraction_regime?: string;
  target_rpe?: number;
  target_velocity?: number; // VBT - target velocity in m/s
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
        ? { label: "Exercice 1 (agoniste)", sublabel: "Entrez le nom de l'exercice" }
        : { label: "Exercice 2 (antagoniste)", sublabel: "Entrez le nom de l'exercice" };
    case "bulgarian":
      return slotIndex === 0
        ? { label: "Exercice lourd (85-95% 1RM)", sublabel: "Entrez le nom de l'exercice lourd" }
        : { label: "Exercice léger (explosif)", sublabel: "Entrez le nom de l'exercice explosif" };
    case "triset":
    case "giant_set":
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Entrez le nom de l'exercice" };
    case "biset":
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Entrez le nom de l'exercice" };
    default:
      return { label: `Exercice ${slotIndex + 1}`, sublabel: "Entrez le nom de l'exercice" };
  }
}

// Exercise input with library autocomplete
function ExerciseInput({
  exercise,
  exerciseIndex,
  placeholder,
  onUpdateExercise,
  onSelectFromLibrary,
  filteredLibrary,
  searchQuery,
  setSearchQuery,
  showLibraryFor,
  setShowLibraryFor,
  className,
}: {
  exercise: Exercise;
  exerciseIndex: number;
  placeholder?: string;
  onUpdateExercise: (index: number, field: keyof Exercise, value: any) => void;
  onSelectFromLibrary: (index: number, libExercise: any) => void;
  filteredLibrary: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showLibraryFor: number | null;
  setShowLibraryFor: (i: number | null) => void;
  className?: string;
}) {
  return (
    <Popover
      open={showLibraryFor === exerciseIndex}
      onOpenChange={(isOpen) => {
        setShowLibraryFor(isOpen ? exerciseIndex : null);
        if (isOpen) setSearchQuery(exercise.exercise_name);
      }}
    >
      <PopoverTrigger asChild>
        <div className={cn("flex-1 relative", className)}>
          <Input
            placeholder={placeholder || "Nom de l'exercice..."}
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
        className="p-1 w-[min(400px,90vw)] max-h-64 overflow-y-auto z-[100] bg-popover border shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        sideOffset={4}
      >
        {filteredLibrary.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            Aucun exercice trouvé - tapez pour créer
          </div>
        ) : (
          filteredLibrary.slice(0, 15).map((libEx) => (
            <button
              key={libEx.id}
              type="button"
              className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex items-start gap-2"
              onClick={() => onSelectFromLibrary(exerciseIndex, libEx)}
            >
              <span className="break-words min-w-0 flex-1">{libEx.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                {getCategoryLabel(libEx.category)}
              </Badge>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// Exercise slot component for linkable methods
function ExerciseSlotCard({
  exercise,
  exerciseIndex,
  slotNumber,
  slotLabel,
  slotSublabel,
  styleConfig,
  method,
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
  method: string;
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
  const isVbt = isVbtMethod(method);
  
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
          "border-2 rounded-xl p-4 transition-all",
          hasExercise ? "border-border bg-background" : "border-dashed border-muted-foreground/30 bg-muted/20"
        )}>
          <div className="space-y-3">
            {/* Exercise name input */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs shrink-0">{slotLabel}</Badge>
              {exercise ? (
                <ExerciseInput
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  placeholder={slotSublabel}
                  onUpdateExercise={onUpdateExercise}
                  onSelectFromLibrary={onSelectFromLibrary}
                  filteredLibrary={filteredLibrary}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  showLibraryFor={showLibraryFor}
                  setShowLibraryFor={setShowLibraryFor}
                />
              ) : (
                <Input placeholder={slotSublabel} disabled className="h-9" />
              )}
              {hasExercise && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveExercise(exerciseIndex)}
                  className="h-8 w-8 text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Sets, Reps, Weight - only show if exercise has name */}
            {hasExercise && exercise && (
              <div className={cn("grid gap-2", isVbt ? "grid-cols-6" : "grid-cols-5")}>
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
                    max={100}
                    className="h-8 text-xs"
                    value={exercise.weight_percent_rm || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kg</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="h-8 text-xs"
                    value={exercise.weight_kg || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)}
                  />
                </div>
                {isVbt && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">V. min (m/s)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-xs"
                        placeholder="0.8"
                        value={exercise.target_velocity || ""}
                        onChange={(e) => onUpdateExercise(exerciseIndex, "target_velocity", parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">V. max (m/s)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-xs"
                        placeholder="1.0"
                        value={exercise.target_rpe || ""}
                        onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseFloat(e.target.value) || null)}
                      />
                    </div>
                  </>
                )}
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
            )}
          </div>
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
  const intervals = Math.floor(duration / emomInterval);
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
              // Auto-recalculate duration: exerciseCount * new interval
              const newDuration = exercises.length * interval;
              onUpdateBlockConfig(groupId, "duration_minutes", newDuration);
            }
          }}
          className="justify-start flex-wrap"
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

      {/* Duration config */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Durée</Label>
        <div className="flex items-center gap-3 flex-wrap">
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
          <span className="text-muted-foreground">=</span>
          <span className="text-sm font-medium">{intervals} intervalles</span>
        </div>
      </div>

      {/* Summary badge */}
      <div className={cn("px-4 py-2 rounded-lg text-sm", styleConfig.bgColor)}>
        EMOM • {intervals} intervalles × {emomInterval}min = {duration}min
      </div>

      {/* Exercise slots */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">Exercices du bloc EMOM</p>
        <div className="space-y-3">
          {exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id || index} className="flex items-start gap-3">
              <div 
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0",
                  styleConfig.color || "bg-indigo-500"
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <ExerciseInput
                    exercise={exercise}
                    exerciseIndex={index}
                    placeholder={`Minute ${i + 1} - Nom de l'exercice`}
                    onUpdateExercise={onUpdateExercise}
                    onSelectFromLibrary={onSelectFromLibrary}
                    filteredLibrary={filteredLibrary}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showLibraryFor={showLibraryFor}
                    setShowLibraryFor={setShowLibraryFor}
                  />
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
                {exercise.exercise_name && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Reps</Label>
                      <Input
                        className="h-8 text-xs"
                        value={exercise.reps || ""}
                        onChange={(e) => onUpdateExercise(index, "reps", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">%1RM</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={exercise.weight_percent_rm || ""}
                        onChange={(e) => onUpdateExercise(index, "weight_percent_rm", parseInt(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Kg</Label>
                      <Input
                        type="number"
                        step="0.5"
                        className="h-8 text-xs"
                        value={exercise.weight_kg || ""}
                        onChange={(e) => onUpdateExercise(index, "weight_kg", parseFloat(e.target.value) || null)}
                      />
                    </div>
                  </div>
                )}
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
              Ajouter un exercice
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
        <div className="border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
            <ExerciseInput
              exercise={exercise}
              exerciseIndex={exerciseIndex}
              placeholder="Nom de l'exercice..."
              onUpdateExercise={onUpdateExercise}
              onSelectFromLibrary={onSelectFromLibrary}
              filteredLibrary={filteredLibrary}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showLibraryFor={showLibraryFor}
              setShowLibraryFor={setShowLibraryFor}
            />
          </div>
        </div>
      </div>

      {/* Series configuration */}
      {exercise.exercise_name && (
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
                <div className="flex items-center gap-3 flex-wrap">
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
      )}

      {/* Tempo, Contraction Regime and RPE */}
      {exercise.exercise_name && (
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center gap-4 flex-wrap">
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
              <Label className="text-sm whitespace-nowrap">Régime</Label>
              <Select
                value={exercise.contraction_regime || ""}
                onValueChange={(v) => onUpdateExercise(exerciseIndex, "contraction_regime", v || undefined)}
              >
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Contraction..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concentrique">Concentrique</SelectItem>
                  <SelectItem value="excentrique">Excentrique</SelectItem>
                  <SelectItem value="isometrique">Isométrique</SelectItem>
                  <SelectItem value="pliometrique">Pliométrique</SelectItem>
                  <SelectItem value="stato_dynamique">Stato-dynamique</SelectItem>
                  <SelectItem value="concentrique_excentrique">Conc. + Exc.</SelectItem>
                  <SelectItem value="excentrique_surcharge">Exc. surchargé</SelectItem>
                  <SelectItem value="balistique">Balistique</SelectItem>
                  <SelectItem value="isokinetique">Isocinétique</SelectItem>
                </SelectContent>
              </Select>
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
          <div>
            <Label className="text-xs text-muted-foreground">Notes / Consignes</Label>
            <Textarea
              className="min-h-[36px] text-xs resize-y"
              placeholder="Consignes, explications..."
              value={exercise.notes || ""}
              onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)}
              rows={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Tabata Block Component
function TabataBlock({
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
  const workSeconds = blockConfig.work_seconds || 20;
  const restSeconds = blockConfig.rest_seconds || 10;
  const cycles = blockConfig.rounds || 8;

  return (
    <div className="space-y-4">
      {/* Tabata config */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Work (s)</Label>
          <Input
            type="number"
            min="5"
            className="h-8 w-16 text-sm"
            value={workSeconds}
            onChange={(e) => onUpdateBlockConfig(groupId, "work_seconds", parseInt(e.target.value) || 20)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Rest (s)</Label>
          <Input
            type="number"
            min="5"
            className="h-8 w-16 text-sm"
            value={restSeconds}
            onChange={(e) => onUpdateBlockConfig(groupId, "rest_seconds", parseInt(e.target.value) || 10)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Cycles</Label>
          <Input
            type="number"
            min="1"
            className="h-8 w-16 text-sm"
            value={cycles}
            onChange={(e) => onUpdateBlockConfig(groupId, "rounds", parseInt(e.target.value) || 8)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className={cn("px-4 py-2 rounded-lg text-sm", styleConfig.bgColor)}>
        Tabata • {cycles} cycles × ({workSeconds}s work / {restSeconds}s rest) = {Math.round((workSeconds + restSeconds) * cycles / 60)} min
      </div>

      {/* Exercise slots */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Exercices du Tabata</Label>
        <div className="space-y-3">
          {exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id || index} className="flex items-start gap-3">
              <div 
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0",
                  styleConfig.color || "bg-yellow-500"
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <ExerciseInput
                    exercise={exercise}
                    exerciseIndex={index}
                    placeholder={`Exercice ${i + 1}`}
                    onUpdateExercise={onUpdateExercise}
                    onSelectFromLibrary={onSelectFromLibrary}
                    filteredLibrary={filteredLibrary}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showLibraryFor={showLibraryFor}
                    setShowLibraryFor={setShowLibraryFor}
                  />
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
          onClick={() => onAddExerciseToGroup(groupId, "tabata")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un exercice
        </Button>
      </div>
    </div>
  );
}

// Death By Block Component
function DeathByBlock({
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
  const exercise = exercises[0]?.exercise;
  const exerciseIndex = exercises[0]?.index;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        +1 rep chaque minute jusqu'à l'échec. Minute 1 = 1 rep, Minute 2 = 2 reps, etc.
      </p>

      {/* Exercise slot */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Exercice</Label>
        <div className="border rounded-xl p-4">
          {exercise ? (
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
              <ExerciseInput
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                placeholder="Nom de l'exercice..."
                onUpdateExercise={onUpdateExercise}
                onSelectFromLibrary={onSelectFromLibrary}
                filteredLibrary={filteredLibrary}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showLibraryFor={showLibraryFor}
                setShowLibraryFor={setShowLibraryFor}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => onRemoveExercise(exerciseIndex)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onAddExerciseToGroup(groupId, "death_by")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter l'exercice
            </Button>
          )}
        </div>
      </div>

      {/* Visual progression */}
      {exercise?.exercise_name && (
        <div className={cn("p-3 rounded-lg text-sm", styleConfig.bgColor)}>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-red-600 text-white">Min 1</Badge>
            <span>1 rep</span>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-red-600 text-white">Min 5</Badge>
            <span>5 reps</span>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-red-600 text-white">Min 10</Badge>
            <span>10 reps</span>
            <span className="text-muted-foreground">→ ... jusqu'à l'échec</span>
          </div>
        </div>
      )}
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
  };

  const filledExercises = exercises.filter(e => e.exercise.exercise_name.trim());

  return (
    <div className="space-y-4">
      {/* Method-specific config first */}
      <div className="flex items-center gap-4 flex-wrap">
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
      </div>

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
              <div className="flex-1 border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <ExerciseInput
                    exercise={exercise}
                    exerciseIndex={index}
                    placeholder={`Exercice ${i + 1}`}
                    onUpdateExercise={onUpdateExercise}
                    onSelectFromLibrary={onSelectFromLibrary}
                    filteredLibrary={filteredLibrary}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showLibraryFor={showLibraryFor}
                    setShowLibraryFor={setShowLibraryFor}
                  />
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
    </div>
  );
}

// Linkable method block (Superset, Biset, Triset, Bulgarian)
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
      index: exerciseData?.index ?? -1,
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
            method={method}
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
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise}
            onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor}
            setShowLibraryFor={setShowLibraryFor}
          />
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

// Intermittent Cardio Block Component
function IntermittentCardioBlock({
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
  const reps = blockConfig.rounds || 6;
  const workSeconds = blockConfig.work_seconds || 30;
  const restSeconds = blockConfig.rest_seconds || 30;
  const totalMinutes = Math.round((reps * (workSeconds + restSeconds)) / 60);

  return (
    <div className="space-y-4">
      {/* Support selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Support (obligatoire)</Label>
        <ToggleGroup
          type="single"
          value={blockConfig.emom_mode || "running"}
          onValueChange={(v) => v && onUpdateBlockConfig(groupId, "emom_mode" as keyof BlockConfig, v)}
          className="justify-start"
        >
          <ToggleGroupItem value="running" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
            🏃 Course à pied
          </ToggleGroupItem>
          <ToggleGroupItem value="cycling" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
            🚴 Vélo
          </ToggleGroupItem>
          <ToggleGroupItem value="swimming" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
            🏊 Natation
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Config */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Répétitions</Label>
          <Input type="number" min="1" className="h-8 text-sm" value={reps}
            onChange={(e) => onUpdateBlockConfig(groupId, "rounds", parseInt(e.target.value) || 6)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Effort (s)</Label>
          <Input type="number" min="5" className="h-8 text-sm" value={workSeconds}
            onChange={(e) => onUpdateBlockConfig(groupId, "work_seconds", parseInt(e.target.value) || 30)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Récup (s)</Label>
          <Input type="number" min="5" className="h-8 text-sm" value={restSeconds}
            onChange={(e) => onUpdateBlockConfig(groupId, "rest_seconds", parseInt(e.target.value) || 30)} />
        </div>
      </div>

      {/* Intensity */}
      <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20 space-y-3">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">⚡ Intensité</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={blockConfig.time_cap_minutes?.toString() || "rpe"}
              onValueChange={(v) => onUpdateBlockConfig(groupId, "time_cap_minutes" as keyof BlockConfig, v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rpe">RPE (/10)</SelectItem>
                <SelectItem value="vma">% VMA (%)</SelectItem>
                <SelectItem value="fc">FC cible (bpm)</SelectItem>
                <SelectItem value="watts">Watts (W)</SelectItem>
                <SelectItem value="rpm">RPM (tr/min)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">RPE cible</Label>
            <Input type="number" min="1" max="10" className="h-8 text-sm" placeholder="8" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">FC cible (bpm)</Label>
            <Input type="number" min="60" max="220" className="h-8 text-sm" placeholder="160" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className={cn("px-4 py-3 rounded-lg text-sm font-medium", styleConfig.bgColor)}>
        <p className="text-muted-foreground text-xs mb-1">Aperçu</p>
        <p>Intermittent: {reps} × ({Math.floor(workSeconds / 60)}:{String(workSeconds % 60).padStart(2, "0")}/{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")})</p>
        <p className="text-xs text-muted-foreground mt-1">≈ {totalMinutes} min total</p>
      </div>
    </div>
  );
}

// Fartlek Block Component
function FartlekBlock({
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
  const isStructured = blockConfig.emom_mode === "structured";
  const cycles = blockConfig.rounds || 6;
  const workSeconds = blockConfig.work_seconds || 0;
  const restSeconds = blockConfig.rest_seconds || 0;
  const totalMinutes = isStructured ? Math.round((cycles * (workSeconds + restSeconds)) / 60) : (blockConfig.duration_minutes || 0);

  return (
    <div className="space-y-4">
      {/* Structure type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">⚡ Type de structure</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={cn(
              "rounded-xl p-3 border-2 text-left transition-all",
              !isStructured ? "border-green-500 bg-green-500 text-white" : "border-border hover:border-green-300"
            )}
            onClick={() => onUpdateBlockConfig(groupId, "emom_mode" as keyof BlockConfig, "free")}
          >
            <p className="font-medium text-sm">Fartlek libre</p>
            <p className={cn("text-xs mt-1", !isStructured ? "text-green-100" : "text-muted-foreground")}>L'athlète varie les allures selon ses sensations</p>
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl p-3 border-2 text-left transition-all",
              isStructured ? "border-green-500 bg-green-500 text-white" : "border-border hover:border-green-300"
            )}
            onClick={() => onUpdateBlockConfig(groupId, "emom_mode" as keyof BlockConfig, "structured")}
          >
            <p className="font-medium text-sm">Fartlek structuré</p>
            <p className={cn("text-xs mt-1", isStructured ? "text-green-100" : "text-muted-foreground")}>Phases d'effort et récupération définies</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nombre de cycles</Label>
          <Input type="number" min="1" className="h-8 text-sm" value={cycles}
            onChange={(e) => onUpdateBlockConfig(groupId, "rounds", parseInt(e.target.value) || 6)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">⏱ Durée totale (calculée)</Label>
          <div className="h-8 flex items-center px-3 rounded-md border bg-muted text-sm">
            {totalMinutes} min
          </div>
          <p className="text-xs text-muted-foreground mt-1">Calculée automatiquement</p>
        </div>
      </div>

      {isStructured && (
        <>
          {/* Effort phase */}
          <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 space-y-3">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">🔥 Phase d'effort</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Durée effort (s)</Label>
                <Input type="number" min="5" className="h-8 text-sm" value={workSeconds}
                  onChange={(e) => onUpdateBlockConfig(groupId, "work_seconds", parseInt(e.target.value) || 30)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RPE cible effort</Label>
                <Input type="number" min="1" max="10" className="h-8 text-sm" placeholder="7" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Allure (km/h ou min/km)</Label>
                <Input type="text" className="h-8 text-sm" placeholder="ex: 14 km/h ou 4:15/km" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">FC cible (bpm)</Label>
                <Input type="number" min="60" max="220" className="h-8 text-sm" placeholder="170" />
              </div>
            </div>
          </div>

          {/* Recovery phase */}
          <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20 space-y-3">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">🌿 Phase de récupération</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Durée récupération (s)</Label>
                <Input type="number" min="5" className="h-8 text-sm" value={restSeconds}
                  onChange={(e) => onUpdateBlockConfig(groupId, "rest_seconds", parseInt(e.target.value) || 30)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RPE cible récup</Label>
                <Input type="number" min="1" max="10" className="h-8 text-sm" placeholder="3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Allure (km/h ou min/km)</Label>
                <Input type="text" className="h-8 text-sm" placeholder="ex: 8 km/h ou 7:30/km" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">FC cible (bpm)</Label>
                <Input type="number" min="60" max="220" className="h-8 text-sm" placeholder="130" />
              </div>
            </div>
          </div>
        </>
      )}

      {!isStructured && (
        <div>
          <Label className="text-xs text-muted-foreground">Durée totale (min)</Label>
          <Input type="number" min="1" className="h-8 text-sm" value={blockConfig.duration_minutes || 20}
            onChange={(e) => onUpdateBlockConfig(groupId, "duration_minutes", parseInt(e.target.value) || 20)} />
        </div>
      )}

      {/* Summary */}
      <div className={cn("px-4 py-3 rounded-lg text-sm", styleConfig.bgColor)}>
        <p className="text-muted-foreground text-xs mb-1">Résumé</p>
        {isStructured ? (
          <>
            <p className="font-medium">{cycles} × ({Math.floor(workSeconds / 60)}:{String(workSeconds % 60).padStart(2, "0")}/{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")})</p>
            <p className="text-xs mt-1">● Effort: {Math.round(cycles * workSeconds / 60)} min &nbsp;&nbsp; ● Récup: {Math.round(cycles * restSeconds / 60)} min</p>
          </>
        ) : (
          <p className="font-medium">Fartlek libre - {blockConfig.duration_minutes || 20} min</p>
        )}
      </div>
    </div>
  );
}

// Isometric Overcoming Block Component
function IsometricOvercomingBlock({
  exercises,
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
        Contraction maximale contre une résistance fixe immobile. Poussez ou tirez de toutes vos forces pendant la durée prescrite.
      </p>
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput exercise={exercise} exerciseIndex={exerciseIndex} placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise} onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor} setShowLibraryFor={setShowLibraryFor} />
        </div>
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Durée contraction (s)</Label>
                <Input type="number" min="1" className="h-8 text-xs" placeholder="6-10"
                  value={exercise.reps || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RPE cible</Label>
                <Input type="number" min="1" max="10" className="h-8 text-xs" placeholder="10"
                  value={exercise.target_rpe || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseInt(e.target.value) || null)} />
              </div>
            </div>

            {/* Isometric specific config */}
            <div className="border rounded-lg p-3 bg-stone-50 dark:bg-stone-900/20">
              <p className="text-xs font-medium text-stone-700 dark:text-stone-400 mb-2">📐 Configuration isométrique</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Angle articulaire (°)</Label>
                  <Input className="h-8 text-xs" placeholder="Ex: 90° (mi-course)"
                    value={exercise.tempo || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Position / Notes</Label>
                  <Input className="h-8 text-xs" placeholder="Ex: Mi-course, position basse..."
                    value={exercise.notes || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-2 bg-stone-100 dark:bg-stone-800/30">
              <p className="text-[11px] text-stone-600 dark:text-stone-400">💪 Effort maximal contre résistance immobile — pas de mouvement, contraction à 100%. Pas de charge mobile.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Isometric Yielding Block Component
function IsometricYieldingBlock({
  exercises,
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
        Maintien d'une charge à un angle articulaire spécifique. Résistez à la gravité le plus longtemps possible.
      </p>
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput exercise={exercise} exerciseIndex={exerciseIndex} placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise} onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor} setShowLibraryFor={setShowLibraryFor} />
        </div>
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Durée maintien (s)</Label>
                <Input type="number" min="1" className="h-8 text-xs" placeholder="20-60"
                  value={exercise.reps || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">%1RM</Label>
                <Input type="number" min="0" max="100" className="h-8 text-xs" placeholder="60-80"
                  value={exercise.weight_percent_rm || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kg</Label>
                <Input type="number" min="0" step="0.5" className="h-8 text-xs"
                  value={exercise.weight_kg || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)} />
              </div>
            </div>

            {/* Yielding specific: angle and position */}
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/20">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-400 mb-2">📐 Position de maintien</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Angle articulaire (°)</Label>
                  <Input className="h-8 text-xs" placeholder="Ex: 90°, 120°, mi-course..."
                    value={exercise.tempo || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RPE cible</Label>
                  <Input type="number" min="1" max="10" className="h-8 text-xs" placeholder="7-9"
                    value={exercise.target_rpe || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseInt(e.target.value) || null)} />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Notes position</Label>
                <Input className="h-8 text-xs" placeholder="Ex: Pause en bas du squat, coudes à 90°..."
                  value={exercise.notes || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)} />
              </div>
            </div>

            <div className="border rounded-lg p-2 bg-slate-100 dark:bg-slate-800/30">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">⏱ Maintenez la charge à l'angle prescrit — le temps sous tension est la variable clé</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Iso Max Block Component
function IsoMaxBlock({
  exercises,
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
        Contraction isométrique maximale contre une charge très lourde (85-100% 1RM). Maintenez le plus longtemps possible.
      </p>
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput exercise={exercise} exerciseIndex={exerciseIndex} placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise} onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor} setShowLibraryFor={setShowLibraryFor} />
        </div>
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Durée max (s)</Label>
                <Input type="number" min="1" className="h-8 text-xs" placeholder="6-30"
                  value={exercise.reps || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">%1RM</Label>
                <Input type="number" min="0" max="100" className="h-8 text-xs" placeholder="85-100"
                  value={exercise.weight_percent_rm || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kg</Label>
                <Input type="number" min="0" step="0.5" className="h-8 text-xs"
                  value={exercise.weight_kg || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)} />
              </div>
            </div>

            {/* Iso Max specific: angle and position */}
            <div className="border rounded-lg p-3 bg-zinc-50 dark:bg-zinc-900/20">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-2">📐 Position isométrique</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Angle articulaire (°)</Label>
                  <Input className="h-8 text-xs" placeholder="Ex: 90°, point de blocage..."
                    value={exercise.tempo || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RPE cible</Label>
                  <Input type="number" min="1" max="10" className="h-8 text-xs" placeholder="9-10"
                    value={exercise.target_rpe || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseInt(e.target.value) || null)} />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Notes position</Label>
                <Input className="h-8 text-xs" placeholder="Ex: Maintien au point de blocage, sticking point..."
                  value={exercise.notes || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)} />
              </div>
            </div>

            <div className="border rounded-lg p-2 bg-zinc-100 dark:bg-zinc-800/30">
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">🔥 Charge lourde (85-100% 1RM) — maintenez la contraction maximale le plus longtemps possible</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Super Pletnev Block Component
function SuperPletnevBlock({
  exercises,
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

  const phases = [
    { label: "Excentrique", desc: "Phase négative lente et contrôlée" },
    { label: "Explosif", desc: "Phase concentrique explosive" },
    { label: "Isométrie", desc: "Maintien statique 3-5s" },
    { label: "Concentrique", desc: "Phase positive contrôlée" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Méthode de contraste avancée : excentrique lent, explosif, isométrie, concentrique. 4 phases par répétition.
      </p>
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput exercise={exercise} exerciseIndex={exerciseIndex} placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise} onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor} setShowLibraryFor={setShowLibraryFor} />
        </div>
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input className="h-8 text-xs" placeholder="3-5"
                  value={exercise.reps || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">%1RM</Label>
                <Input type="number" min="0" max="100" className="h-8 text-xs" placeholder="70-85"
                  value={exercise.weight_percent_rm || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kg</Label>
                <Input type="number" min="0" step="0.5" className="h-8 text-xs"
                  value={exercise.weight_kg || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-violet-50 dark:bg-violet-900/20">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">⚡ 4 phases par répétition :</p>
              <div className="grid grid-cols-4 gap-2">
                {phases.map((phase, i) => (
                  <div key={i} className="text-center p-1.5 bg-violet-100 dark:bg-violet-800/30 rounded">
                    <p className="text-[10px] font-bold text-violet-600 dark:text-violet-300">{i + 1}. {phase.label}</p>
                    <p className="text-[9px] text-muted-foreground">{phase.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tempo (ex: 4-0-X-2)</Label>
              <Input className="h-8 text-xs" placeholder="4-0-X-2"
                value={exercise.tempo || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Combiné Haltéro Block Component
function CombineHalteroBlock({
  exercises,
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
        Enchaînement de mouvements d'haltérophilie (épaulé, arraché, jeté) dans une même série sans reposer la barre.
      </p>
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput exercise={exercise} exerciseIndex={exerciseIndex} placeholder="Ex: Épaulé + Jeté..."
            onUpdateExercise={onUpdateExercise} onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor} setShowLibraryFor={setShowLibraryFor} />
        </div>
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input className="h-8 text-xs" placeholder="1-3"
                  value={exercise.reps || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">%1RM</Label>
                <Input type="number" min="0" max="100" className="h-8 text-xs" placeholder="70-85"
                  value={exercise.weight_percent_rm || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kg</Label>
                <Input type="number" min="0" step="0.5" className="h-8 text-xs"
                  value={exercise.weight_kg || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">🏋️ Enchaînez les mouvements sans reposer la barre — ex: Épaulé + Front Squat + Jeté</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes (détail des mouvements)</Label>
              <Input className="h-8 text-xs" placeholder="Épaulé + Front Squat + Jeté"
                value={exercise.notes || ""} onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatoDynamiqueBlock({
  groupId,
  exercises,
  blockConfig,
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
        Maintien isométrique (3-5s) suivi d'une phase concentrique explosive. Développe la force et la puissance.
      </p>

      {/* Exercise slot */}
      <div className="border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
          <ExerciseInput
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            placeholder="Nom de l'exercice..."
            onUpdateExercise={onUpdateExercise}
            onSelectFromLibrary={onSelectFromLibrary}
            filteredLibrary={filteredLibrary}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showLibraryFor={showLibraryFor}
            setShowLibraryFor={setShowLibraryFor}
          />
        </div>
        
        {exercise.exercise_name && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
                <Input type="number" min="1" className="h-8 text-xs"
                  value={exercise.sets || ""}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "sets", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input className="h-8 text-xs" value={exercise.reps || ""}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "reps", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">%1RM</Label>
                <Input type="number" min="0" max="100" className="h-8 text-xs"
                  value={exercise.weight_percent_rm || ""}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "weight_percent_rm", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kg</Label>
                <Input type="number" min="0" step="0.5" className="h-8 text-xs"
                  value={exercise.weight_kg || ""}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "weight_kg", parseFloat(e.target.value) || null)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Repos (s)</Label>
                <Input type="number" min="0" className="h-8 text-xs"
                  value={exercise.rest_seconds || ""}
                  onChange={(e) => onUpdateExercise(exerciseIndex, "rest_seconds", parseInt(e.target.value) || null)} />
              </div>
            </div>

            {/* Isometric hold config */}
            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">⏱ Phase isométrique</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Durée maintien (s)</Label>
                  <Input type="number" min="1" max="10" className="h-8 text-xs" placeholder="3-5"
                    value={exercise.tempo || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "tempo", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Angle articulaire (°)</Label>
                  <Input className="h-8 text-xs" placeholder="Ex: 90°, mi-course..."
                    value={exercise.notes || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "notes", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RPE cible</Label>
                  <Input type="number" min="1" max="10" className="h-8 text-xs" placeholder="8"
                    value={exercise.target_rpe || ""}
                    onChange={(e) => onUpdateExercise(exerciseIndex, "target_rpe", parseInt(e.target.value) || null)} />
                </div>
              </div>
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
  const maxExercises = getMaxExercisesForMethod(method);
  const filledExercises = exercises.filter(e => e.exercise.exercise_name.trim());
  const isComplete = filledExercises.length >= minExercises;
  
  // For methods with flexible exercise count (EMOM, Tabata, Circuit, etc.), 
  // show total count without max limit
  const isFlexibleMethod = ["emom", "tabata", "circuit", "amrap", "for_time", "death_by", "intermittent_cardio", "fartlek"].includes(method);

  // Render content based on method type
  const renderContent = () => {
    switch (method) {
      case "emom":
        return <EmomBlock {...props} styleConfig={styleConfig} />;
      case "pyramid_up":
      case "pyramid_down":
      case "pyramid_full":
        return <PyramidBlock {...props} styleConfig={styleConfig} />;
      case "drop_set":
        return <DropSetBlock {...props} styleConfig={styleConfig} />;
      case "tabata":
        return <TabataBlock {...props} styleConfig={styleConfig} />;
      case "death_by":
        return <DeathByBlock {...props} styleConfig={styleConfig} />;
      case "circuit":
      case "amrap":
      case "for_time":
        return <CardioBlock {...props} styleConfig={styleConfig} />;
      case "five_by_five":
        return <FiveByFiveBlock {...props} styleConfig={styleConfig} />;
      case "intermittent_cardio":
        return <IntermittentCardioBlock {...props} styleConfig={styleConfig} />;
      case "fartlek":
        return <FartlekBlock {...props} styleConfig={styleConfig} />;
      case "stato_dynamique":
        return <StatoDynamiqueBlock {...props} styleConfig={styleConfig} />;
      case "isometric_overcoming":
        return <IsometricOvercomingBlock {...props} styleConfig={styleConfig} />;
      case "isometric_yielding":
        return <IsometricYieldingBlock {...props} styleConfig={styleConfig} />;
      case "iso_max":
        return <IsoMaxBlock {...props} styleConfig={styleConfig} />;
      case "super_pletnev":
        return <SuperPletnevBlock {...props} styleConfig={styleConfig} />;
      case "combine_haltero":
        return <CombineHalteroBlock {...props} styleConfig={styleConfig} />;
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
        "rounded-2xl border-2 p-5 print-exercise-group",
        styleConfig.borderColor,
        styleConfig.bgColor
      )}
    >
      {/* Block header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge className={cn("text-white text-sm px-3 py-1", styleConfig.color)}>
            {styleConfig.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {isFlexibleMethod 
              ? `${filledExercises.length} exercice${filledExercises.length > 1 ? "s" : ""}`
              : `${filledExercises.length}/${minExercises} exercices`
            }
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
              Valider le bloc
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
