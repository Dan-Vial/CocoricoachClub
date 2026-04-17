import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ExerciseMedia {
  image_url: string | null;
  youtube_url: string | null;
  description: string | null;
}

/**
 * Hook to look up exercise media (image/video/description) by exercise name.
 * Returns a function that gives media info for a given exercise name.
 */
export function useExerciseMedia() {
  const { user } = useAuth();

  const { data: exercises } = useQuery({
    queryKey: ["exercise-library-media", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_library")
        .select("name, image_url, youtube_url, description")
        .or(user ? `user_id.eq.${user.id},is_system.eq.true` : "is_system.eq.true");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  const mediaMap = new Map<string, ExerciseMedia>();
  exercises?.forEach((ex) => {
    if (!ex.image_url && !ex.youtube_url && !ex.description) return;
    const key = ex.name.toLowerCase().trim();
    const existing = mediaMap.get(key);
    // Merge entries so a row with description doesn't get overwritten by an empty one
    mediaMap.set(key, {
      image_url: ex.image_url || existing?.image_url || null,
      youtube_url: ex.youtube_url || existing?.youtube_url || null,
      description: ex.description || existing?.description || null,
    });
  });

  const getMedia = (exerciseName: string): ExerciseMedia | null => {
    return mediaMap.get(exerciseName.toLowerCase()) || null;
  };

  return { getMedia };
}
