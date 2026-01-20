import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Dumbbell,
  Library,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EXERCISE_CATEGORIES, getCategoryLabel, getCategoriesForSport, isCategoryForSport, isErgCategory } from "@/lib/constants/exerciseCategories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTrainingTypesForSport, trainingTypeHasExercises } from "@/lib/constants/trainingTypes";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  editSession?: any | null;
}

// Set types for exercise groupings
const SET_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "superset", label: "Superset" },
  { value: "triset", label: "Triset" },
  { value: "giant_set", label: "Giant Set" },
  { value: "circuit", label: "Circuit" },
  { value: "drop_set", label: "Drop Set" },
  { value: "pyramid", label: "Pyramide" },
  { value: "cluster", label: "Cluster" },
  { value: "emom", label: "EMOM" },
  { value: "amrap", label: "AMRAP" },
] as const;

// Erg-specific data structure for cardio machines
interface ErgData {
  duration_seconds?: number;
  distance_meters?: number;
  calories?: number;
  watts?: number;
  rpm?: number;
  stroke_rate?: number;
}

interface Exercise {
  id?: string;
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  weight_percent_rm: number | null;
  weight_mode: "kg" | "percent_rm";
  rest_seconds: number | null;
  notes: string;
  order_index: number;
  library_exercise_id: string | null;
  set_type: string;
  group_id: string | null;
  // Erg-specific fields
  erg_data?: ErgData;
}

const emptyExercise = (index: number): Exercise => ({
  exercise_name: "",
  exercise_category: "upper_push",
  sets: 3,
  reps: 10,
  weight_kg: null,
  weight_percent_rm: null,
  weight_mode: "kg",
  rest_seconds: 90,
  notes: "",
  order_index: index,
  library_exercise_id: null,
  set_type: "normal",
  group_id: null,
  erg_data: undefined,
});

export function SessionFormDialog({
  open,
  onOpenChange,
  categoryId,
  editSession,
}: SessionFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSelectionMode, setPlayerSelectionMode] = useState<"all" | "specific">("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLibraryFor, setShowLibraryFor] = useState<number | null>(null);
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false);

  // Fetch category to get sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport-type", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sportType = category?.rugby_type;
  const trainingTypes = getTrainingTypesForSport(sportType);
  const availableCategories = getCategoriesForSport(sportType);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players-with-injuries", categoryId],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, name, position, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (playersError) throw playersError;

      const { data: injuriesData } = await supabase
        .from("injuries")
        .select("player_id")
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"]);

      const injuredPlayerIds = new Set(injuriesData?.map((i) => i.player_id) || []);

      return (
        playersData?.map((p) => ({
          ...p,
          isInjured: injuredPlayerIds.has(p.id),
        })) || []
      );
    },
    enabled: open,
  });

  // Fetch exercise library
  const { data: libraryExercises } = useQuery({
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
    enabled: !!user && open,
  });

  // Fetch existing exercises if editing
  const { data: existingExercises } = useQuery({
    queryKey: ["session-exercises", editSession?.id],
    queryFn: async () => {
      if (!editSession?.id) return [];
      // Get unique exercises for this session (grouped by name to avoid duplicates per player)
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", editSession.id)
        .order("order_index");
      if (error) throw error;
      // Deduplicate by exercise_name + order_index
      const seen = new Map<string, any>();
      data?.forEach((ex) => {
        const key = `${ex.exercise_name}-${ex.order_index}`;
        if (!seen.has(key)) {
          seen.set(key, ex);
        }
      });
      return Array.from(seen.values());
    },
    enabled: open && !!editSession?.id,
  });

  // Initialize form when editing or opening
  useEffect(() => {
    if (open) {
      if (editSession) {
        setDate(editSession.session_date || "");
        setStartTime(editSession.session_start_time || "");
        setEndTime(editSession.session_end_time || "");
        setType(editSession.training_type || "");
        setIntensity(editSession.intensity?.toString() || "");
        setNotes(editSession.notes || "");
        setPlayerSelectionMode("all");
        setSelectedPlayers([]);
      } else {
        resetForm();
      }
    }
  }, [open, editSession]);

  // Load existing exercises when available
  useEffect(() => {
    if (existingExercises && existingExercises.length > 0) {
      setExercises(
        existingExercises.map((ex, idx) => ({
          id: ex.id,
          exercise_name: ex.exercise_name,
          exercise_category: ex.exercise_category || "upper_push",
          sets: ex.sets || 3,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          weight_percent_rm: null,
          weight_mode: "kg" as const,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || "",
          order_index: idx,
          library_exercise_id: ex.library_exercise_id,
          set_type: ex.set_type || "normal",
          group_id: ex.group_id || null,
        }))
      );
    } else if (!editSession) {
      setExercises([]);
    }
  }, [existingExercises, editSession]);

  const injuredPlayers = players?.filter((p) => p.isInjured) || [];
  const healthyPlayers = players?.filter((p) => !p.isInjured) || [];

  const filteredLibrary =
    libraryExercises?.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSport = isCategoryForSport(ex.category, sportType);
      return matchesSearch && matchesSport;
    }) || [];

  // Create or update session
  const saveSession = useMutation({
    mutationFn: async () => {
      const sessionData = {
        category_id: categoryId,
        session_date: date,
        session_start_time: startTime || null,
        session_end_time: endTime || null,
        training_type: type as any,
        intensity: intensity ? parseInt(intensity) : null,
        notes: notes || null,
      };

      let sessionId = editSession?.id;

      if (editSession) {
        // Update existing session
        const { error } = await supabase
          .from("training_sessions")
          .update(sessionData)
          .eq("id", editSession.id);
        if (error) throw error;

        // Delete old exercises to replace with new ones
        await supabase
          .from("gym_session_exercises")
          .delete()
          .eq("training_session_id", editSession.id);
      } else {
        // Create new session
        const { data, error } = await supabase
          .from("training_sessions")
          .insert([sessionData])
          .select()
          .single();
        if (error) throw error;
        sessionId = data.id;

        // Create attendance records for selected players
        const playersToUse =
          playerSelectionMode === "specific" && selectedPlayers.length > 0
            ? selectedPlayers
            : players?.map((p) => p.id) || [];

        if (playersToUse.length > 0) {
          const attendanceRecords = playersToUse.map((playerId) => ({
            player_id: playerId,
            category_id: categoryId,
            attendance_date: date,
            training_session_id: sessionId,
            status: "present",
          }));

          await supabase.from("training_attendance").insert(attendanceRecords);
        }
      }

      // Add exercises for all players
      const validExercises = exercises.filter((e) => e.exercise_name.trim());
      if (validExercises.length > 0) {
        const playersToUse =
          playerSelectionMode === "specific" && selectedPlayers.length > 0
            ? selectedPlayers
            : players?.map((p) => p.id) || [];

        if (playersToUse.length > 0) {
          const exerciseRecords = playersToUse.flatMap((playerId) =>
            validExercises.map((ex, idx) => ({
              training_session_id: sessionId,
              player_id: playerId,
              category_id: categoryId,
              exercise_name: ex.exercise_name,
              exercise_category: ex.exercise_category,
              sets: ex.sets,
              reps: ex.reps,
              weight_kg: ex.weight_mode === "kg" ? ex.weight_kg : null,
              rest_seconds: ex.rest_seconds,
              notes: ex.weight_mode === "percent_rm" && ex.weight_percent_rm 
                ? `${ex.weight_percent_rm}% RM${ex.notes ? ` - ${ex.notes}` : ""}` 
                : (ex.notes || null),
              order_index: idx,
              library_exercise_id: ex.library_exercise_id,
              set_type: ex.set_type,
              group_id: ex.group_id,
            }))
          );

          await supabase.from("gym_session_exercises").insert(exerciseRecords);
        }
      }

      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training_attendance"] });
      queryClient.invalidateQueries({ queryKey: ["gym-exercises"] });
      const exerciseCount = exercises.filter((e) => e.exercise_name.trim()).length;
      toast.success(
        editSession
          ? "Séance modifiée avec succès"
          : `Séance créée${exerciseCount > 0 ? ` avec ${exerciseCount} exercice(s)` : ""}`
      );
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const resetForm = () => {
    setDate("");
    setStartTime("");
    setEndTime("");
    setType("");
    setIntensity("");
    setNotes("");
    setSelectedPlayers([]);
    setPlayerSelectionMode("all");
    setExercises([]);
    setSearchQuery("");
    setShowLibraryFor(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (endTime && !startTime) {
      toast.error("Veuillez indiquer une heure de début si vous spécifiez une heure de fin");
      return;
    }

    if (startTime && endTime && endTime <= startTime) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    if (date && type) {
      saveSession.mutate();
    }
  };

  // Player selection helpers
  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const selectAll = () => {
    setSelectedPlayers(players?.map((p) => p.id) || []);
    setPlayerSelectionMode("specific");
  };

  const selectAllInjured = () => {
    setSelectedPlayers(injuredPlayers.map((p) => p.id));
    setPlayerSelectionMode("specific");
  };

  const selectAllHealthy = () => {
    setSelectedPlayers(healthyPlayers.map((p) => p.id));
    setPlayerSelectionMode("specific");
  };

  const clearSelection = () => {
    setSelectedPlayers([]);
  };

  // Exercise management
  const addExercise = () => {
    setExercises([...exercises, emptyExercise(exercises.length)]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const duplicateExercise = (index: number) => {
    const exercise = { ...exercises[index], order_index: exercises.length, id: undefined };
    setExercises([...exercises, exercise]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const selectFromLibrary = (index: number, libExercise: any) => {
    const updated = [...exercises];
    updated[index] = {
      ...updated[index],
      exercise_name: libExercise.name,
      exercise_category: libExercise.category,
      library_exercise_id: libExercise.id,
    };
    setExercises(updated);
    setShowLibraryFor(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editSession ? "Modifier la séance" : "Nouvelle séance"}</DialogTitle>
          <DialogDescription>
            Remplissez les détails de la séance et ajoutez des exercices si nécessaire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="exercises">
                Exercices
                {exercises.filter((e) => e.exercise_name.trim()).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {exercises.filter((e) => e.exercise_name.trim()).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="players">Joueurs</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="details" className="h-full m-0">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Heure de début</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">Heure de fin</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Type d'entraînement *</Label>
                      <Select value={type} onValueChange={setType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intensity">Intensité (1-10)</Label>
                      <Input
                        id="intensity"
                        type="number"
                        min="1"
                        max="10"
                        value={intensity}
                        onChange={(e) => setIntensity(e.target.value)}
                        placeholder="De 1 à 10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Remarques ou détails supplémentaires..."
                        rows={3}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="exercises" className="h-full m-0">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-base font-medium">
                        <Dumbbell className="h-4 w-4" />
                        Exercices de la séance
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>

                    {exercises.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-muted/30">
                        <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground mb-2">Aucun exercice ajouté</p>
                        <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter un exercice
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {exercises.map((exercise, index) => (
                          <div key={index} className="p-4 border rounded-lg bg-card space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                              <div className="flex-1 relative">
                                <Popover
                                  open={showLibraryFor === index}
                                  onOpenChange={(isOpen) => {
                                    setShowLibraryFor(isOpen ? index : null);
                                    if (isOpen) setSearchQuery(exercise.exercise_name);
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <div className="relative">
                                      <Input
                                        placeholder="Nom de l'exercice..."
                                        value={exercise.exercise_name}
                                        onChange={(e) => {
                                          updateExercise(index, "exercise_name", e.target.value);
                                          setSearchQuery(e.target.value);
                                          setShowLibraryFor(index);
                                        }}
                                      />
                                      {exercise.library_exercise_id && (
                                        <Library className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  </PopoverTrigger>

                                  <PopoverContent
                                    align="start"
                                    className="p-1 w-[--radix-popover-trigger-width] max-h-64 overflow-y-auto z-50"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                  >
                                    {filteredLibrary.length === 0 ? (
                                      <div className="px-2 py-2 text-xs text-muted-foreground">
                                        Aucun exercice trouvé
                                      </div>
                                    ) : (
                                      filteredLibrary.slice(0, 12).map((libEx) => (
                                        <button
                                          key={libEx.id}
                                          type="button"
                                          className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex justify-between items-center"
                                          onClick={() => selectFromLibrary(index, libEx)}
                                        >
                                          <span className="truncate pr-2">{libEx.name}</span>
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            {getCategoryLabel(libEx.category)}
                                          </Badge>
                                        </button>
                                      ))
                                    )}
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateExercise(index)}
                                title="Dupliquer"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExercise(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Row 1: Set Type + Category */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Type de série</Label>
                                <Select
                                  value={exercise.set_type}
                                  onValueChange={(v) => updateExercise(index, "set_type", v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SET_TYPES.map((st) => (
                                      <SelectItem key={st.value} value={st.value}>
                                        {st.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Catégorie</Label>
                                <Select
                                  value={exercise.exercise_category}
                                  onValueChange={(v) => updateExercise(index, "exercise_category", v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableCategories.map((c) => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Row 2: Conditional inputs based on exercise type */}
                            {isErgCategory(exercise.exercise_category) ? (
                              // Erg-specific inputs
                              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Temps (s)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs"
                                    placeholder="300"
                                    value={exercise.erg_data?.duration_seconds || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "erg_data", {
                                        ...exercise.erg_data,
                                        duration_seconds: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Distance (m)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs"
                                    placeholder="2000"
                                    value={exercise.erg_data?.distance_meters || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "erg_data", {
                                        ...exercise.erg_data,
                                        distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Calories</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs"
                                    placeholder="50"
                                    value={exercise.erg_data?.calories || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "erg_data", {
                                        ...exercise.erg_data,
                                        calories: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Watts</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs"
                                    placeholder="150"
                                    value={exercise.erg_data?.watts || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "erg_data", {
                                        ...exercise.erg_data,
                                        watts: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">RPM</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs"
                                    placeholder="80"
                                    value={exercise.erg_data?.rpm || ""}
                                    onChange={(e) =>
                                      updateExercise(index, "erg_data", {
                                        ...exercise.erg_data,
                                        rpm: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                  />
                                </div>
                                {/* Show stroke rate for rower */}
                                {(exercise.exercise_category === "rowerg" || exercise.exercise_name.toLowerCase().includes("row")) && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Stroke/min</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="h-8 text-xs"
                                      placeholder="28"
                                      value={exercise.erg_data?.stroke_rate || ""}
                                      onChange={(e) =>
                                        updateExercise(index, "erg_data", {
                                          ...exercise.erg_data,
                                          stroke_rate: e.target.value ? parseInt(e.target.value) : undefined,
                                        })
                                      }
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label className="text-xs text-muted-foreground">Repos (sec)</Label>
                                  <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={exercise.rest_seconds || ""}
                                    onChange={(e) =>
                                      updateExercise(
                                        index,
                                        "rest_seconds",
                                        e.target.value ? parseInt(e.target.value) : null
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ) : (
                              // Standard Sets, Reps, Weight, Rest
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Séries</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-8 text-xs"
                                    value={exercise.sets}
                                    onChange={(e) =>
                                      updateExercise(index, "sets", parseInt(e.target.value) || 1)
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Reps</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-8 text-xs"
                                    value={exercise.reps || ""}
                                    onChange={(e) =>
                                      updateExercise(
                                        index,
                                        "reps",
                                        e.target.value ? parseInt(e.target.value) : null
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    Poids
                                    <button
                                      type="button"
                                      className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80"
                                      onClick={() => updateExercise(index, "weight_mode", exercise.weight_mode === "kg" ? "percent_rm" : "kg")}
                                    >
                                      {exercise.weight_mode === "kg" ? "kg" : "% RM"}
                                    </button>
                                  </Label>
                                  {exercise.weight_mode === "kg" ? (
                                    <Input
                                      type="number"
                                      step="0.5"
                                      className="h-8 text-xs"
                                      placeholder="kg"
                                      value={exercise.weight_kg || ""}
                                      onChange={(e) =>
                                        updateExercise(
                                          index,
                                          "weight_kg",
                                          e.target.value ? parseFloat(e.target.value) : null
                                        )
                                      }
                                    />
                                  ) : (
                                    <Input
                                      type="number"
                                      min="1"
                                      max="100"
                                      className="h-8 text-xs"
                                      placeholder="% RM"
                                      value={exercise.weight_percent_rm || ""}
                                      onChange={(e) =>
                                        updateExercise(
                                          index,
                                          "weight_percent_rm",
                                          e.target.value ? parseInt(e.target.value) : null
                                        )
                                      }
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Repos (sec)</Label>
                                  <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={exercise.rest_seconds || ""}
                                    onChange={(e) =>
                                      updateExercise(
                                        index,
                                        "rest_seconds",
                                        e.target.value ? parseInt(e.target.value) : null
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <Label className="text-xs text-muted-foreground">Notes</Label>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Notes..."
                                value={exercise.notes}
                                onChange={(e) => updateExercise(index, "notes", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="players" className="h-full m-0">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-base font-medium">
                        <Users className="h-4 w-4" />
                        Athlètes concernés
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={playerSelectionMode === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPlayerSelectionMode("all");
                            setSelectedPlayers([]);
                          }}
                        >
                          Tous
                        </Button>
                        <Button
                          type="button"
                          variant={playerSelectionMode === "specific" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPlayerSelectionMode("specific")}
                        >
                          Spécifiques
                        </Button>
                      </div>
                    </div>

                    {playerSelectionMode === "specific" ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAll}
                            className="text-xs"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Tous ({players?.length || 0})
                          </Button>
                          {injuredPlayers.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={selectAllInjured}
                              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Blessés ({injuredPlayers.length})
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllHealthy}
                            className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Aptes ({healthyPlayers.length})
                          </Button>
                          {selectedPlayers.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearSelection}
                              className="text-xs text-muted-foreground"
                            >
                              Effacer
                            </Button>
                          )}
                        </div>

                        {selectedPlayers.length > 0 && (
                          <Badge variant="secondary" className="w-fit">
                            {selectedPlayers.length} athlète(s) sélectionné(s)
                          </Badge>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {players?.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => togglePlayer(player.id)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                                selectedPlayers.includes(player.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/50",
                                player.isInjured && "border-amber-300 bg-amber-50/50"
                              )}
                            >
                              <Checkbox
                                checked={selectedPlayers.includes(player.id)}
                                onCheckedChange={() => togglePlayer(player.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={player.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {player.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate flex-1">{player.name}</span>
                              {player.isInjured && (
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              )}
                              {player.position && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {player.position}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">
                        Tous les athlètes de la catégorie seront concernés par cette séance.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!date || !type || saveSession.isPending}>
              {saveSession.isPending ? "Enregistrement..." : editSession ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      <QuickAddExerciseDialog
        open={showAddExerciseDialog}
        onOpenChange={setShowAddExerciseDialog}
        sportType={sportType}
        onSuccess={(newExercise) => {
          const newEx = emptyExercise(exercises.length);
          newEx.exercise_name = newExercise.name;
          newEx.exercise_category = newExercise.category;
          newEx.library_exercise_id = newExercise.id;
          setExercises([...exercises, newEx]);
        }}
      />
    </Dialog>
  );
}
