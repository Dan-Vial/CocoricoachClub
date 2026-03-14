import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { ExternalLink, Trash2, Library, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  CATEGORY_GROUPS, 
  getCategoryLabel, 
  getCategoriesByGroup,
  getSubcategoryLabel,
  getSubcategoriesForCategory,
  getCategoryGroup,
  CATEGORY_GROUP_CONFIGS,
  EXERCISE_SUBCATEGORIES,
} from "@/lib/constants/exerciseCategories";
import { cn } from "@/lib/utils";

const getCategoryColor = (value: string) => {
  const group = getCategoryGroup(value);
  const config = group ? CATEGORY_GROUP_CONFIGS[group] : null;
  
  if (config) {
    return cn(config.bgColor, config.color, config.borderColor);
  }
  
  return "bg-muted text-muted-foreground";
};

// Get style based on group
const getGroupStyles = (group: string | null) => {
  switch (group) {
    case "halterophilie":
      return { border: "border-l-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400" };
    case "musculation":
      return { border: "border-l-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400" };
    case "course":
      return { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" };
    case "ergo":
      return { border: "border-l-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-400" };
    case "bodyweight":
      return { border: "border-l-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" };
    case "crossfit_hyrox":
      return { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400" };
    case "sled":
      return { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" };
    case "plyometrie":
      return { border: "border-l-lime-600", bg: "bg-lime-50 dark:bg-lime-950/30", text: "text-lime-700 dark:text-lime-400" };
    case "neuro":
      return { border: "border-l-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400" };
    case "stretching_mobility":
      return { border: "border-l-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-400" };
    case "reathletisation":
      return { border: "border-l-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" };
    case "pilates":
      return { border: "border-l-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-400" };
    case "terrain":
      return { border: "border-l-green-600", bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400" };
    default:
      return { border: "border-l-muted", bg: "bg-muted/30", text: "text-muted-foreground" };
  }
};

export function ExerciseLibrarySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercise-library", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
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

  const filterExercises = (group: string) => {
    if (!exercises) return [];
    let filtered = group === "all" ? exercises : exercises.filter((e) => {
      const categoriesInGroup = getCategoriesByGroup(group).map(c => c.value);
      return categoriesInGroup.includes(e.category);
    });
    
    // Apply subcategory filter
    if (activeSubcategory) {
      filtered = filtered.filter((e) => e.subcategory === activeSubcategory);
    }
    
    return filtered;
  };

  // Get subcategories available for a given group (from actual exercises)
  const getSubcategoriesForGroup = (group: string) => {
    if (!exercises) return [];
    const groupExercises = group === "all" 
      ? exercises 
      : exercises.filter((e) => {
          const categoriesInGroup = getCategoriesByGroup(group).map(c => c.value);
          return categoriesInGroup.includes(e.category);
        });
    
    const subcatValues = [...new Set(groupExercises.map(e => e.subcategory).filter(Boolean))];
    return EXERCISE_SUBCATEGORIES
      .filter(s => subcatValues.includes(s.value))
      .sort((a, b) => a.label.localeCompare(b.label));
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
          <Tabs defaultValue="all" onValueChange={() => setActiveSubcategory(null)}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted/50 p-2">
              {CATEGORY_GROUPS.map((group) => {
                const config = CATEGORY_GROUP_CONFIGS[group.value];
                const Icon = config?.icon || Library;
                return (
                  <TabsTrigger 
                    key={group.value} 
                    value={group.value} 
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm",
                      "data-[state=active]:shadow-sm",
                      config && `data-[state=active]:${config.bgColor} data-[state=active]:${config.color}`
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config?.color)} />
                    <span className="hidden sm:inline">{group.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORY_GROUPS.map((group) => {
              const subcats = getSubcategoriesForGroup(group.value);
              
              return (
                <TabsContent key={group.value} value={group.value}>
                  {/* Subcategory filter chips */}
                  {subcats.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mb-4 p-2 bg-muted/30 rounded-lg">
                      <button
                        onClick={() => setActiveSubcategory(null)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                          !activeSubcategory
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        <Filter className="h-3 w-3" />
                        Tous
                      </button>
                      {subcats.map((sub) => {
                        const count = filterExercisesCount(exercises, group.value, sub.value);
                        return (
                          <button
                            key={sub.value}
                            onClick={() => setActiveSubcategory(activeSubcategory === sub.value ? null : sub.value)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                              activeSubcategory === sub.value
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                          >
                            {sub.label}
                            <span className="opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </div>
                  ) : filterExercises(group.value).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {activeSubcategory 
                        ? "Aucun exercice dans cette sous-catégorie"
                        : "Aucun exercice dans cette catégorie"
                      }
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filterExercises(group.value).map((exercise) => {
                        const exerciseGroup = getCategoryGroup(exercise.category);
                        const config = exerciseGroup ? CATEGORY_GROUP_CONFIGS[exerciseGroup] : null;
                        const Icon = config?.icon || Library;
                        const styles = getGroupStyles(exerciseGroup);
                        
                        return (
                          <Card 
                            key={exercise.id} 
                            className={cn(
                              "overflow-hidden border-l-4 transition-all hover:shadow-md",
                              styles.border
                            )}
                          >
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
                            <CardHeader className={cn("pb-2", styles.bg)}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={cn("h-4 w-4", styles.text)} />
                                  <CardTitle className="text-base">{exercise.name}</CardTitle>
                                </div>
                                {!exercise.is_system && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(exercise.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Badge 
                                  variant="outline" 
                                  className={cn("border", styles.bg, styles.text, styles.border)}
                                >
                                  {getCategoryLabel(exercise.category)}
                                </Badge>
                                {exercise.subcategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {getSubcategoryLabel(exercise.subcategory)}
                                  </Badge>
                                )}
                                {exercise.is_system && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                    Système
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            {exercise.description && (
                              <CardContent className="pt-2">
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
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to count exercises for a subcategory within a group
function filterExercisesCount(exercises: any[] | undefined, group: string, subcatValue: string): number {
  if (!exercises) return 0;
  const groupExercises = group === "all" 
    ? exercises 
    : exercises.filter((e) => {
        const categoriesInGroup = getCategoriesByGroup(group).map(c => c.value);
        return categoriesInGroup.includes(e.category);
      });
  return groupExercises.filter(e => e.subcategory === subcatValue).length;
}