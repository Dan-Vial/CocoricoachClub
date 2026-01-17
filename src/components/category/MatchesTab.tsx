import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, BarChart3 } from "lucide-react";
import { AddMatchCalendarDialog } from "./matches/AddMatchCalendarDialog";
import { MatchCard } from "./matches/MatchCard";
import { PlayerCumulativeStats } from "./matches/PlayerCumulativeStats";
import { isFuture, isPast } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface MatchesTabProps {
  categoryId: string;
  sportType?: string;
}

export function MatchesTab({ categoryId, sportType }: MatchesTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { isViewer } = useViewerModeContext();

  // Check if this is an individual sport (judo, bowling)
  const isIndividual = isIndividualSport(sportType || "");
  
  // Labels adaptés selon le sport
  const itemLabel = isIndividual ? "compétition" : "match";
  const itemLabelPlural = isIndividual ? "compétitions" : "matchs";
  const itemLabelCapital = isIndividual ? "Compétition" : "Match";
  const itemLabelPluralCapital = isIndividual ? "Compétitions" : "Matchs";

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const upcomingMatches = matches?.filter((m) => isFuture(new Date(m.match_date))) || [];
  const pastMatches = matches?.filter((m) => isPast(new Date(m.match_date))) || [];

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="matches" className="gap-2">
            <Calendar className="h-4 w-4" />
            {itemLabelPluralCapital}
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats cumulées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Gestion des {itemLabelPlural}
                </CardTitle>
                {!isViewer && (
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter {isIndividual ? "une" : "un"} {itemLabel}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(!matches || matches.length === 0) ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {isIndividual ? "Aucune compétition programmée" : "Aucun match programmé"} pour cette catégorie
                  </p>
                  {!isViewer && (
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Créer {isIndividual ? "la première compétition" : "le premier match"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {upcomingMatches.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">
                        {itemLabelPluralCapital} à venir ({upcomingMatches.length})
                      </h3>
                      <div className="space-y-3">
                        {upcomingMatches.map((match) => (
                          <MatchCard key={match.id} match={match} categoryId={categoryId} />
                        ))}
                      </div>
                    </div>
                  )}

                  {pastMatches.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                        {itemLabelPluralCapital} passé{isIndividual ? "e" : ""}s ({pastMatches.length})
                      </h3>
                      <div className="space-y-3">
                        {[...pastMatches].reverse().map((match) => (
                          <MatchCard key={match.id} match={match} categoryId={categoryId} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <PlayerCumulativeStats categoryId={categoryId} />
        </TabsContent>
      </Tabs>

      <AddMatchCalendarDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
        sportType={sportType || "XV"}
      />
    </div>
  );
}
