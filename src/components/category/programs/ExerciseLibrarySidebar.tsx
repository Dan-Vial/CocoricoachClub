import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dumbbell, Search, Plus, ChevronUp, ChevronDown, X, Video, Image as ImageIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDraggable } from "@dnd-kit/core";
import { 
  CATEGORY_GROUPS, 
  EXERCISE_SUBCATEGORIES,
  getCategoriesByGroup, 
  isCategoryForSport, 
  getCategoryColor,
  getCategoryLabel,
  getCategoryGroupConfig,
  EXERCISE_CATEGORIES
} from "@/lib/constants/exerciseCategories";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import { ExerciseMediaViewer } from "@/components/library/ExerciseMediaViewer";
import { cn } from "@/lib/utils";

interface ExerciseLibrarySidebarProps {
  sportType?: string;
  /** If provided, exercises are clickable (no drag). Used in prophylaxis dialog etc. */
  onClickExercise?: (exercise: { id: string; name: string; category: string; youtube_url?: string | null; image_url?: string | null }) => void;
}

interface DraggableExerciseProps {
  exercise: {
    id: string;
    name: string;
    category: string;
    youtube_url?: string | null;
    image_url?: string | null;
  };
}

function DraggableExercise({ exercise }: DraggableExerciseProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: exercise.id,
    data: exercise,
  });

  const categoryColors = getCategoryColor(exercise.category);
  const categoryInfo = EXERCISE_CATEGORIES.find(c => c.value === exercise.category);
  const groupConfig = categoryInfo?.group ? getCategoryGroupConfig(categoryInfo.group) : null;
  const IconComponent = groupConfig?.icon || Dumbbell;

  const hasMedia = !!exercise.youtube_url || !!exercise.image_url;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm",
        categoryColors.borderColor,
        categoryColors.bgColor,
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <IconComponent className={cn("h-3.5 w-3.5 shrink-0", categoryColors.color)} />
      <p className="font-medium text-xs truncate flex-1 min-w-0">{exercise.name}</p>
      {hasMedia && (
        <ExerciseMediaViewer
          exerciseName={exercise.name}
          imageUrl={exercise.image_url}
          youtubeUrl={exercise.youtube_url}
        >
          <span
            className="shrink-0 p-0.5 rounded hover:bg-background/80 transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Voir le média"
          >
            {exercise.youtube_url ? (
              <Video className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
            )}
          </span>
        </ExerciseMediaViewer>
      )}
    </div>
  );
}

export function ExerciseLibrarySidebar({ sportType, onClickExercise }: ExerciseLibrarySidebarProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const hasActiveFilters = categoryFilter !== "all" || searchQuery.length > 0;

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercise-library", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const availableSubcategories =
    categoryFilter === "all"
      ? []
      : EXERCISE_SUBCATEGORIES.filter((sub) => sub.parentCategory === categoryFilter);

  const filteredExercises = exercises?.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesSport = isCategoryForSport(exercise.category, sportType);
    if (!matchesSport) return false;

    const matchesCategory =
      categoryFilter === "all" ||
      getCategoriesByGroup(categoryFilter)
        .map((c) => c.value)
        .includes(exercise.category);

    const matchesSubcategory =
      subcategoryFilter === "all" || exercise.subcategory === subcategoryFilter;

    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const selectedGroupLabel = CATEGORY_GROUPS.find(g => g.value === categoryFilter)?.label;
  const selectedSubLabel = availableSubcategories.find(s => s.value === subcategoryFilter)?.label;

  return (
    <>
      <div className="hidden sm:flex w-80 border-l bg-muted/30 flex-col h-full">
        <div className="border-b bg-background">
          <div className="flex items-center justify-between p-3 pb-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Bibliothèque</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAddDialog(true)}
                title="Ajouter un exercice"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Collapsed filter summary */}
          {!filtersOpen && hasActiveFilters && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {selectedGroupLabel}
                  {subcategoryFilter !== "all" && ` › ${selectedSubLabel}`}
                  <X
                    className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                    onClick={() => { setCategoryFilter("all"); setSubcategoryFilter("all"); }}
                  />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="text-xs gap-1">
                  "{searchQuery}"
                  <X
                    className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="px-3 pb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 h-8 text-sm"
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setSubcategoryFilter("all");
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Toutes catégories" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {categoryFilter !== "all" && availableSubcategories.length > 0 && (
                <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Toutes sous-catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes sous-catégories</SelectItem>
                    {availableSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory.value} value={subcategory.value}>
                        {subcategory.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Exercise count */}
        {filteredExercises && filteredExercises.length > 0 && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b bg-muted/20">
            {filteredExercises.length} exercice{filteredExercises.length > 1 ? "s" : ""}
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1.5">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Chargement...</p>
            ) : !filteredExercises?.length ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Aucun exercice trouvé</p>
            ) : (
              filteredExercises.map((exercise) => (
                onClickExercise ? (
                  <button
                    key={exercise.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-all hover:shadow-sm",
                      getCategoryColor(exercise.category).borderColor,
                      getCategoryColor(exercise.category).bgColor,
                    )}
                    onClick={() => onClickExercise(exercise)}
                  >
                    <Plus className={cn("h-3.5 w-3.5 shrink-0", getCategoryColor(exercise.category).color)} />
                    <p className="font-medium text-xs truncate flex-1 min-w-0 text-left">{exercise.name}</p>
                    {(exercise.youtube_url || exercise.image_url) && (
                      <ExerciseMediaViewer
                        exerciseName={exercise.name}
                        imageUrl={exercise.image_url}
                        youtubeUrl={exercise.youtube_url}
                      >
                        <span
                          className="shrink-0 p-0.5 rounded hover:bg-background/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="Voir le média"
                        >
                          {exercise.youtube_url ? (
                            <Video className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 text-primary" />
                          )}
                        </span>
                      </ExerciseMediaViewer>
                    )}
                  </button>
                ) : (
                  <DraggableExercise key={exercise.id} exercise={exercise} />
                )
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t text-xs text-center text-muted-foreground bg-background">
          {onClickExercise ? "Cliquez pour ajouter un exercice" : "Glissez-déposez dans les séances"}
        </div>
      </div>

      <QuickAddExerciseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        sportType={sportType}
      />
    </>
  );
}
