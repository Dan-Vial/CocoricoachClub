import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Flame, 
  Beef, 
  Wheat, 
  Apple, 
  Droplets,
  Dumbbell,
  Trophy,
  BedDouble,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

interface NutritionObjectivesProps {
  categoryId: string;
  players: { id: string; name: string }[];
}

interface PlayerWithMeasurements {
  id: string;
  name: string;
  birth_year: number | null;
  latestMeasurement: {
    weight_kg: number | null;
    height_cm: number | null;
  } | null;
}

// Harris-Benedict formula for BMR calculation
function calculateBMR(weight: number, height: number, age: number, isMale: boolean): number {
  if (isMale) {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
}

// Activity multipliers for rugby players
const activityMultipliers = {
  rest: { factor: 1.4, label: "Jour de repos", icon: BedDouble, color: "text-blue-500" },
  training: { factor: 1.8, label: "Jour d'entraînement", icon: Dumbbell, color: "text-amber-500" },
  match: { factor: 2.2, label: "Jour de match", icon: Trophy, color: "text-red-500" },
};

// Macro distribution for rugby players (percentage of total calories)
const macroDistribution = {
  rest: { proteins: 0.25, carbs: 0.45, fats: 0.30 },
  training: { proteins: 0.25, carbs: 0.50, fats: 0.25 },
  match: { proteins: 0.20, carbs: 0.60, fats: 0.20 },
};

// Protein per kg of body weight recommendations
const proteinPerKg = {
  rest: 1.6,
  training: 1.8,
  match: 2.0,
};

export function NutritionObjectives({ categoryId, players }: NutritionObjectivesProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");

  // Fetch category gender
  const { data: category } = useQuery({
    queryKey: ["category-gender", categoryId],
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

  // Fetch players with birth year
  const { data: playersWithDetails = [] } = useQuery({
    queryKey: ["players-details", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, birth_year")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest measurements for selected player
  const { data: latestMeasurement } = useQuery({
    queryKey: ["player-measurement", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId || selectedPlayerId === "none") return null;
      const { data, error } = await supabase
        .from("player_measurements")
        .select("weight_kg, height_cm")
        .eq("player_id", selectedPlayerId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: selectedPlayerId !== "none",
  });

  const selectedPlayer = playersWithDetails.find(p => p.id === selectedPlayerId);
  const isMale = category?.gender !== "feminine";
  
  // Calculate age
  const currentYear = new Date().getFullYear();
  const age = selectedPlayer?.birth_year ? currentYear - selectedPlayer.birth_year : null;
  
  const weight = latestMeasurement?.weight_kg;
  const height = latestMeasurement?.height_cm;

  // Calculate BMR and daily needs
  const canCalculate = weight && height && age;
  const bmr = canCalculate ? calculateBMR(weight, height, age, isMale) : null;

  const calculateDailyNeeds = (dayType: "rest" | "training" | "match") => {
    if (!bmr || !weight) return null;
    
    const multiplier = activityMultipliers[dayType].factor;
    const totalCalories = Math.round(bmr * multiplier);
    
    // Calculate proteins based on body weight
    const proteinsG = Math.round(weight * proteinPerKg[dayType]);
    const proteinsCalories = proteinsG * 4;
    
    // Remaining calories distributed between carbs and fats
    const remainingCalories = totalCalories - proteinsCalories;
    const distribution = macroDistribution[dayType];
    const carbsRatio = distribution.carbs / (distribution.carbs + distribution.fats);
    const fatsRatio = distribution.fats / (distribution.carbs + distribution.fats);
    
    const carbsG = Math.round((remainingCalories * carbsRatio) / 4);
    const fatsG = Math.round((remainingCalories * fatsRatio) / 9);
    
    // Water recommendation: 35ml per kg + extra for activity
    const waterBase = weight * 35;
    const waterExtra = dayType === "match" ? 1500 : dayType === "training" ? 1000 : 0;
    const waterMl = Math.round(waterBase + waterExtra);

    return {
      calories: totalCalories,
      proteins: proteinsG,
      carbs: carbsG,
      fats: fatsG,
      water: waterMl,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectifs Nutritionnels Personnalisés
          </CardTitle>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner un joueur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sélectionner un joueur</SelectItem>
              {playersWithDetails.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {selectedPlayerId === "none" ? (
          <p className="text-muted-foreground text-center py-8">
            Sélectionnez un joueur pour voir ses objectifs nutritionnels personnalisés
          </p>
        ) : !canCalculate ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-amber-500" />
            <p className="font-medium mb-2">Données manquantes</p>
            <p className="text-sm text-muted-foreground mb-4">
              Pour calculer les objectifs nutritionnels, nous avons besoin de :
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {!weight && <Badge variant="outline">Poids</Badge>}
              {!height && <Badge variant="outline">Taille</Badge>}
              {!age && <Badge variant="outline">Année de naissance</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Ajoutez ces informations dans le profil du joueur (onglet Biométrie)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Player Info Summary */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Joueur</p>
                <p className="font-semibold">{selectedPlayer?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Âge</p>
                <p className="font-semibold">{age} ans</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Poids</p>
                <p className="font-semibold">{weight} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taille</p>
                <p className="font-semibold">{height} cm</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Métabolisme de base</p>
                <p className="font-semibold">{Math.round(bmr!)} kcal/jour</p>
              </div>
            </div>

            {/* Daily Needs by Activity Type */}
            <Tabs defaultValue="training" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rest" className="flex items-center gap-1">
                  <BedDouble className="h-4 w-4" />
                  <span className="hidden sm:inline">Repos</span>
                </TabsTrigger>
                <TabsTrigger value="training" className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4" />
                  <span className="hidden sm:inline">Entraînement</span>
                </TabsTrigger>
                <TabsTrigger value="match" className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">Match</span>
                </TabsTrigger>
              </TabsList>

              {(["rest", "training", "match"] as const).map((dayType) => {
                const needs = calculateDailyNeeds(dayType);
                const config = activityMultipliers[dayType];
                const Icon = config.icon;

                if (!needs) return null;

                return (
                  <TabsContent key={dayType} value={dayType} className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary">x{config.factor}</Badge>
                    </div>

                    {/* Calories Card */}
                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Flame className="h-6 w-6 text-orange-500" />
                            <span className="font-medium">Calories totales</span>
                          </div>
                          <span className="text-2xl font-bold text-orange-600">
                            {needs.calories} kcal
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Proteins */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Beef className="h-5 w-5 text-red-500" />
                            <span className="font-medium">Protéines</span>
                          </div>
                          <p className="text-2xl font-bold">{needs.proteins}g</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {proteinPerKg[dayType]}g/kg de poids corporel
                          </p>
                          <p className="text-xs text-muted-foreground">
                            = {needs.proteins * 4} kcal
                          </p>
                          <Progress 
                            value={(needs.proteins * 4 / needs.calories) * 100} 
                            className="mt-2 h-2"
                          />
                        </CardContent>
                      </Card>

                      {/* Carbs */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Wheat className="h-5 w-5 text-amber-500" />
                            <span className="font-medium">Glucides</span>
                          </div>
                          <p className="text-2xl font-bold">{needs.carbs}g</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Source d'énergie principale
                          </p>
                          <p className="text-xs text-muted-foreground">
                            = {needs.carbs * 4} kcal
                          </p>
                          <Progress 
                            value={(needs.carbs * 4 / needs.calories) * 100} 
                            className="mt-2 h-2"
                          />
                        </CardContent>
                      </Card>

                      {/* Fats */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Apple className="h-5 w-5 text-green-500" />
                            <span className="font-medium">Lipides</span>
                          </div>
                          <p className="text-2xl font-bold">{needs.fats}g</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Graisses saines
                          </p>
                          <p className="text-xs text-muted-foreground">
                            = {needs.fats * 9} kcal
                          </p>
                          <Progress 
                            value={(needs.fats * 9 / needs.calories) * 100} 
                            className="mt-2 h-2"
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Hydration */}
                    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-6 w-6 text-blue-500" />
                            <span className="font-medium">Hydratation recommandée</span>
                          </div>
                          <span className="text-2xl font-bold text-blue-600">
                            {(needs.water / 1000).toFixed(1)}L
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Soit environ {Math.ceil(needs.water / 250)} verres de 250ml
                        </p>
                      </CardContent>
                    </Card>

                    {/* Tips */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">💡 Conseils pour {config.label.toLowerCase()}</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {dayType === "rest" && (
                          <>
                            <li>• Privilégiez les protéines pour la récupération musculaire</li>
                            <li>• Réduisez légèrement les glucides</li>
                            <li>• Consommez des graisses saines (huile d'olive, noix, avocat)</li>
                          </>
                        )}
                        {dayType === "training" && (
                          <>
                            <li>• Mangez des glucides 2-3h avant l'entraînement</li>
                            <li>• Collation protéinée dans les 30min après l'effort</li>
                            <li>• Hydratez-vous régulièrement pendant l'entraînement</li>
                          </>
                        )}
                        {dayType === "match" && (
                          <>
                            <li>• Repas riche en glucides 3h avant le match</li>
                            <li>• Évitez les aliments gras et difficiles à digérer</li>
                            <li>• Récupération: glucides + protéines dans l'heure suivant le match</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
