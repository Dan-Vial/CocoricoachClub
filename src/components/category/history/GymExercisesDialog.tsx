import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell, Copy, Search, Library, Link2 } from "lucide-react";
import { toast } from "sonner";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import { useAuth } from "@/contexts/AuthContext";

interface GymExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    session_date: string;
    training_type: string;
  } | null;
  playerId: string;
  categoryId: string;
}

interface Exercise {
  id?: string;
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  rpe: number | null;
  tempo: string;
  notes: string;
  order_index: number;
  set_type: string;
  group_id: string | null;
  duration_seconds: number | null;
  library_exercise_id: string | null;
}

const EXERCISE_CATEGORIES = [
  { value: "upper_push", label: "Haut - Poussée" },
  { value: "upper_pull", label: "Haut - Tirage" },
  { value: "lower_push", label: "Bas - Poussée" },
  { value: "lower_pull", label: "Bas - Tirage" },
  { value: "core", label: "Core / Gainage" },
  { value: "cardio", label: "Cardio" },
  { value: "plyometrics", label: "Pliométrie" },
  { value: "mobility", label: "Mobilité" },
  { value: "stretching_mobility", label: "Stretching" },
  { value: "terrain", label: "Terrain" },
  { value: "musculation", label: "Musculation" },
  { value: "other", label: "Autre" },
];

const SET_TYPES = [
  { value: "standard", label: "Standard", description: "Séries classiques" },
  { value: "superset", label: "Superset", description: "2 exercices enchaînés" },
  { value: "triset", label: "Triset", description: "3 exercices enchaînés" },
  { value: "giant_set", label: "Giant Set", description: "4+ exercices enchaînés" },
  { value: "emom", label: "EMOM", description: "Every Minute On the Minute" },
  { value: "tabata", label: "Tabata", description: "20s travail / 10s repos" },
  { value: "amrap", label: "AMRAP", description: "As Many Reps As Possible" },
  { value: "circuit", label: "Circuit", description: "Enchaînement sans repos" },
  { value: "drop_set", label: "Drop Set", description: "Réduction charge progressive" },
  { value: "rest_pause", label: "Rest-Pause", description: "Pause courte intra-série" },
];

const emptyExercise = (): Exercise => ({
  exercise_name: "",
  exercise_category: "musculation",
  sets: 3,
  reps: 10,
  weight_kg: null,
  rest_seconds: 90,
  rpe: null,
  tempo: "",
  notes: "",
  order_index: 0,
  set_type: "standard",
  group_id: null,
  duration_seconds: null,
  library_exercise_id: null,
});

export function GymExercisesDialog({ 
  open, 
  onOpenChange, 
  session, 
  playerId,
  categoryId 
}: GymExercisesDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLibrary, setShowLibrary] = useState<number | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);

  // Fetch exercise library
  const { data: libraryExercises } = useQuery({
    queryKey: ["exercise-library", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  // Fetch existing exercises
  const { data: existingExercises } = useQuery({
    queryKey: ["gym-exercises", session?.id, playerId],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", session.id)
        .eq("player_id", playerId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!session && open,
  });

  // Load existing exercises when data arrives
  useEffect(() => {
    if (existingExercises && existingExercises.length > 0) {
      setExercises(existingExercises.map((e) => ({
        id: e.id,
        exercise_name: e.exercise_name,
        exercise_category: e.exercise_category || "musculation",
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg ? parseFloat(String(e.weight_kg)) : null,
        rest_seconds: e.rest_seconds,
        rpe: e.rpe,
        tempo: e.tempo || "",
        notes: e.notes || "",
        order_index: e.order_index || 0,
        set_type: e.set_type || "standard",
        group_id: e.group_id || null,
        duration_seconds: e.duration_seconds || null,
        library_exercise_id: e.library_exercise_id || null,
      })));
    } else if (open && (!existingExercises || existingExercises.length === 0)) {
      setExercises([emptyExercise()]);
    }
  }, [existingExercises, open]);

  const saveExercises = useMutation({
    mutationFn: async () => {
      if (!session) return;

      // Delete existing
      await supabase
        .from("gym_session_exercises")
        .delete()
        .eq("training_session_id", session.id)
        .eq("player_id", playerId);

      // Insert new
      const validExercises = exercises.filter((e) => e.exercise_name.trim());
      if (validExercises.length === 0) return;

      const entries = validExercises.map((e, idx) => ({
        training_session_id: session.id,
        player_id: playerId,
        category_id: categoryId,
        exercise_name: e.exercise_name,
        exercise_category: e.exercise_category,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg,
        rest_seconds: e.rest_seconds,
        rpe: e.rpe,
        tempo: e.tempo || null,
        notes: e.notes || null,
        order_index: idx,
        set_type: e.set_type,
        group_id: e.group_id,
        duration_seconds: e.duration_seconds,
        library_exercise_id: e.library_exercise_id,
      }));

      const { error } = await supabase.from("gym_session_exercises").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["session-history-gym"] });
      toast.success("Exercices enregistrés");
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const addExercise = () => {
    setExercises([...exercises, { ...emptyExercise(), order_index: exercises.length }]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const duplicateExercise = (index: number) => {
    const exercise = { ...exercises[index], id: undefined, order_index: exercises.length };
    setExercises([...exercises, exercise]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const selectFromLibrary = (index: number, libExercise: any) => {
    updateExercise(index, "exercise_name", libExercise.name);
    updateExercise(index, "exercise_category", libExercise.category);
    updateExercise(index, "library_exercise_id", libExercise.id);
    setShowLibrary(null);
    setSearchQuery("");
  };

  const openQuickAdd = (index: number) => {
    setQuickAddIndex(index);
    setQuickAddOpen(true);
  };

  const handleQuickAddSuccess = (exercise: { id: string; name: string; category: string }) => {
    if (quickAddIndex !== null) {
      updateExercise(quickAddIndex, "exercise_name", exercise.name);
      updateExercise(quickAddIndex, "exercise_category", exercise.category);
      updateExercise(quickAddIndex, "library_exercise_id", exercise.id);
    }
    setQuickAddIndex(null);
  };

  const calculateTonnage = () => {
    return exercises.reduce((total, ex) => {
      const weight = ex.weight_kg || 0;
      const sets = ex.sets || 0;
      const reps = ex.reps || 0;
      return total + (weight * sets * reps);
    }, 0);
  };

  // Calculate total session time based on exercises and set types
  const calculateSessionTime = () => {
    let totalSeconds = 0;
    const validExercises = exercises.filter((e) => e.exercise_name.trim());
    
    // Group exercises by group_id for supersets/trisets
    const groups: { [key: string]: Exercise[] } = {};
    let ungrouped: Exercise[] = [];
    
    validExercises.forEach((ex) => {
      if (ex.group_id) {
        if (!groups[ex.group_id]) groups[ex.group_id] = [];
        groups[ex.group_id].push(ex);
      } else {
        ungrouped.push(ex);
      }
    });

    // Calculate time for ungrouped exercises
    ungrouped.forEach((ex) => {
      const sets = ex.sets || 1;
      const reps = ex.reps || 10;
      const restSeconds = ex.rest_seconds || 90;
      
      // Estimate time per rep (3 seconds average)
      const timePerRep = 3;
      // Time for all sets including rest (no rest after last set)
      const workTime = sets * reps * timePerRep;
      const restTime = (sets - 1) * restSeconds;
      
      // Special handling for timed exercises
      if (["emom", "tabata", "amrap"].includes(ex.set_type)) {
        totalSeconds += ex.duration_seconds || 60;
      } else if (ex.set_type === "circuit") {
        // Circuit: minimal rest
        totalSeconds += workTime + (sets - 1) * 15;
      } else {
        totalSeconds += workTime + restTime;
      }
    });

    // Calculate time for grouped exercises (supersets, trisets, etc.)
    Object.values(groups).forEach((groupExercises) => {
      if (groupExercises.length === 0) return;
      
      const maxSets = Math.max(...groupExercises.map((e) => e.sets || 1));
      const restBetweenRounds = groupExercises[0].rest_seconds || 90;
      
      // Time for each exercise in the group
      let roundTime = 0;
      groupExercises.forEach((ex) => {
        const reps = ex.reps || 10;
        roundTime += reps * 3; // 3 seconds per rep
      });
      
      // Total: rounds * round time + rest between rounds (not after last)
      totalSeconds += maxSets * roundTime + (maxSets - 1) * restBetweenRounds;
    });

    return totalSeconds;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    return `${mins} min`;
  };

  // Get rest time hint based on set type
  const getRestHint = (setType: string) => {
    switch (setType) {
      case "superset":
      case "triset":
      case "giant_set":
        return "Repos après le groupe";
      case "circuit":
        return "Repos minimal (~15s)";
      case "emom":
        return "Repos = temps restant";
      case "tabata":
        return "10s repos fixe";
      case "drop_set":
        return "Repos entre drops: 0-10s";
      default:
        return "";
    }
  };

  const getCategoryLabel = (value: string) => {
    return EXERCISE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getSetTypeInfo = (value: string) => {
    return SET_TYPES.find((t) => t.value === value) || SET_TYPES[0];
  };

  const filteredLibrary = libraryExercises?.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!session) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Exercices Séance
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{session.training_type}</Badge>
              <span>{session.session_date}</span>
            </div>
          </DialogHeader>

          {/* Summary */}
          <div className="flex gap-2 flex-wrap flex-shrink-0 p-2 bg-muted rounded-lg">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {exercises.filter((e) => e.exercise_name).length} exercices
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {exercises.reduce((sum, e) => sum + e.sets, 0)} séries totales
            </Badge>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Tonnage: {calculateTonnage().toLocaleString()}kg
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              ⏱️ Durée estimée: {formatTime(calculateSessionTime())}
            </Badge>
          </div>

          {/* Exercises list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-4">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-card space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1 relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Rechercher ou saisir un exercice..."
                            value={exercise.exercise_name}
                            onChange={(e) => {
                              updateExercise(index, "exercise_name", e.target.value);
                              setSearchQuery(e.target.value);
                            }}
                            onFocus={() => setShowLibrary(index)}
                          />
                          {exercise.library_exercise_id && (
                            <Library className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          onClick={() => openQuickAdd(index)}
                          title="Ajouter à la bibliothèque"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Library dropdown */}
                      {showLibrary === index && filteredLibrary.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredLibrary.slice(0, 10).map((libEx) => (
                            <div
                              key={libEx.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between items-center"
                              onClick={() => selectFromLibrary(index, libEx)}
                            >
                              <div className="flex items-center gap-2">
                                <Link2 className="h-3 w-3 text-primary" />
                                <span>{libEx.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(libEx.category)}
                              </Badge>
                            </div>
                          ))}
                          {searchQuery && !filteredLibrary.find(e => e.name.toLowerCase() === searchQuery.toLowerCase()) && (
                            <div
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-t flex items-center gap-2 text-primary"
                              onClick={() => openQuickAdd(index)}
                            >
                              <Plus className="h-3 w-3" />
                              Ajouter "{searchQuery}" à la bibliothèque
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateExercise(index)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(index)}
                      disabled={exercises.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Category and Set Type row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Catégorie</Label>
                      <Select
                        value={exercise.exercise_category}
                        onValueChange={(v) => updateExercise(index, "exercise_category", v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXERCISE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Type de série</Label>
                      <Select
                        value={exercise.set_type}
                        onValueChange={(v) => updateExercise(index, "set_type", v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SET_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exercise details */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div>
                      <Label className="text-xs">Séries</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-8"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reps</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-8"
                        placeholder="10"
                        value={exercise.reps || ""}
                        onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Charge (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        className="h-8"
                        placeholder="0"
                        value={exercise.weight_kg || ""}
                        onChange={(e) => updateExercise(index, "weight_kg", parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        Repos (s)
                        {getRestHint(exercise.set_type) && (
                          <span className="text-[10px] text-muted-foreground">
                            ({getRestHint(exercise.set_type)})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={15}
                        className="h-8"
                        placeholder={["superset", "triset", "giant_set"].includes(exercise.set_type) ? "120" : "90"}
                        value={exercise.rest_seconds || ""}
                        onChange={(e) => updateExercise(index, "rest_seconds", parseInt(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">RPE</Label>
                      <Select
                        value={exercise.rpe?.toString() || ""}
                        onValueChange={(v) => updateExercise(index, "rpe", v ? parseInt(v) : null)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {["emom", "tabata", "amrap"].includes(exercise.set_type) && (
                      <div>
                        <Label className="text-xs">Durée (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8"
                          placeholder="60"
                          value={exercise.duration_seconds || ""}
                          onChange={(e) => updateExercise(index, "duration_seconds", parseInt(e.target.value) || null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Superset grouping hint */}
                  {["superset", "triset", "giant_set"].includes(exercise.set_type) && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Groupe:</Label>
                      <Input
                        className="h-7 w-20 text-xs"
                        placeholder="A, B..."
                        value={exercise.group_id || ""}
                        onChange={(e) => updateExercise(index, "group_id", e.target.value || null)}
                      />
                      <span className="text-xs text-muted-foreground">
                        (même lettre = même groupe)
                      </span>
                    </div>
                  )}

                  {/* Info badges */}
                  <div className="flex flex-wrap gap-2">
                    {exercise.set_type !== "standard" && (
                      <Badge variant="secondary" className="text-xs">
                        {getSetTypeInfo(exercise.set_type).label}
                      </Badge>
                    )}
                    {exercise.group_id && (
                      <Badge variant="outline" className="text-xs bg-primary/10">
                        Groupe {exercise.group_id}
                      </Badge>
                    )}
                    {exercise.weight_kg && exercise.reps && (
                      <Badge variant="outline" className="text-xs">
                        Tonnage: {(exercise.weight_kg * exercise.sets * exercise.reps).toLocaleString()}kg
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {/* Add button */}
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={addExercise}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un exercice
              </Button>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={() => saveExercises.mutate()} disabled={saveExercises.isPending}>
              {saveExercises.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickAddExerciseDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialName={searchQuery}
        initialCategory={exercises[quickAddIndex || 0]?.exercise_category || "musculation"}
        onSuccess={handleQuickAddSuccess}
      />
    </>
  );
}
