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
import { toast } from "sonner";
import { categorySchema } from "@/lib/validations";

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
  const [rugbyType, setRugbyType] = useState<"XV" | "7" | "academie">("XV");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const addCategory = useMutation({
    mutationFn: async (data: { name: string; rugby_type: "XV" | "7" | "academie" }) => {
      console.log("Adding category with data:", { name: data.name, club_id: clubId, rugby_type: data.rugby_type });
      const { error, data: result } = await supabase
        .from("categories")
        .insert({ name: data.name, club_id: clubId, rugby_type: data.rugby_type });
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
      setRugbyType("XV");
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

    addCategory.mutate({ name: result.data.name, rugby_type: rugbyType });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                placeholder="Ex: M14, Gaudermen, Alamercery"
                required
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Type de rugby</Label>
              <RadioGroup value={rugbyType} onValueChange={(value: "XV" | "7" | "academie") => setRugbyType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="XV" id="rugby-xv" />
                  <Label htmlFor="rugby-xv" className="cursor-pointer font-normal">Rugby à XV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="7" id="rugby-7" />
                  <Label htmlFor="rugby-7" className="cursor-pointer font-normal">Rugby à 7</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="academie" id="rugby-academie" />
                  <Label htmlFor="rugby-academie" className="cursor-pointer font-normal">Académie / Pôle Espoir</Label>
                </div>
              </RadioGroup>
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
