import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, GripVertical, Search, Dumbbell, Image, Video } from "lucide-react";

export interface ProtocolExercise {
  id?: string;
  name: string;
  description: string;
  sets: number | null;
  reps: string;
  frequency: string;
  exercise_order: number;
  image_url?: string | null;
  video_url?: string | null;
  notes?: string | null;
}

interface ProtocolPhaseExercisesProps {
  exercises: ProtocolExercise[];
  onChange: (exercises: ProtocolExercise[]) => void;
  disabled?: boolean;
}

export function ProtocolPhaseExercises({ exercises, onChange, disabled }: ProtocolPhaseExercisesProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Fetch exercise library
  const { data: libraryExercises } = useQuery({
    queryKey: ["exercise-library-for-protocol", user?.id],
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

  const addExerciseFromLibrary = (libExercise: any) => {
    const newExercise: ProtocolExercise = {
      name: libExercise.name,
      description: libExercise.description || "",
      sets: 3,
      reps: "10",
      frequency: "3x/semaine",
      exercise_order: exercises.length,
      image_url: libExercise.image_url || null,
      video_url: libExercise.youtube_url || null,
    };
    onChange([...exercises, newExercise]);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const addCustomExercise = () => {
    const newExercise: ProtocolExercise = {
      name: "",
      description: "",
      sets: 3,
      reps: "10",
      frequency: "3x/semaine",
      exercise_order: exercises.length,
    };
    onChange([...exercises, newExercise]);
  };

  const updateExercise = (index: number, field: keyof ProtocolExercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index).map((e, i) => ({
      ...e,
      exercise_order: i,
    }));
    onChange(updated);
  };

  // Group library exercises by category
  const groupedExercises = libraryExercises?.reduce((acc, ex) => {
    const cat = ex.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Dumbbell className="h-3 w-3" />
          Exercices ({exercises.length})
        </Label>
        <div className="flex gap-1">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={disabled}>
                <Search className="h-3 w-3" />
                Bibliothèque
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Rechercher un exercice..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-60">
                  <CommandEmpty>Aucun exercice trouvé</CommandEmpty>
                  {Object.entries(groupedExercises).map(([category, exs]) => (
                    <CommandGroup key={category} heading={category}>
                      {exs.map((ex) => (
                        <CommandItem
                          key={ex.id}
                          value={ex.name}
                          onSelect={() => addExerciseFromLibrary(ex)}
                          className="flex items-center gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {ex.image_url && <Image className="h-3 w-3 text-muted-foreground" />}
                            {ex.youtube_url && <Video className="h-3 w-3 text-muted-foreground" />}
                            <span>{ex.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addCustomExercise} disabled={disabled}>
            <Plus className="h-3 w-3" />
            Manuel
          </Button>
        </div>
      </div>

      {exercises.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">
          Aucun exercice. Ajoutez depuis la bibliothèque ou manuellement.
        </p>
      )}

      {exercises.map((exercise, index) => (
        <div key={index} className="flex gap-2 items-start p-2 border rounded bg-muted/20">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                value={exercise.name}
                onChange={(e) => updateExercise(index, "name", e.target.value)}
                placeholder="Nom de l'exercice"
                className="h-7 text-sm font-medium"
                disabled={disabled}
              />
              {(exercise.image_url || exercise.video_url) && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {exercise.video_url ? "📹" : "🖼️"}
                </Badge>
              )}
            </div>
            <Input
              value={exercise.description}
              onChange={(e) => updateExercise(index, "description", e.target.value)}
              placeholder="Description / consignes"
              className="h-7 text-xs"
              disabled={disabled}
            />
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Séries:</span>
                <Input
                  type="number"
                  value={exercise.sets || ""}
                  onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || null)}
                  className="h-6 text-xs"
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Reps:</span>
                <Input
                  value={exercise.reps}
                  onChange={(e) => updateExercise(index, "reps", e.target.value)}
                  className="h-6 text-xs"
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Fréq:</span>
                <Input
                  value={exercise.frequency}
                  onChange={(e) => updateExercise(index, "frequency", e.target.value)}
                  className="h-6 text-xs"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => removeExercise(index)}
            disabled={disabled}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
