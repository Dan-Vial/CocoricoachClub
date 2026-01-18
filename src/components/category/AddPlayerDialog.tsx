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
  const [birthDate, setBirthDate] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const addPlayer = useMutation({
    mutationFn: async (data: { name: string; birth_year?: number; birth_date?: string }) => {
      const { error } = await supabase
        .from("players")
        .insert({ 
          name: data.name, 
          category_id: categoryId,
          birth_year: data.birth_year,
          birth_date: data.birth_date || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Athlète ajouté avec succès");
      setPlayerName("");
      setBirthYear("");
      setBirthDate("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de l'athlète");
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
      birth_year: result.data.birthYear,
      birth_date: birthDate || undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel athlète</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Nom de l'athlète</Label>
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
              <Label htmlFor="birthDate">Date de naissance (optionnel)</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  // Auto-fill birth year from date
                  if (e.target.value) {
                    setBirthYear(e.target.value.split('-')[0]);
                  }
                  setValidationError("");
                }}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Pour recevoir des notifications d'anniversaire
              </p>
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
