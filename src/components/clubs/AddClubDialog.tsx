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
import { MAIN_SPORTS, MainSportCategory, SKI_CLUB_DISCIPLINES } from "@/lib/constants/sportTypes";

interface AddClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClubDialog({ open, onOpenChange }: AddClubDialogProps) {
  const [clubName, setClubName] = useState("");
  const [sport, setSport] = useState<MainSportCategory>("rugby");
  const [skiDiscipline, setSkiDiscipline] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isSkiSport = sport === "ski";

  const addClub = useMutation({
    mutationFn: async (data: { name: string; sport: string }) => {
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
      setSkiDiscipline("");
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
      // For ski sports, store the specific discipline as the sport value
      const finalSport = isSkiSport && skiDiscipline ? skiDiscipline : sport;
      addClub.mutate({ name: clubName.trim(), sport: finalSport });
    }
  };

  const handleSportChange = (value: MainSportCategory) => {
    setSport(value);
    if (value !== "ski") {
      setSkiDiscipline("");
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
              <Select value={sport} onValueChange={(value: MainSportCategory) => handleSportChange(value)}>
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
            {isSkiSport && (
              <div className="space-y-2">
                <Label>Discipline</Label>
                <Select value={skiDiscipline} onValueChange={setSkiDiscipline}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner la discipline" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {SKI_CLUB_DISCIPLINES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choisissez la discipline principale de votre structure
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!clubName.trim() || (isSkiSport && !skiDiscipline) || addClub.isPending}>
              {addClub.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
