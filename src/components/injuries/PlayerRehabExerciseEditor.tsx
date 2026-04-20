import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Search, Dumbbell, Pencil, Save, Image, Video } from "lucide-react";
import { toast } from "sonner";

interface PlayerRehabExerciseEditorProps {
  playerRehabProtocolId: string;
  phaseId: string;
  phaseNumber: number;
  categoryId: string;
  disabled?: boolean;
}

export function PlayerRehabExerciseEditor({
  playerRehabProtocolId,
  phaseId,
  phaseNumber,
  categoryId,
  disabled,
}: PlayerRehabExerciseEditorProps) {
  const [editing, setEditing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch player-specific exercises for this phase
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["player-rehab-exercises", playerRehabProtocolId, phaseNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_exercises")
        .select("*")
        .eq("player_rehab_protocol_id", playerRehabProtocolId)
        .eq("phase_number", phaseNumber)
        .order("exercise_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exercise library
  const { data: libraryExercises } = useQuery({
    queryKey: ["exercise-library-for-rehab", user?.id],
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
    enabled: !!user && editing,
  });

  const addFromLibrary = useMutation({
    mutationFn: async (libExercise: any) => {
      const { error } = await supabase.from("player_rehab_exercises").insert({
        player_rehab_protocol_id: playerRehabProtocolId,
        phase_id: phaseId,
        phase_number: phaseNumber,
        exercise_library_id: libExercise.id,
        name: libExercise.name,
        description: libExercise.description || null,
        sets: 3,
        reps: "10",
        frequency: "3x/semaine",
        exercise_order: (exercises?.length || 0),
        image_url: libExercise.image_url || null,
        video_url: libExercise.youtube_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-exercises", playerRehabProtocolId, phaseNumber] });
      setSearchOpen(false);
      toast.success("Exercice ajouté");
    },
  });

  const addCustom = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_rehab_exercises").insert({
        player_rehab_protocol_id: playerRehabProtocolId,
        phase_id: phaseId,
        phase_number: phaseNumber,
        name: "Nouvel exercice",
        sets: 3,
        reps: "10",
        frequency: "3x/semaine",
        exercise_order: (exercises?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-exercises", playerRehabProtocolId, phaseNumber] });
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from("player_rehab_exercises")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-exercises", playerRehabProtocolId, phaseNumber] });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("player_rehab_exercises")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-exercises", playerRehabProtocolId, phaseNumber] });
      toast.success("Exercice supprimé");
    },
  });

  const groupedLibrary = libraryExercises?.reduce((acc, ex) => {
    const cat = ex.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {} as Record<string, any[]>) || {};

  if (isLoading) return null;

  // Read-only view
  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Dumbbell className="h-3 w-3" />
            Exercices ({exercises?.length || 0})
          </Label>
          {!disabled && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
              Modifier
            </Button>
          )}
        </div>
        {exercises?.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{ex.name}</p>
                {(ex.image_url || ex.video_url) && (
                  <Badge variant="outline" className="text-xs">
                    {ex.video_url ? "📹" : "🖼️"}
                  </Badge>
                )}
              </div>
              {ex.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                {ex.sets && <span>{ex.sets} séries</span>}
                {ex.reps && <span>{ex.reps}</span>}
                {ex.frequency && <span>{ex.frequency}</span>}
              </div>
            </div>
          </div>
        ))}
        {(!exercises || exercises.length === 0) && (
          <p className="text-xs text-muted-foreground italic py-2">Aucun exercice pour cette phase</p>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-2 border-2 border-primary/20 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Dumbbell className="h-3 w-3" />
          Exercices ({exercises?.length || 0}) — Mode édition
        </Label>
        <div className="flex gap-1">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Search className="h-3 w-3" />
                Bibliothèque
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Rechercher un exercice..." value={searchQuery} onValueChange={setSearchQuery} />
                <CommandList className="max-h-60">
                  <CommandEmpty>Aucun exercice trouvé</CommandEmpty>
                  {Object.entries(groupedLibrary).map(([category, exs]) => (
                    <CommandGroup key={category} heading={category}>
                      {exs.map((ex) => (
                        <CommandItem key={ex.id} value={ex.name} onSelect={() => addFromLibrary.mutate(ex)}>
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
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addCustom.mutate()}>
            <Plus className="h-3 w-3" />
            Manuel
          </Button>
          <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}>
            <Save className="h-3 w-3" />
            Terminé
          </Button>
        </div>
      </div>

      {exercises?.map((exercise) => (
        <div key={exercise.id} className="flex gap-2 items-start p-2 border rounded bg-muted/20">
          <div className="flex-1 space-y-1.5">
            <Input
              value={exercise.name}
              onChange={(e) => updateExercise.mutate({ id: exercise.id, field: "name", value: e.target.value })}
              placeholder="Nom de l'exercice"
              className="h-7 text-sm font-medium"
            />
            <Input
              value={exercise.description || ""}
              onChange={(e) => updateExercise.mutate({ id: exercise.id, field: "description", value: e.target.value })}
              placeholder="Description / consignes"
              className="h-7 text-xs"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Séries:</span>
                <Input
                  type="number"
                  value={exercise.sets || ""}
                  onChange={(e) => updateExercise.mutate({ id: exercise.id, field: "sets", value: parseInt(e.target.value) || null })}
                  className="h-6 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Reps:</span>
                <Input
                  value={exercise.reps || ""}
                  onChange={(e) => updateExercise.mutate({ id: exercise.id, field: "reps", value: e.target.value })}
                  className="h-6 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Fréq:</span>
                <Input
                  value={exercise.frequency || ""}
                  onChange={(e) => updateExercise.mutate({ id: exercise.id, field: "frequency", value: e.target.value })}
                  className="h-6 text-xs"
                />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => deleteExercise.mutate(exercise.id)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}

      {(!exercises || exercises.length === 0) && (
        <p className="text-xs text-muted-foreground italic py-2">
          Ajoutez des exercices depuis la bibliothèque ou manuellement.
        </p>
      )}
    </div>
  );
}
