import { useState } from "react";
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
import { Dumbbell, Users, Activity, Clock, Calendar } from "lucide-react";
import { getCategoryLabel } from "@/lib/constants/exerciseCategories";

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
};

const setTypeLabels: Record<string, string> = {
  normal: "Normal",
  superset: "Superset",
  triset: "Triset",
  giant_set: "Giant Set",
  circuit: "Circuit",
  drop_set: "Drop Set",
  pyramid: "Pyramide",
  cluster: "Cluster",
  emom: "EMOM",
  amrap: "AMRAP",
};

export function SessionDetailsDialog({
  open,
  onOpenChange,
  categoryId,
  sessionId,
  sessionDate,
}: SessionDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; duration: string }>>({});

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Séance du {format(new Date(sessionDate), "PPP", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

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
          </div>
        )}

        {session?.notes && (
          <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
            {session.notes}
          </p>
        )}

        <Tabs defaultValue="exercises" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exercises" className="flex items-center gap-1">
              <Dumbbell className="h-4 w-4" />
              Exercices
              {exercises && exercises.length > 0 && (
                <Badge variant="secondary" className="ml-1">{exercises.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rpe" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Saisie RPE
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="exercises" className="h-full m-0">
              <ScrollArea className="h-[40vh]">
                {!exercises || exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun exercice détaillé pour cette séance</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {exercises.map((ex, idx) => (
                      <div key={ex.id || idx} className="p-3 border rounded-lg bg-card">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              {idx + 1}.
                            </span>
                            <span className="font-medium">{ex.exercise_name}</span>
                          </div>
                          <div className="flex gap-1">
                            {ex.set_type && ex.set_type !== "normal" && (
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
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rpe" className="h-full m-0">
              <ScrollArea className="h-[40vh]">
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
                        <Label className="w-36 font-medium truncate">{player.name}</Label>
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
      </DialogContent>
    </Dialog>
  );
}
