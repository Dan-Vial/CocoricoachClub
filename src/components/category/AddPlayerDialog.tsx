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
import { playerSchema } from "@/lib/validations";
import { ATHLETISME_DISCIPLINES, JUDO_WEIGHT_CATEGORIES, isAthletismeCategory, isJudoCategory, isIndividualSport } from "@/lib/constants/sportTypes";
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
  const [birthYear, setBirthYear] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [position, setPosition] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  // Fetch category to check sport type
  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = category?.rugby_type || "XV";
  const isAthletics = category?.rugby_type ? isAthletismeCategory(category.rugby_type) : false;
  const isJudo = category?.rugby_type ? isJudoCategory(category.rugby_type) : false;
  const needsDisciplineSelection = isAthletics || isJudo;
  const isTeamSport = !isIndividualSport(sportType);
  const positions = getPositionsForSport(sportType);

  const addPlayer = useMutation({
    mutationFn: async (data: { name: string; email?: string; birth_year?: number; birth_date?: string; discipline?: string; position?: string }) => {
      const { error } = await supabase
        .from("players")
        .insert({ 
          name: data.name, 
          category_id: categoryId,
          email: data.email || null,
          birth_year: data.birth_year,
          birth_date: data.birth_date || null,
          discipline: data.discipline || null,
          position: data.position || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Athlète ajouté avec succès");
      setPlayerName("");
      setPlayerEmail("");
      setBirthYear("");
      setBirthDate("");
      setDiscipline("");
      setPosition("");
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

    // Validate discipline for athletics
    if (isAthletics && !discipline) {
      setValidationError("Veuillez sélectionner une discipline");
      return;
    }

    // Validate weight category for judo
    if (isJudo && !discipline) {
      setValidationError("Veuillez sélectionner une catégorie de poids");
      return;
    }

    addPlayer.mutate({
      name: result.data.name,
      email: playerEmail.trim() || undefined,
      birth_year: result.data.birthYear,
      birth_date: birthDate || undefined,
      discipline: discipline || undefined,
      position: position || undefined
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
                L'email permettra de générer un lien d'accès athlète
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
              <div className="space-y-2">
                <Label htmlFor="discipline">Discipline *</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une discipline" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {ATHLETISME_DISCIPLINES.map((disc) => (
                      <SelectItem key={disc.value} value={disc.value}>
                        {disc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Le profilage et les tests seront adaptés à cette discipline
                </p>
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
              disabled={!playerName.trim() || addPlayer.isPending}
            >
              {addPlayer.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
