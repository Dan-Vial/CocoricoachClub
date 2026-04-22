import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, BarChart3, Settings2, Camera, CalendarClock, History } from "lucide-react";
import { AddMatchCalendarDialog } from "./matches/AddMatchCalendarDialog";
import { MatchCard } from "./matches/MatchCard";
import { PlayerCumulativeStats } from "./matches/PlayerCumulativeStats";
import { BowlingCumulativeStats } from "@/components/bowling/BowlingCumulativeStats";

import { CategoryPhotosTab } from "./photos/CategoryPhotosTab";
import { startOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { isIndividualSport } from "@/lib/constants/sportTypes";
import { useViewerMatches } from "@/hooks/use-viewer-data";
import { StatPreferencesDialog } from "./settings/StatPreferencesDialog";
import { useQueryClient } from "@tanstack/react-query";

interface MatchesTabProps {
  categoryId: string;
  sportType?: string;
}

export function MatchesTab({ categoryId, sportType }: MatchesTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStatPrefsOpen, setIsStatPrefsOpen] = useState(false);
  const { isViewer } = useViewerModeContext();
  const queryClient = useQueryClient();

  // Check if this is an individual sport (judo, bowling)
  const isIndividual = isIndividualSport(sportType || "");
  const isBowling = (sportType || "").toLowerCase().includes("bowling");
  
  // Labels adaptés selon le sport
  const itemLabel = isIndividual ? "compétition" : "match";
  const itemLabelPlural = isIndividual ? "compétitions" : "matchs";
  const itemLabelCapital = isIndividual ? "Compétition" : "Match";
  const itemLabelPluralCapital = isIndividual ? "Compétitions" : "Matchs";

  const { data: matches, isLoading } = useViewerMatches(categoryId);

  // Filter out sub-matches (they are displayed within their parent match)
  // Compare by calendar day so a match scheduled for "today" is considered upcoming
  const parentMatches = matches?.filter((m) => !m.parent_match_id) || [];
  const today = startOfDay(new Date());
  const upcomingMatches = parentMatches.filter(
    (m) => startOfDay(new Date(m.match_date)).getTime() >= today.getTime()
  );
  const pastMatches = parentMatches.filter(
    (m) => startOfDay(new Date(m.match_date)).getTime() < today.getTime()
  );

  // Group past matches by month (most recent first)
  const pastMatchesByMonth = (() => {
    const sorted = [...pastMatches].sort(
      (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );
    const groups = new Map<string, { label: string; matches: typeof sorted }>();
    sorted.forEach((m) => {
      const d = new Date(m.match_date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = format(d, "MMMM yyyy", { locale: fr });
      if (!groups.has(key)) groups.set(key, { label, matches: [] });
      groups.get(key)!.matches.push(m);
    });
    return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }));
  })();

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="matches" className="w-full">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="competition" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="matches" colorKey="competition" icon={<Calendar className="h-4 w-4" />}>
              Gestion
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="stats" colorKey="competition" icon={<BarChart3 className="h-4 w-4" />}>
              Stats compétition
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="photos" colorKey="competition" icon={<Camera className="h-4 w-4" />}>
              Photos
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="matches">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Gestion des {itemLabelPlural}
                </CardTitle>
                {!isViewer && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isBowling && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsStatPrefsOpen(true)}
                        className="gap-1"
                      >
                        <Settings2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Personnaliser stats</span>
                      </Button>
                    )}
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter {isIndividual ? "une" : "un"} {itemLabel}
                    </Button>
                  </div>
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
                  {/* === UPCOMING SECTION === */}
                  <section className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/15 text-primary">
                          <CalendarClock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-primary leading-tight">
                            {itemLabelPluralCapital} à venir
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Programmé{isIndividual ? "e" : ""}s prochainement
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {upcomingMatches.length}
                      </span>
                    </div>
                    {upcomingMatches.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingMatches.map((match) => (
                          <MatchCard key={match.id} match={match} categoryId={categoryId} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">
                        Aucun{isIndividual ? "e" : ""} {itemLabel} à venir
                      </p>
                    )}
                  </section>

                  {/* === PAST SECTION === */}
                  <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted text-muted-foreground">
                          <History className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground/80 leading-tight">
                            {itemLabelPluralCapital} passé{isIndividual ? "e" : ""}s
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Historique et résultats
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full bg-muted-foreground/20 text-foreground text-xs font-bold">
                        {pastMatches.length}
                      </span>
                    </div>
                    {pastMatches.length > 0 ? (
                      <div className="space-y-6">
                        {pastMatchesByMonth.map((group) => (
                          <div key={group.key}>
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground capitalize">
                                {group.label}
                              </h4>
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {group.matches.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {group.matches.map((match) => (
                                <MatchCard key={match.id} match={match} categoryId={categoryId} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">
                        Aucun{isIndividual ? "e" : ""} {itemLabel} passé{isIndividual ? "e" : ""}
                      </p>
                    )}
                  </section>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          {isBowling ? (
            <BowlingCumulativeStats categoryId={categoryId} />
          ) : (
            <PlayerCumulativeStats categoryId={categoryId} sportType={sportType} />
          )}
        </TabsContent>



        <TabsContent value="photos">
          <CategoryPhotosTab categoryId={categoryId} />
        </TabsContent>
      </Tabs>

      <AddMatchCalendarDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
        sportType={sportType || "XV"}
      />

      {!isBowling && sportType && (
        <StatPreferencesDialog
          open={isStatPrefsOpen}
          onOpenChange={setIsStatPrefsOpen}
          categoryId={categoryId}
          sportType={sportType}
        />
      )}
    </div>
  );
}
