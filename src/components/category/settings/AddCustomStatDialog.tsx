import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddCustomStatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onStatAdded: (statKey: string) => void;
}

const MEASUREMENT_TYPES = [
  { value: "number", label: "Nombre (quantité)", unit: "" },
  { value: "percentage", label: "Pourcentage (%)", unit: "%" },
  { value: "time", label: "Temps (secondes)", unit: "sec" },
  { value: "time_minutes", label: "Temps (minutes)", unit: "min" },
  { value: "distance_m", label: "Distance (mètres)", unit: "m" },
  { value: "distance_km", label: "Distance (kilomètres)", unit: "km" },
  { value: "speed_ms", label: "Vitesse (m/s)", unit: "m/s" },
  { value: "speed_kmh", label: "Vitesse (km/h)", unit: "km/h" },
  { value: "weight_kg", label: "Poids (kg)", unit: "kg" },
  { value: "height_cm", label: "Hauteur (cm)", unit: "cm" },
  { value: "power_watts", label: "Puissance (watts)", unit: "W" },
  { value: "heart_rate", label: "Fréquence cardiaque (bpm)", unit: "bpm" },
];

const CATEGORY_TYPES = [
  { value: "general", label: "Général" },
  { value: "scoring", label: "Score / Points" },
  { value: "attack", label: "Attaque" },
  { value: "defense", label: "Défense" },
];

export function AddCustomStatDialog({
  open,
  onOpenChange,
  categoryId,
  onStatAdded,
}: AddCustomStatDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [categoryType, setCategoryType] = useState("general");
  const [measurementType, setMeasurementType] = useState("number");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const resetForm = () => {
    setLabel("");
    setShortLabel("");
    setCategoryType("general");
    setMeasurementType("number");
    setMinValue("");
    setMaxValue("");
  };

  const generateKey = (label: string) => {
    return `custom_${label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}`;
  };

  const addCustomStat = useMutation({
    mutationFn: async () => {
      const key = generateKey(label);
      const selectedMeasurement = MEASUREMENT_TYPES.find(m => m.value === measurementType);
      
      const { error } = await supabase.from("custom_stats").insert({
        category_id: categoryId,
        key,
        label,
        short_label: shortLabel || label.substring(0, 10),
        category_type: categoryType,
        measurement_type: measurementType,
        min_value: minValue ? parseFloat(minValue) : null,
        max_value: maxValue ? parseFloat(maxValue) : null,
        unit: selectedMeasurement?.unit || null,
        created_by: user?.id,
      });

      if (error) throw error;
      return key;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: ["custom-stats", categoryId] });
      toast.success("Statistique personnalisée ajoutée");
      onStatAdded(key);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Error adding custom stat:", error);
      if (error.message.includes("duplicate")) {
        toast.error("Une statistique avec ce nom existe déjà");
      } else {
        toast.error("Erreur lors de l'ajout de la statistique");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Le nom de la statistique est requis");
      return;
    }
    addCustomStat.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter une statistique
          </DialogTitle>
          <DialogDescription>
            Créez une statistique personnalisée pour votre catégorie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Nom de la statistique *</Label>
            <Input
              id="label"
              placeholder="Ex: Distance haute intensité"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortLabel">Abréviation (optionnel)</Label>
            <Input
              id="shortLabel"
              placeholder="Ex: Dist. HI"
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value)}
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Utilisée dans les tableaux. Max 15 caractères.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categoryType} onValueChange={setCategoryType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type de mesure</Label>
            <Select value={measurementType} onValueChange={setMeasurementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEASUREMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minValue">Valeur min (optionnel)</Label>
              <Input
                id="minValue"
                type="number"
                placeholder="0"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxValue">Valeur max (optionnel)</Label>
              <Input
                id="maxValue"
                type="number"
                placeholder="100"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addCustomStat.isPending || !label.trim()}>
              {addCustomStat.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
