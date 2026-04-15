import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionNotifications } from "@/lib/hooks/useSessionNotifications";
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
import { CustomTrainingTypeSelect } from "@/components/category/sessions/CustomTrainingTypeSelect";
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
  Unlink,
  Check,
  Info,
  GripVertical,
  Minus,
  Timer,
  Repeat,
  ArrowUp,
  ArrowDown,
  Waves,
  Mountain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoriesForSport, isCategoryForSport, isErgCategory, isSledCategory, isRunningCategory, hasSpecialMetrics } from "@/lib/constants/exerciseCategories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTrainingTypesForSport, trainingTypeHasExercises } from "@/lib/constants/trainingTypes";
import { QuickAddExerciseDialog } from "@/components/library/QuickAddExerciseDialog";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { ExerciseLibrarySidebar } from "@/components/category/programs/ExerciseLibrarySidebar";
import {
  TRAINING_STYLES,
  getTrainingStyleConfig,
  isLinkableMethod,
  isCardioBlockMethod,
  isDropMethod,
  isClusterMethod,
  isBlockMethod,
  getMaxExercisesForMethod,
  getMinExercisesForMethod,
  getCardioBlockConfig,
  LINKABLE_METHODS,
  CARDIO_BLOCK_METHODS,
  DROP_METHODS,
  CLUSTER_METHODS,
  SPECIAL_METHODS,
  ALL_BLOCK_METHODS,
} from "@/lib/constants/trainingStyles";
import { SessionGpsImport, type GpsPlayerData } from "@/components/category/gps/SessionGpsImport";
import { GpsObjectivesForm } from "@/components/category/gps/GpsObjectivesForm";
import { isRugbyType, isSkiCategory, isSurfCategory, isPadelCategory, isIndividualSport } from "@/lib/constants/sportTypes";
import { SurfConditionsForm } from "@/components/surf/SurfConditionsForm";
import { SkiConditionsForm } from "@/components/ski/SkiConditionsForm";
import { SessionEquipmentSection } from "@/components/shared/SessionEquipmentSection";
import { TrainingMethodBlock } from "./TrainingMethodBlocks";
import { TrainingMethodSelect } from "./TrainingMethodSelect";
import { SessionTestBlock, type SessionTest } from "./SessionTestBlock";
import { SessionBlocksManager, type SessionBlock } from "./SessionBlocksManager";
import { PrecisionExerciseSelector } from "@/components/precision/PrecisionExerciseSelector";
import { getDisplayNotes, parsePrecisionExerciseFromNotes } from "@/lib/utils/sessionNotes";
import { RUGBY_PRECISION_EXERCISES, EXERCISE_CATEGORIES } from "@/lib/constants/rugbyPrecisionExercises";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  editSession?: any | null;
  defaultDate?: string; // Format: "yyyy-MM-dd"
  /** When set, the dialog runs in "athlete mode": player is pre-selected & locked, session is tagged as athlete-created */
  athletePlayerId?: string;
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

// Running-specific data structure
interface RunningData {
  distance_meters?: number;
  duration_seconds?: number;
  vma_percentage?: number; // % of VMA
  pace_kmh?: number; // pace in km/h
  pace_ms?: number; // pace in m/s
  intervals?: number; // number of intervals
  interval_distance_m?: number; // distance per interval in meters
  interval_duration_s?: number; // duration per interval in seconds
  recovery_time_s?: number; // recovery time between intervals
  recovery_distance_m?: number; // recovery distance between intervals
  elevation_gain_m?: number; // for hill runs
}

interface DropSet {
  reps: string;
  percentage: number;
}

interface ClusterSet {
  reps: number;
  rest_seconds: number;
}

// Block configuration for cardio methods
interface BlockConfig {
  duration_minutes?: number;
  rounds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  rest_between_rounds?: number;
  emom_interval?: number;
  emom_mode?: "single" | "multi";
  time_cap_minutes?: number;
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
  running_data?: RunningData;
  drop_sets?: DropSet[];
  cluster_sets?: ClusterSet[];
  block_config?: BlockConfig;
  tempo?: string;
  contraction_regime?: string;
  target_rpe?: number;
  target_velocity?: number; // VBT - target velocity in m/s
  target_force_newton?: number | null; // Force in Newton
}

const emptyExercise = (index: number, groupId?: string, groupOrder?: number, method?: string): Exercise => ({
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
  set_type: method || "normal",
  group_id: groupId || null,
  group_order: groupOrder,
  erg_data: undefined,
  running_data: undefined,
  drop_sets: undefined,
  cluster_sets: undefined,
  block_config: undefined,
  tempo: undefined,
  contraction_regime: undefined,
  target_rpe: undefined,
});

// Group exercises by group_id for visual grouping
interface ExerciseGroup {
  groupId: string | null;
  exercises: { exercise: Exercise; index: number }[];
  method: string;
  blockConfig?: BlockConfig;
}

const normalizePlayerIds = (ids: Array<string | null | undefined>): string[] =>
  ids.filter((id): id is string => typeof id === "string" && id.length > 0);

const areSameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

// Droppable zone component for exercises
function DroppableExerciseZone({ children, id = "exercise-drop-zone" }: { children: React.ReactNode; id?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full transition-colors rounded-lg",
        isOver && "bg-primary/5 ring-2 ring-primary ring-dashed"
      )}
    >
      {children}
    </div>
  );
}

// Droppable zone for method groups (superset, triset, etc.)
function DroppableGroupZone({ children, groupId, isActive }: { children: React.ReactNode; groupId: string; isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${groupId}`,
    data: { groupId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all rounded-lg",
        isActive && isOver && "ring-2 ring-primary ring-dashed bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

export function SessionFormDialog({
  open,
  onOpenChange,
  categoryId,
  editSession,
  defaultDate,
  athletePlayerId,
}: SessionFormDialogProps) {
  const isAthleteMode = !!athletePlayerId;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { notify } = useSessionNotifications();

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
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [gpsData, setGpsData] = useState<GpsPlayerData[]>([]);
  const [sessionTests, setSessionTests] = useState<SessionTest[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlock[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [precisionExerciseId, setPrecisionExerciseId] = useState<string | null>(null);
  const [precisionExerciseLabel, setPrecisionExerciseLabel] = useState("");
  
  // Block configurations for groups
  const [blockConfigs, setBlockConfigs] = useState<Record<string, BlockConfig>>({});

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
  
  // GPS is only available for Rugby and Football
  const showGpsImport = editSession && (isRugbyType(sportType || "") || (sportType || "").toLowerCase().includes("football"));

  // Fetch players
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

  // Fetch existing session blocks if editing
  const { data: existingBlocks } = useQuery({
    queryKey: ["session-blocks-edit", editSession?.id],
    queryFn: async () => {
      if (!editSession?.id) return [];
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("*")
        .eq("training_session_id", editSession.id)
        .order("block_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!editSession?.id,
  });

  // Fetch existing player attendance if editing
  const { data: existingAttendance } = useQuery({
    queryKey: ["session-attendance-edit", editSession?.id],
    queryFn: async () => {
      if (!editSession?.id) return [];
      const { data, error } = await supabase
        .from("training_attendance")
        .select("player_id")
        .eq("training_session_id", editSession.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!editSession?.id,
  });

  // Fetch event participants for non-training events (medical, video, reunion)
  const isCustomEventType = editSession?.training_type && ["medical", "video_analyse", "reunion"].includes(editSession.training_type);
  const { data: existingEventParticipants } = useQuery({
    queryKey: ["event-participants-edit", editSession?.id],
    queryFn: async () => {
      if (!editSession?.id) return [];
      const { data, error } = await supabase
        .from("event_participants")
        .select("player_id")
        .eq("training_session_id", editSession.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!editSession?.id && !!isCustomEventType,
  });

  // Fetch existing tests linked to this session if editing
  const { data: existingSessionTests } = useQuery({
    queryKey: ["session-tests-edit", editSession?.id],
    queryFn: async () => {
      if (!editSession?.id) return [];
      const { data, error } = await supabase
        .from("generic_tests")
        .select("*")
        .like("notes", `%Session ID: ${editSession.id}%`);
      if (error) throw error;
      return data || [];
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
            blockConfig: blockConfigs[exercise.group_id],
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
  }, [exercises, blockConfigs]);

  // Initialize form when editing or opening
  useEffect(() => {
    if (!open) return;

    setActiveTab("details"); // Always start on details tab

    if (editSession) {
      setDate(editSession.session_date || "");
      setStartTime(editSession.session_start_time || "");
      setEndTime(editSession.session_end_time || "");
      setType(editSession.training_type || "");
      setIntensity(editSession.intensity?.toString() || "");

      const precisionExercise = parsePrecisionExerciseFromNotes(editSession.notes);
      setPrecisionExerciseId(precisionExercise?.id ?? precisionExercise?.label ?? null);
      setPrecisionExerciseLabel(precisionExercise?.label ?? "");
      setNotes(getDisplayNotes(editSession.notes));
      setPlayerSelectionMode((prev) => (prev === "all" ? prev : "all"));
      setSelectedPlayers((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    resetForm();

    // If a default date is provided, use it
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [open, editSession, defaultDate]);

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
          tempo: ex.tempo || undefined,
          contraction_regime: (ex as any).contraction_regime || undefined,
        }))
      );
    } else if (!editSession) {
      setExercises([]);
    }
  }, [existingExercises, editSession]);

  // Load existing blocks when editing
  useEffect(() => {
    if (existingBlocks && existingBlocks.length > 0 && editSession) {
      setSessionBlocks(
        existingBlocks.map((block: any) => ({
          id: block.id,
          training_type: block.training_type,
          intensity: block.intensity || undefined,
          start_time: block.start_time || undefined,
          end_time: block.end_time || undefined,
          notes: block.notes || undefined,
          block_order: block.block_order,
          bowling_exercise_type: block.bowling_exercise_type || undefined,
        }))
      );
    } else if (!editSession) {
      setSessionBlocks([]);
    }
  }, [existingBlocks, editSession]);

  // Load existing player attendance when editing
  useEffect(() => {
    if (!open) return;

    // For custom event types, load from event_participants
    if (isCustomEventType && editSession && players) {
      const participantIds = normalizePlayerIds(
        (existingEventParticipants || []).map((participant) => participant.player_id)
      );

      if (participantIds.length > 0) {
        setPlayerSelectionMode((prev) => (prev === "specific" ? prev : "specific"));
        setSelectedPlayers((prev) => (areSameIds(prev, participantIds) ? prev : participantIds));
        return;
      }
    }

    if (editSession && players) {
      const attendedPlayerIds = normalizePlayerIds(
        (existingAttendance || []).map((attendance) => attendance.player_id)
      );
      const totalPlayers = players.length;

      // If all (or no) players are present, keep mode "all"
      if (attendedPlayerIds.length === 0 || attendedPlayerIds.length === totalPlayers) {
        setPlayerSelectionMode((prev) => (prev === "all" ? prev : "all"));
        setSelectedPlayers((prev) => (prev.length === 0 ? prev : []));
      } else {
        setPlayerSelectionMode((prev) => (prev === "specific" ? prev : "specific"));
        setSelectedPlayers((prev) => (areSameIds(prev, attendedPlayerIds) ? prev : attendedPlayerIds));
      }
      return;
    }

    if (!editSession) {
      setPlayerSelectionMode((prev) => (prev === "all" ? prev : "all"));
      setSelectedPlayers((prev) => (prev.length === 0 ? prev : []));
    }
  }, [open, existingAttendance, existingEventParticipants, isCustomEventType, editSession, players]);

  // Load existing tests when editing - from generic_tests OR from session notes config
  useEffect(() => {
    if (!editSession) {
      setSessionTests((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const shouldKeepExistingTests = (currentTests: SessionTest[], nextTests: SessionTest[]) => {
      return (
        currentTests.length === nextTests.length &&
        currentTests.every(
          (existing, index) =>
            existing.test_category === nextTests[index]?.test_category &&
            existing.test_type === nextTests[index]?.test_type
        )
      );
    };

    // If we have saved results in generic_tests, load them
    if (existingSessionTests && existingSessionTests.length > 0) {
      const testGroups = new Map<string, SessionTest>();
      existingSessionTests.forEach((t) => {
        const key = `${t.test_category}__${t.test_type}`;
        if (!testGroups.has(key)) {
          testGroups.set(key, {
            id: key,
            test_category: t.test_category,
            test_type: t.test_type,
            result_unit: t.result_unit || "",
            player_results: {},
          });
        }
        const group = testGroups.get(key)!;
        if (t.player_id && t.result_value != null) {
          group.player_results[t.player_id] = t.result_value.toString();
        }
      });

      const nextTests = Array.from(testGroups.values());
      setSessionTests((prev) => (shouldKeepExistingTests(prev, nextTests) ? prev : nextTests));
      return;
    }

    // Fallback: parse test config from session notes (<!--TESTS:[...]-->)
    const rawNotes = editSession.notes || "";
    const match = rawNotes.match(/<!--TESTS:(.*?)-->/);
    if (match) {
      try {
        const config = JSON.parse(match[1]) as { test_category: string; test_type: string; result_unit: string }[];
        if (config.length > 0) {
          const nextTests = config.map((testConfig) => ({
            id: `${testConfig.test_category}__${testConfig.test_type}`,
            test_category: testConfig.test_category,
            test_type: testConfig.test_type,
            result_unit: testConfig.result_unit || "",
            player_results: {},
          }));

          setSessionTests((prev) => (shouldKeepExistingTests(prev, nextTests) ? prev : nextTests));
          return;
        }
      } catch {
        // Invalid notes format, fallback to empty
      }
    }

    setSessionTests((prev) => (prev.length === 0 ? prev : []));
  }, [existingSessionTests, editSession]);

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
      // Use first block type if blocks exist, otherwise use selected type
      const mainType = sessionBlocks.length > 0 ? sessionBlocks[0].training_type : type;
      const rawIntensity = sessionBlocks.length > 0 
        ? sessionBlocks.reduce((max, b) => Math.max(max, b.intensity || 0), 0)
        : (intensity ? parseInt(intensity) : null);
      const mainIntensity = rawIntensity && rawIntensity >= 1 && rawIntensity <= 10 ? rawIntensity : null;

      // Build notes with embedded test config for test sessions
      let finalNotes = notes || "";
      if (mainType === "precision" && precisionExerciseLabel) {
        finalNotes =
          (finalNotes ? `${finalNotes}\n` : "") +
          `<!--PRECISION_EXERCISE:${JSON.stringify({ id: precisionExerciseId, label: precisionExerciseLabel })}-->`;
      }
      if (sessionTests.length > 0) {
        const testConfig = sessionTests
          .filter(t => t.test_type)
          .map(t => ({ test_category: t.test_category, test_type: t.test_type, result_unit: t.result_unit }));
        if (testConfig.length > 0) {
          finalNotes = (finalNotes ? finalNotes + "\n" : "") + `<!--TESTS:${JSON.stringify(testConfig)}-->`;
        }
      }

      // --- ATHLETE MODE: use edge function ---
      if (isAthleteMode) {
        if (!athletePlayerId) throw new Error("Session expirée. Reconnecte-toi.");
        const { data: authData } = await supabase.auth.getSession();
        const accessToken = authData.session?.access_token;
        if (!accessToken) throw new Error("Session expirée. Reconnecte-toi.");

        const athleteBlocks = sessionBlocks
          .filter((block) => block.training_type)
          .map((block, idx) => ({
            block_order: idx,
            start_time: block.start_time || null,
            end_time: block.end_time || null,
            training_type: block.training_type,
            intensity: block.intensity ?? null,
            notes: block.notes || null,
            session_type: block.session_type || null,
            objective: block.objective || null,
            target_intensity: block.target_intensity || null,
            volume: block.volume || null,
            contact_charge: block.contact_charge || null,
            bowling_exercise_type: block.bowling_exercise_type || null,
          }));

        const validExercisesForAthlete = exercises
          .filter(e => e.exercise_name.trim())
          .map((ex, idx) => ({
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
          }));

        const { data: payload, error } = await supabase.functions.invoke("athlete-create-session", {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            category_id: categoryId,
            player_id: athletePlayerId,
            session_date: date,
            session_start_time: startTime || null,
            session_end_time: endTime || null,
            training_type: mainType || "autre",
            intensity: mainIntensity,
            notes: finalNotes || null,
            session_blocks: athleteBlocks,
            exercises: validExercisesForAthlete,
          },
        });

        if (error) throw new Error(error.message || "Erreur lors de la création de la séance");
        if (!payload?.success) throw new Error(payload?.error || "Erreur lors de la création de la séance");
        return payload.session_id;
      }

      // --- STAFF MODE ---
      const sessionData = {
        category_id: categoryId,
        session_date: date,
        session_start_time: startTime || null,
        session_end_time: endTime || null,
        training_type: mainType || "autre" as any,
        intensity: mainIntensity,
        planned_intensity: mainIntensity,
        notes: finalNotes || null,
      };

      let sessionId = editSession?.id;

      if (editSession) {
        const { error } = await supabase
          .from("training_sessions")
          .update(sessionData)
          .eq("id", editSession.id);
        if (error) throw error;

        // Delete existing blocks and exercises when editing
        await supabase
          .from("training_session_blocks")
          .delete()
          .eq("training_session_id", editSession.id);

        await supabase
          .from("gym_session_exercises")
          .delete()
          .eq("training_session_id", editSession.id);

        // Delete existing tests linked to this session
        await supabase
          .from("generic_tests")
          .delete()
          .like("notes", `%Session ID: ${editSession.id}%`);

        // Update attendance records when editing
        await supabase
          .from("training_attendance")
          .delete()
          .eq("training_session_id", editSession.id);

        const playersToUse =
          playerSelectionMode === "specific" && selectedPlayers.length > 0
            ? selectedPlayers
            : players?.map((p) => p.id) || [];

        if (playersToUse.length > 0) {
          const attendanceRecords = playersToUse.map((playerId) => ({
            player_id: playerId,
            category_id: categoryId,
            attendance_date: date,
            training_session_id: sessionId!,
            status: "present",
          }));

          await supabase.from("training_attendance").insert(attendanceRecords);
        }
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

      // Sync event_participants for custom event types
      const customTypes = ["medical", "video_analyse", "reunion"];
      const currentType = mainType || "autre";
      if (customTypes.includes(currentType)) {
        // Delete existing participants
        await supabase
          .from("event_participants")
          .delete()
          .eq("training_session_id", sessionId!);

        // Insert selected participants
        const participantsToSave =
          playerSelectionMode === "specific" && selectedPlayers.length > 0
            ? selectedPlayers
            : [];

        if (participantsToSave.length > 0) {
          await supabase.from("event_participants").insert(
            participantsToSave.map(playerId => ({
              training_session_id: sessionId!,
              player_id: playerId,
            }))
          );
        }
      }

      // If session blocks exist, create them
      if (sessionBlocks.length > 0) {
        const blockRecords = sessionBlocks
          .filter(block => block.training_type)
          .map((block, idx) => ({
            training_session_id: sessionId,
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
            bowling_exercise_type: block.bowling_exercise_type || null,
          }));

        if (blockRecords.length > 0) {
          const { error: blocksError } = await supabase
            .from("training_session_blocks")
            .insert(blockRecords);
          
          if (blocksError) throw blocksError;
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
              tempo: ex.tempo || null,
              contraction_regime: ex.contraction_regime || null,
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

      // Save GPS data if provided (only when editing)
      if (editSession && gpsData.length > 0) {
        const matchedGpsData = gpsData.filter(d => d.matchedPlayer);
        if (matchedGpsData.length > 0) {
          const gpsRecords = matchedGpsData.map(d => ({
            player_id: d.matchedPlayer!.id,
            category_id: categoryId,
            session_date: date,
            training_session_id: sessionId,
            source: 'csv_import',
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

          await supabase.from("gps_sessions").insert(gpsRecords);
        }
      }

      // Test config is stored in session notes - no need to save results during creation
      // Results will be entered later via the feedback dialog

      return sessionId;
    },
    onSuccess: (returnedSessionId) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_exercises"] });
      queryClient.invalidateQueries({ queryKey: ["today_session_tests"] });
      queryClient.invalidateQueries({ queryKey: ["training_attendance"] });
      queryClient.invalidateQueries({ queryKey: ["session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["session-attendance-edit"] });
      queryClient.invalidateQueries({ queryKey: ["gym-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["gps-sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["event-participants-edit"] });
      queryClient.invalidateQueries({ queryKey: ["generic_tests", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["generic_tests_discovery", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["generic-tests-evolution", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["generic-tests-multi-comparison", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["session-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["session-blocks-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["session-blocks-edit"] });
      queryClient.invalidateQueries({ queryKey: ["sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["tomorrow_sessions_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_attendance_decision", categoryId] });
      if (isAthleteMode) {
        queryClient.invalidateQueries({ queryKey: ["athlete-calendar-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["athlete-space-sessions"] });
      }
      
      const exerciseCount = exercises.filter((e) => e.exercise_name.trim()).length;
      const gpsCount = gpsData.filter(d => d.matchedPlayer).length;
      const testCount = sessionTests.filter(t => t.test_type && Object.values(t.player_results).some(v => v)).length;
      const blockCount = sessionBlocks.filter(b => b.training_type).length;
      
      let successMessage = isAthleteMode ? "Séance ajoutée" : (editSession ? "Séance modifiée" : "Séance créée");
      if (blockCount > 0) successMessage += ` avec ${blockCount} bloc(s)`;
      if (exerciseCount > 0) successMessage += ` et ${exerciseCount} exercice(s)`;
      if (testCount > 0) successMessage += ` et ${testCount} test(s)`;
      if (gpsCount > 0) successMessage += ` + ${gpsCount} données GPS`;
      
      toast.success(successMessage);

      // 🔔 Send push notifications to participants (creation only, staff mode)
      if (!isAthleteMode && !editSession && returnedSessionId) {
        const mainType = sessionBlocks.length > 0 ? sessionBlocks[0].training_type : type;
        const participantIds = playerSelectionMode === "specific" && selectedPlayers.length > 0
          ? selectedPlayers
          : undefined;
        
        notify({
          action: "created",
          sessionId: returnedSessionId,
          categoryId,
          sessionDate: date,
          sessionStartTime: startTime || null,
          sessionType: mainType,
          participantPlayerIds: participantIds,
        });
      }

      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("[SessionFormDialog] Save error:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
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
    setBlockConfigs({});
    setGpsData([]);
    setSessionTests([]);
    setSessionBlocks([]);
    setPrecisionExerciseId(null);
    setPrecisionExerciseLabel("");
    setActiveTab("details");
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType !== "precision") {
      setPrecisionExerciseId(null);
      setPrecisionExerciseLabel("");
    }
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

    // Validate: athlete mode uses type, staff mode uses blocks
    if (isAthleteMode) {
      if (date && type) {
        saveSession.mutate();
      } else if (!type) {
        toast.error("Veuillez sélectionner un type de séance");
      }
    } else {
      const hasValidBlocks = sessionBlocks.length > 0 && sessionBlocks.some(b => b.training_type);
      if (date && hasValidBlocks) {
        saveSession.mutate();
      } else if (!hasValidBlocks) {
        toast.error("Veuillez ajouter au moins un bloc thématique");
      }
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

  // Create a block with empty exercises for linked methods
  const createMethodBlock = (method: string) => {
    const groupId = crypto.randomUUID();
    const startIndex = exercises.length;
    
    // For pyramid methods, 5x5, and death_by, we only need 1 exercise
    const isPyramidOrSpecial = isDropMethod(method) || method === "five_by_five" || method === "death_by" || method === "vbt" || SPECIAL_METHODS.includes(method);
    const minExercises = isPyramidOrSpecial ? 1 : getMinExercisesForMethod(method);
    
    let newExercises: Exercise[];
    
    if (isPyramidOrSpecial) {
      // Create a single exercise with drop_sets for pyramids
      const exercise = emptyExercise(startIndex, groupId, 1, method);
      
      if (isDropMethod(method)) {
        // Initialize drop sets based on method
        const baseReps = 10;
        const basePercentage = 70;
        let dropSets: { reps: string; percentage: number }[] = [];
        
        if (method === "pyramid_up") {
          dropSets = [
            { reps: "12", percentage: 60 },
            { reps: "10", percentage: 70 },
            { reps: "8", percentage: 80 },
          ];
        } else if (method === "pyramid_down") {
          dropSets = [
            { reps: "6", percentage: 85 },
            { reps: "8", percentage: 75 },
            { reps: "12", percentage: 65 },
          ];
        } else if (method === "pyramid_full") {
          dropSets = [
            { reps: "12", percentage: 60 },
            { reps: "10", percentage: 70 },
            { reps: "8", percentage: 80 },
            { reps: "10", percentage: 70 },
            { reps: "12", percentage: 60 },
          ];
        } else if (method === "drop_set") {
          dropSets = [
            { reps: "10", percentage: 80 },
            { reps: "10", percentage: 70 },
            { reps: "10", percentage: 60 },
          ];
        }
        
        exercise.drop_sets = dropSets;
        exercise.sets = dropSets.length;
      } else if (method === "five_by_five") {
        exercise.sets = 5;
        exercise.reps = "5";
        exercise.weight_percent_rm = 80;
      }
      // death_by just uses default settings
      
      newExercises = [exercise];
    } else {
      newExercises = Array.from({ length: minExercises }, (_, i) => 
        emptyExercise(startIndex + i, groupId, i + 1, method)
      );
    }
    
    // Initialize block config for cardio methods
    if (isCardioBlockMethod(method)) {
      const config = getCardioBlockConfig(method);
      const defaultBlockConfig: BlockConfig = {
        duration_minutes: config.showDuration ? 10 : undefined,
        rounds: method === "tabata" ? 8 : (config.showRounds ? 3 : undefined),
        work_seconds: config.showWorkRest ? 20 : undefined,
        rest_seconds: config.showWorkRest ? 10 : undefined,
        emom_interval: method === "emom" ? 1 : undefined,
        emom_mode: method === "emom" ? "single" : undefined,
      };
      setBlockConfigs(prev => ({ ...prev, [groupId]: defaultBlockConfig }));
    }
    
    setExercises([...exercises, ...newExercises]);
  };

  // Replace a single exercise with a method block (avoids stale state from separate remove+create)
  const replaceExerciseWithMethodBlock = (indexToRemove: number, method: string) => {
    const groupId = crypto.randomUUID();
    const remainingExercises = exercises.filter((_, i) => i !== indexToRemove)
      .map((e, i) => ({ ...e, order_index: i }));
    const startIndex = remainingExercises.length;

    const isPyramidOrSpecial = isDropMethod(method) || method === "five_by_five" || method === "death_by" || method === "vbt" || SPECIAL_METHODS.includes(method);
    const minExercises = isPyramidOrSpecial ? 1 : getMinExercisesForMethod(method);

    let newExercises: Exercise[];
    if (isPyramidOrSpecial) {
      const exercise = emptyExercise(startIndex, groupId, 1, method);
      if (isDropMethod(method)) {
        let dropSets: { reps: string; percentage: number }[] = [];
        if (method === "pyramid_up") dropSets = [{ reps: "12", percentage: 60 }, { reps: "10", percentage: 70 }, { reps: "8", percentage: 80 }];
        else if (method === "pyramid_down") dropSets = [{ reps: "6", percentage: 85 }, { reps: "8", percentage: 75 }, { reps: "12", percentage: 65 }];
        else if (method === "pyramid_full") dropSets = [{ reps: "12", percentage: 60 }, { reps: "10", percentage: 70 }, { reps: "8", percentage: 80 }, { reps: "10", percentage: 70 }, { reps: "12", percentage: 60 }];
        else if (method === "drop_set") dropSets = [{ reps: "10", percentage: 80 }, { reps: "10", percentage: 70 }, { reps: "10", percentage: 60 }];
        exercise.drop_sets = dropSets;
        exercise.sets = dropSets.length;
      } else if (method === "five_by_five") {
        exercise.sets = 5; exercise.reps = "5"; exercise.weight_percent_rm = 80;
      }
      newExercises = [exercise];
    } else {
      newExercises = Array.from({ length: minExercises }, (_, i) =>
        emptyExercise(startIndex + i, groupId, i + 1, method)
      );
    }

    if (isCardioBlockMethod(method)) {
      const config = getCardioBlockConfig(method);
      const defaultBlockConfig: BlockConfig = {
        duration_minutes: config.showDuration ? (method === "emom" ? minExercises : 10) : undefined,
        rounds: method === "tabata" ? 8 : (config.showRounds ? 3 : undefined),
        work_seconds: config.showWorkRest ? 20 : undefined,
        rest_seconds: config.showWorkRest ? 10 : undefined,
        emom_interval: method === "emom" ? 1 : undefined,
        emom_mode: method === "emom" ? "single" : undefined,
      };
      setBlockConfigs(prev => ({ ...prev, [groupId]: defaultBlockConfig }));
    }

    setExercises([...remainingExercises, ...newExercises]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveExercise(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveExercise(null);
    const { active, over } = event;

    if (!over) return;

    const droppedExercise = active.data.current;
    if (!droppedExercise) return;

    const overId = String(over.id);
    
    // Check if dropped on a group zone
    if (overId.startsWith("group-")) {
      const groupId = overId.replace("group-", "");
      const groupExercises = exercises.filter(e => e.group_id === groupId);
      const groupMethod = groupExercises[0]?.set_type || "normal";
      const maxExercises = getMaxExercisesForMethod(groupMethod);
      
      if (groupExercises.length >= maxExercises) {
        toast.error(`Maximum ${maxExercises} exercices pour cette méthode`);
        return;
      }
      
      const newExercise: Exercise = {
        exercise_name: droppedExercise.name,
        exercise_category: droppedExercise.category,
        sets: 3,
        reps: "10",
        weight_kg: null,
        weight_percent_rm: null,
        weight_mode: "kg",
        rest_seconds: 90,
        notes: "",
        order_index: exercises.length,
        library_exercise_id: droppedExercise.id,
        set_type: groupMethod,
        group_id: groupId,
        group_order: groupExercises.length + 1,
        erg_data: undefined,
        drop_sets: undefined,
        cluster_sets: undefined,
        block_config: undefined,
      };
      
      setExercises([...exercises, newExercise]);
      toast.success(`${droppedExercise.name} ajouté au bloc`);
      return;
    }

    // Add the dropped exercise to the list (normal drop)
    const newExercise: Exercise = {
      exercise_name: droppedExercise.name,
      exercise_category: droppedExercise.category,
      sets: 3,
      reps: "10",
      weight_kg: null,
      weight_percent_rm: null,
      weight_mode: "kg",
      rest_seconds: 90,
      notes: "",
      order_index: exercises.length,
      library_exercise_id: droppedExercise.id,
      set_type: "normal",
      group_id: null,
      group_order: undefined,
      erg_data: undefined,
      drop_sets: undefined,
      cluster_sets: undefined,
      block_config: undefined,
    };

    setExercises([...exercises, newExercise]);
    toast.success(`${droppedExercise.name} ajouté`);
  };

  const removeExercise = (index: number) => {
    const exerciseToDelete = exercises[index];
    let newExercises = exercises.filter((_, i) => i !== index);

    if (exerciseToDelete.group_id) {
      const groupExercises = newExercises.filter(
        (e) => e.group_id === exerciseToDelete.group_id
      );
      if (groupExercises.length < 2) {
        // Remove block config if group is dissolved
        if (blockConfigs[exerciseToDelete.group_id]) {
          setBlockConfigs(prev => {
            const next = { ...prev };
            delete next[exerciseToDelete.group_id!];
            return next;
          });
        }
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
        // Auto-recalculate EMOM duration when removing exercise
        if (exerciseToDelete.set_type === "emom" && exerciseToDelete.group_id) {
          const remainingCount = newExercises.filter(e => e.group_id === exerciseToDelete.group_id).length;
          const config = blockConfigs[exerciseToDelete.group_id] || {};
          const interval = config.emom_interval || 1;
          setBlockConfigs(prev => ({
            ...prev,
            [exerciseToDelete.group_id!]: { ...prev[exerciseToDelete.group_id!], duration_minutes: remainingCount * interval },
          }));
        }
      }
    }

    setExercises(newExercises.map((e, i) => ({ ...e, order_index: i })));
  };

  const duplicateExercise = (index: number) => {
    const exercise = { ...exercises[index], order_index: exercises.length, id: undefined, group_id: null, group_order: undefined, set_type: "normal" };
    setExercises([...exercises, exercise]);
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const updated = [...exercises];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setExercises(updated.map((e, i) => ({ ...e, order_index: i })));
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

  // Add exercise to existing group
  const addExerciseToGroup = (groupId: string, method: string) => {
    const groupExercises = exercises.filter(e => e.group_id === groupId);
    const maxExercises = getMaxExercisesForMethod(method);
    
    if (groupExercises.length >= maxExercises) {
      toast.error(`Maximum ${maxExercises} exercices pour cette méthode`);
      return;
    }
    
    const newExercise = emptyExercise(
      exercises.length,
      groupId,
      groupExercises.length + 1,
      method
    );
    
    setExercises([...exercises, newExercise]);

    // Auto-calculate EMOM duration based on exercise count
    if (method === "emom") {
      const newCount = groupExercises.length + 1;
      const config = blockConfigs[groupId] || {};
      const interval = config.emom_interval || 1;
      setBlockConfigs(prev => ({
        ...prev,
        [groupId]: { ...prev[groupId], duration_minutes: newCount * interval },
      }));
    }
  };

  const unlinkGroup = (groupId: string) => {
    // Remove block config
    setBlockConfigs(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    
    const newExercises = exercises.map((ex) => {
      if (ex.group_id === groupId) {
        return { ...ex, group_id: null, group_order: undefined, set_type: "normal" };
      }
      return ex;
    });
    setExercises(newExercises);
  };

  const updateBlockConfig = (groupId: string, field: keyof BlockConfig, value: number | undefined) => {
    setBlockConfigs(prev => ({
      ...prev,
      [groupId]: { ...prev[groupId], [field]: value },
    }));
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

  // Render exercise card based on method
  const renderExerciseCard = (
    exercise: Exercise,
    index: number,
    isGrouped: boolean,
    exerciseNumber?: number,
    groupMethod?: string
  ) => {
    const styleConfig = getTrainingStyleConfig(exercise.set_type);
    const dropMode = isDropMethod(exercise.set_type);
    const clusterMode = isClusterMethod(exercise.set_type);
    const isCardioBlock = isCardioBlockMethod(groupMethod || exercise.set_type);
    const cardioConfig = isCardioBlock ? getCardioBlockConfig(groupMethod || exercise.set_type) : null;

    return (
      <div
        className={cn(
          "flex flex-col gap-3 p-3 rounded-lg border transition-all bg-background",
          isGrouped && "border-dashed"
        )}
      >
        {/* Exercise header */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          
          {isGrouped && exerciseNumber && (
            <Badge className={cn("text-white text-xs", styleConfig.color || "bg-primary")}>
              Ex. {exerciseNumber}
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
                className="p-1 w-[min(400px,90vw)] max-h-64 overflow-y-auto z-50"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {filteredLibrary.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    Aucun exercice trouvé
                  </div>
                ) : (
                  filteredLibrary.slice(0, 15).map((libEx) => (
                    <button
                      key={libEx.id}
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-muted rounded-sm text-sm flex items-start gap-2"
                      onClick={() => selectFromLibrary(index, libEx)}
                    >
                      <span className="break-words min-w-0 flex-1">{libEx.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
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

          {!isGrouped && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveExercise(index, "up")}
                disabled={index === 0}
                title="Monter"
                className="h-7 w-7"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveExercise(index, "down")}
                disabled={index === exercises.length - 1}
                title="Descendre"
                className="h-7 w-7"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </>
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

        {/* Row 1: Category selection */}
        <div className="grid grid-cols-2 gap-2">
           {!isGrouped && (
             <div>
               <Label className="text-xs text-muted-foreground">Méthode</Label>
               <TrainingMethodSelect
                 value={exercise.set_type}
                  onValueChange={(v) => {
                    if (LINKABLE_METHODS.includes(v) || CARDIO_BLOCK_METHODS.includes(v) || SPECIAL_METHODS.includes(v)) {
                      // Replace current exercise with a new method block in a single state update
                      replaceExerciseWithMethodBlock(index, v);
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
                 showColorDot
               />
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
        {isSledCategory(exercise.exercise_category) ? (
          // Sled-specific inputs (distance in meters)
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Séries</Label>
              <Input
                type="number"
                min="1"
                className="h-8 text-xs"
                placeholder="4"
                value={exercise.sets || ""}
                onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Distance (m)</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                placeholder="25"
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
              <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                placeholder="50"
                value={exercise.weight_kg || ""}
                onChange={(e) =>
                  updateExercise(index, "weight_kg", e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Repos (s)</Label>
              <Input
                type="number"
                min="0"
                className="h-8 text-xs"
                placeholder="90"
                value={exercise.rest_seconds || ""}
                onChange={(e) =>
                  updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
          </div>
        ) : isErgCategory(exercise.exercise_category) ? (
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
            {(exercise.exercise_category === "ergo_rowerg" || exercise.exercise_name.toLowerCase().includes("row")) && (
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
          </div>
        ) : isRunningCategory(exercise.exercise_category) ? (
          // Running-specific inputs
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">% VMA</Label>
                <Input
                  type="number"
                  min="0"
                  max="130"
                  className="h-8 text-xs"
                  placeholder="85"
                  value={exercise.running_data?.vma_percentage || ""}
                  onChange={(e) =>
                    updateExercise(index, "running_data", {
                      ...exercise.running_data,
                      vma_percentage: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure (km/h)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-8 text-xs"
                  placeholder="12.5"
                  value={exercise.running_data?.pace_kmh || ""}
                  onChange={(e) =>
                    updateExercise(index, "running_data", {
                      ...exercise.running_data,
                      pace_kmh: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure (m/s)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-8 text-xs"
                  placeholder="3.5"
                  value={exercise.running_data?.pace_ms || ""}
                  onChange={(e) =>
                    updateExercise(index, "running_data", {
                      ...exercise.running_data,
                      pace_ms: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Durée (s)</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-8 text-xs"
                  placeholder="1200"
                  value={exercise.running_data?.duration_seconds || ""}
                  onChange={(e) =>
                    updateExercise(index, "running_data", {
                      ...exercise.running_data,
                      duration_seconds: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            
            {/* Second row: interval-specific fields */}
            {(exercise.exercise_category === "running_fractionne" || 
              exercise.exercise_category === "running_vma" ||
              exercise.exercise_category === "running_sprint") && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Répétitions</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                    placeholder="8"
                    value={exercise.running_data?.intervals || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        intervals: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dist./rep (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="400"
                    value={exercise.running_data?.interval_distance_m || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        interval_distance_m: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Durée/rep (s)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="60"
                    value={exercise.running_data?.interval_duration_s || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        interval_duration_s: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Récup (s)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="60"
                    value={exercise.running_data?.recovery_time_s || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        recovery_time_s: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Récup (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="200"
                    value={exercise.running_data?.recovery_distance_m || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        recovery_distance_m: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
            
            {/* Hill running specific: elevation gain */}
            {exercise.exercise_category === "running_cote" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Distance (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="100"
                    value={exercise.running_data?.distance_meters || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dénivelé (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="30"
                    value={exercise.running_data?.elevation_gain_m || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        elevation_gain_m: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
            
            {/* Continuous running specific: total distance */}
            {(exercise.exercise_category === "running_ef" || 
              exercise.exercise_category === "running_seuil" ||
              exercise.exercise_category === "running_tempo" ||
              exercise.exercise_category === "running_recup" ||
              exercise.exercise_category === "running_fartlek") && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Distance totale (m)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="5000"
                    value={exercise.running_data?.distance_meters || ""}
                    onChange={(e) =>
                      updateExercise(index, "running_data", {
                        ...exercise.running_data,
                        distance_meters: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Repos après (s)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="120"
                    value={exercise.rest_seconds || ""}
                    onChange={(e) =>
                      updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
              </div>
            )}
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
        ) : isCardioBlock && cardioConfig ? (
          // Cardio block exercise - only show reps if needed
          <div className="grid grid-cols-2 gap-2">
            {cardioConfig.showReps && (
              <div>
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input
                  className="h-8 text-xs"
                  value={exercise.reps || ""}
                  onChange={(e) => updateExercise(index, "reps", e.target.value)}
                  placeholder="10"
                />
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
        ) : exercise.set_type === "vbt" ? (
          // VBT: Sets, Reps, Weight (kg), Velocity min, Velocity max, Rest
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Séries</Label>
              <Input
                type="number"
                min="1"
                className="h-8 text-xs"
                value={exercise.sets}
                onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reps</Label>
              <Input
                className="h-8 text-xs"
                value={exercise.reps || ""}
                onChange={(e) => updateExercise(index, "reps", e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
              <Input
                type="number"
                step="0.5"
                className="h-8 text-xs"
                placeholder="kg"
                value={exercise.weight_kg || ""}
                onChange={(e) => updateExercise(index, "weight_kg", e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">V. min (m/s)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-8 text-xs"
                placeholder="0.8"
                value={exercise.target_velocity || ""}
                onChange={(e) => updateExercise(index, "target_velocity", e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">V. max (m/s)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-8 text-xs"
                placeholder="1.0"
                value={exercise.target_rpe || ""}
                onChange={(e) => updateExercise(index, "target_rpe", e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            {!isGrouped && (
              <div>
                <Label className="text-xs text-muted-foreground">Repos (sec)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={exercise.rest_seconds || ""}
                  onChange={(e) => updateExercise(index, "rest_seconds", e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            )}
          </div>
        ) : (
          // Standard Sets, Reps, Weight, Rest
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
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
            {/* VBT toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  exercise.target_velocity != null || exercise.target_rpe != null
                    ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                    : "bg-muted border-border text-muted-foreground hover:border-emerald-300"
                }`}
                onClick={() => {
                  if (exercise.target_velocity != null || exercise.target_rpe != null) {
                    updateMultipleFields(index, { target_velocity: undefined, target_rpe: undefined });
                  } else {
                    updateMultipleFields(index, { target_velocity: 0.8, target_rpe: 1.0 });
                  }
                }}
              >
                ⚡ VBT
              </button>
              {(exercise.target_velocity != null || exercise.target_rpe != null) && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">V. min</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-7 text-xs w-20"
                      placeholder="0.8"
                      value={exercise.target_velocity || ""}
                      onChange={(e) => updateExercise(index, "target_velocity", e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">V. max</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-7 text-xs w-20"
                      placeholder="1.0"
                      value={exercise.target_rpe || ""}
                      onChange={(e) => updateExercise(index, "target_rpe", e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">m/s</span>
                </div>
              )}
              {/* Force (N) toggle */}
              <button
                type="button"
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  exercise.target_force_newton != null
                    ? "bg-amber-100 border-amber-400 text-amber-700"
                    : "bg-muted border-border text-muted-foreground hover:border-amber-300"
                }`}
                onClick={() => {
                  if (exercise.target_force_newton != null) {
                    updateExercise(index, "target_force_newton", undefined);
                  } else {
                    updateExercise(index, "target_force_newton", 0);
                  }
                }}
              >
                💪 Force
              </button>
              {exercise.target_force_newton != null && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="h-7 text-xs w-24"
                    placeholder="500"
                    value={exercise.target_force_newton || ""}
                    onChange={(e) => updateExercise(index, "target_force_newton", e.target.value ? parseFloat(e.target.value) : null)}
                  />
                  <span className="text-[10px] text-muted-foreground">N</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tempo + Contraction Regime */}
        {!isCardioBlock && exercise.exercise_name && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Tempo</Label>
              <Input
                className="h-8 text-xs"
                placeholder="3-1-2-0"
                value={exercise.tempo || ""}
                onChange={(e) => updateExercise(index, "tempo", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Régime de contraction</Label>
              <Select
                value={exercise.contraction_regime || ""}
                onValueChange={(v) => updateExercise(index, "contraction_regime", v || undefined)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concentrique">Concentrique</SelectItem>
                  <SelectItem value="excentrique">Excentrique</SelectItem>
                  <SelectItem value="isometrique">Isométrique</SelectItem>
                  <SelectItem value="pliometrique">Pliométrique</SelectItem>
                  <SelectItem value="stato_dynamique">Stato-dynamique</SelectItem>
                  <SelectItem value="concentrique_excentrique">Concentrique + Excentrique</SelectItem>
                  <SelectItem value="excentrique_surcharge">Excentrique surchargé</SelectItem>
                  <SelectItem value="balistique">Balistique</SelectItem>
                  <SelectItem value="isokinetique">Isocinétique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Notes for non-cardio exercises */}
        {!isCardioBlock && (
          <div>
            <Label className="text-xs text-muted-foreground">Notes / Consignes</Label>
            <Textarea
              className="min-h-[40px] text-xs resize-y"
              placeholder="Consignes, explications de la méthode, points clés..."
              value={exercise.notes}
              onChange={(e) => updateExercise(index, "notes", e.target.value)}
              rows={2}
            />
          </div>
        )}
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

    const maxExercises = getMaxExercisesForMethod(group.method);
    const canAcceptMore = group.exercises.length < maxExercises;
    const blockConfig = blockConfigs[group.groupId] || {};

    // Use new TrainingMethodBlock component for block methods
    return (
      <DroppableGroupZone 
        key={group.groupId} 
        groupId={group.groupId} 
        isActive={!!activeExercise && canAcceptMore}
      >
        <TrainingMethodBlock
          method={group.method}
          groupId={group.groupId}
          exercises={group.exercises}
          blockConfig={blockConfig}
          onUpdateExercise={updateExercise}
          onUpdateMultipleFields={updateMultipleFields}
          onRemoveExercise={removeExercise}
          onAddExerciseToGroup={addExerciseToGroup}
          onUnlinkGroup={unlinkGroup}
          onUpdateBlockConfig={updateBlockConfig}
          onSelectFromLibrary={selectFromLibrary}
          filteredLibrary={filteredLibrary}
          availableCategories={availableCategories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showLibraryFor={showLibraryFor}
          setShowLibraryFor={setShowLibraryFor}
        />
      </DroppableGroupZone>
    );
  };

  // Render block creation buttons
  const renderBlockCreationButtons = () => {
    const methodGroups = [
      { label: "📋 Classique", methods: LINKABLE_METHODS },
      { label: "💪 Intensification", methods: [...DROP_METHODS, "five_by_five", "super_pletnev", "combine_haltero", "bulgarian"] },
      { label: "⚡ Spéciales", methods: ["vbt", "isometric_overcoming", "isometric_yielding", "iso_max", "stato_dynamique"] },
      { label: "🏃 Cardio", methods: CARDIO_BLOCK_METHODS },
    ];

    // Deduplicate (bulgarian is in both LINKABLE and intensification)
    const seen = new Set<string>();

    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Créer un bloc d'exercices</Label>
        <div className="space-y-2">
          <TooltipProvider delayDuration={200}>
            {methodGroups.map(group => {
              const styles = group.methods
                .filter(m => { if (seen.has(m)) return false; seen.add(m); return true; })
                .map(m => getTrainingStyleConfig(m));
              if (styles.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {styles.map(style => (
                      <Tooltip key={style.value}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => createMethodBlock(style.value)}
                            className={cn(
                              "text-xs h-7 px-2",
                              style.borderColor,
                              "hover:bg-opacity-20"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full mr-1.5 shrink-0", style.color)} />
                            <span className="truncate">{style.label}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="z-[9999]">
                          <p className="text-xs max-w-xs">{style.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[95vh] flex flex-col p-4 sm:p-6", isAthleteMode ? "max-w-3xl" : "max-w-6xl w-[95vw]")}>
        <DialogHeader>
          <DialogTitle>{isAthleteMode ? "Ajouter ma séance" : (editSession ? "Modifier la séance" : "Nouvelle séance")}</DialogTitle>
          <DialogDescription>
            {isAthleteMode 
              ? "Crée ta séance avec exercices et tests. Elle sera visible par le staff."
              : "Remplissez les détails de la séance et ajoutez des exercices si nécessaire."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className={cn("grid w-full shrink-0", isAthleteMode ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="exercises">
                Exercices
                {exercises.filter((e) => e.exercise_name.trim()).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {exercises.filter((e) => e.exercise_name.trim()).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tests">
                Tests
                {sessionTests.filter((t) => t.test_type).length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                    {sessionTests.filter((t) => t.test_type).length}
                  </Badge>
                )}
              </TabsTrigger>
              {!isAthleteMode && <TabsTrigger value="players">{isIndividualSport(sportType || "") ? "Athlètes" : "Joueurs"}</TabsTrigger>}
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="details" className="h-full m-0">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    {/* Athlete quick type selector */}
                    {isAthleteMode && (
                      <div className="space-y-2">
                        <Label>Type de séance *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "musculation", label: "Musculation", icon: "💪" },
                            { value: "cardio", label: "Cardio / Course", icon: "🏃" },
                            { value: "precision", label: "Précision", icon: "🎯" },
                            { value: "test", label: "Test", icon: "📋" },
                            { value: "physique", label: "Physique", icon: "⚡" },
                            { value: "recuperation", label: "Récupération", icon: "🧘" },
                          ].map((opt) => (
                            <Button
                              key={opt.value}
                              type="button"
                              variant={type === opt.value ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "flex items-center gap-1.5 text-xs h-9",
                                type === opt.value && "ring-2 ring-primary ring-offset-1"
                              )}
                              onClick={() => handleTypeChange(opt.value)}
                            >
                              <span>{opt.icon}</span>
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

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

                    {/* Session Blocks Manager - staff only */}
                    {!isAthleteMode && (
                      <SessionBlocksManager
                        blocks={sessionBlocks}
                        onBlocksChange={setSessionBlocks}
                        sportType={sportType}
                        categoryId={categoryId}
                        sessionStartTime={startTime}
                        sessionEndTime={endTime}
                      />
                    )}

                    {/* Intensity - only shown if no blocks */}
                    {sessionBlocks.length === 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="intensity-no-blocks">Intensité (1-10)</Label>
                        <Input
                          id="intensity-no-blocks"
                          type="number"
                          min="1"
                          max="10"
                          value={intensity}
                          onChange={(e) => setIntensity(e.target.value)}
                          placeholder="De 1 à 10"
                        />
                      </div>
                    )}


                    {/* Precision exercise selector - shown for "precision" type or when a block has precision */}
                    {(type === "precision" || sessionBlocks.some(b => b.training_type === "precision")) && !isRugbyType(sportType || "") && (
                      <div className="rounded-lg border border-accent/30 p-3 space-y-2">
                        <PrecisionExerciseSelector
                          categoryId={categoryId}
                          sportType={sportType}
                          selectedExerciseId={precisionExerciseId}
                          onExerciseChange={(id, label) => {
                            setPrecisionExerciseId(id);
                            setPrecisionExerciseLabel(label);
                          }}
                          allowCreate={!isAthleteMode}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          📊 Les athlètes pourront saisir leurs stats de précision (réussites / tentatives) lors de la saisie RPE.
                          Le staff peut créer des exercices personnalisés via le bouton « + ».
                        </p>
                      </div>
                    )}
                    {(type === "precision" || sessionBlocks.some(b => b.training_type === "precision")) && isRugbyType(sportType || "") && (() => {
                      const resolvedCat = EXERCISE_CATEGORIES.find(c => c.exercises.some(e => e.value === precisionExerciseId));
                      const activeCatKey = resolvedCat?.key || "buteur";
                      const activeCat = resolvedCat || EXERCISE_CATEGORIES.find(c => c.key === "buteur")!;
                      return (
                      <div className="rounded-lg border border-accent/30 p-3 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Catégorie de précision</Label>
                          <Select
                            value={activeCatKey}
                            onValueChange={(catKey) => {
                              const cat = EXERCISE_CATEGORIES.find(c => c.key === catKey);
                              const first = cat?.exercises[0];
                              if (first) {
                                setPrecisionExerciseId(first.value);
                                setPrecisionExerciseLabel(first.label);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir la catégorie" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[200]">
                              {EXERCISE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.key} value={cat.key}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Show specific exercise for non-buteur */}
                        {activeCatKey === "buteur" ? (
                              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-1.5">
                                <p className="text-xs font-medium text-primary">🎯 Exercices buteur disponibles :</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {activeCat.exercises.map(ex => (
                                    <span key={ex.value} className="flex items-center gap-1.5 text-xs">
                                      <span style={{ color: ex.color }}>
                                        {ex.shape === "circle" ? "●" : ex.shape === "square" ? "■" : "◆"}
                                      </span>
                                      {ex.label}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Les 3 types seront disponibles simultanément sur la cartographie.
                                </p>
                              </div>
                        ) : (
                            <div className="space-y-2">
                              <Label className="text-sm">Exercice spécifique</Label>
                              <Select
                                value={precisionExerciseId ?? undefined}
                                onValueChange={(value) => {
                                  const exercise = RUGBY_PRECISION_EXERCISES.find((item) => item.value === value);
                                  setPrecisionExerciseId(value);
                                  setPrecisionExerciseLabel(exercise?.label || value);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir l'exercice" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[200]">
                                  {activeCat.exercises.map((exercise) => (
                                    <SelectItem key={exercise.value} value={exercise.value}>
                                      <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exercise.color }} />
                                        {exercise.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          🏉 Le choix fait ici sera repris par défaut dans la saisie athlète.
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          📊 Tu pourras saisir tes stats de précision (réussites / tentatives) lors de la saisie RPE via le terrain interactif.
                        </p>
                      </div>
                      );
                    })()}

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

                    {/* GPS Import - Only visible when editing a session for Rugby/Football (staff only) */}
                    {!isAthleteMode && showGpsImport && players && (
                      <div className="pt-4 border-t">
                        <SessionGpsImport
                          players={players.map(p => ({ id: p.id, name: p.name, position: p.position }))}
                          onGpsDataChange={setGpsData}
                          gpsData={gpsData}
                        />
                      </div>
                    )}

                    {/* GPS Objectives - Only visible when editing a session (staff only) */}
                    {!isAthleteMode && showGpsImport && editSession && (
                      <div className="pt-4 border-t">
                        <GpsObjectivesForm
                          categoryId={categoryId}
                          trainingSessionId={editSession.id}
                          sportType={sportType || "XV"}
                        />
                      </div>
                    )}

                    {/* Surf Conditions */}
                    {isSurfCategory(sportType || "") && (
                      <div className="pt-4 border-t">
                        {editSession ? (
                          <SurfConditionsForm
                            trainingSessionId={editSession.id}
                            categoryId={categoryId}
                            isViewer={isAthleteMode}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-muted-foreground text-sm">
                            <Waves className="h-4 w-4 shrink-0" />
                            <span>Les conditions de surf et le matériel seront disponibles après la création de la séance.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ski Conditions */}
                    {isSkiCategory(sportType || "") && (
                      <div className="pt-4 border-t">
                        {editSession ? (
                          <SkiConditionsForm
                            trainingSessionId={editSession.id}
                            categoryId={categoryId}
                            isViewer={isAthleteMode}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-muted-foreground text-sm">
                            <Mountain className="h-4 w-4 shrink-0" />
                            <span>Les conditions neige et le matériel seront disponibles après la création de la séance.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Equipment selection per player */}
                    {editSession && (isSurfCategory(sportType || "") || isSkiCategory(sportType || "") || isPadelCategory(sportType || "")) && (
                      <div className="pt-4 border-t">
                        <SessionEquipmentSection
                          categoryId={categoryId}
                          sportType={sportType || ""}
                          trainingSessionId={editSession.id}
                          isViewer={isAthleteMode}
                        />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="exercises" className="h-full m-0">
                {activeTab === "exercises" ? (
                  <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex flex-col sm:flex-row h-[50vh]">
                      {/* Left side - Exercise list with drop zone */}
                      <div className="flex-1 sm:pr-4 min-h-0">
                        <DroppableExerciseZone>
                          <ScrollArea className="h-full">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-base font-medium">
                                  <Dumbbell className="h-4 w-4" />
                                  Exercices de la séance
                                </Label>
                                <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Exercice simple
                                </Button>
                              </div>

                              {/* Block creation buttons */}
                              {renderBlockCreationButtons()}

                              {exercises.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                                  <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                  <p className="text-sm text-muted-foreground mb-2">Aucun exercice ajouté</p>
                                  <p className="text-xs text-muted-foreground mb-4">
                                    Glissez-déposez des exercices depuis la bibliothèque ou ajoutez-en manuellement
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {exerciseGroups.map((group) => renderExerciseGroup(group))}
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DroppableExerciseZone>
                      </div>

                      {/* Right side - Exercise Library Sidebar */}
                      <ExerciseLibrarySidebar sportType={sportType} />
                    </div>

                    {/* Drag overlay */}
                    <DragOverlay>
                      {activeExercise ? (
                        <div className="p-3 rounded-lg border bg-card shadow-lg">
                          <p className="font-medium text-sm">{activeExercise.name}</p>
                          <p className="text-xs text-muted-foreground">{getCategoryLabel(activeExercise.category)}</p>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <div className="flex flex-col sm:flex-row h-[50vh]">
                    <div className="flex-1 sm:pr-4 min-h-0">
                      <ScrollArea className="h-full">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-base font-medium">
                              <Dumbbell className="h-4 w-4" />
                              Exercices de la séance
                            </Label>
                            <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                              <Plus className="h-4 w-4 mr-1" />
                              Exercice simple
                            </Button>
                          </div>

                          {/* Block creation buttons */}
                          {renderBlockCreationButtons()}

                          {exercises.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground mb-2">Aucun exercice ajouté</p>
                              <p className="text-xs text-muted-foreground mb-4">
                                Cliquez sur l'onglet Exercices pour utiliser le glisser-déposer
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {exerciseGroups.map((group) => renderExerciseGroup(group))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="hidden sm:block w-80 border-l bg-muted/30" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tests" className="h-full m-0">
                <ScrollArea className="h-[50vh] pr-4">
                  <SessionTestBlock
                    tests={sessionTests}
                    onTestsChange={setSessionTests}
                    sportType={sportType}
                    players={isAthleteMode 
                      ? (players?.filter(p => p.id === athletePlayerId).map(p => ({ 
                          id: p.id, name: p.name, position: p.position, avatar_url: p.avatar_url 
                        })) || [])
                      : (players?.map(p => ({ 
                          id: p.id, name: p.name, position: p.position, avatar_url: p.avatar_url 
                        })) || [])
                    }
                    selectedPlayers={isAthleteMode ? (athletePlayerId ? [athletePlayerId] : []) : selectedPlayers}
                    playerSelectionMode={isAthleteMode ? "specific" : playerSelectionMode}
                    hideResults={true}
                  />
                </ScrollArea>
              </TabsContent>

              {!isAthleteMode && <TabsContent value="players" className="h-full m-0">
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
                              role="button"
                              tabIndex={0}
                              onClick={() => togglePlayer(player.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  togglePlayer(player.id);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors select-none",
                                selectedPlayers.includes(player.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/50",
                                player.isInjured && "border-amber-300 bg-amber-50/50"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 pointer-events-none",
                                  selectedPlayers.includes(player.id)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-primary/50 bg-background"
                                )}
                              >
                                {selectedPlayers.includes(player.id) && <Check className="h-3 w-3" />}
                              </div>
                              <Avatar className="h-6 w-6 pointer-events-none">
                                <AvatarImage src={player.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(player.first_name || player.name).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate flex-1 pointer-events-none">{player.first_name ? `${player.first_name} ${player.name}` : player.name}</span>
                              {player.isInjured && (
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 pointer-events-none" />
                              )}
                              {player.position && (
                                <Badge variant="outline" className="text-xs flex-shrink-0 pointer-events-none">
                                  {player.position}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 border rounded-lg bg-muted/30">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          Tous les {players?.length || 0} athlètes seront concernés
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>}
            </div>
          </Tabs>

          <DialogFooter className="pt-4 border-t mt-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!date || (!type && sessionBlocks.length === 0) || saveSession.isPending}
            >
              {saveSession.isPending ? "Enregistrement..." : editSession ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <QuickAddExerciseDialog
        open={showAddExerciseDialog}
        onOpenChange={setShowAddExerciseDialog}
      />
    </Dialog>
  );
}