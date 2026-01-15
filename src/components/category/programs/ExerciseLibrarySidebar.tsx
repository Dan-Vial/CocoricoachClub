import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dumbbell, Search, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CATEGORY_GROUPS, getCategoriesByGroup } from "@/lib/constants/exerciseCategories";

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

  const getCategoryLabel = (category: string) => {
    const allCategories = getCategoriesByGroup("all");
    return allCategories.find((c) => c.value === category)?.label || category;
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors hover:bg-accent ${
        isDragging ? "opacity-50 bg-accent" : "bg-card"
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{exercise.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {getCategoryLabel(exercise.category)}
        </p>
      </div>
    </div>
  );
}

export function ExerciseLibrarySidebar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const filteredExercises = exercises?.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (categoryFilter === "all") return matchesSearch;

    const categoriesInGroup = getCategoriesByGroup(categoryFilter).map((c) => c.value);
    return matchesSearch && categoriesInGroup.includes(exercise.category);
  });

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Bibliothèque d'exercices</h3>
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

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
  );
}
