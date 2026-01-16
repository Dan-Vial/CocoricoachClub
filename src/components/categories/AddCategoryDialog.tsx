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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations";
import { SPORT_TYPES, SportType, getRugbyTypes, getOtherSportTypes } from "@/lib/constants/sportTypes";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  clubId,
}: AddCategoryDialogProps) {
  const [categoryName, setCategoryName] = useState("");
  const [sportType, setSportType] = useState<SportType>("XV");
  const [gender, setGender] = useState<"masculine" | "feminine">("masculine");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const rugbyTypes = getRugbyTypes();
  const otherSports = getOtherSportTypes();

  const addCategory = useMutation({
    mutationFn: async (data: { name: string; rugby_type: SportType; gender: "masculine" | "feminine" }) => {
      console.log("Adding category with data:", { name: data.name, club_id: clubId, rugby_type: data.rugby_type, gender: data.gender });
      const { error, data: result } = await supabase
        .from("categories")
        .insert({ name: data.name, club_id: clubId, rugby_type: data.rugby_type, gender: data.gender });
      if (error) {
        console.error("Category insert error:", error);
        throw error;
      }
      console.log("Category added successfully:", result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", clubId] });
      toast.success("Catégorie ajoutée avec succès");
      setCategoryName("");
      setSportType("XV");
      setGender("masculine");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la catégorie");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const result = categorySchema.safeParse({ name: categoryName });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    addCategory.mutate({ name: result.data.name, rugby_type: sportType, gender: gender });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nom de la catégorie</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: M14, Séniors, U19"
                required
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <RadioGroup value={gender} onValueChange={(value: "masculine" | "feminine") => setGender(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="masculine" id="gender-m" />
                  <Label htmlFor="gender-m" className="cursor-pointer font-normal">Masculin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feminine" id="gender-f" />
                  <Label htmlFor="gender-f" className="cursor-pointer font-normal">Féminin</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-3">
              <Label>Type de sport</Label>
              
              {/* Rugby options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Rugby</p>
                <RadioGroup value={sportType} onValueChange={(value: SportType) => setSportType(value)}>
                  {rugbyTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={type.value} id={`sport-${type.value}`} />
                      <Label htmlFor={`sport-${type.value}`} className="cursor-pointer font-normal">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Other sports */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Autres sports</p>
                <RadioGroup value={sportType} onValueChange={(value: SportType) => setSportType(value)}>
                  {otherSports.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={type.value} id={`sport-${type.value}`} />
                      <Label htmlFor={`sport-${type.value}`} className="cursor-pointer font-normal">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
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
              disabled={!categoryName.trim() || addCategory.isPending}
            >
              {addCategory.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
