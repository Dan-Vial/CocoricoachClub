import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddWellnessDialog } from "./AddWellnessDialog";
import { InjuryRiskAssessment } from "./InjuryRiskAssessment";
import { MenstrualCycleSection } from "./MenstrualCycleSection";
import { WellnessPainStats } from "./WellnessPainStats";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface WellnessTabProps {
  categoryId: string;
}

const getScoreBadgeClass = (score: number) => {
  if (score <= 2) return "bg-status-optimal/15 text-status-optimal border-status-optimal/30";
  if (score <= 3) return "bg-status-attention/15 text-status-attention border-status-attention/30";
  return "bg-status-critical/15 text-status-critical border-status-critical/30";
};

export function WellnessTab({ categoryId }: WellnessTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>(subDays(new Date(), 1));
  const { isViewer } = useViewerModeContext();

  useRealtimeSync({
    tables: ["wellness_tracking"],
    categoryId,
    queryKeys: [
      ["wellness_tracking", categoryId],
      ["wellness_decision", categoryId],
    ],
    channelName: `wellness-sync-${categoryId}`,
  });

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("gender")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isFeminine = category?.gender === "feminine";

  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["wellness_tracking", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  const calculateWellnessScore = (entry: NonNullable<typeof wellnessData>[0]) => {
    const avg = (
      entry.sleep_quality +
      entry.sleep_duration +
      entry.general_fatigue +
      entry.stress_level +
      entry.soreness_upper_body +
      entry.soreness_lower_body
    ) / 6;
    return avg.toFixed(1);
  };

  // Filter wellness data by selected date
  const filteredWellnessData = filterDate
    ? wellnessData?.filter(entry => entry.tracking_date === format(filterDate, "yyyy-MM-dd"))
    : wellnessData;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tracking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tracking">Suivi Wellness</TabsTrigger>
          <TabsTrigger value="pain-stats">Statistiques Douleurs</TabsTrigger>
          <TabsTrigger value="risk">Risque Blessure (EWMA + AWCR + Wellness)</TabsTrigger>
          {isFeminine && (
            <TabsTrigger value="menstrual">Cycle Menstruel</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Wellness & Soreness</CardTitle>
                  <CardDescription>
                    Suivi du bien-être et des douleurs musculaires des joueurs
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Date filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !filterDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDate ? format(filterDate, "dd MMM yyyy", { locale: fr }) : "Filtrer par date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={filterDate}
                        onSelect={setFilterDate}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {filterDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFilterDate(undefined)}
                      title="Effacer le filtre"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {!isViewer && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle entrée
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
        {!filteredWellnessData || filteredWellnessData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{filterDate ? `Aucune donnée wellness pour le ${format(filterDate, "dd MMMM yyyy", { locale: fr })}.` : "Aucune donnée wellness enregistrée."}</p>
            {!isViewer && !filterDate && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter la première entrée
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Sommeil Qualité</TableHead>
                    <TableHead className="text-center">Sommeil Durée</TableHead>
                    <TableHead className="text-center">Fatigue</TableHead>
                    <TableHead className="text-center">Stress</TableHead>
                    <TableHead className="text-center">Soreness Haut</TableHead>
                    <TableHead className="text-center">Soreness Bas</TableHead>
                    <TableHead className="text-center">Score Moyen</TableHead>
                    <TableHead>Douleur Spécifique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWellnessData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {[entry.players?.first_name, entry.players?.name].filter(Boolean).join(" ")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.sleep_quality)}>
                          {entry.sleep_quality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.sleep_duration)}>
                          {entry.sleep_duration}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.general_fatigue)}>
                          {entry.general_fatigue}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.stress_level)}>
                          {entry.stress_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.soreness_upper_body)}>
                          {entry.soreness_upper_body}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(entry.soreness_lower_body)}>
                          {entry.soreness_lower_body}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBadgeClass(parseFloat(calculateWellnessScore(entry)))}>
                          {calculateWellnessScore(entry)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.has_specific_pain ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{entry.pain_location || "Oui"}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Légende des scores (1-5)</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="default">1-2</Badge>
                  <span>Bon état</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">3</Badge>
                  <span>À surveiller</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">4-5</Badge>
                  <span>Attention requise</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pour Soreness: 1 = aucune gêne • 5 = douleur limitante
              </p>
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pain-stats">
        <WellnessPainStats categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="risk">
        <InjuryRiskAssessment categoryId={categoryId} />
      </TabsContent>

      {isFeminine && (
        <TabsContent value="menstrual">
          <MenstrualCycleSection categoryId={categoryId} />
        </TabsContent>
      )}
    </Tabs>

    <AddWellnessDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      categoryId={categoryId}
    />
  </div>
  );
}
