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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const TENNIS_EXERCISE_TYPES = [
  { value: "service_1ere", label: "1ère balle de service" },
  { value: "service_2eme", label: "2ème balle de service" },
  { value: "service_ace", label: "Service - Aces" },
  { value: "retour_coup_droit", label: "Retour coup droit" },
  { value: "retour_revers", label: "Retour revers" },
  { value: "coup_droit_long_ligne", label: "Coup droit long de ligne" },
  { value: "coup_droit_croise", label: "Coup droit croisé" },
  { value: "revers_long_ligne", label: "Revers long de ligne" },
  { value: "revers_croise", label: "Revers croisé" },
  { value: "volley_coup_droit", label: "Volée coup droit" },
  { value: "volley_revers", label: "Volée revers" },
  { value: "smash", label: "Smash" },
  { value: "lob", label: "Lob" },
  { value: "amortie", label: "Amortie" },
  { value: "passing_shot", label: "Passing shot" },
  { value: "montee_filet", label: "Montée au filet" },
  { value: "defense_fond_court", label: "Défense fond de court" },
];

interface TennisDrillTrainingProps {
  playerId: string;
  categoryId: string;
  trainingSessionId?: string;
}

export function TennisDrillTraining({ playerId, categoryId, trainingSessionId }: TennisDrillTrainingProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [exerciseType, setExerciseType] = useState("service_1ere");
  const [attempts, setAttempts] = useState("");
  const [successes, setSuccesses] = useState("");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["tennis_drill_training", playerId, trainingSessionId],
    queryFn: async () => {
      let query = supabase
        .from("tennis_drill_training" as any)
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

      const { error } = await supabase.from("tennis_drill_training" as any).insert({
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
      queryClient.invalidateQueries({ queryKey: ["tennis_drill_training", playerId] });
      queryClient.invalidateQueries({ queryKey: ["tennis_training_stats"] });
      toast.success("Exercice enregistré");
      setIsAddOpen(false);
      setAttempts("");
      setSuccesses("");
    },
    onError: (e: Error) => toast.error(e.message || "Erreur"),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tennis_drill_training" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tennis_drill_training", playerId] });
      queryClient.invalidateQueries({ queryKey: ["tennis_training_stats"] });
      toast.success("Supprimé");
    },
  });

  const getTypeLabel = (type: string) => TENNIS_EXERCISE_TYPES.find(t => t.value === type)?.label || type;

  const previewRate = (() => {
    const a = parseInt(attempts);
    const s = parseInt(successes);
    if (a > 0 && s >= 0 && s <= a) return ((s / a) * 100).toFixed(1);
    return null;
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            Exercices spécifiques
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="gap-1">
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : !exercises || exercises.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun exercice enregistré. Cliquez sur "Ajouter" pour saisir coups tentés / réussis.
          </p>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex: any) => (
              <div key={ex.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 group">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{getTypeLabel(ex.exercise_type)}</Badge>
                  <span className="text-sm">
                    {ex.successes}/{ex.attempts}
                  </span>
                  <Badge
                    variant={ex.success_rate >= 70 ? "default" : ex.success_rate >= 50 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {Number(ex.success_rate).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ex.session_date), "dd/MM", { locale: fr })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteExercise.mutate(ex.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un exercice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type d'exercice</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENNIS_EXERCISE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tentatives</Label>
                <Input
                  type="number"
                  min="1"
                  value={attempts}
                  onChange={(e) => setAttempts(e.target.value)}
                  placeholder="Ex: 20"
                />
              </div>
              <div className="space-y-2">
                <Label>Réussites</Label>
                <Input
                  type="number"
                  min="0"
                  value={successes}
                  onChange={(e) => setSuccesses(e.target.value)}
                  placeholder="Ex: 14"
                />
              </div>
            </div>
            {previewRate && (
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {previewRate}%
                </Badge>
              </div>
            )}
            {!trainingSessionId && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => addExercise.mutate()}
              disabled={addExercise.isPending || !attempts || !successes}
            >
              {addExercise.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
