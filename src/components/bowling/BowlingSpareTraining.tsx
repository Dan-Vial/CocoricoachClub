import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SPARE_EXERCISE_TYPES } from "@/lib/constants/bowlingBallBrands";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BowlingSpareTrainingProps {
  playerId: string;
  categoryId: string;
  trainingSessionId?: string;
}

export function BowlingSpareTraining({ playerId, categoryId, trainingSessionId }: BowlingSpareTrainingProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [exerciseType, setExerciseType] = useState("spare_pin_7");
  const [attempts, setAttempts] = useState("");
  const [successes, setSuccesses] = useState("");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["bowling_spare_training", playerId, trainingSessionId],
    queryFn: async () => {
      let query = supabase
        .from("bowling_spare_training" as any)
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (trainingSessionId) {
        query = query.eq("training_session_id", trainingSessionId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      const attemptsNum = parseInt(attempts);
      const successesNum = parseInt(successes);
      if (isNaN(attemptsNum) || attemptsNum <= 0) throw new Error("Nombre de tentatives invalide");
      if (isNaN(successesNum) || successesNum < 0 || successesNum > attemptsNum) throw new Error("Nombre de réussites invalide");

      const { error } = await supabase.from("bowling_spare_training" as any).insert({
        player_id: playerId,
        category_id: categoryId,
        training_session_id: trainingSessionId || null,
        exercise_type: exerciseType,
        attempts: attemptsNum,
        successes: successesNum,
        session_date: sessionDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_spare_training", playerId] });
      toast.success("Exercice enregistré");
      setIsAddOpen(false);
      setAttempts("");
      setSuccesses("");
    },
    onError: (e: Error) => toast.error(e.message || "Erreur"),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bowling_spare_training" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_spare_training", playerId] });
      toast.success("Supprimé");
    },
  });

  const getTypeLabel = (type: string) => SPARE_EXERCISE_TYPES.find(t => t.value === type)?.label || type;

  const previewRate = (() => {
    const a = parseInt(attempts);
    const s = parseInt(successes);
    if (a > 0 && s >= 0 && s <= a) return ((s / a) * 100).toFixed(1);
    return null;
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Entraînement Précision
          </CardTitle>
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !exercises || exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun exercice de spare enregistré.
          </p>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex: any) => (
              <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getTypeLabel(ex.exercise_type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ex.session_date), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span>{ex.successes}/{ex.attempts} réussites</span>
                    <span className="font-bold text-primary">{Number(ex.success_rate).toFixed(1)}%</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteExercise.mutate(ex.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvel exercice Spare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d'exercice</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPARE_EXERCISE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!trainingSessionId && (
              <div>
                <Label>Date</Label>
                <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tentatives</Label>
                <Input type="number" value={attempts} onChange={e => setAttempts(e.target.value)} min="1" placeholder="50" />
              </div>
              <div>
                <Label>Réussites</Label>
                <Input type="number" value={successes} onChange={e => setSuccesses(e.target.value)} min="0" max={attempts} placeholder="35" />
              </div>
            </div>
            {previewRate && (
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{previewRate}%</p>
                <p className="text-xs text-muted-foreground">Taux de réussite</p>
              </div>
            )}
            <Button className="w-full" onClick={() => addExercise.mutate()} disabled={addExercise.isPending}>
              {addExercise.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
