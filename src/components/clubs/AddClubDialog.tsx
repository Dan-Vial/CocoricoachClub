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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { clubSchema } from "@/lib/validations";
import { z } from "zod";
import { MAIN_SPORTS, MainSportCategory } from "@/lib/constants/sportTypes";

interface AddClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClubDialog({ open, onOpenChange }: AddClubDialogProps) {
  const [clubName, setClubName] = useState("");
  const [sport, setSport] = useState<MainSportCategory>("rugby");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addClub = useMutation({
    mutationFn: async (data: { name: string; sport: MainSportCategory }) => {
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }
      
      const validatedData = clubSchema.parse({ name: data.name });
      
      const { error } = await supabase
        .from("clubs")
        .insert({ name: validatedData.name, user_id: user.id, sport: data.sport });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-clubs"] });
      toast.success("Club ajouté avec succès");
      setClubName("");
      setSport("rugby");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erreur lors de l'ajout du club");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clubName.trim()) {
      addClub.mutate({ name: clubName.trim(), sport });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau club</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clubName">Nom du club</Label>
              <Input
                id="clubName"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Ex: Colomiers Rugby"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={(value: MainSportCategory) => setSport(value)}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Sélectionner un sport" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {MAIN_SPORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!clubName.trim() || addClub.isPending}>
              {addClub.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
