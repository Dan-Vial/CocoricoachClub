import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Satellite, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddAwcrDialog } from "./AddAwcrDialog";

interface AwcrTabProps {
  categoryId: string;
}

export function AwcrTab({ categoryId }: AwcrTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: awcrData, isLoading } = useQuery({
    queryKey: ["awcr_tracking", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Check if GPS data exists for this category
  const { data: gpsCount } = useQuery({
    queryKey: ["gps-sessions-count", categoryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("gps_sessions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);
      if (error) throw error;
      return count || 0;
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Suivi AWCR</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Acute:Chronic Workload Ratio - Suivi de la charge d'entraînement
            </p>
            {gpsCount && gpsCount > 0 ? (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Satellite className="h-3 w-3" />
                {gpsCount} sessions GPS disponibles
              </Badge>
            ) : (
              <Badge variant="outline" className="mt-2 gap-1">
                <ClipboardList className="h-3 w-3" />
                Mode RPE manuel
              </Badge>
            )}
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une entrée
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {awcrData && awcrData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucune donnée AWCR enregistrée</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter la première entrée
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>RPE</TableHead>
                  <TableHead>Durée (min)</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Charge Aiguë</TableHead>
                  <TableHead>Charge Chronique</TableHead>
                  <TableHead>AWCR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awcrData?.map((entry) => (
                  <TableRow key={entry.id} className="animate-fade-in">
                    <TableCell className="font-medium">{entry.players?.name}</TableCell>
                    <TableCell>
                      {new Date(entry.session_date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <ClipboardList className="h-3 w-3 mr-1" />
                        RPE
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.rpe}/10</TableCell>
                    <TableCell>{entry.duration_minutes}</TableCell>
                    <TableCell className="font-semibold">{entry.training_load}</TableCell>
                    <TableCell>{entry.acute_load?.toFixed(1) || "-"}</TableCell>
                    <TableCell>{entry.chronic_load?.toFixed(1) || "-"}</TableCell>
                    <TableCell>
                      {entry.awcr && (
                        <span
                          className={`font-semibold ${
                            entry.awcr < 0.8 || entry.awcr > 1.3
                              ? "text-destructive"
                              : entry.awcr >= 0.8 && entry.awcr <= 1.3
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {entry.awcr.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Zone sûre AWCR:</strong> 0.8 - 1.3 | <strong className="text-destructive">&lt; 0.8:</strong> Risque de désentraînement | <strong className="text-destructive">&gt; 1.3:</strong> Risque de blessure
              </p>
              {gpsCount === 0 && (
                <p className="text-xs text-muted-foreground">
                  💡 Importez des données GPS (Catapult/STATSports) dans l'onglet Performance → GPS pour un calcul plus précis basé sur le Player Load.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <AddAwcrDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}
