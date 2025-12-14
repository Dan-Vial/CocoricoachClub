import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Weight, Ruler, Calendar, Scale, Dumbbell } from "lucide-react";
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

  const { data: bodyCompositions } = useQuery({
    queryKey: ["body_composition", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_composition")
        .select("*")
        .eq("player_id", playerId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestMeasurement = measurements?.[0];
  const latestComposition = bodyCompositions?.[0];
  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : null;

  // Calculate BMI from latest data
  const weight = latestComposition?.weight_kg || latestMeasurement?.weight_kg;
  const height = latestComposition?.height_cm || latestMeasurement?.height_cm;
  const bmi = weight && height ? (weight / ((height / 100) * (height / 100))).toFixed(1) : null;

  const getBmiCategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: "Insuffisance", color: "bg-blue-500/20 text-blue-400" };
    if (bmiValue < 25) return { label: "Normal", color: "bg-green-500/20 text-green-400" };
    if (bmiValue < 30) return { label: "Surpoids", color: "bg-yellow-500/20 text-yellow-400" };
    return { label: "Obésité", color: "bg-red-500/20 text-red-400" };
  };

  const getBodyFatCategory = (bf: number) => {
    if (bf < 10) return { label: "Athlète élite", color: "bg-green-500/20 text-green-400" };
    if (bf < 14) return { label: "Athlète", color: "bg-emerald-500/20 text-emerald-400" };
    if (bf < 18) return { label: "Fitness", color: "bg-yellow-500/20 text-yellow-400" };
    return { label: "Standard", color: "bg-orange-500/20 text-orange-400" };
  };

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
          {(latestMeasurement || latestComposition) ? (
            <>
              {/* Basic measurements */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {weight && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Poids</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {weight} kg
                    </p>
                  </div>
                )}
                {height && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Taille</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {height} cm
                    </p>
                  </div>
                )}
                {bmi && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">IMC</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-primary">{bmi}</p>
                      <Badge variant="outline" className={getBmiCategory(parseFloat(bmi)).color}>
                        {getBmiCategory(parseFloat(bmi)).label}
                      </Badge>
                    </div>
                  </div>
                )}
                {latestComposition?.body_fat_percentage && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">% Masse Grasse</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-primary">
                        {latestComposition.body_fat_percentage}%
                      </p>
                      <Badge variant="outline" className={getBodyFatCategory(latestComposition.body_fat_percentage).color}>
                        {getBodyFatCategory(latestComposition.body_fat_percentage).label}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Muscle mass if available */}
              {latestComposition?.muscle_mass_kg && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Masse Musculaire</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {latestComposition.muscle_mass_kg} kg
                    </p>
                    {weight && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {((latestComposition.muscle_mass_kg / weight) * 100).toFixed(1)}% du poids total
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Dernière mesure: {format(new Date(latestComposition?.measurement_date || latestMeasurement?.measurement_date), "d MMMM yyyy", { locale: fr })}
                </span>
              </div>

              {/* History */}
              {bodyCompositions && bodyCompositions.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Historique composition corporelle</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bodyCompositions.slice(1, 6).map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                      >
                        <span className="text-muted-foreground">
                          {format(new Date(comp.measurement_date), "d MMM yyyy", { locale: fr })}
                        </span>
                        <div className="flex gap-4">
                          {comp.weight_kg && <span>{comp.weight_kg} kg</span>}
                          {comp.body_fat_percentage && <span>{comp.body_fat_percentage}% MG</span>}
                          {comp.muscle_mass_kg && <span>{comp.muscle_mass_kg} kg MM</span>}
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
                Cliquez sur "Nouvelle mesure" pour ajouter les données biométriques
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
