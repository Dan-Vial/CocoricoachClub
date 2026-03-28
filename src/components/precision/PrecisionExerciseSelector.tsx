import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trash2 } from "lucide-react";
import { usePrecisionExercises, type PrecisionExerciseType } from "@/lib/hooks/usePrecisionExercises";
import { toast } from "sonner";

interface PrecisionExerciseSelectorProps {
  categoryId: string;
  sportType?: string;
  selectedExerciseId: string | null;
  onExerciseChange: (exerciseId: string | null, exerciseLabel: string) => void;
  /** Show add custom exercise form */
  allowCreate?: boolean;
  compact?: boolean;
}

export function PrecisionExerciseSelector({
  categoryId,
  sportType,
  selectedExerciseId,
  onExerciseChange,
  allowCreate = false,
  compact = false,
}: PrecisionExerciseSelectorProps) {
  const { exercises, addExercise, deleteExercise } = usePrecisionExercises(categoryId, sportType);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    const value = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    try {
      const result = await addExercise.mutateAsync({ label: newLabel.trim(), value: `custom_${value}_${Date.now()}` });
      onExerciseChange(result.id, result.label);
      setNewLabel("");
      setShowCreate(false);
      toast.success("Exercice de précision ajouté");
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (ex: PrecisionExerciseType) => {
    if (ex.is_system) return;
    try {
      await deleteExercise.mutateAsync(ex.id);
      if (selectedExerciseId === ex.id) onExerciseChange(null, "");
      toast.success("Exercice supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (exercises.length === 0 && !allowCreate) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aucun exercice de précision configuré pour ce sport
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label className={compact ? "text-xs" : "text-sm"}>
        <Target className="h-3.5 w-3.5 inline mr-1.5" />
        Exercice de précision
      </Label>

      <Select
        value={selectedExerciseId || ""}
        onValueChange={(val) => {
          const ex = exercises.find((e) => e.id === val);
          onExerciseChange(val, ex?.label || "");
        }}
      >
        <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
          <SelectValue placeholder="Choisir l'exercice" />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              <div className="flex items-center gap-2">
                <span>{ex.label}</span>
                {!ex.is_system && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                    Custom
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowCreate && (
        <>
          {!showCreate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter un exercice personnalisé
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Tirs en lucarne"
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={handleCreate}
                disabled={!newLabel.trim() || addExercise.isPending}
              >
                Ajouter
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setShowCreate(false); setNewLabel(""); }}
              >
                Annuler
              </Button>
            </div>
          )}

          {/* Show custom exercises with delete option */}
          {exercises.filter((e) => !e.is_system).length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] text-muted-foreground font-medium">Exercices personnalisés :</p>
              {exercises
                .filter((e) => !e.is_system)
                .map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                    <span>{ex.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(ex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
