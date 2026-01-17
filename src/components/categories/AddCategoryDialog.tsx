import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations";
import { 
  SportType, 
  MainSportCategory, 
  MAIN_SPORTS, 
  RUGBY_SUBTYPES, 
  getOtherSportSubtypes 
} from "@/lib/constants/sportTypes";

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
  const [mainSport, setMainSport] = useState<MainSportCategory>("rugby");
  const [sportSubType, setSportSubType] = useState<SportType>("XV");
  const [gender, setGender] = useState<"masculine" | "feminine">("masculine");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  // Get available subtypes based on selected main sport
  const availableSubtypes = mainSport === "rugby" 
    ? RUGBY_SUBTYPES 
    : getOtherSportSubtypes(mainSport);

  // Reset subtype when main sport changes
  useEffect(() => {
    const subtypes = mainSport === "rugby" 
      ? RUGBY_SUBTYPES 
      : getOtherSportSubtypes(mainSport);
    if (subtypes.length > 0) {
      setSportSubType(subtypes[0].value);
    }
  }, [mainSport]);

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
      setMainSport("rugby");
      setSportSubType("XV");
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

    addCategory.mutate({ name: result.data.name, rugby_type: sportSubType, gender: gender });
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select 
                  value={mainSport} 
                  onValueChange={(value: MainSportCategory) => setMainSport(value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {MAIN_SPORTS.map((sport) => (
                      <SelectItem key={sport.value} value={sport.value}>
                        {sport.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={sportSubType} 
                  onValueChange={(value: SportType) => setSportSubType(value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {availableSubtypes.map((subtype) => (
                      <SelectItem key={subtype.value} value={subtype.value}>
                        {subtype.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
