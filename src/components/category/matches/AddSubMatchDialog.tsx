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

interface AddSubMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentMatch: {
    id: string;
    category_id: string;
    competition: string | null;
    match_format?: string | null;
  };
}

const COMPETITION_STAGES = [
  { value: "poules_1", label: "Phase de poules - Match 1" },
  { value: "poules_2", label: "Phase de poules - Match 2" },
  { value: "poules_3", label: "Phase de poules - Match 3" },
  { value: "trente_deuxiemes", label: "32èmes de finale" },
  { value: "seiziemes", label: "Seizièmes de finale" },
  { value: "huitiemes", label: "Huitièmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "petite_finale", label: "Petite finale / 3ème place" },
  { value: "finale", label: "Finale" },
  { value: "classement_5", label: "Match de classement (5ème-8ème)" },
  { value: "classement_9", label: "Match de classement (9ème-12ème)" },
  { value: "classement_13", label: "Match de classement (13ème-16ème)" },
];

export function AddSubMatchDialog({
  open,
  onOpenChange,
  parentMatch,
}: AddSubMatchDialogProps) {
  const [opponent, setOpponent] = useState("");
  const [competitionStage, setCompetitionStage] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [location, setLocation] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState("");
  
  const queryClient = useQueryClient();

  const addSubMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").insert({
        category_id: parentMatch.category_id,
        parent_match_id: parentMatch.id,
        opponent: opponent,
        competition: parentMatch.competition,
        competition_stage: competitionStage || null,
        match_date: matchDate,
        match_time: matchTime || null,
        location: location || null,
        is_home: isHome,
        notes: notes || null,
        match_format: parentMatch.match_format || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", parentMatch.category_id] });
      queryClient.invalidateQueries({ queryKey: ["sub_matches", parentMatch.id] });
      toast.success("Match ajouté à la compétition");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du match");
    },
  });

  const resetForm = () => {
    setOpponent("");
    setCompetitionStage("");
    setMatchDate("");
    setMatchTime("");
    setLocation("");
    setIsHome(true);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchDate || !opponent) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    addSubMatch.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ajouter un match - {parentMatch.competition || "Compétition"}
          </DialogTitle>
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
            <Label htmlFor="competitionStage">Phase de compétition</Label>
            <Select value={competitionStage} onValueChange={setCompetitionStage}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une phase" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {COMPETITION_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
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
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addSubMatch.isPending}>
              {addSubMatch.isPending ? "Ajout..." : "Ajouter le match"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
