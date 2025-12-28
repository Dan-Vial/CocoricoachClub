import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Dumbbell, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExerciseChecklistProps {
  playerId: string;
  playerRehabProtocolId: string;
  currentPhase: number;
}

export function ExerciseChecklist({ 
  playerId, 
  playerRehabProtocolId, 
  currentPhase 
}: ExerciseChecklistProps) {
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch protocol phases with exercises
  const { data: protocolData, isLoading } = useQuery({
    queryKey: ["protocol-with-exercises", playerRehabProtocolId],
    queryFn: async () => {
      // First get the protocol
      const { data: rehabProtocol, error: protocolError } = await supabase
        .from("player_rehab_protocols")
        .select(`
          *,
          injury_protocols (
            id,
            name
          )
        `)
        .eq("id", playerRehabProtocolId)
        .single();

      if (protocolError) throw protocolError;

      // Then get phases
      const { data: phases, error: phasesError } = await supabase
        .from("protocol_phases")
        .select("*")
        .eq("protocol_id", (rehabProtocol.injury_protocols as any).id)
        .order("phase_number");

      if (phasesError) throw phasesError;

      // Get exercises for each phase
      const { data: exercises, error: exercisesError } = await supabase
        .from("protocol_exercises")
        .select("*")
        .in("phase_id", phases.map(p => p.id))
        .order("exercise_order");

      if (exercisesError) throw exercisesError;

      return {
        protocol: rehabProtocol,
        phases,
        exercises,
      };
    },
  });

  // Fetch completions for this player
  const { data: completions } = useQuery({
    queryKey: ["player-exercise-completions", playerId, playerRehabProtocolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_exercise_completions")
        .select("*")
        .eq("player_id", playerId)
        .eq("player_rehab_protocol_id", playerRehabProtocolId);

      if (error) throw error;
      return data;
    },
  });

  const toggleExercise = useMutation({
    mutationFn: async ({ 
      exerciseId, 
      phaseId, 
      completed 
    }: { 
      exerciseId: string; 
      phaseId: string; 
      completed: boolean;
    }) => {
      const existingCompletion = completions?.find(
        c => c.protocol_exercise_id === exerciseId && 
            c.completion_date === format(new Date(), "yyyy-MM-dd")
      );

      if (existingCompletion) {
        if (completed) {
          const { error } = await supabase
            .from("player_exercise_completions")
            .update({ completed: true })
            .eq("id", existingCompletion.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("player_exercise_completions")
            .delete()
            .eq("id", existingCompletion.id);
          if (error) throw error;
        }
      } else if (completed) {
        const { error } = await supabase
          .from("player_exercise_completions")
          .insert({
            player_id: playerId,
            player_rehab_protocol_id: playerRehabProtocolId,
            phase_id: phaseId,
            protocol_exercise_id: exerciseId,
            completed: true,
            completion_date: format(new Date(), "yyyy-MM-dd"),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["player-exercise-completions", playerId, playerRehabProtocolId] 
      });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const isExerciseCompleted = (exerciseId: string) => {
    return completions?.some(
      c => c.protocol_exercise_id === exerciseId && 
          c.completion_date === format(new Date(), "yyyy-MM-dd") &&
          c.completed
    );
  };

  const getPhaseProgress = (phaseId: string) => {
    const phaseExercises = protocolData?.exercises?.filter(e => e.phase_id === phaseId) || [];
    const completedToday = phaseExercises.filter(e => isExerciseCompleted(e.id)).length;
    return { total: phaseExercises.length, completed: completedToday };
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!protocolData?.phases?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Aucune phase définie pour ce protocole</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Exercices du jour
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {protocolData.phases.map((phase) => {
          const phaseExercises = protocolData.exercises?.filter(e => e.phase_id === phase.id) || [];
          const progress = getPhaseProgress(phase.id);
          const isCurrentPhase = phase.phase_number === currentPhase;
          const isExpanded = expandedPhases.includes(phase.id) || isCurrentPhase;

          return (
            <Collapsible
              key={phase.id}
              open={isExpanded}
              onOpenChange={() => togglePhase(phase.id)}
            >
              <div className={`border rounded-lg ${isCurrentPhase ? 'border-primary' : ''}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCurrentPhase ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Dumbbell className={`h-4 w-4 ${
                          isCurrentPhase ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Phase {phase.phase_number}: {phase.name}</span>
                          {isCurrentPhase && (
                            <Badge variant="secondary" className="text-xs">Actuelle</Badge>
                          )}
                        </div>
                        {phaseExercises.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {progress.completed}/{progress.total} exercices complétés aujourd'hui
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2">
                    {phaseExercises.length > 0 ? (
                      phaseExercises.map((exercise) => {
                        const completed = isExerciseCompleted(exercise.id);
                        return (
                          <div
                            key={exercise.id}
                            className={`flex items-start gap-3 p-2 rounded-lg border ${
                              completed ? 'bg-green-500/5 border-green-500/20' : 'bg-card'
                            }`}
                          >
                            <Checkbox
                              checked={completed}
                              onCheckedChange={(checked) => 
                                toggleExercise.mutate({
                                  exerciseId: exercise.id,
                                  phaseId: phase.id,
                                  completed: checked as boolean,
                                })
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {exercise.name}
                                </span>
                                {completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </div>
                              {exercise.description && (
                                <p className="text-sm text-muted-foreground">{exercise.description}</p>
                              )}
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                {exercise.sets && <span>{exercise.sets} séries</span>}
                                {exercise.reps && <span>{exercise.reps} reps</span>}
                                {exercise.frequency && <span>{exercise.frequency}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Aucun exercice défini pour cette phase
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}