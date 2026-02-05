import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [gender, setGender] = useState<"masculine" | "feminine">("masculine");
  const [sportSubType, setSportSubType] = useState<SportType>("XV");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  // Fetch club to get the sport
  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, sport")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!clubId,
  });

  // Get available subtypes based on club's sport
  const availableSubtypes = useMemo(() => {
    if (!club?.sport) return RUGBY_SUBTYPES;
    const sport = club.sport as MainSportCategory;
    return sport === "rugby" ? RUGBY_SUBTYPES : getOtherSportSubtypes(sport);
  }, [club?.sport]);

  // Reset subtype when dialog opens or club changes
  useEffect(() => {
    if (availableSubtypes.length > 0) {
      setSportSubType(availableSubtypes[0].value);
    }
  }, [availableSubtypes]);

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
      setGender("masculine");
      if (availableSubtypes.length > 0) {
        setSportSubType(availableSubtypes[0].value);
      }
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

  // Get sport label for display
  const getSportLabel = (sport: string) => {
    const sportLabels: Record<string, string> = {
      rugby: "Rugby",
      football: "Football",
      basketball: "Basketball",
      handball: "Handball",
      volleyball: "Volleyball",
      athletics: "Athlétisme",
      judo: "Judo",
      rowing: "Aviron",
      bowling: "Bowling",
    };
    return sportLabels[sport] || sport;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle catégorie</DialogTitle>
          {club?.sport && (
            <p className="text-sm text-muted-foreground">
              Sport : {getSportLabel(club.sport)}
            </p>
          )}
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
