import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Trash2, Lock } from "lucide-react";
import { SPARE_EXERCISE_TYPES } from "@/lib/constants/bowlingBallBrands";

interface SpareExercise {
  exercise_type: string;
  attempts: number;
  successes: number;
}

interface AthleteSpareExerciseFormProps {
  onSubmit: (exercises: SpareExercise[]) => void;
  isSubmitting: boolean;
  /** Pre-filled exercise type from block bowling_exercise_type (mapped to SPARE_EXERCISE_TYPES value) */
  prefilledExerciseType?: string;
  /** Human label for the exercise (e.g. "Quille 7") */
  exerciseLabel?: string | null;
}

export function AthleteSpareExerciseForm({
  onSubmit,
  isSubmitting,
  prefilledExerciseType,
  exerciseLabel,
}: AthleteSpareExerciseFormProps) {
  // If staff assigned a specific exercise, lock it
  const isStaffAssigned = !!prefilledExerciseType;

  const [exercises, setExercises] = useState<SpareExercise[]>([
    { exercise_type: prefilledExerciseType || "", attempts: 0, successes: 0 },
  ]);

  // Reset when prefilled type changes
  useEffect(() => {
    if (prefilledExerciseType) {
      setExercises([{ exercise_type: prefilledExerciseType, attempts: 0, successes: 0 }]);
    }
  }, [prefilledExerciseType]);

  const addExercise = () => {
    setExercises(prev => [...prev, { exercise_type: "", attempts: 0, successes: 0 }]);
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof SpareExercise, value: string | number) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validExercises = exercises.filter(e => e.exercise_type && e.attempts > 0);

  return (
    <Card className="border-orange-300 dark:border-orange-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-600" />
          Exercices de Précision
        </CardTitle>
        {isStaffAssigned && exerciseLabel && (
          <CardDescription className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-muted-foreground" />
            Exercice assigné par le staff :
            <Badge variant="secondary" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              {exerciseLabel}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {exercises.map((ex, i) => (
          <div key={i} className="space-y-3 p-3 bg-muted/50 rounded-lg relative">
            {!isStaffAssigned && exercises.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeExercise(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <div>
              <Label className="text-xs">Type d'exercice</Label>
              {isStaffAssigned && i === 0 ? (
                // Staff-assigned: show locked badge instead of dropdown
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 bg-muted rounded-md border border-input">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {exerciseLabel || SPARE_EXERCISE_TYPES.find(t => t.value === ex.exercise_type)?.label || ex.exercise_type}
                  </span>
                </div>
              ) : (
                <Select
                  value={ex.exercise_type}
                  onValueChange={(v) => updateExercise(i, "exercise_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un exercice" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPARE_EXERCISE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre de lancers</Label>
                <Input
                  type="number"
                  min="0"
                  value={ex.attempts || ""}
                  onChange={(e) => updateExercise(i, "attempts", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Réussis</Label>
                <Input
                  type="number"
                  min="0"
                  max={ex.attempts}
                  value={ex.successes || ""}
                  onChange={(e) => updateExercise(i, "successes", Math.min(parseInt(e.target.value) || 0, ex.attempts))}
                  placeholder="0"
                />
              </div>
            </div>
            {ex.attempts > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Taux: {((ex.successes / ex.attempts) * 100).toFixed(0)}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({ex.successes}/{ex.attempts})
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Only show "Add exercise" button if NOT staff-assigned */}
        {!isStaffAssigned && (
          <Button variant="outline" size="sm" onClick={addExercise} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un exercice
          </Button>
        )}

        {validExercises.length > 0 && (
          <Button
            onClick={() => onSubmit(validExercises)}
            disabled={isSubmitting}
            className="w-full"
            variant="secondary"
          >
            {isSubmitting ? "Enregistrement..." : `Enregistrer ${validExercises.length} exercice(s)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
