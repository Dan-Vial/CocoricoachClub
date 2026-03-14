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
import { Dumbbell, Search, GripVertical, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ExerciseLibrarySidebarProps {
  sportType?: string;
}

interface DraggableExerciseProps {
  exercise: {
    id: string;
    name: string;
    category: string;
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

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
        categoryColors.borderColor,
        categoryColors.bgColor,
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className={cn("p-1.5 rounded-md", categoryColors.bgColor)}>
        <IconComponent className={cn("h-4 w-4", categoryColors.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <Badge 
          variant="outline" 
          className={cn("text-xs mt-1", categoryColors.color, categoryColors.borderColor)}
        >
          {getCategoryLabel(exercise.category)}
        </Badge>
      </div>
    </div>
  );
}

export function ExerciseLibrarySidebar({ sportType }: ExerciseLibrarySidebarProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

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

  return (
    <>
      <div className="w-80 border-l bg-muted/30 flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Bibliothèque d'exercices</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddDialog(true)}
              title="Ajouter un exercice"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setSubcategoryFilter("all");
              }}
            >
              <SelectTrigger>
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
                <SelectTrigger>
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
        </div>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : !filteredExercises?.length ? (
            <p className="text-center text-muted-foreground py-4">Aucun exercice trouvé</p>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <DraggableExercise key={exercise.id} exercise={exercise} />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t text-xs text-center text-muted-foreground bg-background">
          Glissez-déposez les exercices dans les séances
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
