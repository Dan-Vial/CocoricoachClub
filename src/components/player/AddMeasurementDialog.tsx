import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { measurementSchema } from "@/lib/validations";
import { format } from "date-fns";

interface AddMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  categoryId: string;
}

export function AddMeasurementDialog({
  open,
  onOpenChange,
  playerId,
  categoryId,
}: AddMeasurementDialogProps) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [measurementDate, setMeasurementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const addMeasurement = useMutation({
    mutationFn: async (data: { weight_kg?: number; height_cm?: number; measurement_date: string }) => {
      const { error } = await supabase
        .from("player_measurements")
        .insert({
          player_id: playerId,
          category_id: categoryId,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          measurement_date: data.measurement_date,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_measurements", playerId] });
      toast.success("Mesure ajoutée avec succès");
      setWeight("");
      setHeight("");
      setMeasurementDate(format(new Date(), "yyyy-MM-dd"));
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la mesure");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const weightNum = weight ? parseFloat(weight) : undefined;
    const heightNum = height ? parseFloat(height) : undefined;

    const result = measurementSchema.safeParse({
      weight_kg: weightNum,
      height_cm: heightNum,
      measurement_date: measurementDate,
    });

    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    addMeasurement.mutate({
      weight_kg: result.data.weight_kg,
      height_cm: result.data.height_cm,
      measurement_date: result.data.measurement_date,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une mesure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="measurementDate">Date de mesure</Label>
              <Input
                id="measurementDate"
                type="date"
                value={measurementDate}
                onChange={(e) => {
                  setMeasurementDate(e.target.value);
                  setValidationError("");
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: 75.5"
                min="20"
                max="200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Taille (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => {
                  setHeight(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: 175"
                min="100"
                max="250"
              />
            </div>

            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}

            <p className="text-sm text-muted-foreground">
              * Au moins le poids ou la taille doit être renseigné
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={(!weight && !height) || addMeasurement.isPending}
            >
              {addMeasurement.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
