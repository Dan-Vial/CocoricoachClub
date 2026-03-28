import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Star, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface EvaluationsSectionProps {
  categoryId: string;
  players: { id: string; name: string; first_name?: string | null }[] | undefined;
}

const EVALUATION_PERIODS = [
  { value: "trimestre_1", label: "1er Trimestre" },
  { value: "trimestre_2", label: "2e Trimestre" },
  { value: "trimestre_3", label: "3e Trimestre" },
  { value: "semestre_1", label: "1er Semestre" },
  { value: "semestre_2", label: "2e Semestre" },
  { value: "annuel", label: "Bilan Annuel" },
];

const SCORE_LABELS: Record<number, string> = {
  1: "Insuffisant",
  2: "Faible",
  3: "Passable",
  4: "Assez bien",
  5: "Bien",
  6: "Assez bien+",
  7: "Bien+",
  8: "Très bien",
  9: "Excellent",
  10: "Exceptionnel",
};

export function EvaluationsSection({ categoryId, players }: EvaluationsSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split("T")[0]);
  const [evaluationPeriod, setEvaluationPeriod] = useState("");
  const [technicalScore, setTechnicalScore] = useState(5);
  const [tacticalScore, setTacticalScore] = useState(5);
  const [physicalScore, setPhysicalScore] = useState(5);
  const [mentalScore, setMentalScore] = useState(5);
  const [attitudeScore, setAttitudeScore] = useState(5);
  const [overallComments, setOverallComments] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");

  const { data: evaluations } = useQuery({
    queryKey: ["player_evaluations", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_evaluations")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addEvaluation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_evaluations").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        evaluation_date: evaluationDate,
        evaluation_period: evaluationPeriod || null,
        technical_score: technicalScore,
        tactical_score: tacticalScore,
        physical_score: physicalScore,
        mental_score: mentalScore,
        attitude_score: attitudeScore,
        overall_comments: overallComments || null,
        strengths: strengths || null,
        areas_to_improve: areasToImprove || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_evaluations", categoryId] });
      toast.success("Évaluation ajoutée");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteEvaluation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_evaluations", categoryId] });
      toast.success("Évaluation supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const resetForm = () => {
    setSelectedPlayer("");
    setEvaluationPeriod("");
    setTechnicalScore(5);
    setTacticalScore(5);
    setPhysicalScore(5);
    setMentalScore(5);
    setAttitudeScore(5);
    setOverallComments("");
    setStrengths("");
    setAreasToImprove("");
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
  };

  const getAverageScore = (eval_: NonNullable<typeof evaluations>[0]) => {
    const scores = [eval_.technical_score, eval_.tactical_score, eval_.physical_score, eval_.mental_score, eval_.attitude_score].filter(Boolean) as number[];
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "-";
  };

  const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className={`font-medium ${getScoreColor(value)}`}>{value}/10 - {SCORE_LABELS[value]}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={1}
        max={10}
        step={1}
        className="w-full"
      />
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Évaluations Périodiques
              </CardTitle>
              <CardDescription>Notes et appréciations sur différents critères</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle évaluation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!evaluations || evaluations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune évaluation enregistrée.</p>
          ) : (
            <div className="space-y-4">
              {evaluations.map((eval_) => (
                <div key={eval_.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{eval_.players?.name}</span>
                      {eval_.evaluation_period && (
                        <Badge variant="outline">
                          {EVALUATION_PERIODS.find((p) => p.value === eval_.evaluation_period)?.label || eval_.evaluation_period}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(eval_.evaluation_date), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className={`font-bold ${getScoreColor(parseFloat(getAverageScore(eval_) || "0"))}`}>
                          {getAverageScore(eval_)}/10
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteEvaluation.mutate(eval_.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Technique</p>
                      <p className={`font-bold ${getScoreColor(eval_.technical_score || 0)}`}>{eval_.technical_score}/10</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Tactique</p>
                      <p className={`font-bold ${getScoreColor(eval_.tactical_score || 0)}`}>{eval_.tactical_score}/10</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Physique</p>
                      <p className={`font-bold ${getScoreColor(eval_.physical_score || 0)}`}>{eval_.physical_score}/10</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Mental</p>
                      <p className={`font-bold ${getScoreColor(eval_.mental_score || 0)}`}>{eval_.mental_score}/10</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Attitude</p>
                      <p className={`font-bold ${getScoreColor(eval_.attitude_score || 0)}`}>{eval_.attitude_score}/10</p>
                    </div>
                  </div>

                  {(eval_.strengths || eval_.areas_to_improve || eval_.overall_comments) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {eval_.strengths && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                          <p className="font-medium text-green-700 dark:text-green-300 mb-1">Points forts</p>
                          <p>{eval_.strengths}</p>
                        </div>
                      )}
                      {eval_.areas_to_improve && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded">
                          <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">Axes d'amélioration</p>
                          <p>{eval_.areas_to_improve}</p>
                        </div>
                      )}
                      {eval_.overall_comments && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                          <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Commentaires</p>
                          <p>{eval_.overall_comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle évaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Joueur</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                  <SelectContent>
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name ? `${p.first_name} ${p.name}` : p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Période</Label>
                <Select value={evaluationPeriod} onValueChange={setEvaluationPeriod}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {EVALUATION_PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Date d'évaluation</Label>
              <Input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} />
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Notes (1-10)</h4>
              <ScoreSlider label="Technique" value={technicalScore} onChange={setTechnicalScore} />
              <ScoreSlider label="Tactique" value={tacticalScore} onChange={setTacticalScore} />
              <ScoreSlider label="Physique" value={physicalScore} onChange={setPhysicalScore} />
              <ScoreSlider label="Mental" value={mentalScore} onChange={setMentalScore} />
              <ScoreSlider label="Attitude" value={attitudeScore} onChange={setAttitudeScore} />
            </div>

            <div>
              <Label>Points forts</Label>
              <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="Ce que le joueur fait bien..." />
            </div>

            <div>
              <Label>Axes d'amélioration</Label>
              <Textarea value={areasToImprove} onChange={(e) => setAreasToImprove(e.target.value)} placeholder="Ce qui doit être travaillé..." />
            </div>

            <div>
              <Label>Commentaires généraux</Label>
              <Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Appréciation générale..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addEvaluation.mutate()} disabled={!selectedPlayer}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}