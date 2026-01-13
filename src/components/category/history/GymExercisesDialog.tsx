import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell, GripVertical, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  { value: "other", label: "Autre" },
];

const COMMON_EXERCISES = [
  // Upper Push
  { name: "Développé couché", category: "upper_push" },
  { name: "Développé incliné", category: "upper_push" },
  { name: "Développé militaire", category: "upper_push" },
  { name: "Dips", category: "upper_push" },
  { name: "Pompes", category: "upper_push" },
  // Upper Pull
  { name: "Tractions", category: "upper_pull" },
  { name: "Rowing barre", category: "upper_pull" },
  { name: "Rowing haltères", category: "upper_pull" },
  { name: "Tirage vertical", category: "upper_pull" },
  { name: "Face pull", category: "upper_pull" },
  // Lower Push
  { name: "Squat", category: "lower_push" },
  { name: "Presse", category: "lower_push" },
  { name: "Fentes", category: "lower_push" },
  { name: "Leg extension", category: "lower_push" },
  { name: "Squat bulgare", category: "lower_push" },
  // Lower Pull
  { name: "Soulevé de terre", category: "lower_pull" },
  { name: "Romanian deadlift", category: "lower_pull" },
  { name: "Leg curl", category: "lower_pull" },
  { name: "Hip thrust", category: "lower_pull" },
  { name: "Good morning", category: "lower_pull" },
  // Core
  { name: "Planche", category: "core" },
  { name: "Gainage latéral", category: "core" },
  { name: "Crunch", category: "core" },
  { name: "Russian twist", category: "core" },
  { name: "Ab wheel", category: "core" },
];

const emptyExercise = (): Exercise => ({
  exercise_name: "",
  exercise_category: "other",
  sets: 3,
  reps: 10,
  weight_kg: null,
  rest_seconds: 90,
  rpe: null,
  tempo: "",
  notes: "",
  order_index: 0,
});

export function GymExercisesDialog({ 
  open, 
  onOpenChange, 
  session, 
  playerId,
  categoryId 
}: GymExercisesDialogProps) {
  const queryClient = useQueryClient();
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  // Fetch existing exercises
  const { data: existingExercises, isLoading } = useQuery({
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

  // Load existing exercises when dialog opens
  useState(() => {
    if (existingExercises && existingExercises.length > 0) {
      setExercises(existingExercises.map((e) => ({
        id: e.id,
        exercise_name: e.exercise_name,
        exercise_category: e.exercise_category || "other",
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg ? parseFloat(String(e.weight_kg)) : null,
        rest_seconds: e.rest_seconds,
        rpe: e.rpe,
        tempo: e.tempo || "",
        notes: e.notes || "",
        order_index: e.order_index || 0,
      })));
    }
  });

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

  const selectSuggestion = (index: number, name: string, category: string) => {
    updateExercise(index, "exercise_name", name);
    updateExercise(index, "exercise_category", category);
    setShowSuggestions(null);
  };

  const calculateTonnage = () => {
    return exercises.reduce((total, ex) => {
      const weight = ex.weight_kg || 0;
      const sets = ex.sets || 0;
      const reps = ex.reps || 0;
      return total + (weight * sets * reps);
    }, 0);
  };

  const getCategoryLabel = (value: string) => {
    return EXERCISE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Exercices Musculation
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{session.training_type}</Badge>
            <span>{session.session_date}</span>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="flex gap-2 flex-wrap flex-shrink-0 p-2 bg-muted rounded-lg">
          <Badge className="bg-blue-100 text-blue-700">
            {exercises.filter((e) => e.exercise_name).length} exercices
          </Badge>
          <Badge className="bg-purple-100 text-purple-700">
            {exercises.reduce((sum, e) => sum + e.sets, 0)} séries totales
          </Badge>
          <Badge className="bg-green-100 text-green-700">
            Tonnage: {calculateTonnage().toLocaleString()}kg
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
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Nom de l'exercice..."
                      value={exercise.exercise_name}
                      onChange={(e) => updateExercise(index, "exercise_name", e.target.value)}
                      onFocus={() => setShowSuggestions(index)}
                      onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                    />
                    {showSuggestions === index && !exercise.exercise_name && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {COMMON_EXERCISES.map((ex, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                            onClick={() => selectSuggestion(index, ex.name, ex.category)}
                          >
                            <span>{ex.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {getCategoryLabel(ex.category)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select
                    value={exercise.exercise_category}
                    onValueChange={(v) => updateExercise(index, "exercise_category", v)}
                  >
                    <SelectTrigger className="w-[140px]">
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

                {/* Exercise details */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <Label className="text-xs">Séries</Label>
                    <Input
                      type="number"
                      min={1}
                      value={exercise.sets}
                      onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Répétitions</Label>
                    <Input
                      type="number"
                      min={1}
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
                      placeholder="0"
                      value={exercise.weight_kg || ""}
                      onChange={(e) => updateExercise(index, "weight_kg", parseFloat(e.target.value) || null)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Repos (sec)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={15}
                      placeholder="90"
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
                      <SelectTrigger>
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
                </div>

                {/* Tonnage for this exercise */}
                {exercise.weight_kg && exercise.reps && (
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      Tonnage: {(exercise.weight_kg * exercise.sets * exercise.reps).toLocaleString()}kg
                    </Badge>
                  </div>
                )}
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
  );
}
