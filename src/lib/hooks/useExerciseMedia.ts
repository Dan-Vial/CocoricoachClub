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
    if (ex.image_url || ex.youtube_url || ex.description) {
      mediaMap.set(ex.name.toLowerCase(), {
        image_url: ex.image_url,
        youtube_url: ex.youtube_url,
        description: ex.description,
      });
    }
  });

  const getMedia = (exerciseName: string): ExerciseMedia | null => {
    return mediaMap.get(exerciseName.toLowerCase()) || null;
  };

  return { getMedia };
}
