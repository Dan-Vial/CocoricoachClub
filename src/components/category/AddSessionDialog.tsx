import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { CustomTrainingTypeSelect } from "@/components/category/sessions/CustomTrainingTypeSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, UserCheck, AlertTriangle, Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Library, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EXERCISE_CATEGORIES, getCategoryLabel, getCategoriesForSport, isCategoryForSport } from "@/lib/constants/exerciseCategories";
import { getTrainingTypesForSport, trainingTypeHasExercises } from "@/lib/constants/trainingTypes";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import { SessionGpsImport, type GpsPlayerData } from "@/components/category/gps/SessionGpsImport";
import { SessionBlocksManager, type SessionBlock } from "@/components/category/sessions/SessionBlocksManager";
import { useSessionNotifications } from "@/lib/hooks/useSessionNotifications";

interface AddSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  /** When set, the dialog runs in "athlete mode": player is pre-selected & locked, session is tagged as athlete-created */
  athletePlayerId?: string;
}

interface Exercise {
  exercise_name: string;
  exercise_category: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  notes: string;
  order_index: number;
  library_exercise_id: string | null;
}

const emptyExercise = (index: number): Exercise => ({
  exercise_name: "",
  exercise_category: "upper_push",
  sets: 3,
  reps: 10,
  weight_kg: null,
  rest_seconds: 90,
  notes: "",
  order_index: index,
  library_exercise_id: null,
});

export function AddSessionDialog({
  open,
  onOpenChange,
  categoryId,
  athletePlayerId,
}: AddSessionDialogProps) {
  const isAthleteMode = !!athletePlayerId;
  const { user } = useAuth();
  const { notify } = useSessionNotifications();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSelectionMode, setPlayerSelectionMode] = useState<"all" | "specific">("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExercises, setShowExercises] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLibraryFor, setShowLibraryFor] = useState<number | null>(null);
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false);
  const [gpsData, setGpsData] = useState<GpsPlayerData[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlock[]>([]);
  const queryClient = useQueryClient();
  const exercisesSectionRef = useRef<HTMLDivElement | null>(null);

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
  
  const showExerciseSection = trainingTypeHasExercises(type);
  const hasValidBlocks = sessionBlocks.some((block) => !!block.training_type);

  // When a training type with exercises is selected, ensure UI is ready
  useEffect(() => {
    if (!open || !showExerciseSection) return;
    setShowExercises(true);
    setExercises((prev) => (prev.length === 0 ? [emptyExercise(0)] : prev));
  }, [open, showExerciseSection]);

  const { data: players } = useQuery({
    queryKey: ["players-with-injuries", categoryId],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, name, first_name, position, avatar_url")
        .eq("category_id", categoryId)
        .order("name");
      if (playersError) throw playersError;

      const { data: injuriesData } = await supabase
        .from("injuries")
        .select("player_id")
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"]);

      const injuredPlayerIds = new Set(injuriesData?.map(i => i.player_id) || []);

      return playersData?.map(p => ({
        ...p,
        isInjured: injuredPlayerIds.has(p.id)
      })) || [];
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
    enabled: !!user && open && showExerciseSection,
  });

  const injuredPlayers = players?.filter(p => p.isInjured) || [];
  const healthyPlayers = players?.filter(p => !p.isInjured) || [];

  const filteredLibrary = libraryExercises?.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    // Filter by sport - exclude exercises from other sports
    const matchesSport = isCategoryForSport(ex.category, sportType);
    return matchesSearch && matchesSport;
  }) || [];
  
  // Get categories filtered for the current sport
  const availableCategories = getCategoriesForSport(sportType);

  const addSession = useMutation({
    mutationFn: async () => {
      // Create the session - use first block type if blocks exist, otherwise use selected type
      const mainType = sessionBlocks.length > 0 ? sessionBlocks[0].training_type : type;
      const mainIntensity = sessionBlocks.length > 0 
        ? sessionBlocks.reduce((max, b) => Math.max(max, b.intensity || 0), 0)
        : (intensity ? parseInt(intensity) : null);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert([{
          category_id: categoryId,
          session_date: date,
          session_start_time: startTime || null,
          session_end_time: endTime || null,
          training_type: mainType || "autre",
          intensity: mainIntensity,
          notes: isAthleteMode
            ? (notes ? `[Séance athlète] ${notes}` : "[Séance athlète]")
            : (notes || null),
          ...(isAthleteMode ? { created_by_player_id: athletePlayerId } : {}),
        }])
        .select()
        .single();
      
      if (sessionError) throw sessionError;

      // If session blocks exist, create them
      if (sessionBlocks.length > 0) {
        const blockRecords = sessionBlocks
          .filter(block => block.training_type)
          .map((block, idx) => ({
            training_session_id: sessionData.id,
            block_order: idx,
            start_time: block.start_time || null,
            end_time: block.end_time || null,
            training_type: block.training_type,
            intensity: block.intensity,
            notes: block.notes || null,
            session_type: block.session_type || null,
            objective: block.objective || null,
            target_intensity: block.target_intensity || null,
            volume: block.volume || null,
            contact_charge: block.contact_charge || null,
          }));

        if (blockRecords.length > 0) {
          const { error: blocksError } = await supabase
            .from("training_session_blocks")
            .insert(blockRecords);
          
          if (blocksError) throw blocksError;
        }
      }

      // Determine which players to use
      const playersToUse = isAthleteMode
        ? [athletePlayerId!]
        : playerSelectionMode === "specific" && selectedPlayers.length > 0 
          ? selectedPlayers 
          : players?.map(p => p.id) || [];

      // Create attendance records for selected players (one attendance per session, not per block!)
      if (playersToUse.length > 0) {
        const attendanceRecords = playersToUse.map(playerId => ({
          player_id: playerId,
          category_id: categoryId,
          attendance_date: date,
          training_session_id: sessionData.id,
          status: "present",
        }));

        const { error: attendanceError } = await supabase
          .from("training_attendance")
          .insert(attendanceRecords);
        
        if (attendanceError) throw attendanceError;
      }

      // If exercises were added, create them for each selected player
      const validExercises = exercises.filter(e => e.exercise_name.trim());
      if (validExercises.length > 0 && playersToUse.length > 0) {
        const exerciseRecords = playersToUse.flatMap(playerId => 
          validExercises.map((ex, idx) => ({
            training_session_id: sessionData.id,
            player_id: playerId,
            category_id: categoryId,
            exercise_name: ex.exercise_name,
            exercise_category: ex.exercise_category,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes || null,
            order_index: idx,
            library_exercise_id: ex.library_exercise_id,
          }))
        );

        const { error: exerciseError } = await supabase
          .from("gym_session_exercises")
          .insert(exerciseRecords);
        
        if (exerciseError) throw exerciseError;
      }

      // If GPS data was imported, create GPS session records linked to this session
      const validGpsData = gpsData.filter(d => d.matchedPlayer);
      if (validGpsData.length > 0) {
        const gpsRecords = validGpsData.map(d => ({
          category_id: categoryId,
          player_id: d.matchedPlayer!.id,
          session_date: date,
          session_name: mainType || null,
          training_session_id: sessionData.id,
          source: 'catapult' as const,
          total_distance_m: d.total_distance_m,
          high_speed_distance_m: d.high_speed_distance_m,
          sprint_distance_m: d.sprint_distance_m,
          max_speed_ms: d.max_speed_ms,
          player_load: d.player_load,
          accelerations: d.accelerations,
          decelerations: d.decelerations,
          duration_minutes: d.duration_minutes,
          sprint_count: d.sprint_count,
          raw_data: d.raw_data,
        }));

        const { error: gpsError } = await supabase
          .from("gps_sessions")
          .insert(gpsRecords);
        
        if (gpsError) throw gpsError;
      }

      return sessionData;
    },
    onSuccess: (sessionData) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_exercises"] });
      queryClient.invalidateQueries({ queryKey: ["training_attendance"] });
      queryClient.invalidateQueries({ queryKey: ["gym-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["gps-sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["session-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["tomorrow_sessions_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_attendance_decision", categoryId] });
      if (isAthleteMode) {
        queryClient.invalidateQueries({ queryKey: ["athlete-calendar-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["athlete-space-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["sessions", categoryId] });
      }
      
      const exerciseCount = exercises.filter(e => e.exercise_name.trim()).length;
      const gpsCount = gpsData.filter(d => d.matchedPlayer).length;
      const blockCount = sessionBlocks.filter(b => b.training_type).length;
      
      let toastMessage = "Séance ajoutée";
      if (blockCount > 0) toastMessage += ` avec ${blockCount} bloc(s)`;
      if (exerciseCount > 0) toastMessage += ` et ${exerciseCount} exercice(s)`;
      if (gpsCount > 0) toastMessage += ` et ${gpsCount} données GPS`;
      toast.success(toastMessage);

      // 🔔 Send push notifications to participants (skip in athlete mode)
      if (!isAthleteMode) {
        const mainType = sessionBlocks.length > 0 ? sessionBlocks[0].training_type : type;
        const participantIds = playerSelectionMode === "specific" && selectedPlayers.length > 0
          ? selectedPlayers
          : undefined;
        
        notify({
          action: "created",
          sessionId: sessionData?.id,
          categoryId,
          sessionDate: date,
          sessionStartTime: startTime || null,
          sessionType: mainType,
          participantPlayerIds: participantIds,
        });
      }

      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la séance");
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
    setShowExercises(true);
    setSearchQuery("");
    setShowLibraryFor(null);
    setGpsData([]);
    setSessionBlocks([]);
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

    if (!date) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    if (!hasValidBlocks) {
      toast.error("Veuillez ajouter au moins un bloc thématique");
      return;
    }

    addSession.mutate();
  };
...
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addSession.isPending}>
              {addSession.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      <QuickAddExerciseDialog
        open={showAddExerciseDialog}
        onOpenChange={setShowAddExerciseDialog}
        sportType={sportType}
        onSuccess={(newExercise) => {
          // Add the new exercise to the session
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
