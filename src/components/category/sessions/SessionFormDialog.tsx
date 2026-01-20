import { useEffect, useState, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Link2,
  Unlink,
  Check,
  Info,
  GripVertical,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoriesForSport, isCategoryForSport, isErgCategory } from "@/lib/constants/exerciseCategories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTrainingTypesForSport, trainingTypeHasExercises } from "@/lib/constants/trainingTypes";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import {
  TRAINING_STYLES,
  getTrainingStyleConfig,
  isLinkableMethod,
  isDropMethod,
  isClusterMethod,
  getMaxExercisesForMethod,
  LINKABLE_METHODS,
  DROP_METHODS,
  CLUSTER_METHODS,
} from "@/lib/constants/trainingStyles";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  editSession?: any | null;
}

// Erg-specific data structure for cardio machines
interface ErgData {
  duration_seconds?: number;
  distance_meters?: number;
  calories?: number;
  watts?: number;
  rpm?: number;
  stroke_rate?: number;
}

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

interface Exercise {
  id?: string;
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  weight_percent_rm: number | null;
  weight_mode: "kg" | "percent_rm";
  rest_seconds: number | null;
  notes: string;
  order_index: number;
  library_exercise_id: string | null;
  set_type: string;
  group_id: string | null;
  group_order?: number;
  erg_data?: ErgData;
  drop_sets?: DropSet[];
  cluster_sets?: ClusterSet[];
}

const emptyExercise = (index: number): Exercise => ({
  exercise_name: "",
  exercise_category: "upper_push",
  sets: 3,
  reps: "10",
  weight_kg: null,
  weight_percent_rm: null,
  weight_mode: "kg",
  rest_seconds: 90,
  notes: "",
  order_index: index,
  library_exercise_id: null,
  set_type: "normal",
  group_id: null,
  group_order: undefined,
  erg_data: undefined,
  drop_sets: undefined,
  cluster_sets: undefined,
});

// Group exercises by group_id for visual grouping
interface ExerciseGroup {
  groupId: string | null;
  exercises: { exercise: Exercise; index: number }[];
  method: string;
}

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
  
  // Linking state for grouping exercises
  const [linkingFrom, setLinkingFrom] = useState<{index: number, method: string, maxCount: number} | null>(null);
  const [selectedForLinking, setSelectedForLinking] = useState<number[]>([]);

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
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", editSession.id)
        .order("order_index");
      if (error) throw error;
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

  // Organize exercises into groups for rendering
  const exerciseGroups = useMemo(() => {
    const groups: ExerciseGroup[] = [];
    const processedGroupIds = new Set<string>();

    exercises.forEach((exercise, index) => {
      if (exercise.group_id) {
        if (!processedGroupIds.has(exercise.group_id)) {
          processedGroupIds.add(exercise.group_id);
          const groupExercises = exercises
            .map((ex, idx) => ({ exercise: ex, index: idx }))
            .filter(({ exercise: ex }) => ex.group_id === exercise.group_id)
            .sort((a, b) => (a.exercise.group_order || 0) - (b.exercise.group_order || 0));
          
          groups.push({
            groupId: exercise.group_id,
            exercises: groupExercises,
            method: exercise.set_type,
          });
        }
      } else {
        groups.push({
          groupId: null,
          exercises: [{ exercise, index }],
          method: exercise.set_type,
        });
      }
    });

    return groups;
  }, [exercises]);

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
          reps: ex.reps?.toString() || "10",
          weight_kg: ex.weight_kg,
          weight_percent_rm: null,
          weight_mode: "kg" as const,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || "",
          order_index: idx,
          library_exercise_id: ex.library_exercise_id,
          set_type: ex.set_type || "normal",
          group_id: ex.group_id || null,
          group_order: undefined,
        }))
      );
    } else if (!editSession) {
      setExercises([]);
    }
  }, [existingExercises, editSession]);

  // Reset linking state when exercises change
  useEffect(() => {
    if (linkingFrom) {
      const stillValid = exercises[linkingFrom.index];
      if (!stillValid) {
        setLinkingFrom(null);
        setSelectedForLinking([]);
      }
    }
  }, [exercises]);

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
        const { error } = await supabase
          .from("training_sessions")
          .update(sessionData)
          .eq("id", editSession.id);
        if (error) throw error;

        await supabase
          .from("gym_session_exercises")
          .delete()
          .eq("training_session_id", editSession.id);
      } else {
        const { data, error } = await supabase
          .from("training_sessions")
          .insert([sessionData])
          .select()
          .single();
        if (error) throw error;
        sessionId = data.id;

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
              reps: ex.reps ? parseInt(ex.reps) : null,
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
    setLinkingFrom(null);
    setSelectedForLinking([]);
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
    const exerciseToDelete = exercises[index];
    let newExercises = exercises.filter((_, i) => i !== index);

    if (exerciseToDelete.group_id) {
      const groupExercises = newExercises.filter(
        (e) => e.group_id === exerciseToDelete.group_id
      );
      if (groupExercises.length < 2) {
        newExercises = newExercises.map((e) =>
          e.group_id === exerciseToDelete.group_id
            ? { ...e, group_id: null, group_order: undefined, set_type: "normal" }
            : e
        );
      } else {
        let groupOrder = 1;
        newExercises = newExercises.map((e) =>
          e.group_id === exerciseToDelete.group_id
            ? { ...e, group_order: groupOrder++ }
            : e
        );
      }
    }

    setExercises(newExercises.map((e, i) => ({ ...e, order_index: i })));
  };

  const duplicateExercise = (index: number) => {
    const exercise = { ...exercises[index], order_index: exercises.length, id: undefined, group_id: null, group_order: undefined };
    setExercises([...exercises, exercise]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const updateMultipleFields = (index: number, updates: Record<string, any>) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], ...updates };
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

  // Linking functions for grouping
  const startLinking = (index: number, method: string) => {
    const maxCount = getMaxExercisesForMethod(method);
    setLinkingFrom({ index, method, maxCount });
    setSelectedForLinking([index]);
  };

  const toggleExerciseForLinking = (targetIndex: number) => {
    if (!linkingFrom) return;
    
    const exercise = exercises[targetIndex];
    if (exercise.group_id) return;
    
    if (selectedForLinking.includes(targetIndex)) {
      if (targetIndex === linkingFrom.index) return;
      setSelectedForLinking(prev => prev.filter(i => i !== targetIndex));
    } else {
      if (selectedForLinking.length < linkingFrom.maxCount) {
        setSelectedForLinking(prev => [...prev, targetIndex]);
      }
    }
  };

  const confirmLinking = () => {
    if (!linkingFrom || selectedForLinking.length < 2) return;
    
    const { method } = linkingFrom;
    const groupId = crypto.randomUUID();
    const sortedIndices = [...selectedForLinking].sort((a, b) => a - b);
    
    const newExercises = exercises.map((ex, i) => {
      const groupIndex = sortedIndices.indexOf(i);
      if (groupIndex !== -1) {
        return {
          ...ex,
          set_type: method,
          group_id: groupId,
          group_order: groupIndex + 1,
        };
      }
      return ex;
    });
    
    setExercises(newExercises);
    setLinkingFrom(null);
    setSelectedForLinking([]);
  };

  const cancelLinking = () => {
    setLinkingFrom(null);
    setSelectedForLinking([]);
  };

  const unlinkGroup = (groupId: string) => {
    const newExercises = exercises.map((ex) => {
      if (ex.group_id === groupId) {
        return { ...ex, group_id: null, group_order: undefined, set_type: "normal" };
      }
      return ex;
    });
    setExercises(newExercises);
  };

  const isLinkable = (index: number) => {
    if (!linkingFrom) return false;
    const exercise = exercises[index];
    return !exercise.group_id;
  };

  // Drop sets / Pyramid initialization
  const initDropSets = (index: number, method: string) => {
    const exercise = exercises[index];
    const sets = exercise.sets || 4;
    const basePercentage = exercise.weight_percent_rm || 75;
    const baseReps = parseInt(exercise.reps) || 10;
    
    let dropSets: DropSet[] = [];
    
    if (method === "drop_set") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps),
        percentage: Math.max(basePercentage - (i * 12), 40),
      }));
    } else if (method === "pyramid_up") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(Math.max(baseReps - (i * 2), 2)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
    } else if (method === "pyramid_down") {
      dropSets = Array.from({ length: sets }, (_, i) => ({
        reps: String(baseReps + (i * 2)),
        percentage: Math.max(basePercentage - (i * 5), 50),
      }));
    } else if (method === "pyramid_full") {
      const halfSets = Math.ceil(sets / 2);
      const upPhase = Array.from({ length: halfSets }, (_, i) => ({
        reps: String(Math.max(baseReps - (i * 2), 2)),
        percentage: Math.min(basePercentage + (i * 5), 100),
      }));
      const downPhase = Array.from({ length: sets - halfSets }, (_, i) => ({
        reps: String(Math.max(baseReps - (halfSets - 2 - i) * 2, 2)),
        percentage: Math.min(basePercentage + (halfSets - 2 - i) * 5, 100),
      }));
      dropSets = [...upPhase, ...downPhase];
    }
    
    updateMultipleFields(index, {
      set_type: method,
      sets: dropSets.length,
      drop_sets: dropSets,
    });
  };

  const initClusterSets = (index: number, method: string) => {
    const exercise = exercises[index];
    const totalReps = parseInt(exercise.reps) || 12;
    const numClusters = 4;
    const repsPerCluster = Math.ceil(totalReps / numClusters);
    
    const clusterSets: ClusterSet[] = Array.from({ length: numClusters }, () => ({
      reps: repsPerCluster,
      rest_seconds: method === "rest_pause" ? 15 : 10,
    }));
    
    updateMultipleFields(index, {
      set_type: method,
      cluster_sets: clusterSets,
    });
  };

  const updateDropSet = (exerciseIndex: number, setIndex: number, field: keyof DropSet, value: any) => {
    const exercise = exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    dropSets[setIndex] = { ...dropSets[setIndex], [field]: value };
    updateExercise(exerciseIndex, "drop_sets", dropSets);
  };

  const updateClusterSet = (exerciseIndex: number, setIndex: number, field: keyof ClusterSet, value: any) => {
    const exercise = exercises[exerciseIndex];
    const clusterSets = [...(exercise.cluster_sets || [])];
    clusterSets[setIndex] = { ...clusterSets[setIndex], [field]: value };
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  const addDropSet = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const dropSets = [...(exercise.drop_sets || [])];
    const lastSet = dropSets[dropSets.length - 1];
    dropSets.push({
      reps: lastSet?.reps || "10",
      percentage: Math.max((lastSet?.percentage || 70) - 10, 40),
    });
    updateMultipleFields(exerciseIndex, {
      drop_sets: dropSets,
      sets: dropSets.length,
    });
  };

  const addClusterSet = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const clusterSets = [...(exercise.cluster_sets || [])];
    const lastSet = clusterSets[clusterSets.length - 1];
    clusterSets.push({
      reps: lastSet?.reps || 3,
      rest_seconds: lastSet?.rest_seconds || 15,
    });
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  const removeDropSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const dropSets = (exercise.drop_sets || []).filter((_, i) => i !== setIndex);
    updateMultipleFields(exerciseIndex, {
      drop_sets: dropSets,
      sets: dropSets.length,
    });
  };

  const removeClusterSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const clusterSets = (exercise.cluster_sets || []).filter((_, i) => i !== setIndex);
    updateExercise(exerciseIndex, "cluster_sets", clusterSets);
  };

  // Render a single exercise card
  const renderExerciseCard = (
    exercise: Exercise,
    index: number,
    isGrouped: boolean,
    exerciseNumber?: number
  ) => {
    const isSelected = selectedForLinking.includes(index);
    const styleConfig = getTrainingStyleConfig(exercise.set_type);
    const dropMode = isDropMethod(exercise.set_type);
    const clusterMode = isClusterMethod(exercise.set_type);

    const getExerciseStyle = () => {
      if (linkingFrom && isLinkable(index)) {
        const linkStyle = getTrainingStyleConfig(linkingFrom.method);
        return isSelected
          ? cn("border-2", linkStyle.borderColor, linkStyle.bgColor)
          : cn("border-2 border-dashed", linkStyle.borderColor, "hover:opacity-80");
      }
      if (dropMode || clusterMode) {
        return cn("border", styleConfig.borderColor, styleConfig.bgColor);
      }
      return "bg-background border-border";
    };

    return (
      <div
        className={cn(
          "flex flex-col gap-3 p-3 rounded-lg border transition-all",
          getExerciseStyle(),
          linkingFrom && isLinkable(index) && "cursor-pointer"
        )}
        onClick={() => {
          if (linkingFrom && isLinkable(index)) {
            toggleExerciseForLinking(index);
          }
        }}
      >
        {/* Exercise header */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          
          {isGrouped && exerciseNumber && (
            <Badge className={cn("text-white text-xs", styleConfig.color || "bg-primary")}>
              Exercice {exerciseNumber}
            </Badge>
          )}
          
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
                    className="h-8"
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

          {!isGrouped && (dropMode || clusterMode) && (
            <Badge className={cn("text-white text-xs", styleConfig.color)}>
              {styleConfig.label}
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => duplicateExercise(index)}
            title="Dupliquer"
            className="h-7 w-7"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeExercise(index)}
            className="h-7 w-7 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Row 1: Method + Category */}
        <div className="grid grid-cols-2 gap-2">
          {!isGrouped && (
            <div>
              <Label className="text-xs text-muted-foreground">Méthode</Label>
              <Select
                value={exercise.set_type}
                onValueChange={(v) => {
                  if (LINKABLE_METHODS.includes(v)) {
                    startLinking(index, v);
                  } else if (DROP_METHODS.includes(v)) {
                    initDropSets(index, v);
                  } else if (CLUSTER_METHODS.includes(v)) {
                    initClusterSets(index, v);
                  } else {
                    updateMultipleFields(index, {
                      set_type: v,
                      drop_sets: undefined,
                      cluster_sets: undefined,
                    });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {TRAINING_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex items-center gap-2">
                        {style.color && (
                          <div className={cn("w-2 h-2 rounded-full", style.color)} />
                        )}
                        <span>{style.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={isGrouped ? "col-span-2" : ""}>
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
                  updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
          </div>
        ) : dropMode && exercise.drop_sets ? (
          // Drop set configuration
          <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {exercise.set_type === "drop_set" && "Drop Set - Même reps, charge décroissante"}
                {exercise.set_type === "pyramid_up" && "Pyramide Montante - ↑ charge, ↓ reps"}
                {exercise.set_type === "pyramid_down" && "Pyramide Descendante - ↓ charge, ↑ reps"}
                {exercise.set_type === "pyramid_full" && "Pyramide Complète ↑↓"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addDropSet(index)}
                className="h-6 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Série
              </Button>
            </div>
            
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium mb-1">
                <span>Set</span>
                <span>% 1RM</span>
                <span>Reps</span>
                <span></span>
              </div>
              {exercise.drop_sets.map((dropSet, setIndex) => (
                <div key={setIndex} className="grid grid-cols-4 gap-2 items-center bg-background/50 p-2 rounded">
                  <span className="text-xs font-medium">Set {setIndex + 1}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={dropSet.percentage}
                      onChange={(e) => updateDropSet(index, setIndex, "percentage", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                    <span className="text-xs">%</span>
                  </div>
                  <Input
                    value={dropSet.reps}
                    onChange={(e) => updateDropSet(index, setIndex, "reps", e.target.value)}
                    className="h-7 text-xs"
                    placeholder="10"
                  />
                  {exercise.drop_sets!.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDropSet(index, setIndex)}
                      className="h-6 w-6 text-destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : clusterMode && exercise.cluster_sets ? (
          // Cluster set configuration
          <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {exercise.set_type === "cluster" && "Cluster - Mini-séries avec micro-repos"}
                {exercise.set_type === "rest_pause" && "Rest-Pause - Séries à l'échec avec pauses"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addClusterSet(index)}
                className="h-6 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Mini-série
              </Button>
            </div>
            
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium mb-1">
                <span>Mini-série</span>
                <span>Reps</span>
                <span>Micro-repos</span>
                <span></span>
              </div>
              {exercise.cluster_sets.map((clusterSet, setIndex) => (
                <div key={setIndex} className="grid grid-cols-4 gap-2 items-center bg-background/50 p-2 rounded">
                  <span className="text-xs font-medium">#{setIndex + 1}</span>
                  <Input
                    type="number"
                    value={clusterSet.reps}
                    onChange={(e) => updateClusterSet(index, setIndex, "reps", parseInt(e.target.value) || 1)}
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={clusterSet.rest_seconds}
                      onChange={(e) => updateClusterSet(index, setIndex, "rest_seconds", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                    <span className="text-xs">s</span>
                  </div>
                  {exercise.cluster_sets!.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeClusterSet(index, setIndex)}
                      className="h-6 w-6 text-destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">%1RM</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={exercise.weight_percent_rm || ""}
                  onChange={(e) =>
                    updateExercise(index, "weight_percent_rm", e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="85"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Repos final (s)</label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.rest_seconds || ""}
                  onChange={(e) =>
                    updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="h-8 text-sm"
                />
              </div>
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
                className="h-8 text-xs"
                value={exercise.reps || ""}
                onChange={(e) => updateExercise(index, "reps", e.target.value)}
                placeholder="10"
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
                    updateExercise(index, "weight_kg", e.target.value ? parseFloat(e.target.value) : null)
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
                    updateExercise(index, "weight_percent_rm", e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              )}
            </div>
            {!isGrouped && (
              <div>
                <Label className="text-xs text-muted-foreground">Repos (sec)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={exercise.rest_seconds || ""}
                  onChange={(e) =>
                    updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </div>
            )}
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
    );
  };

  // Render a group of exercises with colored container
  const renderExerciseGroup = (group: ExerciseGroup) => {
    if (!group.groupId) {
      const { exercise, index } = group.exercises[0];
      return (
        <div key={`single-${index}`}>
          {renderExerciseCard(exercise, index, false)}
        </div>
      );
    }

    const styleConfig = getTrainingStyleConfig(group.method);
    const maxExercises = getMaxExercisesForMethod(group.method);
    const lastExercise = group.exercises[group.exercises.length - 1];

    return (
      <div
        key={group.groupId}
        className={cn(
          "rounded-xl border-2 p-4 space-y-3",
          styleConfig.borderColor,
          styleConfig.bgColor
        )}
      >
        {/* Group header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={cn("text-white text-sm px-3 py-1", styleConfig.color)}>
              {styleConfig.label}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {group.exercises.length}/{maxExercises} exercices
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{styleConfig.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => unlinkGroup(group.groupId!)}
              className="h-7 text-xs"
            >
              <Unlink className="h-3 w-3 mr-1" />
              Annuler
            </Button>
          </div>
        </div>

        {/* Group exercises */}
        <div className="space-y-2">
          {group.exercises.map(({ exercise, index }, i) => (
            <div key={exercise.id || index}>
              {renderExerciseCard(exercise, index, true, i + 1)}
            </div>
          ))}
        </div>

        {/* Group completion message */}
        {group.exercises.length >= 2 && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 pt-2">
            <Check className="h-4 w-4" />
            Bloc complet ! Configurez les paramètres puis validez.
          </div>
        )}

        {/* Rest after group */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <label className="text-xs text-muted-foreground">Repos après le bloc (s)</label>
          <Input
            type="number"
            min={0}
            value={lastExercise.exercise.rest_seconds || ""}
            onChange={(e) =>
              updateExercise(lastExercise.index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
            }
            className="h-8 text-sm w-24"
          />
        </div>
      </div>
    );
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

                    {/* Linking mode indicator */}
                    {linkingFrom && (
                      <div className={cn(
                        "p-3 rounded-lg space-y-2",
                        getTrainingStyleConfig(linkingFrom.method).bgColor,
                        "border-2",
                        getTrainingStyleConfig(linkingFrom.method).borderColor
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-white", getTrainingStyleConfig(linkingFrom.method).color)}>
                              {getTrainingStyleConfig(linkingFrom.method).label}
                            </Badge>
                            <span className="text-sm font-medium">
                              {selectedForLinking.length}/{linkingFrom.maxCount} exercices
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cliquez sur les exercices à lier ensemble (max {linkingFrom.maxCount})
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={confirmLinking}
                            disabled={selectedForLinking.length < 2}
                            className={cn("text-white", getTrainingStyleConfig(linkingFrom.method).color)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Valider le bloc
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={cancelLinking}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}

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
                        {exerciseGroups.map((group) => renderExerciseGroup(group))}
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
