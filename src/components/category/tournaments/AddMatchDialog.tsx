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
import { Textarea } from "@/components/ui/textarea";
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

interface AddMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  nextMatchOrder: number;
}

export function AddMatchDialog({
  open,
  onOpenChange,
  tournamentId,
  nextMatchOrder,
}: AddMatchDialogProps) {
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const addMatch = useMutation({
    mutationFn: async (data: {
      opponent: string;
      competition?: string;
      match_date: string;
      match_time?: string;
      match_order: number;
      notes?: string;
    }) => {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      toast.success("Match ajouté avec succès");
      setOpponent("");
      setCompetition("");
      setMatchDate("");
      setMatchTime("");
      setNotes("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du match");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMatch.mutate({
      opponent,
      competition: competition || undefined,
      match_date: matchDate,
      match_time: matchTime || undefined,
      match_order: nextMatchOrder,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un match</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opponent">Adversaire</Label>
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
                <Label htmlFor="matchDate">Date</Label>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations sur le match..."
                rows={2}
              />
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
            <Button type="submit" disabled={addMatch.isPending}>
              {addMatch.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
