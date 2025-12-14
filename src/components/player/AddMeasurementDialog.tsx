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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [notes, setNotes] = useState("");
  const [measurementDate, setMeasurementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const addMeasurement = useMutation({
    mutationFn: async () => {
      // Insert into body_composition table (which includes all fields + auto-calculated BMI)
      const { error } = await supabase
        .from("body_composition")
        .insert({
          player_id: playerId,
          category_id: categoryId,
          weight_kg: weight ? parseFloat(weight) : null,
          height_cm: height ? parseFloat(height) : null,
          body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
          muscle_mass_kg: muscleMass ? parseFloat(muscleMass) : null,
          measurement_date: measurementDate,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body_composition", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player_measurements", playerId] });
      toast.success("Mesure ajoutée avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la mesure");
    },
  });

  const resetForm = () => {
    setWeight("");
    setHeight("");
    setBodyFat("");
    setMuscleMass("");
    setNotes("");
    setMeasurementDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight && !height && !bodyFat && !muscleMass) {
      toast.error("Au moins une mesure doit être renseignée");
      return;
    }
    addMeasurement.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une mesure biométrique</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="measurementDate">Date de mesure</Label>
              <Input
                id="measurementDate"
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 85.5"
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
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ex: 185"
                  min="100"
                  max="250"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bodyFat">% Masse Grasse</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="Ex: 12.5"
                  min="3"
                  max="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscleMass">Masse Musculaire (kg)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)}
                  placeholder="Ex: 42.0"
                  min="10"
                  max="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              * L'IMC sera calculé automatiquement si le poids et la taille sont renseignés
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
              disabled={(!weight && !height && !bodyFat && !muscleMass) || addMeasurement.isPending}
            >
              {addMeasurement.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
