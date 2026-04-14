import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mountain, UserPlus, Calendar, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreateFisCompetitionDialog } from "./CreateFisCompetitionDialog";
import { AddFisResultDialog } from "./AddFisResultDialog";
import { getDisciplineLabel } from "@/lib/constants/skiDisciplines";

interface FisCompetitionsTabProps {
  categoryId: string;
}

const LEVEL_LABELS: Record<string, string> = {
  world_cup: "Coupe du Monde",
  continental_cup: "Coupe Continentale",
  fis: "FIS Race",
  national: "National",
};

export function FisCompetitionsTab({ categoryId }: FisCompetitionsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [resultComp, setResultComp] = useState<{
    id: string; name: string; category_id: string; race_penalty: number | null; total_participants: number | null;
  } | null>(null);

  // Fetch club sport for discipline filtering
  const { data: clubSport } = useQuery({
    queryKey: ["club-sport-for-category", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("clubs(sport)")
        .eq("id", categoryId)
        .single();
      return (data as Record<string, unknown>)?.clubs as { sport: string } | null;
    },
  });

  const { data: competitions, isLoading } = useQuery({
    queryKey: ["fis-competitions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fis_competitions")
        .select("*")
        .eq("category_id", categoryId)
        .order("competition_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: results } = useQuery({
    queryKey: ["fis-results-all", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fis_results")
        .select("*, players!fis_results_player_id_fkey(name, first_name)")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  const getResultsForComp = (compId: string) =>
    results?.filter((r) => r.competition_id === compId) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mountain className="h-5 w-5 text-primary" />
          Compétitions FIS + WSPL
        </h3>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle compétition
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !competitions?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mountain className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucune compétition FIS + WSPL enregistrée</p>
            <p className="text-xs mt-1">Créez votre première compétition pour commencer le suivi des points</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {competitions.map((comp) => {
            const compResults = getResultsForComp(comp.id);
            const compAny = comp as Record<string, unknown>;
            const racePenalty = compAny.race_penalty as number | null;

            return (
              <Card key={comp.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{comp.name}</CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(comp.competition_date), "d MMM yyyy", { locale: fr })}
                        </span>
                        {comp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {comp.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getDisciplineLabel(comp.discipline)}</Badge>
                      <Badge variant="secondary">{LEVEL_LABELS[comp.level] || comp.level}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      {comp.total_participants && (
                        <span>{comp.total_participants} participants</span>
                      )}
                      {racePenalty != null && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          Race Penalty: <span className="font-mono">{racePenalty}</span>
                        </span>
                      )}
                      {compResults.length > 0 && (
                        <Badge variant="default" className="text-[10px]">
                          {compResults.length} résultat(s)
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setResultComp({
                          id: comp.id,
                          name: comp.name,
                          category_id: comp.category_id,
                          race_penalty: racePenalty,
                          total_participants: comp.total_participants,
                        })
                      }
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Ajouter résultat
                    </Button>
                  </div>

                  {compResults.length > 0 && (
                    <div className="mt-3 border rounded-md divide-y text-sm">
                      {compResults
                        .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
                        .map((r) => {
                          const rAny = r as Record<string, unknown>;
                          const player = rAny.players as { name: string; first_name: string | null } | null;
                          const calcPts = rAny.calculated_points as number | null;
                          return (
                            <div key={r.id} className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs w-8 text-center font-bold">
                                  {r.ranking ? `${r.ranking}e` : "-"}
                                </span>
                                <span>{player ? `${player.first_name || ""} ${player.name}` : "—"}</span>
                              </div>
                              <Badge variant="secondary" className="font-mono">
                                {calcPts != null && calcPts > 0
                                  ? calcPts.toFixed(2)
                                  : r.fis_points > 0
                                    ? r.fis_points.toFixed(2)
                                    : "0"} pts
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateFisCompetitionDialog open={createOpen} onOpenChange={setCreateOpen} categoryId={categoryId} clubSport={clubSport?.sport} />
      {resultComp && (
        <AddFisResultDialog open={!!resultComp} onOpenChange={(o) => !o && setResultComp(null)} competition={resultComp} />
      )}
    </div>
  );
}
