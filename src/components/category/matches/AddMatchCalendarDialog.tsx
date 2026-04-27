import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { isIndividualSport, isBasket3x3 } from "@/lib/constants/sportTypes";
import { Info } from "lucide-react";

interface AddMatchCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
  defaultDate?: Date;
}

const CUSTOM_COMPETITION_VALUE = "__custom__";

// Aviron boat types
const AVIRON_BOAT_TYPES = [
  { value: "1x", label: "1x (Skiff)" },
  { value: "2x", label: "2x (Double)" },
  { value: "2-", label: "2- (Deux sans barreur)" },
  { value: "4x", label: "4x (Quatre de couple)" },
  { value: "4-", label: "4- (Quatre sans barreur)" },
  { value: "4+", label: "4+ (Quatre avec barreur)" },
  { value: "8+", label: "8+ (Huit)" },
];

// Aviron distances
const AVIRON_DISTANCES = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1000m" },
  { value: 1500, label: "1500m" },
  { value: 2000, label: "2000m" },
  { value: 6000, label: "6000m (Tête de rivière)" },
];

// Tennis match formats
const TENNIS_FORMATS = [
  { value: "simple", label: "Simple" },
  { value: "double", label: "Double" },
  { value: "double_mixte", label: "Double Mixte" },
];

// Age categories per sport
const AGE_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  default: [
    { value: "U15", label: "U15 (Cadet)" },
    { value: "U17", label: "U17 (Junior)" },
    { value: "U19", label: "U19" },
    { value: "U23", label: "U23 (Espoir)" },
    { value: "senior", label: "Senior" },
    { value: "master", label: "Master" },
  ],
  surf: [
    { value: "grom_u12", label: "Grom (U12)" },
    { value: "benjamin_u14", label: "Benjamin (U14)" },
    { value: "minime_u16", label: "Minime (U16)" },
    { value: "cadet_u18", label: "Cadet (U18)" },
    { value: "junior", label: "Junior" },
    { value: "espoir", label: "Espoir" },
    { value: "open", label: "Open" },
    { value: "master", label: "Master" },
    { value: "grand_master", label: "Grand Master" },
  ],
};

export function AddMatchCalendarDialog({
  open,
  onOpenChange,
  categoryId,
  sportType = "XV",
  defaultDate,
}: AddMatchCalendarDialogProps) {
  const competitions = getCompetitionsBySport(sportType);
  const isIndividual = isIndividualSport(sportType);
  const isSurf = sportType.toLowerCase().includes("surf");
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isTennis = sportType.toLowerCase().includes("tennis");
  const isPadel = sportType.toLowerCase().includes("padel");
  const is3x3 = isBasket3x3(sportType);
  const hasTournamentBracket = isPadel || isTennis;
  
  const baseSport = sportType.split('_')[0].toLowerCase();
  const ageCategories = AGE_CATEGORIES[baseSport] || AGE_CATEGORIES.default;
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [customCompetition, setCustomCompetition] = useState("");
  const [competitionStage, setCompetitionStage] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [location, setLocation] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState("");
  
  // Aviron specific fields
  const [eventType, setEventType] = useState<string>("individual");
  const [ageCategory, setAgeCategory] = useState("");
  const [distanceMeters, setDistanceMeters] = useState<number | undefined>();
  
  // Tennis specific fields
  const [matchFormat, setMatchFormat] = useState<string>("simple");
  
  // Basketball 3x3 specific format (FIBA): 'time_10min' = match 10 min OR 'first_to_21' = 1ère à 21 pts
  const [format3x3, setFormat3x3] = useState<string>("time_10min");
  
  const queryClient = useQueryClient();

  const COMPETITION_STAGES = getCompetitionStagesBySport(sportType || "XV");

  const isCustomSelected = competition === CUSTOM_COMPETITION_VALUE;
  const finalCompetition = isCustomSelected ? customCompetition : competition;

  const addMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").insert({
        category_id: categoryId,
        opponent: isIndividual ? (opponent || (hasTournamentBracket ? "Tournoi" : "Compétition")) : opponent,
        competition: finalCompetition || null,
        competition_stage: competitionStage === "none" ? null : (competitionStage || null),
        match_date: matchDate,
        end_date: endDate || null,
        match_time: matchTime || null,
        location: location || null,
        is_home: isHome,
        notes: notes || null,
        // Aviron specific fields
        event_type: isAviron ? eventType : (isIndividual ? "individual" : "team"),
        age_category: ageCategory || null,
        distance_meters: distanceMeters || null,
        // Tennis/Padel/3x3 specific
        match_format: isPadel
          ? "double"
          : isTennis
          ? matchFormat
          : is3x3
          ? format3x3
          : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success(hasTournamentBracket ? "Tournoi ajouté avec succès" : (isIndividual ? "Compétition ajoutée avec succès" : "Match ajouté avec succès"));
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isIndividual ? "Erreur lors de l'ajout de la compétition" : "Erreur lors de l'ajout du match");
    },
  });

  // Initialize date when dialog opens with defaultDate
  useEffect(() => {
    if (open && defaultDate) {
      setMatchDate(format(defaultDate, "yyyy-MM-dd"));
    }
  }, [open, defaultDate]);

  const resetForm = () => {
    setOpponent("");
    setCompetition("");
    setCustomCompetition("");
    setCompetitionStage("");
    setMatchDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : "");
    setEndDate("");
    setMatchTime("");
    setLocation("");
    setIsHome(true);
    setNotes("");
    setEventType("individual");
    setAgeCategory("");
    setDistanceMeters(undefined);
    setMatchFormat("simple");
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {hasTournamentBracket ? "Ajouter un tournoi" : (isIndividual ? "Ajouter une compétition" : "Ajouter un match")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tennis specific: Match format */}
          {isTennis && (
            <div className="space-y-2">
              <Label>Format de jeu *</Label>
              <div className="flex gap-4 flex-wrap">
                {TENNIS_FORMATS.map((fmt) => (
                  <label key={fmt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="matchFormat"
                      value={fmt.value}
                      checked={matchFormat === fmt.value}
                      onChange={(e) => setMatchFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>{fmt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Aviron specific: Event type (Individual/Team) */}
          {isAviron && (
            <div className="space-y-2">
              <Label>Type d'épreuve *</Label>
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

          {/* Age category (for Aviron and other individual sports) */}
          {isIndividual && (
            <div className="space-y-2">
              <Label>Catégorie d'âge</Label>
              <Select value={ageCategory} onValueChange={setAgeCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {ageCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Aviron: Distance */}
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

          {/* Phase finale dropdown — masqué pour les sports individuels (saisi par épreuve/tour) */}
          {!isIndividual && (
            <div className="space-y-2">
              <Label htmlFor="competitionStage">Phase de compétition</Label>
              <Select value={competitionStage} onValueChange={setCompetitionStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une phase (optionnel)" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {COMPETITION_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value || "none"}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isIndividual && (
            <div className="space-y-2">
              <Label htmlFor="opponent">{hasTournamentBracket ? "Nom du tournoi" : "Nom de l'événement"}</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder={hasTournamentBracket ? "Ex: Open de France, Tournoi du Club..." : (isSurf ? "Ex: Lacanau Pro, Biarritz Surf Festival..." : "Ex: Tournoi de Paris, Régates Nationales...")}
              />
            </div>
          )}

          <div className={`grid ${isIndividual ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="matchDate">{isIndividual ? "Date début *" : "Date *"}</Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
              />
            </div>
            {isIndividual && (
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
            )}
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
              placeholder={isAviron ? "Plan d'eau, bassin..." : isSurf ? "Spot, plage..." : isIndividual ? "Salle, bowling, dojo..." : "Stade, ville..."}
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
