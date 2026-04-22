import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import { ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES } from "@/lib/constants/sportTypes";

interface Props {
  playerId: string;
  initialDisciplines: string[] | null;
  initialSpecialties: string[] | null;
  /** Discipline principale (legacy single) — utilisée comme fallback si tableaux vides */
  primaryDiscipline: string | null;
  primarySpecialty: string | null;
}

/**
 * Éditeur multi-disciplines pour les athlètes (athlétisme uniquement).
 * Permet d'aligner un athlète sur plusieurs (discipline, spécialité), ex.
 * sprint 100m + sprint 200m + saut en longueur.
 * La 1ʳᵉ paire reste la "principale" (synchronisée avec discipline/specialty).
 */
export function AthleticsDisciplinesEditor({
  playerId,
  initialDisciplines,
  initialSpecialties,
  primaryDiscipline,
  primarySpecialty,
}: Props) {
  const queryClient = useQueryClient();

  const buildInitialPairs = () => {
    if (initialDisciplines && initialDisciplines.length > 0) {
      return initialDisciplines.map((d, i) => ({
        discipline: d,
        specialty: initialSpecialties?.[i] || "",
      }));
    }
    if (primaryDiscipline) {
      return [{ discipline: primaryDiscipline, specialty: primarySpecialty || "" }];
    }
    return [];
  };

  const [pairs, setPairs] = useState(buildInitialPairs);
  const [draftDiscipline, setDraftDiscipline] = useState("");
  const [draftSpecialty, setDraftSpecialty] = useState("");

  // Resync when underlying data changes (after save / refetch)
  useEffect(() => {
    setPairs(buildInitialPairs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDisciplines?.join("|"), initialSpecialties?.join("|"), primaryDiscipline, primarySpecialty]);

  const draftAvailableSpecialties = draftDiscipline
    ? ATHLETISME_SPECIALTIES[draftDiscipline] || []
    : [];

  const addPair = () => {
    if (!draftDiscipline) return;
    const needsSpec = (ATHLETISME_SPECIALTIES[draftDiscipline] || []).length > 0;
    if (needsSpec && !draftSpecialty) return;
    const exists = pairs.some(
      (p) => p.discipline === draftDiscipline && p.specialty === (draftSpecialty || ""),
    );
    if (exists) {
      toast.info("Cette discipline/spécialité est déjà enregistrée");
      return;
    }
    setPairs([...pairs, { discipline: draftDiscipline, specialty: draftSpecialty || "" }]);
    setDraftDiscipline("");
    setDraftSpecialty("");
  };

  const removePair = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const next = [...pairs];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setPairs(next);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (pairs.length === 0) {
        throw new Error("Ajoute au moins une discipline");
      }
      const { error } = await supabase
        .from("players")
        .update({
          discipline: pairs[0].discipline,
          specialty: pairs[0].specialty || null,
          disciplines: pairs.map((p) => p.discipline),
          specialties: pairs.map((p) => p.specialty || ""),
        } as any)
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disciplines mises à jour");
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["athletics_matrix_players"] });
      queryClient.invalidateQueries({ queryKey: ["category_players_minimal_athletics"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erreur lors de la sauvegarde");
    },
  });

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Disciplines pratiquées</Label>
          <p className="text-xs text-muted-foreground">
            Cet athlète peut s'aligner sur plusieurs disciplines/spécialités. La 1ʳᵉ est la principale.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="shrink-0"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Enregistrer
        </Button>
      </div>

      {pairs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pairs.map((pair, i) => {
            const discLabel =
              ATHLETISME_DISCIPLINES.find((d) => d.value === pair.discipline)?.label ||
              pair.discipline;
            const specLabel = pair.specialty
              ? (ATHLETISME_SPECIALTIES[pair.discipline] || []).find(
                  (s) => s.value === pair.specialty,
                )?.label || pair.specialty
              : null;
            return (
              <span
                key={`${pair.discipline}-${pair.specialty}-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  i === 0
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted text-foreground"
                }`}
              >
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    className="text-[10px] underline opacity-70 hover:opacity-100"
                    title="Définir comme discipline principale"
                  >
                    ★
                  </button>
                )}
                <span>
                  {discLabel}
                  {specLabel ? ` · ${specLabel}` : ""}
                  {i === 0 ? " (principale)" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removePair(i)}
                  className="ml-0.5 rounded-sm hover:bg-foreground/10 p-0.5"
                  aria-label="Retirer cette discipline"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

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
          <SelectContent className="bg-background border z-[200] max-h-[300px]">
            {ATHLETISME_DISCIPLINES.map((disc) => (
              <SelectItem key={disc.value} value={disc.value}>
                {disc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {draftAvailableSpecialties.length > 0 && (
          <Select value={draftSpecialty} onValueChange={setDraftSpecialty}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Spécialité" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-[200] max-h-[300px]">
              {draftAvailableSpecialties.map((spec) => (
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
          onClick={addPair}
          disabled={
            !draftDiscipline ||
            (draftAvailableSpecialties.length > 0 && !draftSpecialty)
          }
          aria-label="Ajouter cette discipline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
