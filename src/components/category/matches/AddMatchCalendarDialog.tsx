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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getCompetitionsBySport } from "@/lib/constants/competitions";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface AddMatchCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
}

const CUSTOM_COMPETITION_VALUE = "__custom__";

export function AddMatchCalendarDialog({
  open,
  onOpenChange,
  categoryId,
  sportType = "XV",
}: AddMatchCalendarDialogProps) {
  const competitions = getCompetitionsBySport(sportType);
  const isIndividual = isIndividualSport(sportType);
  
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [customCompetition, setCustomCompetition] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [location, setLocation] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const isCustomSelected = competition === CUSTOM_COMPETITION_VALUE;
  const finalCompetition = isCustomSelected ? customCompetition : competition;

  const addMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").insert({
        category_id: categoryId,
        opponent: isIndividual ? (opponent || "Compétition") : opponent,
        competition: finalCompetition || null,
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
      toast.success(isIndividual ? "Compétition ajoutée avec succès" : "Match ajouté avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isIndividual ? "Erreur lors de l'ajout de la compétition" : "Erreur lors de l'ajout du match");
    },
  });

  const resetForm = () => {
    setOpponent("");
    setCompetition("");
    setCustomCompetition("");
    setMatchDate("");
    setMatchTime("");
    setLocation("");
    setIsHome(true);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchDate) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    // For individual sports, opponent is optional
    if (!isIndividual && !opponent) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    // If custom is selected, require the custom field
    if (isCustomSelected && !customCompetition.trim()) {
      toast.error("Veuillez saisir le nom de la compétition");
      return;
    }
    addMatch.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isIndividual ? "Ajouter une compétition" : "Ajouter un match"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isIndividual && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="competition">
              {isIndividual ? "Type de compétition *" : "Championnat"}
            </Label>
            <Select value={competition} onValueChange={setCompetition}>
              <SelectTrigger>
                <SelectValue placeholder={isIndividual ? "Sélectionner une compétition" : "Sélectionner un championnat"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {competitions.map((category) => (
                  <SelectGroup key={category.label}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground">
                      {category.label}
                    </SelectLabel>
                    {category.options.map((comp) => (
                      <SelectItem key={comp} value={comp}>
                        {comp}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground">
                    Personnalisé
                  </SelectLabel>
                  <SelectItem value={CUSTOM_COMPETITION_VALUE}>
                    ✏️ Autre (saisie libre)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {isCustomSelected && (
            <div className="space-y-2">
              <Label htmlFor="customCompetition">Nom de la compétition *</Label>
              <Input
                id="customCompetition"
                value={customCompetition}
                onChange={(e) => setCustomCompetition(e.target.value)}
                placeholder="Saisissez le nom de la compétition..."
                required
              />
            </div>
          )}

          {isIndividual && (
            <div className="space-y-2">
              <Label htmlFor="opponent">Nom de l'événement</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Ex: Tournoi de Paris, Open National..."
              />
            </div>
          )}

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
              placeholder={isIndividual ? "Salle, bowling, dojo..." : "Stade, ville..."}
            />
          </div>

          {!isIndividual && (
            <div className="flex items-center justify-between">
              <Label htmlFor="isHome">Match à domicile</Label>
              <Switch
                id="isHome"
                checked={isHome}
                onCheckedChange={setIsHome}
              />
            </div>
          )}

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
