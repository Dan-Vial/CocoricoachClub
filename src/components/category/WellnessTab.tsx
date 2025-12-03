import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddWellnessDialog } from "./AddWellnessDialog";

interface WellnessTabProps {
  categoryId: string;
}

const getScoreColor = (score: number) => {
  if (score <= 2) return "bg-green-500";
  if (score <= 3) return "bg-yellow-500";
  return "bg-red-500";
};

const getScoreBadge = (score: number) => {
  if (score <= 2) return "default";
  if (score <= 3) return "secondary";
  return "destructive";
};

export function WellnessTab({ categoryId }: WellnessTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["wellness_tracking", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  const calculateWellnessScore = (entry: typeof wellnessData[0]) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Wellness & Soreness</CardTitle>
            <CardDescription>
              Suivi du bien-être et des douleurs musculaires des joueurs
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle entrée
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!wellnessData || wellnessData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune donnée wellness enregistrée.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter la première entrée
            </Button>
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
                  {wellnessData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.players?.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.sleep_quality)}>
                          {entry.sleep_quality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.sleep_duration)}>
                          {entry.sleep_duration}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.general_fatigue)}>
                          {entry.general_fatigue}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.stress_level)}>
                          {entry.stress_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.soreness_upper_body)}>
                          {entry.soreness_upper_body}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(entry.soreness_lower_body)}>
                          {entry.soreness_lower_body}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadge(parseFloat(calculateWellnessScore(entry)))}>
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

      <AddWellnessDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}
