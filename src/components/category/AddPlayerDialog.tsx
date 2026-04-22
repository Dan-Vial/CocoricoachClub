import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { AlertTriangle, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { playerSchema } from "@/lib/validations";
import { ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES, JUDO_WEIGHT_CATEGORIES, AVIRON_ROLES, isAthletismeCategory, isJudoCategory, isIndividualSport, isSkiCategory, SKI_DISCIPLINES, getSkiDisciplinesForCategory } from "@/lib/constants/sportTypes";
import { getPositionsForSport } from "@/lib/constants/sportPositions";

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
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [specialty, setSpecialty] = useState("");
  // Multi-discipline support (athletics): list of {discipline, specialty} pairs.
  // The first pair is the "primary" — kept in sync with `discipline` / `specialty` for backward compat.
  const [disciplinePairs, setDisciplinePairs] = useState<Array<{ discipline: string; specialty: string }>>([]);
  const [draftDiscipline, setDraftDiscipline] = useState("");
  const [draftSpecialty, setDraftSpecialty] = useState("");
  const [position, setPosition] = useState("");
  const [fisRanking, setFisRanking] = useState("");
  const [fisPointsInput, setFisPointsInput] = useState("");
  const [fisObjective, setFisObjective] = useState("");
  const [fisObjectiveDate, setFisObjectiveDate] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  // Fetch category to check sport type and club_id
  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type, club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch client athlete limits
  const { data: clientLimits } = useQuery({
    queryKey: ["client-athlete-limits", category?.club_id],
    queryFn: async () => {
      if (!category?.club_id) return null;
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("client_id")
        .eq("id", category.club_id)
        .single();
      if (clubError || !club?.client_id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("max_athletes")
        .eq("id", club.client_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open && !!category?.club_id,
    staleTime: 0,
  });

  const { data: currentPlayerCount = 0 } = useQuery({
    queryKey: ["category-player-count", categoryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);
      if (error) throw error;
      return count || 0;
    },
    enabled: open,
    staleTime: 0,
  });

  const maxAthletes = clientLimits?.max_athletes ?? null;
  const isAthletesFull = maxAthletes !== null && currentPlayerCount >= maxAthletes;

  // Fetch active season for the club
  const { data: activeSeason } = useQuery({
    queryKey: ["active-season", category?.club_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("id")
        .eq("club_id", category!.club_id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!category?.club_id,
  });

  const sportType = category?.rugby_type || "XV";
  const isAthletics = category?.rugby_type ? isAthletismeCategory(category.rugby_type) : false;
  const isJudo = category?.rugby_type ? isJudoCategory(category.rugby_type) : false;
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isSki = category?.rugby_type ? isSkiCategory(category.rugby_type) : false;
  const needsDisciplineSelection = isAthletics || isJudo;
  const isTeamSport = !isIndividualSport(sportType);
  const positions = getPositionsForSport(sportType);

  // Available specialties for the *draft* discipline being added (athletics multi-discipline)
  const availableSpecialties =
    draftDiscipline && isAthletics ? ATHLETISME_SPECIALTIES[draftDiscipline] || [] : [];

  const addDisciplinePair = () => {
    if (!draftDiscipline) return;
    const needsSpec = (ATHLETISME_SPECIALTIES[draftDiscipline] || []).length > 0;
    if (needsSpec && !draftSpecialty) return;
    const exists = disciplinePairs.some(
      (p) => p.discipline === draftDiscipline && p.specialty === (draftSpecialty || ""),
    );
    if (exists) return;
    setDisciplinePairs([
      ...disciplinePairs,
      { discipline: draftDiscipline, specialty: draftSpecialty || "" },
    ]);
    setDraftDiscipline("");
    setDraftSpecialty("");
  };

  const removeDisciplinePair = (index: number) => {
    setDisciplinePairs(disciplinePairs.filter((_, i) => i !== index));
  };

  const addPlayer = useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string;
      phone?: string;
      birth_year?: number;
      birth_date?: string;
      discipline?: string;
      specialty?: string;
      disciplines?: string[];
      specialties?: string[];
      position?: string;
      fis_ranking?: number;
      fis_points?: number;
      fis_objective?: string;
      fis_objective_date?: string;
    }) => {
      const { error } = await supabase
        .from("players")
        .insert({
          name: data.name,
          category_id: categoryId,
          email: data.email || null,
          phone: data.phone || null,
          birth_year: data.birth_year,
          birth_date: data.birth_date || null,
          discipline: data.discipline || null,
          specialty: data.specialty || null,
          disciplines: data.disciplines && data.disciplines.length > 0 ? data.disciplines : null,
          specialties: data.specialties && data.specialties.length > 0 ? data.specialties : null,
          position: data.position || null,
          season_id: activeSeason?.id || null,
          fis_ranking: data.fis_ranking || null,
          fis_points: data.fis_points || null,
          fis_objective: data.fis_objective || null,
          fis_objective_date: data.fis_objective_date || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Athlète ajouté avec succès");
      setPlayerName("");
      setPlayerEmail("");
      setPlayerPhone("");
      setBirthYear("");
      setBirthDate("");
      setDiscipline("");
      setSpecialty("");
      setDisciplinePairs([]);
      setDraftDiscipline("");
      setDraftSpecialty("");
      setPosition("");
      setFisRanking("");
      setFisPointsInput("");
      setFisObjective("");
      setFisObjectiveDate("");
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

    // Validate discipline(s) for athletics — multi-discipline supported
    if (isAthletics && disciplinePairs.length === 0) {
      setValidationError(
        "Ajoutez au moins une discipline (clique sur + après ton choix de discipline/spécialité)",
      );
      return;
    }

    // Validate weight category for judo
    if (isJudo && !discipline) {
      setValidationError("Veuillez sélectionner une catégorie de poids");
      return;
    }

    // Validate role for aviron
    if (isAviron && !position) {
      setValidationError("Veuillez sélectionner un rôle");
      return;
    }

    // Athletics: derive primary discipline/specialty from the first pair, send full lists too.
    const primaryDiscipline = isAthletics
      ? disciplinePairs[0]?.discipline || ""
      : discipline;
    const primarySpecialty = isAthletics
      ? disciplinePairs[0]?.specialty || ""
      : specialty;
    const disciplineList = isAthletics ? disciplinePairs.map((p) => p.discipline) : undefined;
    const specialtyList = isAthletics ? disciplinePairs.map((p) => p.specialty || "") : undefined;

    addPlayer.mutate({
      name: result.data.name,
      email: playerEmail.trim() || undefined,
      phone: playerPhone.trim() || undefined,
      birth_year: result.data.birthYear,
      birth_date: birthDate || undefined,
      discipline: primaryDiscipline || undefined,
      specialty: primarySpecialty || undefined,
      disciplines: disciplineList,
      specialties: specialtyList,
      position: position || undefined,
      fis_ranking: fisRanking ? parseInt(fisRanking) : undefined,
      fis_points: fisPointsInput ? parseFloat(fisPointsInput) : undefined,
      fis_objective: fisObjective.trim() || undefined,
      fis_objective_date: fisObjectiveDate || undefined,
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
            {isAthletesFull && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limite d'athlètes atteinte ({currentPlayerCount}/{maxAthletes}). Retirez un athlète existant avant d'en ajouter un nouveau.
                </AlertDescription>
              </Alert>
            )}

            {maxAthletes !== null && !isAthletesFull && (
              <p className="text-xs text-muted-foreground">
                Athlètes : {currentPlayerCount}/{maxAthletes} dans cette catégorie
              </p>
            )}
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
              <Label htmlFor="playerEmail">Email (optionnel)</Label>
              <Input
                id="playerEmail"
                type="email"
                value={playerEmail}
                onChange={(e) => setPlayerEmail(e.target.value)}
                placeholder="athlete@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Pour envoyer des notifications par email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerPhone">Téléphone (optionnel)</Label>
              <Input
                id="playerPhone"
                type="tel"
                value={playerPhone}
                onChange={(e) => setPlayerPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
              <p className="text-xs text-muted-foreground">
                Pour envoyer des notifications par SMS
              </p>
            </div>

            {/* Position selector for team sports */}
            {isTeamSport && positions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="position">Poste (optionnel)</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.id}. {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAthletics && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                <Label className="text-sm font-medium">Disciplines pratiquées *</Label>
                <p className="text-xs text-muted-foreground">
                  Un athlète peut pratiquer plusieurs disciplines (ex. sprint + saut). La 1ʳᵉ ajoutée est la discipline principale.
                </p>

                {/* Existing pairs */}
                {disciplinePairs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {disciplinePairs.map((pair, i) => {
                      const discLabel =
                        ATHLETISME_DISCIPLINES.find((d) => d.value === pair.discipline)?.label ||
                        pair.discipline;
                      const specLabel = pair.specialty
                        ? (ATHLETISME_SPECIALTIES[pair.discipline] || []).find(
                            (s) => s.value === pair.specialty,
                          )?.label || pair.specialty
                        : null;
                      return (
                        <Badge
                          key={`${pair.discipline}-${pair.specialty}-${i}`}
                          variant={i === 0 ? "default" : "secondary"}
                          className="gap-1.5 pr-1"
                        >
                          <span>
                            {discLabel}
                            {specLabel ? ` · ${specLabel}` : ""}
                            {i === 0 ? " (principale)" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDisciplinePair(i)}
                            className="ml-1 rounded-sm hover:bg-foreground/10 p-0.5"
                            aria-label="Retirer cette discipline"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Draft adder row */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Select
                    value={draftDiscipline}
                    onValueChange={(val) => {
                      setDraftDiscipline(val);
                      setDraftSpecialty("");
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Discipline" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {ATHLETISME_DISCIPLINES.map((disc) => (
                        <SelectItem key={disc.value} value={disc.value}>
                          {disc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {availableSpecialties.length > 0 && (
                    <Select value={draftSpecialty} onValueChange={setDraftSpecialty}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Spécialité" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {availableSpecialties.map((spec) => (
                          <SelectItem key={spec.value} value={spec.value}>
                            {spec.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addDisciplinePair}
                    disabled={
                      !draftDiscipline ||
                      (availableSpecialties.length > 0 && !draftSpecialty)
                    }
                    aria-label="Ajouter cette discipline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {isJudo && (
              <div className="space-y-2">
                <Label htmlFor="weightCategory">Catégorie de poids *</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {JUDO_WEIGHT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Les athlètes pourront être comparés par catégorie de poids
                </p>
              </div>
            )}

            {isAviron && (
              <div className="space-y-2">
                <Label htmlFor="avironRole">Rôle *</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {AVIRON_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Le rôle dans l'embarcation
                </p>
              </div>
            )}

            {/* Ski/Snow discipline selector - filtered */}
            {isSki && (() => {
              const filteredDisciplines = getSkiDisciplinesForCategory(category?.rugby_type || "");
              return filteredDisciplines.length > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="skiDiscipline">Discipline</Label>
                  <Select value={discipline} onValueChange={setDiscipline}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Sélectionner une discipline" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50 max-h-[300px]">
                      {filteredDisciplines.map((disc) => (
                        <SelectItem key={disc.value} value={disc.value}>
                          {disc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null;
            })()}

            {/* FIS fields for ski/snow */}
            {isSki && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fisRanking">Classement FIS</Label>
                    <Input
                      id="fisRanking"
                      type="number"
                      value={fisRanking}
                      onChange={(e) => setFisRanking(e.target.value)}
                      placeholder="Ex: 45"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fisPoints">Points FIS</Label>
                    <Input
                      id="fisPoints"
                      type="number"
                      value={fisPointsInput}
                      onChange={(e) => setFisPointsInput(e.target.value)}
                      placeholder="Ex: 320.50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fisObjective">Objectif sportif</Label>
                  <Input
                    id="fisObjective"
                    value={fisObjective}
                    onChange={(e) => setFisObjective(e.target.value)}
                    placeholder="Ex: Qualification Championnats du Monde"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fisObjectiveDate">Date cible objectif</Label>
                  <Input
                    id="fisObjectiveDate"
                    type="date"
                    value={fisObjectiveDate}
                    onChange={(e) => setFisObjectiveDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Échéance pour atteindre l'objectif FIS
                  </p>
                </div>
              </>
            )}

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
              disabled={!playerName.trim() || addPlayer.isPending || isAthletesFull}
            >
              {addPlayer.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
