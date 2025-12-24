import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { ExternalLink, Trash2, Dumbbell, Move, Target, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "all", label: "Tous", icon: Library },
  { value: "stretching_mobility", label: "Stretching / Mobilité", icon: Move },
  { value: "musculation", label: "Musculation", icon: Dumbbell },
  { value: "terrain", label: "Terrain", icon: Target },
];

const getCategoryLabel = (value: string) => {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
};

const getCategoryColor = (value: string) => {
  switch (value) {
    case "stretching_mobility":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "musculation":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "terrain":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ExerciseLibrarySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercise-library", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .eq("user_id", user.id)
        .order("category")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("exercise_library").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Exercice supprimé",
        description: "L'exercice a été retiré de votre bibliothèque",
      });
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const filterExercises = (category: string) => {
    if (!exercises) return [];
    if (category === "all") return exercises;
    return exercises.filter((e) => e.category === category);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Ma Bibliothèque</h2>
        </div>
        <AddExerciseDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-1">
                  <cat.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </div>
                ) : filterExercises(cat.value).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun exercice dans cette catégorie
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filterExercises(cat.value).map((exercise) => (
                      <Card key={exercise.id} className="overflow-hidden">
                        {exercise.youtube_url && getYoutubeEmbedUrl(exercise.youtube_url) && (
                          <div className="aspect-video">
                            <iframe
                              src={getYoutubeEmbedUrl(exercise.youtube_url)!}
                              className="w-full h-full"
                              allowFullScreen
                              title={exercise.name}
                            />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{exercise.name}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(exercise.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge variant="outline" className={getCategoryColor(exercise.category)}>
                            {getCategoryLabel(exercise.category)}
                          </Badge>
                        </CardHeader>
                        {exercise.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                          </CardContent>
                        )}
                        {exercise.youtube_url && (
                          <CardContent className="pt-0">
                            <a
                              href={exercise.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Voir sur YouTube
                            </a>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
