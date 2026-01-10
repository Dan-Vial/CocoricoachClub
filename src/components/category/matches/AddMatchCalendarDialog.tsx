import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const COMPETITIONS = [
  "Tournois",
  "SCF",
  "Groupama A",
  "Groupama B",
  "Groupama C",
  "Sélection régionale",
  "Gaudermen",
  "Alamercery",
  "Crabos A",
  "Crabos B",
  "Espoirs",
  "Sélection nationale",
  "Elite 1 féminine",
  "Matchs amicaux",
  "Sevens jeunes",
];

interface AddMatchCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function AddMatchCalendarDialog({
  open,
  onOpenChange,
  categoryId,
}: AddMatchCalendarDialogProps) {
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [location, setLocation] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const addMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").insert({
        category_id: categoryId,
        opponent,
        competition: competition || null,
        match_date: matchDate,
        match_time: matchTime || null,
        location: location || null,
        is_home: isHome,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success("Match ajouté avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du match");
    },
  });

  const resetForm = () => {
    setOpponent("");
    setCompetition("");
    setMatchDate("");
    setMatchTime("");
    setLocation("");
    setIsHome(true);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent || !matchDate) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    addMatch.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opponent">Adversaire *</Label>
            <Input
              id="opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Nom de l'équipe adverse"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition">Championnat</Label>
            <Select value={competition} onValueChange={setCompetition}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un championnat" />
              </SelectTrigger>
              <SelectContent>
                {COMPETITIONS.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {comp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate">Date *</Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime">Heure</Label>
              <Input
                id="matchTime"
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Stade, ville..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isHome">Match à domicile</Label>
            <Switch
              id="isHome"
              checked={isHome}
              onCheckedChange={setIsHome}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMatch.isPending}>
              {addMatch.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
