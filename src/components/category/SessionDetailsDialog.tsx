import { useState, useRef, useMemo } from "react";
import { getObjectiveLabel } from "@/lib/constants/sessionBlockOptions";
import { getDisplayNotes, parsePrecisionExerciseFromNotes } from "@/lib/utils/sessionNotes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dumbbell, Users, Activity, Clock, Calendar, Printer, Calculator, Info, Bell, Target } from "lucide-react";
import { getCategoryLabel } from "@/lib/constants/exerciseCategories";
import { printElement, exportSessionToPdf, preparePdfWithSettings } from "@/lib/pdfExport";
import { TEST_CATEGORIES } from "@/lib/constants/testCategories";
import { getTrainingStyleConfig, isLinkableMethod, isCardioBlockMethod } from "@/lib/constants/trainingStyles";
import { cn } from "@/lib/utils";
import { calculateWeightedRpe, formatDuration } from "@/lib/weightedRpeCalculations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { NotifyAthletesDialog } from "@/components/notifications/NotifyAthletesDialog";
import { BowlingSessionContent } from "@/components/bowling/BowlingSessionContent";
import { TennisDrillTraining } from "@/components/tennis/TennisDrillTraining";
import { PrecisionFieldTracker } from "@/components/rugby/PrecisionFieldTracker";
import { RUGBY_PRECISION_EXERCISES, EXERCISE_CATEGORIES } from "@/lib/constants/rugbyPrecisionExercises";
import { isRugbyType } from "@/lib/constants/sportTypes";
interface SessionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  sessionId: string;
  sessionDate: string;
}

const trainingTypeLabels: Record<string, string> = {
  collectif: "Collectif",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
  reathlétisation: "Réathlétisation",
  bowling_game: "Parties d'Entraînement",
  bowling_spare: "Entraînement Précision",
  bowling_technique: "Travail Technique",
  bowling_approche: "Travail d'Approche",
  bowling_release: "Travail de Lâcher",
  bowling_practice: "Pratique Libre",
};

const setTypeLabels: Record<string, string> = {
  normal: "Normal",
  superset: "Superset",
  biset: "Biset",
  triset: "Triset",
  giant_set: "Giant Set",
  circuit: "Circuit",
  drop_set: "Drop Set",
  pyramid: "Pyramide",
  cluster: "Cluster",
  emom: "EMOM",
  amrap: "AMRAP",
  for_time: "For Time",
  tabata: "Tabata",
  bulgarian: "Méthode Bulgare",
};

interface ExerciseGroup {
  groupId: string | null;
  exercises: { exercise: any; index: number }[];
  method: string;
}

export function SessionDetailsDialog({
  open,
  onOpenChange,
  categoryId,
  sessionId,
  sessionDate,
}: SessionDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; duration: string }>>({});
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch category to determine sport type
  const { data: category } = useQuery({
    queryKey: ["category-sport", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type, club_id, clubs(sport)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sportType = (category as any)?.clubs?.sport || "rugby";
  const isRugby = isRugbyType(sportType);

  const handlePrint = async () => {
    if (!session) return;
    try {
      const { settings: pdfSettings, logoBase64, seasonName } = await preparePdfWithSettings(categoryId);
      await exportSessionToPdf(session, exercises || [], session.training_type || "Séance", {
        customSettings: pdfSettings,
        logoBase64,
        blocks: sessionBlocks || [],
        testCategories: TEST_CATEGORIES,
        seasonName,
      });
    } catch {
      if (printRef.current) {
        printElement(printRef.current, `Séance du ${format(new Date(sessionDate), "PPP", { locale: fr })}`);
      }
    }
  };
  
  // Fetch session details
  const { data: session } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Fetch session blocks
  const { data: sessionBlocks } = useQuery({
    queryKey: ["session-blocks", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("*")
        .eq("training_session_id", sessionId)
        .order("block_order");
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Fetch exercises for this session (deduplicated)
  const { data: exercises } = useQuery({
    queryKey: ["session-exercises-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("training_session_id", sessionId)
        .order("order_index");
      if (error) throw error;
      
      // Deduplicate by exercise name + order index
      const seen = new Map<string, any>();
      data?.forEach((ex) => {
        const key = `${ex.exercise_name}-${ex.order_index}`;
        if (!seen.has(key)) {
          seen.set(key, ex);
        }
      });
      return Array.from(seen.values());
    },
    enabled: open && !!sessionId,
  });

  // Organize exercises into groups for visual grouping
  const exerciseGroups = useMemo(() => {
    if (!exercises) return [];
    
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
            method: exercise.set_type || exercise.method || "superset",
          });
        }
      } else {
        groups.push({
          groupId: null,
          exercises: [{ exercise, index }],
          method: exercise.set_type || exercise.method || "normal",
        });
      }
    });

    return groups;
  }, [exercises]);

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing RPE data
  const { data: existingRpe } = useQuery({
    queryKey: ["awcr_tracking", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Fetch attendance
  const { data: attendance } = useQuery({
    queryKey: ["session-attendance", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_attendance")
        .select("*, player:players(name)")
        .eq("training_session_id", sessionId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Calculate AWCR for a player
  const calculateAWCR = async (playerId: string, sessionDateStr: string, newLoad: number) => {
    const sevenDaysAgo = new Date(sessionDateStr);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyEightDaysAgo = new Date(sessionDateStr);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: recentSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const { data: chronicSessions } = await supabase
      .from("awcr_tracking")
      .select("training_load")
      .eq("player_id", playerId)
      .gte("session_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .lt("session_date", sessionDateStr);

    const acuteTotal = (recentSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0) + newLoad;
    const chronicTotal = chronicSessions?.reduce((sum, s) => sum + (s.training_load || 0), 0) || 0;

    const acuteAvg = acuteTotal / 7;
    const chronicAvg = chronicTotal / 28;

    const awcr = chronicAvg > 0 ? acuteAvg / chronicAvg : 0;

    return { acuteLoad: acuteAvg, chronicLoad: chronicAvg, awcr };
  };

  const saveRpe = useMutation({
    mutationFn: async () => {
      const playersToSave = players?.filter((p) => rpeValues[p.id]?.rpe && rpeValues[p.id]?.duration) || [];

      if (playersToSave.length === 0) {
        throw new Error("Aucun RPE à enregistrer");
      }

      // Calculate AWCR for each player and save
      for (const player of playersToSave) {
        const rpe = parseInt(rpeValues[player.id].rpe);
        const duration = parseInt(rpeValues[player.id].duration);
        const trainingLoad = rpe * duration;

        const { acuteLoad, chronicLoad, awcr } = await calculateAWCR(
          player.id,
          sessionDate,
          trainingLoad
        );

        const { error } = await supabase.from("awcr_tracking").insert({
          player_id: player.id,
          category_id: categoryId,
          training_session_id: sessionId,
          session_date: sessionDate,
          rpe,
          duration_minutes: duration,
          acute_load: acuteLoad,
          chronic_load: chronicLoad,
          awcr: awcr,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awcr_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["awcr-data"] });
      toast.success(`RPE enregistrés avec calcul AWCR automatique`);
      setRpeValues({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleChange = (playerId: string, field: "rpe" | "duration", value: string) => {
    setRpeValues((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const attendedPlayerIds = new Set(attendance?.map(a => a.player_id) || []);
  const playersWithRpe = new Set(existingRpe?.map(r => r.player_id) || []);

  // Render a single exercise card
  const renderExerciseCard = (ex: any, idx: number, isGrouped: boolean, exerciseNumber?: number) => {
    const styleConfig = getTrainingStyleConfig(ex.set_type || ex.method || "normal");
    
    return (
      <div key={ex.id || idx} className={cn(
        "p-3 border rounded-lg",
        isGrouped ? "bg-background/50" : "bg-card"
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isGrouped && exerciseNumber && (
              <Badge className={cn("text-white text-xs", styleConfig.color || "bg-primary")}>
                {exerciseNumber}
              </Badge>
            )}
            {!isGrouped && (
              <span className="text-sm font-medium text-muted-foreground w-6">
                {idx + 1}.
              </span>
            )}
            <span className="font-medium">{ex.exercise_name}</span>
          </div>
          <div className="flex gap-1">
            {!isGrouped && ex.set_type && ex.set_type !== "normal" && (
              <Badge variant="secondary" className="text-xs">
                {setTypeLabels[ex.set_type] || ex.set_type}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel(ex.exercise_category)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{ex.sets} séries</span>
          {ex.reps && <span>× {ex.reps} reps</span>}
          {ex.weight_kg && <span>@ {ex.weight_kg} kg</span>}
          {ex.rest_seconds && <span>- {ex.rest_seconds}s repos</span>}
          {ex.tempo && <span>Tempo: {ex.tempo}</span>}
        </div>
        {ex.notes && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            {ex.notes}
          </p>
        )}
      </div>
    );
  };

  // Render a grouped block of exercises
  const renderExerciseGroup = (group: ExerciseGroup, groupIdx: number) => {
    if (!group.groupId) {
      // Single exercise, not grouped
      const { exercise, index } = group.exercises[0];
      return renderExerciseCard(exercise, index, false);
    }

    // Grouped exercises (superset, circuit, etc.)
    const styleConfig = getTrainingStyleConfig(group.method);
    const isLinkable = isLinkableMethod(group.method) || isCardioBlockMethod(group.method);
    
    return (
      <div
        key={group.groupId}
        className={cn(
          "border-2 rounded-lg p-3 space-y-2",
          styleConfig.borderColor,
          styleConfig.bgColor
        )}
      >
        {/* Group header */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-white", styleConfig.color || "bg-primary")}>
            {setTypeLabels[group.method] || styleConfig.label || group.method}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {group.exercises.length} exercices liés
          </span>
        </div>
        
        {/* Exercises in the group */}
        <div className="space-y-2">
          {group.exercises.map(({ exercise, index }, exIdx) => 
            renderExerciseCard(exercise, index, true, exIdx + 1)
          )}
        </div>
      </div>
    );
  };

  // Get block and week info from session notes or title
  const getBlockWeekInfo = () => {
    if (!session) return null;
    // Try to extract from notes or training_type
    const blockName = session.notes?.match(/Bloc\s+(\w+)/i)?.[1] || 
                      trainingTypeLabels[session.training_type] || 
                      session.training_type;
    
    // Calculate week number from session date
    const sessionStart = new Date(sessionDate);
    const yearStart = new Date(sessionStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((sessionStart.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    
    return { blockName, weekNumber };
  };

  const blockWeekInfo = getBlockWeekInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Séance du {format(new Date(sessionDate), "PPP", { locale: fr })}
            </DialogTitle>
            {blockWeekInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                {blockWeekInfo.blockName} - Semaine {blockWeekInfo.weekNumber}
              </p>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimer">
            <Printer className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
        {/* Printable content - includes exercises */}
        <div ref={printRef} className="print-content">
          {session && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {trainingTypeLabels[session.training_type] || session.training_type}
              </Badge>
              {session.intensity && (
                <Badge variant="outline">Intensité: {session.intensity}/10</Badge>
              )}
              {session.session_start_time && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {session.session_start_time}
                  {session.session_end_time && ` - ${session.session_end_time}`}
                </Badge>
              )}
              {attendance && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {attendance.length} joueur(s)
                </Badge>
              )}
              {session.created_by_player_id && (() => {
                const creator = players?.find(p => p.id === session.created_by_player_id);
                return creator ? (
                  <Badge variant="outline" className="flex items-center gap-1 border-violet-300 text-violet-600 bg-violet-50 dark:bg-violet-950/20 dark:text-violet-400">
                    <Users className="h-3 w-3" />
                    Créée par {creator.first_name ? `${creator.first_name} ${creator.name}` : creator.name}
                  </Badge>
                ) : null;
              })()}
              {/* Precision exercise theme badge */}
              {session.training_type === "precision" && (() => {
                const precisionEx = parsePrecisionExerciseFromNotes(session.notes);
                if (!precisionEx) return null;
                const exerciseConfig = RUGBY_PRECISION_EXERCISES.find(e => e.value === precisionEx.id);
                const categoryConfig = exerciseConfig 
                  ? EXERCISE_CATEGORIES.find(c => c.exercises.some(e => e.value === exerciseConfig.value))
                  : null;
                return (
                  <>
                    {categoryConfig && (
                      <Badge variant="outline" className="flex items-center gap-1 border-accent text-accent">
                        <Target className="h-3 w-3" />
                        {categoryConfig.label}
                      </Badge>
                    )}
                    <Badge className="flex items-center gap-1" style={{ backgroundColor: exerciseConfig?.color || 'hsl(var(--accent))' }}>
                      {exerciseConfig?.shape === "square" ? "■" : exerciseConfig?.shape === "diamond" ? "◆" : "●"}{" "}
                      {precisionEx.label}
                    </Badge>
                  </>
                );
              })()}
            </div>
          )}

          {/* Session Blocks - Thematic segments with weighted RPE */}
          {sessionBlocks && sessionBlocks.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Blocs thématiques
              </h4>
              <div className="grid gap-2">
                {sessionBlocks.map((block: any, idx: number) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border-l-4"
                    style={{
                      borderLeftColor: block.intensity 
                        ? `hsl(${Math.max(0, 120 - (block.intensity - 1) * 13)}, 70%, 50%)`
                        : "hsl(var(--muted))"
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {block.start_time || "?"} - {block.end_time || "?"}
                        </Badge>
                        <span className="font-medium text-sm">
                          {getTrainingTypeLabel(block.training_type)}
                        </span>
                        {block.intensity && (
                          <Badge variant="secondary" className="text-xs">
                            RPE {block.intensity}
                          </Badge>
                        )}
                        {block.session_type && (
                          <Badge variant="outline" className="text-xs">
                            {block.session_type === "technique" ? "Technique" : block.session_type === "physique" ? "Physique" : block.session_type === "mixte" ? "Mixte" : block.session_type === "vitesse" ? "Vitesse" : block.session_type === "contact" ? "Contact" : block.session_type === "jeu_reduit" ? "Jeu réduit" : block.session_type === "simulation_match" ? "Simulation match" : block.session_type}
                          </Badge>
                        )}
                        {block.objective && (
                          <Badge variant="outline" className="text-xs bg-primary/5">
                            {getObjectiveLabel(block.objective)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {block.target_intensity && (
                          <Badge variant="secondary" className="text-xs">
                            Intensité: {block.target_intensity === "faible" ? "Faible" : block.target_intensity === "moderee" ? "Modérée" : block.target_intensity === "elevee" ? "Élevée" : "Très élevée"}
                          </Badge>
                        )}
                        {block.volume && (
                          <Badge variant="secondary" className="text-xs">
                            Vol: {block.volume === "court" ? "Court" : block.volume === "moyen" ? "Moyen" : "Long"}
                          </Badge>
                        )}
                        {block.contact_charge && block.contact_charge !== "aucun" && (
                          <Badge variant="secondary" className="text-xs">
                            Contact: {block.contact_charge === "faible" ? "Faible" : block.contact_charge === "modere" ? "Modéré" : "Élevé"}
                          </Badge>
                        )}
                      </div>
                      {block.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{block.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Weighted RPE Summary */}
              {(() => {
                const weightedResult = calculateWeightedRpe(sessionBlocks as any);
                if (weightedResult.hasValidData) {
                  return (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">RPE moyen pondéré</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Calculé selon la formule : Σ(durée × intensité) / Σ(durée)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {weightedResult.weightedRpe.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / 10
                        </span>
                        <Badge variant="outline" className="ml-auto">
                          {formatDuration(weightedResult.totalDuration)} au total
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        {weightedResult.blockDetails.map((detail, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{getTrainingTypeLabel(detail.training_type)}</span>
                            <span>
                              {formatDuration(detail.duration)} × RPE {detail.intensity} = {detail.contribution}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Bowling-specific content for bowling_game and bowling_spare blocks */}
          {sessionBlocks?.some((b: any) => b.training_type === "bowling_game" || b.training_type === "bowling_spare") && (
            <div className="mb-4 space-y-4">
              {sessionBlocks
                .filter((b: any) => b.training_type === "bowling_game" || b.training_type === "bowling_spare")
                .map((block: any) => (
                  <BowlingSessionContent
                    key={block.id}
                    sessionId={sessionId}
                    categoryId={categoryId}
                    blockType={block.training_type as "bowling_game" | "bowling_spare"}
                    sessionDate={sessionDate}
                  />
                ))
              }
            </div>
          )}

          {/* Tennis-specific drill training for tennis blocks */}
          {sessionBlocks?.some((b: any) => typeof b.training_type === "string" && b.training_type.startsWith("tennis_") && b.training_type !== "tennis_match") && (
            <div className="mb-4 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                🎾 Exercices spécifiques Tennis
              </h4>
              {players && players.length > 0 ? (
                <div className="space-y-3">
                  {players.map((player) => (
                    <div key={player.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                      </p>
                      <TennisDrillTraining
                        playerId={player.id}
                        categoryId={categoryId}
                        trainingSessionId={sessionId}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun athlète dans cette catégorie.</p>
              )}
            </div>
          )}

          {session?.notes && getDisplayNotes(session.notes) && (
            <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
              {getDisplayNotes(session.notes)}
            </p>
          )}

          {/* Exercises section for print */}
          {exerciseGroups.length > 0 && (
            <div className="space-y-3 mt-4 print-exercises hidden print:block">
              <h3 className="font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Exercices ({exercises?.length || 0})
              </h3>
              {exerciseGroups.map((group, idx) => (
                <div key={group.groupId || idx}>
                  {renderExerciseGroup(group, idx)}
                </div>
              ))}
            </div>
          )}

          {/* Print footer with block/week info */}
          {blockWeekInfo && (
            <div className="print-only mt-4 pt-4 border-t text-sm text-muted-foreground hidden print:block">
              <p className="font-medium">{blockWeekInfo.blockName} - Semaine {blockWeekInfo.weekNumber}</p>
              <p>Exporté le {format(new Date(), "PPP", { locale: fr })}</p>
            </div>
          )}
        </div>

        <Tabs defaultValue={session?.training_type === "precision" && isRugby ? "precision_stats" : "exercises"} className="flex-1 flex flex-col min-h-0">
          <TabsList className={cn("grid w-full shrink-0", session?.training_type === "precision" && isRugby ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="exercises" className="flex items-center gap-1">
              <Dumbbell className="h-4 w-4" />
              Exercices
              {exercises && exercises.length > 0 && (
                <Badge variant="secondary" className="ml-1">{exercises.length}</Badge>
              )}
            </TabsTrigger>
            {session?.training_type === "precision" && isRugby && (
              <TabsTrigger value="precision_stats" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Saisie stats
              </TabsTrigger>
            )}
            <TabsTrigger value="rpe" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Saisie RPE
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            <TabsContent value="exercises" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1 h-[60vh]">
                {!exercises || exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun exercice détaillé pour cette séance</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {exerciseGroups.map((group, idx) => (
                      <div key={group.groupId || idx}>
                        {renderExerciseGroup(group, idx)}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Precision stats tab with field cartography */}
            {session?.training_type === "precision" && isRugby && (
              <TabsContent value="precision_stats" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="flex-1 h-[60vh]">
                  <div className="pr-4">
                    <PrecisionFieldTracker categoryId={categoryId} />
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            <TabsContent value="rpe" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1 h-[50vh] max-h-[50vh]">
                <div className="space-y-2 pr-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    RPE: Rate of Perceived Exertion (0-10). Durée en minutes.
                  </p>
                  {players?.map((player) => {
                    const existing = existingRpe?.find((r) => r.player_id === player.id);
                    const wasPresent = attendedPlayerIds.has(player.id);
                    
                    return (
                      <div 
                        key={player.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          wasPresent ? "bg-muted/50" : "bg-muted/20 opacity-60"
                        }`}
                      >
                        <Label className="w-36 font-medium truncate">{player.first_name ? `${player.first_name} ${player.name}` : player.name}</Label>
                        {!wasPresent && attendance && attendance.length > 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            Non présent
                          </span>
                        ) : existing ? (
                          <span className="text-sm text-muted-foreground">
                            ✓ RPE {existing.rpe} - {existing.duration_minutes}min 
                            <span className="text-xs ml-1">(charge: {existing.training_load})</span>
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">RPE</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                placeholder="0-10"
                                className="w-16 h-8"
                                value={rpeValues[player.id]?.rpe || ""}
                                onChange={(e) => handleChange(player.id, "rpe", e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">Min</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="Min"
                                className="w-16 h-8"
                                value={rpeValues[player.id]?.duration || ""}
                                onChange={(e) => handleChange(player.id, "duration", e.target.value)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button 
                  onClick={() => saveRpe.mutate()} 
                  disabled={saveRpe.isPending || Object.keys(rpeValues).length === 0}
                >
                  Enregistrer les RPE
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        </div>

        {/* Notify Button in Header */}
        <div className="absolute top-4 right-12">
          <Button variant="outline" size="sm" onClick={() => setIsNotifyOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Notifier
          </Button>
        </div>
      </DialogContent>

      {/* Notify Athletes Dialog */}
      <NotifyAthletesDialog
        open={isNotifyOpen}
        onOpenChange={setIsNotifyOpen}
        athletes={players || []}
        eventType="session"
        defaultSubject={`Séance du ${format(new Date(sessionDate), "EEEE d MMMM", { locale: fr })}`}
        eventDetails={{
          date: format(new Date(sessionDate), "EEEE d MMMM yyyy", { locale: fr }),
          time: session?.session_start_time ? session.session_start_time.slice(0, 5) : undefined,
        }}
      />
    </Dialog>
  );
}
