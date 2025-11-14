import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Weight, Ruler, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddMeasurementDialog } from "./AddMeasurementDialog";

interface PlayerBiometricsProps {
  playerId: string;
  categoryId: string;
  birthYear?: number | null;
}

export function PlayerBiometrics({ playerId, categoryId, birthYear }: PlayerBiometricsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: measurements } = useQuery({
    queryKey: ["player_measurements", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_measurements")
        .select("*")
        .eq("player_id", playerId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestMeasurement = measurements?.[0];
  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : null;

  return (
    <>
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5" />
              Données Biométriques
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle mesure
            </Button>
          </div>
          {birthYear && (
            <p className="text-sm text-muted-foreground">
              Année de naissance: {birthYear} ({age} ans)
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {latestMeasurement ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {latestMeasurement.weight_kg && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Poids</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {latestMeasurement.weight_kg} kg
                    </p>
                  </div>
                )}
                {latestMeasurement.height_cm && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Taille</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {latestMeasurement.height_cm} cm
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Dernière mesure: {format(new Date(latestMeasurement.measurement_date), "d MMMM yyyy", { locale: fr })}
                </span>
              </div>

              {measurements && measurements.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Historique des mesures</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {measurements.slice(1, 6).map((measurement) => (
                      <div
                        key={measurement.id}
                        className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                      >
                        <span className="text-muted-foreground">
                          {format(new Date(measurement.measurement_date), "d MMM yyyy", { locale: fr })}
                        </span>
                        <div className="flex gap-4">
                          {measurement.weight_kg && (
                            <span>{measurement.weight_kg} kg</span>
                          )}
                          {measurement.height_cm && (
                            <span>{measurement.height_cm} cm</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune mesure enregistrée</p>
              <p className="text-sm mt-2">
                Cliquez sur "Nouvelle mesure" pour ajouter le poids et la taille
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddMeasurementDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        playerId={playerId}
        categoryId={categoryId}
      />
    </>
  );
}
