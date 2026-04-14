import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SPORT_TYPES, SportType, getSportLabel, getRugbyTypes, getOtherSportTypes, isRugbyType } from "@/lib/constants/sportTypes";

interface EditableRugbyTypeProps {
  categoryId: string;
  currentType: string;
}

export function EditableRugbyType({ categoryId, currentType }: EditableRugbyTypeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sportType, setSportType] = useState(currentType);
  const queryClient = useQueryClient();

  const rugbyTypes = getRugbyTypes();
  const otherSports = getOtherSportTypes();

  const updateType = useMutation({
    mutationFn: async (newType: string) => {
      const { error } = await supabase
        .from("categories")
        .update({ rugby_type: newType })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["category-sport-type", categoryId] });
      toast.success("Type de sport mis à jour");
      setIsOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du type");
      setSportType(currentType);
    },
  });

  const handleSubmit = () => {
    if (sportType === currentType) {
      setIsOpen(false);
      return;
    }
    updateType.mutate(sportType);
  };

  const getDescription = (type: string) => {
    if (type === "XV") return "Passer au rugby à 7 activera l'onglet Tournois.";
    if (type === "7") return "Passer au rugby à XV désactivera l'onglet Tournois.";
    if (type === "touch") return "Touch Rugby avec 6 joueurs par équipe.";
    if (type === "academie") return "Type Académie avec suivi scolaire et plans de développement.";
    if (type === "national_team") return "Type Équipe Nationale avec calendrier international et suivi des sélections.";
    return "";
  };

  return (
    <>
      <div className="flex items-center gap-2 group">
        <span className="text-white/90">
          {getSportLabel(currentType)}
        </span>
        <button
          onClick={() => {
            setSportType(currentType);
            setIsOpen(true);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md"
          aria-label="Modifier le type de sport"
        >
          <Pencil className="h-4 w-4 text-white" />
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le type de sport</DialogTitle>
            <DialogDescription>
              Changez le type de sport pour cette catégorie.
              {isRugbyType(currentType) && ` ${getDescription(currentType)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rugby options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Rugby</p>
              <RadioGroup value={sportType} onValueChange={setSportType}>
                {rugbyTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`edit-type-${type.value}`} />
                    <Label htmlFor={`edit-type-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Other sports */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Autres sports</p>
              <RadioGroup value={sportType} onValueChange={setSportType}>
                {otherSports.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`edit-type-${type.value}`} />
                    <Label htmlFor={`edit-type-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={updateType.isPending}>
              {updateType.isPending ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
