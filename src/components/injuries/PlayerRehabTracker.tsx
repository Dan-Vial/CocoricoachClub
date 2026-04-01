import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  ChevronRight, 
  Dumbbell,
  Clock,
  AlertTriangle,
  RotateCcw,
  Shield,
  Activity,
  Zap,
  Target,
  Trophy
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { PlayerRehabExerciseEditor } from "./PlayerRehabExerciseEditor";

// Phase colors configuration
const PHASE_COLORS = {
  1: { bg: "bg-red-500/20", text: "text-red-700 dark:text-red-400", border: "border-red-500", icon: Shield, label: "Protection" },
  2: { bg: "bg-orange-500/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500", icon: Activity, label: "Mobilisation" },
  3: { bg: "bg-yellow-500/20", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500", icon: Zap, label: "Renforcement" },
  4: { bg: "bg-blue-500/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500", icon: Target, label: "Retour terrain" },
  5: { bg: "bg-green-500/20", text: "text-green-700 dark:text-green-400", border: "border-green-500", icon: Trophy, label: "Performance" },
};

const getPhaseColor = (phaseNumber: number) => {
  return PHASE_COLORS[phaseNumber as keyof typeof PHASE_COLORS] || PHASE_COLORS[1];
};

interface PlayerRehabTrackerProps {
  playerId: string;
  injuryId: string;
  categoryId: string;
  playerName: string;
  injuryType: string;
}

export function PlayerRehabTracker({
  playerId,
  injuryId,
  categoryId,
  playerName,
  injuryType,
}: PlayerRehabTrackerProps) {
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [painLevel, setPainLevel] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [setsCompleted, setSetsCompleted] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch player's rehab protocol
  const { data: rehabProtocol, isLoading: protocolLoading } = useQuery({
    queryKey: ["player-rehab-protocol", injuryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select(`
          *,
          injury_protocols (
            id,
            name,
            injury_category,
            description
          )
        `)
        .eq("injury_id", injuryId)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch protocol phases (for structure/metadata only)
  const { data: phases } = useQuery({
    queryKey: ["protocol-phases", rehabProtocol?.protocol_id],
    queryFn: async () => {
      if (!rehabProtocol?.protocol_id) return [];
      
      const { data, error } = await supabase
        .from("protocol_phases")
        .select("*")
        .eq("protocol_id", rehabProtocol.protocol_id)
        .order("phase_number");
      
      if (error) throw error;
      return data;
    },
    enabled: !!rehabProtocol?.protocol_id,
  });

  // Fetch player-specific exercises (per phase)
  const { data: playerExercises } = useQuery({
    queryKey: ["player-rehab-exercises-all", rehabProtocol?.id],
    queryFn: async () => {
      if (!rehabProtocol?.id) return [];
      
      const { data, error } = await supabase
        .from("player_rehab_exercises")
        .select("*")
        .eq("player_rehab_protocol_id", rehabProtocol.id)
        .order("exercise_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!rehabProtocol?.id,
  });

  // Fetch exercise logs
  const { data: exerciseLogs } = useQuery({
    queryKey: ["rehab-exercise-logs", rehabProtocol?.id],
    queryFn: async () => {
      if (!rehabProtocol?.id) return [];
      
      const { data, error } = await supabase
        .from("rehab_exercise_logs")
        .select("*")
        .eq("player_rehab_protocol_id", rehabProtocol.id)
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!rehabProtocol?.id,
  });

  // Update phase mutation
  const updatePhase = useMutation({
    mutationFn: async (newPhase: number) => {
      const { error } = await supabase
        .from("player_rehab_protocols")
        .update({ 
          current_phase: newPhase,
          updated_at: new Date().toISOString()
        })
        .eq("id", rehabProtocol?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-protocol", injuryId] });
      toast.success("Phase mise à jour");
    },
  });

  // Complete protocol mutation
  const completeProtocol = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("player_rehab_protocols")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", rehabProtocol?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-protocol", injuryId] });
      toast.success("Protocole terminé ! Le joueur peut reprendre la compétition.");
    },
  });

  // Log exercise mutation
  const logExercise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rehab_exercise_logs")
        .insert({
          player_rehab_protocol_id: rehabProtocol?.id,
          exercise_id: selectedExercise?.id,
          sets_completed: setsCompleted,
          pain_level: painLevel,
          difficulty_level: difficultyLevel,
          notes: exerciseNotes || null,
          logged_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehab-exercise-logs", rehabProtocol?.id] });
      toast.success("Exercice enregistré");
      setLogDialogOpen(false);
      resetLogForm();
    },
  });

  const resetLogForm = () => {
    setSelectedExercise(null);
    setPainLevel(0);
    setDifficultyLevel(3);
    setExerciseNotes("");
    setSetsCompleted(0);
  };

  const handleLogExercise = (exercise: any) => {
    setSelectedExercise(exercise);
    setSetsCompleted(exercise.sets || 1);
    setLogDialogOpen(true);
  };

  const getExerciseCompletionCount = (exerciseId: string) => {
    return exerciseLogs?.filter(log => log.exercise_id === exerciseId).length || 0;
  };

  const getCurrentPhase = () => {
    return phases?.find(p => p.phase_number === rehabProtocol?.current_phase);
  };

  const totalPhases = phases?.length || 0;
  const currentPhaseNumber = rehabProtocol?.current_phase || 1;
  const progressPercentage = totalPhases > 0 ? (currentPhaseNumber / totalPhases) * 100 : 0;

  if (protocolLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Chargement du protocole...</p>
        </CardContent>
      </Card>
    );
  }

  if (!rehabProtocol) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            Aucun protocole de réhabilitation assigné
          </p>
          <p className="text-sm text-muted-foreground">
            Assignez un protocole depuis les détails de la blessure
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPhase = getCurrentPhase();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Protocole de réhabilitation
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {rehabProtocol.injury_protocols?.name} - {playerName}
              </p>
            </div>
            <Badge variant={rehabProtocol.status === "completed" ? "default" : "secondary"}>
              {rehabProtocol.status === "completed" ? "Terminé" : 
               rehabProtocol.status === "paused" ? "En pause" : "En cours"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progression globale</span>
              <span className="font-medium">Phase {currentPhaseNumber} / {totalPhases}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {currentPhase && (
            <div className={`p-4 rounded-lg border-2 ${getPhaseColor(currentPhaseNumber).bg} ${getPhaseColor(currentPhaseNumber).border}`}>
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const PhaseIcon = getPhaseColor(currentPhaseNumber).icon;
                  return <PhaseIcon className={`h-5 w-5 ${getPhaseColor(currentPhaseNumber).text}`} />;
                })()}
                <Badge className={`${getPhaseColor(currentPhaseNumber).bg} ${getPhaseColor(currentPhaseNumber).text} border-0`}>
                  Phase {currentPhaseNumber} - {getPhaseColor(currentPhaseNumber).label}
                </Badge>
                <span className="font-semibold">{currentPhase.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{currentPhase.description}</p>
              
              {currentPhase.objectives && currentPhase.objectives.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Objectifs:</p>
                  <ul className="text-sm space-y-1">
                    {(currentPhase.objectives as string[]).map((obj, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <ChevronRight className={`h-3 w-3 ${getPhaseColor(currentPhaseNumber).text}`} />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentPhase.care_instructions && (currentPhase.care_instructions as string[]).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🩹 Soins:</p>
                  <ul className="text-sm space-y-1">
                    {(currentPhase.care_instructions as string[]).map((care, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-primary">•</span>
                        {care}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentPhase.taping_instructions && (currentPhase.taping_instructions as string[]).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🏷️ Tape:</p>
                  <ul className="text-sm space-y-1">
                    {(currentPhase.taping_instructions as string[]).map((tape, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-accent">•</span>
                        {tape}
                      </li>
                    ))}
                  </ul>
                  {(currentPhase as any).taping_diagram_url && (
                    <div className="mt-2">
                      <img
                        src={(currentPhase as any).taping_diagram_url}
                        alt="Schéma de taping"
                        className="w-full max-h-64 object-contain rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const img = (currentPhase as any).taping_diagram_url;
                          if (img) window.open(img, '_blank');
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Cliquez pour agrandir le schéma
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {currentPhaseNumber > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePhase.mutate(currentPhaseNumber - 1)}
                disabled={updatePhase.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Phase précédente
              </Button>
            )}
            {currentPhaseNumber < totalPhases && (
              <Button
                size="sm"
                onClick={() => updatePhase.mutate(currentPhaseNumber + 1)}
                disabled={updatePhase.isPending}
              >
                Phase suivante
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {currentPhaseNumber === totalPhases && rehabProtocol.status !== "completed" && (
              <Button
                size="sm"
                onClick={() => completeProtocol.mutate()}
                disabled={completeProtocol.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Terminer le protocole
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exercises by Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Exercices par phase</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue={`phase-${currentPhaseNumber}`}>
            {phases?.map((phase) => {
              const phaseColor = getPhaseColor(phase.phase_number);
              const PhaseIcon = phaseColor.icon;
              const isCompleted = phase.phase_number < currentPhaseNumber;
              const isCurrent = phase.phase_number === currentPhaseNumber;
              
              return (
              <AccordionItem key={phase.id} value={`phase-${phase.phase_number}`} className={isCurrent ? `border-2 ${phaseColor.border} rounded-lg` : ""}>
                <AccordionTrigger className={`hover:no-underline ${isCurrent ? `${phaseColor.bg} rounded-t-lg px-4` : ""}`}>
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-green-500 text-white" : 
                        isCurrent ? `${phaseColor.bg} ${phaseColor.text} border-2 ${phaseColor.border}` : 
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <PhaseIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isCurrent ? phaseColor.text : ""}`}>{phase.name}</p>
                        {isCurrent && (
                          <Badge className={`${phaseColor.bg} ${phaseColor.text} border-0 text-xs`}>
                            En cours
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phase.duration_days_min}-{phase.duration_days_max} jours
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {/* Player-specific exercise editor/viewer */}
                    <PlayerRehabExerciseEditor
                      playerRehabProtocolId={rehabProtocol.id}
                      phaseId={phase.id}
                      phaseNumber={phase.phase_number}
                      categoryId={categoryId}
                      disabled={rehabProtocol.status === "completed"}
                    />

                    {phase.exit_criteria && (phase.exit_criteria as string[]).length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                          Critères de passage à la phase suivante:
                        </p>
                        <ul className="text-sm space-y-1">
                          {(phase.exit_criteria as string[]).map((criteria, i) => (
                            <li key={i} className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                              <Checkbox id={`criteria-${phase.id}-${i}`} />
                              <label htmlFor={`criteria-${phase.id}-${i}`} className="cursor-pointer">
                                {criteria}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {exerciseLogs && exerciseLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historique récent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exerciseLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(log.completed_at!), "d MMM à HH:mm", { locale: fr })}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {log.pain_level !== null && log.pain_level > 5 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Douleur {log.pain_level}/10
                      </Badge>
                    )}
                    {log.pain_level !== null && log.pain_level <= 5 && (
                      <Badge variant="secondary" className="text-xs">
                        Douleur {log.pain_level}/10
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Exercise Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer l'exercice</DialogTitle>
          </DialogHeader>
          {selectedExercise && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedExercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedExercise.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Séries complétées: {setsCompleted}</Label>
                <Slider
                  value={[setsCompleted]}
                  onValueChange={([v]) => setSetsCompleted(v)}
                  max={selectedExercise.sets || 5}
                  min={0}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Niveau de douleur: {painLevel}/10</Label>
                <Slider
                  value={[painLevel]}
                  onValueChange={([v]) => setPainLevel(v)}
                  max={10}
                  min={0}
                  step={1}
                  className={painLevel > 5 ? "[&>span]:bg-red-500" : ""}
                />
                {painLevel > 5 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Douleur élevée - envisager de consulter le staff médical
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Difficulté perçue: {difficultyLevel}/5</Label>
                <Slider
                  value={[difficultyLevel]}
                  onValueChange={([v]) => setDifficultyLevel(v)}
                  max={5}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={exerciseNotes}
                  onChange={(e) => setExerciseNotes(e.target.value)}
                  placeholder="Remarques sur l'exécution..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => logExercise.mutate()} disabled={logExercise.isPending}>
              {logExercise.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
