import { useState, useEffect } from "react";
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
import { getCompetitionsBySport, getCompetitionStagesBySport } from "@/lib/constants/competitions";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface Match {
  id: string;
  opponent: string;
  match_date: string;
  end_date?: string | null;
  match_time: string | null;
  location: string | null;
  is_home: boolean;
  notes: string | null;
  category_id: string;
  competition: string | null;
  competition_stage: string | null;
  event_type?: string | null;
  age_category?: string | null;
  distance_meters?: number | null;
  is_finalized?: boolean;
}

interface EditMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match;
  sportType?: string;
}

const CUSTOM_COMPETITION_VALUE = "__custom__";

const AGE_CATEGORIES = [
  { value: "U15", label: "U15 (Cadet)" },
  { value: "U17", label: "U17 (Junior)" },
  { value: "U19", label: "U19" },
  { value: "U23", label: "U23 (Espoir)" },
  { value: "senior", label: "Senior" },
  { value: "master", label: "Master" },
];

const AVIRON_DISTANCES = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1000m" },
  { value: 1500, label: "1500m" },
  { value: 2000, label: "2000m" },
  { value: 6000, label: "6000m (Tête de rivière)" },
];

const getStagesForSport = (sport: string) => getCompetitionStagesBySport(sport);

export function EditMatchDialog({
  open,
  onOpenChange,
  match,
  sportType = "XV",
}: EditMatchDialogProps) {
  const competitions = getCompetitionsBySport(sportType);
  const isIndividual = isIndividualSport(sportType);
  const isAviron = sportType.toLowerCase().includes("aviron");
  
  const [opponent, setOpponent] = useState(match.opponent || "");
  const [competition, setCompetition] = useState("");
  const [customCompetition, setCustomCompetition] = useState("");
  const [competitionStage, setCompetitionStage] = useState(match.competition_stage || "");
  const [matchDate, setMatchDate] = useState(match.match_date || "");
  const [endDate, setEndDate] = useState(match.end_date || "");
  const [matchTime, setMatchTime] = useState(match.match_time?.slice(0, 5) || "");
  const [location, setLocation] = useState(match.location || "");
  const [isHome, setIsHome] = useState(match.is_home);
  const [notes, setNotes] = useState(match.notes || "");
  const [eventType, setEventType] = useState<string>(match.event_type || "individual");
  const [ageCategory, setAgeCategory] = useState(match.age_category || "");
  const [distanceMeters, setDistanceMeters] = useState<number | undefined>(match.distance_meters || undefined);
  
  const queryClient = useQueryClient();

  // Initialize competition value
  useEffect(() => {
    if (match.competition) {
      // Check if it's in the predefined list
      const allCompetitions = competitions.flatMap(c => c.options);
      if (allCompetitions.includes(match.competition)) {
        setCompetition(match.competition);
      } else {
        setCompetition(CUSTOM_COMPETITION_VALUE);
        setCustomCompetition(match.competition);
      }
    }
  }, [match.competition, competitions]);

  const isCustomSelected = competition === CUSTOM_COMPETITION_VALUE;
  const finalCompetition = isCustomSelected ? customCompetition : competition;

  const updateMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("matches")
        .update({
          opponent: isIndividual ? (opponent || "Compétition") : opponent,
          competition: finalCompetition || null,
          competition_stage: competitionStage === "none" ? null : (competitionStage || null),
          match_date: matchDate,
          end_date: endDate || null,
          match_time: matchTime || null,
          location: location || null,
          is_home: isHome,
          notes: notes || null,
          event_type: isAviron ? eventType : (isIndividual ? "individual" : "team"),
          age_category: ageCategory || null,
          distance_meters: distanceMeters || null,
        })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", match.category_id] });
      toast.success(isIndividual ? "Compétition mise à jour" : "Match mis à jour");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchDate) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (!isIndividual && !opponent) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (isCustomSelected && !customCompetition.trim()) {
      toast.error("Veuillez saisir le nom de la compétition");
      return;
    }
    updateMatch.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isIndividual ? "Modifier la compétition" : "Modifier le match"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAviron && (
            <div className="space-y-2">
              <Label>Type d'épreuve</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="eventType"
                    value="individual"
                    checked={eventType === "individual"}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>Individuel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="eventType"
                    value="team"
                    checked={eventType === "team"}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>Équipage</span>
                </label>
              </div>
            </div>
          )}

          {isIndividual && (
            <div className="space-y-2">
              <Label>Catégorie d'âge</Label>
              <Select value={ageCategory} onValueChange={setAgeCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAviron && (
            <div className="space-y-2">
              <Label>Distance</Label>
              <Select 
                value={distanceMeters?.toString() || ""} 
                onValueChange={(v) => setDistanceMeters(v ? parseInt(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une distance" />
                </SelectTrigger>
                <SelectContent>
                  {AVIRON_DISTANCES.map((dist) => (
                    <SelectItem key={dist.value} value={dist.value.toString()}>
                      {dist.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              {isIndividual ? "Type de compétition" : "Championnat"}
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

          <div className="space-y-2">
            <Label htmlFor="competitionStage">Phase de compétition</Label>
            <Select value={competitionStage} onValueChange={setCompetitionStage}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une phase (optionnel)" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {getStagesForSport(sportType).map((stage) => (
                  <SelectItem key={stage.value} value={stage.value || "none"}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isIndividual && (
            <div className="space-y-2">
              <Label htmlFor="opponent">Nom de l'événement</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Ex: Tournoi de Paris, Régates Nationales..."
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate">Date début *</Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={matchDate}
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
              placeholder={isAviron ? "Plan d'eau, bassin..." : isIndividual ? "Salle, bowling, dojo..." : "Stade, ville..."}
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
            <Button type="submit" disabled={updateMatch.isPending}>
              {updateMatch.isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
