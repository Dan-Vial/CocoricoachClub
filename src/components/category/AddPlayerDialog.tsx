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
import { playerSchema } from "@/lib/validations";

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  categoryId,
}: AddPlayerDialogProps) {
  const [playerName, setPlayerName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const addPlayer = useMutation({
    mutationFn: async (data: { name: string; birth_year?: number }) => {
      const { error } = await supabase
        .from("players")
        .insert({ 
          name: data.name, 
          category_id: categoryId,
          birth_year: data.birth_year 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Joueur ajouté avec succès");
      setPlayerName("");
      setBirthYear("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du joueur");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const birthYearNum = birthYear ? parseInt(birthYear) : undefined;
    const result = playerSchema.safeParse({ 
      name: playerName,
      birthYear: birthYearNum 
    });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    addPlayer.mutate({
      name: result.data.name,
      birth_year: result.data.birthYear
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau joueur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Nom du joueur</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: Jean Dupont"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthYear">Année de naissance (optionnel)</Label>
              <Input
                id="birthYear"
                type="number"
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: 2010"
                min="1950"
                max={new Date().getFullYear()}
              />
            </div>
            
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
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
              disabled={!playerName.trim() || addPlayer.isPending}
            >
              {addPlayer.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
