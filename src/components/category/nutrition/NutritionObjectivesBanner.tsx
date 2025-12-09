import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
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

interface NutritionObjectivesBannerProps {
  playerId: string;
  categoryId: string;
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
  rest: { factor: 1.4, label: "Repos", icon: BedDouble, color: "bg-blue-500" },
  training: { factor: 1.8, label: "Entraînement", icon: Dumbbell, color: "bg-amber-500" },
  match: { factor: 2.2, label: "Match", icon: Trophy, color: "bg-red-500" },
};

// Protein per kg of body weight recommendations
const proteinPerKg = {
  rest: 1.6,
  training: 1.8,
  match: 2.0,
};

// Macro distribution
const macroDistribution = {
  rest: { proteins: 0.25, carbs: 0.45, fats: 0.30 },
  training: { proteins: 0.25, carbs: 0.50, fats: 0.25 },
  match: { proteins: 0.20, carbs: 0.60, fats: 0.20 },
};

export function NutritionObjectivesBanner({ playerId, categoryId }: NutritionObjectivesBannerProps) {
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

  // Fetch player info
  const { data: player } = useQuery({
    queryKey: ["player-info", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, birth_year")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch latest measurements
  const { data: latestMeasurement } = useQuery({
    queryKey: ["player-measurement", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_measurements")
        .select("weight_kg, height_cm")
        .eq("player_id", playerId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const isMale = category?.gender !== "feminine";
  const currentYear = new Date().getFullYear();
  const age = player?.birth_year ? currentYear - player.birth_year : null;
  const weight = latestMeasurement?.weight_kg;
  const height = latestMeasurement?.height_cm;

  const canCalculate = weight && height && age;
  const bmr = canCalculate ? calculateBMR(weight, height, age, isMale) : null;

  const calculateDailyNeeds = (dayType: "rest" | "training" | "match") => {
    if (!bmr || !weight) return null;
    
    const multiplier = activityMultipliers[dayType].factor;
    const totalCalories = Math.round(bmr * multiplier);
    
    const proteinsG = Math.round(weight * proteinPerKg[dayType]);
    const proteinsCalories = proteinsG * 4;
    
    const remainingCalories = totalCalories - proteinsCalories;
    const distribution = macroDistribution[dayType];
    const carbsRatio = distribution.carbs / (distribution.carbs + distribution.fats);
    const fatsRatio = distribution.fats / (distribution.carbs + distribution.fats);
    
    const carbsG = Math.round((remainingCalories * carbsRatio) / 4);
    const fatsG = Math.round((remainingCalories * fatsRatio) / 9);
    
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

  if (!canCalculate) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Données biométriques manquantes</span>
        </div>
        <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
          Ajoutez le poids, la taille et l'année de naissance du joueur pour voir ses objectifs nutritionnels.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-semibold text-lg">{player?.name}</span>
        <Badge variant="outline">{weight} kg</Badge>
        <Badge variant="outline">{height} cm</Badge>
        <Badge variant="outline">{age} ans</Badge>
        <Badge variant="secondary">MB: {Math.round(bmr!)} kcal</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["rest", "training", "match"] as const).map((dayType) => {
          const needs = calculateDailyNeeds(dayType);
          const config = activityMultipliers[dayType];
          const Icon = config.icon;

          if (!needs) return null;

          return (
            <div 
              key={dayType} 
              className="bg-background/80 rounded-lg p-3 border"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${config.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              
              <div className="grid grid-cols-5 gap-1 text-center">
                <div>
                  <div className="flex items-center justify-center">
                    <Flame className="h-3 w-3 text-orange-500" />
                  </div>
                  <p className="text-xs font-bold">{needs.calories}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <div>
                  <div className="flex items-center justify-center">
                    <Beef className="h-3 w-3 text-red-500" />
                  </div>
                  <p className="text-xs font-bold">{needs.proteins}g</p>
                  <p className="text-[10px] text-muted-foreground">Prot</p>
                </div>
                <div>
                  <div className="flex items-center justify-center">
                    <Wheat className="h-3 w-3 text-amber-500" />
                  </div>
                  <p className="text-xs font-bold">{needs.carbs}g</p>
                  <p className="text-[10px] text-muted-foreground">Gluc</p>
                </div>
                <div>
                  <div className="flex items-center justify-center">
                    <Apple className="h-3 w-3 text-green-500" />
                  </div>
                  <p className="text-xs font-bold">{needs.fats}g</p>
                  <p className="text-[10px] text-muted-foreground">Lip</p>
                </div>
                <div>
                  <div className="flex items-center justify-center">
                    <Droplets className="h-3 w-3 text-blue-500" />
                  </div>
                  <p className="text-xs font-bold">{(needs.water / 1000).toFixed(1)}L</p>
                  <p className="text-[10px] text-muted-foreground">Eau</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useNutritionObjectives(playerId: string, categoryId: string) {
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

  const { data: player } = useQuery({
    queryKey: ["player-info", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("birth_year")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const { data: latestMeasurement } = useQuery({
    queryKey: ["player-measurement", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_measurements")
        .select("weight_kg, height_cm")
        .eq("player_id", playerId)
        .order("measurement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const isMale = category?.gender !== "feminine";
  const currentYear = new Date().getFullYear();
  const age = player?.birth_year ? currentYear - player.birth_year : null;
  const weight = latestMeasurement?.weight_kg;
  const height = latestMeasurement?.height_cm;

  const canCalculate = weight && height && age;
  const bmr = canCalculate ? calculateBMR(weight, height, age, isMale) : null;

  const getObjectives = (dayType: "rest" | "training" | "match") => {
    if (!bmr || !weight) return null;
    
    const multiplier = activityMultipliers[dayType].factor;
    const totalCalories = Math.round(bmr * multiplier);
    
    const proteinsG = Math.round(weight * proteinPerKg[dayType]);
    const proteinsCalories = proteinsG * 4;
    
    const remainingCalories = totalCalories - proteinsCalories;
    const distribution = macroDistribution[dayType];
    const carbsRatio = distribution.carbs / (distribution.carbs + distribution.fats);
    const fatsRatio = distribution.fats / (distribution.carbs + distribution.fats);
    
    const carbsG = Math.round((remainingCalories * carbsRatio) / 4);
    const fatsG = Math.round((remainingCalories * fatsRatio) / 9);
    
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

  return { getObjectives, canCalculate };
}
