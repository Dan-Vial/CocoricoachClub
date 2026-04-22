import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Plus, Trash2, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { getCompetitionsBySport, getCompetitionStagesBySport } from "@/lib/constants/competitions";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { cn } from "@/lib/utils";

interface AddMultipleCompetitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sportType?: string;
}

const CUSTOM_COMPETITION_VALUE = "__custom__";

const AVIRON_BOAT_TYPES = [
  { value: "1x", label: "1x (Skiff)" },
  { value: "2x", label: "2x (Double)" },
  { value: "2-", label: "2- (Deux sans barreur)" },
  { value: "4x", label: "4x (Quatre de couple)" },
  { value: "4-", label: "4- (Quatre sans barreur)" },
  { value: "4+", label: "4+ (Quatre avec barreur)" },
  { value: "8+", label: "8+ (Huit)" },
];

const AVIRON_DISTANCES = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1000m" },
  { value: 1500, label: "1500m" },
  { value: 2000, label: "2000m" },
  { value: 6000, label: "6000m (Tête de rivière)" },
];

const TENNIS_FORMATS = [
  { value: "simple", label: "Simple" },
  { value: "double", label: "Double" },
  { value: "double_mixte", label: "Double Mixte" },
];

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

interface CompetitionDraft {
  uid: string;
  opponent: string;
  competition: string;
  customCompetition: string;
  competitionStage: string;
  matchDate: string;
  endDate: string;
  matchTime: string;
  location: string;
  isHome: boolean;
  notes: string;
  eventType: string;
  ageCategory: string;
  distanceMeters?: number;
  matchFormat: string;
  collapsed: boolean;
}

const newDraft = (): CompetitionDraft => ({
  uid: crypto.randomUUID(),
  opponent: "",
  competition: "",
  customCompetition: "",
  competitionStage: "",
  matchDate: "",
  endDate: "",
  matchTime: "",
  location: "",
  isHome: true,
  notes: "",
  eventType: "individual",
  ageCategory: "",
  distanceMeters: undefined,
  matchFormat: "simple",
  collapsed: false,
});

export function AddMultipleCompetitionsDialog({
  open,
  onOpenChange,
  categoryId,
  sportType = "XV",
}: AddMultipleCompetitionsDialogProps) {
  const competitions = getCompetitionsBySport(sportType);
  const isIndividual = isIndividualSport(sportType);
  const isSurf = sportType.toLowerCase().includes("surf");
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isTennis = sportType.toLowerCase().includes("tennis");
  const isPadel = sportType.toLowerCase().includes("padel");
  const hasTournamentBracket = isPadel || isTennis;

  const baseSport = sportType.split("_")[0].toLowerCase();
  const ageCategories = AGE_CATEGORIES[baseSport] || AGE_CATEGORIES.default;
  const COMPETITION_STAGES = getCompetitionStagesBySport(sportType || "XV");

  const [drafts, setDrafts] = useState<CompetitionDraft[]>([newDraft()]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setDrafts([newDraft()]);
    }
  }, [open]);

  const updateDraft = (uid: string, patch: Partial<CompetitionDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));
  };

  const removeDraft = (uid: string) => {
    setDrafts((prev) => (prev.length > 1 ? prev.filter((d) => d.uid !== uid) : prev));
  };

  const addDraft = () => {
    // Collapse previous & add a new expanded one
    setDrafts((prev) => [...prev.map((d) => ({ ...d, collapsed: true })), newDraft()]);
  };

  const wordLabel = isIndividual ? "compétition" : "match";
  const wordLabelPlural = isIndividual ? "compétitions" : "matchs";

  const validateDraft = (d: CompetitionDraft): string | null => {
    if (!d.matchDate) return "Date manquante";
    if (!isIndividual && !d.opponent.trim()) return "Adversaire manquant";
    if (d.competition === CUSTOM_COMPETITION_VALUE && !d.customCompetition.trim())
      return "Nom personnalisé requis";
    return null;
  };

  const saveAll = useMutation({
    mutationFn: async () => {
      const rows = drafts.map((d) => {
        const finalCompetition =
          d.competition === CUSTOM_COMPETITION_VALUE ? d.customCompetition : d.competition;
        return {
          category_id: categoryId,
          opponent: isIndividual
            ? d.opponent || (hasTournamentBracket ? "Tournoi" : "Compétition")
            : d.opponent,
          competition: finalCompetition || null,
          competition_stage:
            d.competitionStage === "none" ? null : d.competitionStage || null,
          match_date: d.matchDate,
          end_date: d.endDate || null,
          match_time: d.matchTime || null,
          location: d.location || null,
          is_home: d.isHome,
          notes: d.notes || null,
          event_type: isAviron ? d.eventType : isIndividual ? "individual" : "team",
          age_category: d.ageCategory || null,
          distance_meters: d.distanceMeters || null,
          match_format: isPadel ? "double" : isTennis ? d.matchFormat : null,
        };
      });

      const { error } = await supabase.from("matches").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches_annual", categoryId] });
      toast.success(`${drafts.length} ${drafts.length > 1 ? wordLabelPlural : wordLabel} ajouté${drafts.length > 1 ? "s" : ""}`);
      onOpenChange(false);
    },
    onError: () => toast.error(`Erreur lors de l'ajout des ${wordLabelPlural}`),
  });

  const handleSubmit = () => {
    for (const d of drafts) {
      const err = validateDraft(d);
      if (err) {
        toast.error(`Compétition incomplète : ${err}`);
        // Expand the offending one
        updateDraft(d.uid, { collapsed: false });
        return;
      }
    }
    saveAll.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ajouter des {wordLabelPlural}
          </DialogTitle>
          <DialogDescription>
            Ajoute plusieurs {wordLabelPlural} à la suite. Elles apparaîtront dans le calendrier de planification et dans le module Compétition & Stats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((d, idx) => {
            const isCustom = d.competition === CUSTOM_COMPETITION_VALUE;
            return (
              <div
                key={d.uid}
                className="rounded-xl border bg-muted/30 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-3 py-2 bg-card cursor-pointer"
                  onClick={() => updateDraft(d.uid, { collapsed: !d.collapsed })}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {d.opponent || (d.competition && d.competition !== CUSTOM_COMPETITION_VALUE ? d.competition : `${wordLabel.charAt(0).toUpperCase() + wordLabel.slice(1)} #${idx + 1}`)}
                      {d.matchDate && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {format(new Date(d.matchDate), "dd/MM/yyyy")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {drafts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDraft(d.uid);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                      {d.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {!d.collapsed && (
                  <div className="p-4 space-y-4 border-t">
                    {isTennis && (
                      <div className="space-y-2">
                        <Label>Format de jeu *</Label>
                        <div className="flex gap-4 flex-wrap">
                          {TENNIS_FORMATS.map((fmt) => (
                            <label key={fmt.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`matchFormat-${d.uid}`}
                                value={fmt.value}
                                checked={d.matchFormat === fmt.value}
                                onChange={(e) => updateDraft(d.uid, { matchFormat: e.target.value })}
                                className="w-4 h-4"
                              />
                              <span>{fmt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {isAviron && (
                      <div className="space-y-2">
                        <Label>Type d'épreuve *</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`eventType-${d.uid}`}
                              value="individual"
                              checked={d.eventType === "individual"}
                              onChange={(e) => updateDraft(d.uid, { eventType: e.target.value })}
                              className="w-4 h-4"
                            />
                            <span>Individuel</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`eventType-${d.uid}`}
                              value="team"
                              checked={d.eventType === "team"}
                              onChange={(e) => updateDraft(d.uid, { eventType: e.target.value })}
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
                        <Select value={d.ageCategory} onValueChange={(v) => updateDraft(d.uid, { ageCategory: v })}>
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

                    {isAviron && (
                      <div className="space-y-2">
                        <Label>Distance</Label>
                        <Select
                          value={d.distanceMeters?.toString() || ""}
                          onValueChange={(v) => updateDraft(d.uid, { distanceMeters: v ? parseInt(v) : undefined })}
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
                        <Label>Adversaire *</Label>
                        <Input
                          value={d.opponent}
                          onChange={(e) => updateDraft(d.uid, { opponent: e.target.value })}
                          placeholder="Nom de l'équipe adverse"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>{isIndividual ? "Type de compétition" : "Championnat"}</Label>
                      <Select value={d.competition} onValueChange={(v) => updateDraft(d.uid, { competition: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={isIndividual ? "Sélectionner une compétition" : "Sélectionner un championnat"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
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
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">Personnalisé</SelectLabel>
                            <SelectItem value={CUSTOM_COMPETITION_VALUE}>✏️ Autre (saisie libre)</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {isCustom && (
                      <div className="space-y-2">
                        <Label>Nom de la compétition *</Label>
                        <Input
                          value={d.customCompetition}
                          onChange={(e) => updateDraft(d.uid, { customCompetition: e.target.value })}
                          placeholder="Saisissez le nom de la compétition..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Phase de compétition</Label>
                      <Select value={d.competitionStage} onValueChange={(v) => updateDraft(d.uid, { competitionStage: v })}>
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

                    {isIndividual && (
                      <div className="space-y-2">
                        <Label>{hasTournamentBracket ? "Nom du tournoi" : "Nom de l'événement"}</Label>
                        <Input
                          value={d.opponent}
                          onChange={(e) => updateDraft(d.uid, { opponent: e.target.value })}
                          placeholder={hasTournamentBracket ? "Ex: Open de France..." : isSurf ? "Ex: Lacanau Pro..." : "Ex: Tournoi de Paris..."}
                        />
                      </div>
                    )}

                    <div className={cn("grid gap-4", isIndividual ? "grid-cols-3" : "grid-cols-2")}>
                      <div className="space-y-2">
                        <Label>{isIndividual ? "Date début *" : "Date *"}</Label>
                        <Input
                          type="date"
                          value={d.matchDate}
                          onChange={(e) => updateDraft(d.uid, { matchDate: e.target.value })}
                        />
                      </div>
                      {isIndividual && (
                        <div className="space-y-2">
                          <Label>Date fin</Label>
                          <Input
                            type="date"
                            value={d.endDate}
                            min={d.matchDate}
                            onChange={(e) => updateDraft(d.uid, { endDate: e.target.value })}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Heure</Label>
                        <Input
                          type="time"
                          value={d.matchTime}
                          onChange={(e) => updateDraft(d.uid, { matchTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Lieu</Label>
                      <Input
                        value={d.location}
                        onChange={(e) => updateDraft(d.uid, { location: e.target.value })}
                        placeholder={isAviron ? "Plan d'eau..." : isSurf ? "Spot, plage..." : isIndividual ? "Salle, bowling..." : "Stade, ville..."}
                      />
                    </div>

                    {!isIndividual && (
                      <div className="flex items-center justify-between">
                        <Label>Match à domicile</Label>
                        <Switch checked={d.isHome} onCheckedChange={(v) => updateDraft(d.uid, { isHome: v })} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={d.notes}
                        onChange={(e) => updateDraft(d.uid, { notes: e.target.value })}
                        placeholder="Informations complémentaires..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed gap-2"
            onClick={addDraft}
          >
            <Plus className="h-4 w-4" />
            Ajouter une autre {wordLabel}
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saveAll.isPending}>
            {saveAll.isPending
              ? "Enregistrement..."
              : `Enregistrer ${drafts.length} ${drafts.length > 1 ? wordLabelPlural : wordLabel}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
