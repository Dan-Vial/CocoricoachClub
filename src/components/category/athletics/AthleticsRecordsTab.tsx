import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { AthleticsMinimasManager } from "./AthleticsMinimasManager";
import { AthleticsMinimasMatrix } from "./AthleticsMinimasMatrix";
import { AthleticsRecordsManager } from "./AthleticsRecordsManager";
import { SeasonClosureDialog } from "./SeasonClosureDialog";
import { SeasonHistorySelector } from "./SeasonHistorySelector";

interface Props {
  categoryId: string;
}

/**
 * Sub-tab "Minimas / Records" dans Compétition pour l'athlétisme.
 * - Sélecteur de saison global (consulter l'historique)
 * - Bouton "Clôturer la saison" (validation + archivage)
 * - Matrice croisée Athlètes × Minimas (delta auto)
 * - Gestion des minimas fédéraux
 * - Gestion des records personnels
 */
export function AthleticsRecordsTab({ categoryId }: Props) {
  const [closureOpen, setClosureOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  const { data: category } = useQuery({
    queryKey: ["category_club_for_closure", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("club_id")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      {/* Barre d'outils saison */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Saison
          </span>
          {category?.club_id && (
            <SeasonHistorySelector
              clubId={category.club_id}
              categoryId={categoryId}
              value={selectedSeasonId}
              onChange={setSelectedSeasonId}
            />
          )}
          {selectedSeasonId && (
            <span className="text-[10px] text-muted-foreground italic">
              Mode consultation historique
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setClosureOpen(true)}
        >
          <Lock className="h-4 w-4" />
          Clôturer la saison
        </Button>
      </div>

      <AthleticsMinimasMatrix categoryId={categoryId} />
      <AthleticsMinimasManager categoryId={categoryId} />
      <AthleticsRecordsManager categoryId={categoryId} />

      {category?.club_id && (
        <SeasonClosureDialog
          open={closureOpen}
          onOpenChange={setClosureOpen}
          categoryId={categoryId}
          clubId={category.club_id}
        />
      )}
    </div>
  );
}
