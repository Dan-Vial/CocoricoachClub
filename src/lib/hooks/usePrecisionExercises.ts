import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMainSportFromType } from "@/lib/constants/sportTypes";

export interface PrecisionExerciseType {
  id: string;
  sport: string;
  sub_discipline: string | null;
  label: string;
  value: string;
  category_id: string | null;
  is_system: boolean;
  created_by: string | null;
}

export function usePrecisionExercises(categoryId: string, sportType?: string) {
  const queryClient = useQueryClient();
  const mainSport = sportType ? getMainSportFromType(sportType) : null;

  // Get sub-discipline from sportType for athletisme
  const getSubDiscipline = (): string | null => {
    if (!sportType) return null;
    const lower = sportType.toLowerCase();
    if (lower.startsWith("athletisme_")) {
      const suffix = lower.replace("athletisme_", "");
      // Map known sub-disciplines
      const mapping: Record<string, string> = {
        sprints: "sprints", haies: "haies", demi_fond: "demi_fond",
        fond: "fond", marche: "marche", sauts_longueur: "sauts_longueur",
        sauts_hauteur: "sauts_hauteur", lancers: "lancers",
        combines: "combines", trail: "trail", ultra_trail: "ultra_trail",
      };
      return mapping[suffix] || null;
    }
    return null;
  };

  const subDiscipline = getSubDiscipline();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["precision-exercises", categoryId, mainSport, subDiscipline],
    queryFn: async () => {
      // Fetch system exercises for this sport + custom exercises for this category
      let query = supabase
        .from("precision_exercise_types")
        .select("*")
        .order("label");

      const { data, error } = await query;
      if (error) throw error;

      // Filter: system exercises matching sport (+ sub_discipline if applicable) OR custom for this category
      return (data || []).filter((ex: any) => {
        // Custom exercises for this category
        if (ex.category_id === categoryId) return true;
        // System exercises for this sport
        if (ex.is_system && ex.sport === mainSport) {
          // If sub_discipline is set on exercise, only show if matching
          if (ex.sub_discipline && subDiscipline) {
            return ex.sub_discipline === subDiscipline;
          }
          // If exercise has no sub_discipline, show for all sub-disciplines of that sport
          if (!ex.sub_discipline) return true;
          // If no sub_discipline in context but exercise has one, still show it
          return true;
        }
        return false;
      }) as PrecisionExerciseType[];
    },
    enabled: !!mainSport,
  });

  const addExercise = useMutation({
    mutationFn: async ({ label, value }: { label: string; value: string }) => {
      const { data, error } = await supabase
        .from("precision_exercise_types")
        .insert({
          sport: mainSport!,
          sub_discipline: subDiscipline,
          label,
          value,
          category_id: categoryId,
          is_system: false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-exercises", categoryId] });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase
        .from("precision_exercise_types")
        .delete()
        .eq("id", exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precision-exercises", categoryId] });
    },
  });

  return { exercises, isLoading, addExercise, deleteExercise, mainSport };
}
