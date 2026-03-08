import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Brain, 
  Target, 
  Users, 
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  Shield,
  Focus,
  Flame
} from "lucide-react";

interface MentalPerformanceSectionProps {
  categoryId: string;
}

const ASSESSMENT_TYPES = [
  { value: "initial", label: "Évaluation initiale" },
  { value: "suivi", label: "Suivi régulier" },
  { value: "pre-match", label: "Pré-match" },
  { value: "post-match", label: "Post-match" },
];

const SESSION_TYPES = [
  { value: "individuel", label: "Individuel" },
  { value: "groupe", label: "Groupe" },
  { value: "visualisation", label: "Visualisation" },
  { value: "relaxation", label: "Relaxation" },
  { value: "respiration", label: "Respiration" },
  { value: "concentration", label: "Concentration" },
];

const GOAL_TYPES = [
  { value: "short_term", label: "Court terme (< 1 mois)" },
  { value: "medium_term", label: "Moyen terme (1-3 mois)" },
  { value: "long_term", label: "Long terme (> 3 mois)" },
];

export function MentalPerformanceSection({ categoryId }: MentalPerformanceSectionProps) {
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch mental assessments for selected player
  const { data: assessments = [] } = useQuery({
    queryKey: ["mental-assessments", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      const { data, error } = await supabase
        .from("mental_assessments" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPlayerId,
  });

  // Fetch mental goals for selected player
  const { data: goals = [] } = useQuery({
    queryKey: ["mental-goals", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      const { data, error } = await supabase
        .from("mental_goals" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPlayerId,
  });

  // Fetch mental prep sessions for selected player
  const { data: sessions = [] } = useQuery({
    queryKey: ["mental-sessions", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      const { data, error } = await supabase
        .from("mental_prep_sessions" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPlayerId,
  });

  // Add assessment mutation
  const addAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("mental_assessments" as any)
        .insert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mental-assessments", selectedPlayerId] });
      toast.success("Évaluation ajoutée");
      setAssessmentDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("mental_goals" as any)
        .insert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mental-goals", selectedPlayerId] });
      toast.success("Objectif ajouté");
      setGoalDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Add session mutation
  const addSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("mental_prep_sessions" as any)
        .insert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mental-sessions", selectedPlayerId] });
      toast.success("Séance ajoutée");
      setSessionDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Update goal progress
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: any }) => {
      const { error } = await supabase
        .from("mental_goals" as any)
        .update(updates)
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mental-goals", selectedPlayerId] });
      toast.success("Objectif mis à jour");
    },
  });

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const latestAssessment = assessments[0];
  const activeGoals = goals.filter((g: any) => g.status === "active");

  return (
    <div className="space-y-6">
      {/* Player Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Performance Mentale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Sélectionner un joueur</Label>
              <Select value={selectedPlayerId || ""} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un joueur..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPlayerId && (
        <>
          {/* Mental Profile Overview */}
          {latestAssessment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Profil Mental - {selectedPlayer?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <MetricCard 
                    icon={<Shield className="h-4 w-4" />}
                    label="Confiance" 
                    value={latestAssessment.confidence_level} 
                  />
                  <MetricCard 
                    icon={<Focus className="h-4 w-4" />}
                    label="Concentration" 
                    value={latestAssessment.focus_level} 
                  />
                  <MetricCard 
                    icon={<AlertCircle className="h-4 w-4" />}
                    label="Anxiété" 
                    value={latestAssessment.anxiety_level}
                    inverse 
                  />
                  <MetricCard 
                    icon={<Flame className="h-4 w-4" />}
                    label="Motivation" 
                    value={latestAssessment.motivation_level} 
                  />
                  <MetricCard 
                    icon={<Heart className="h-4 w-4" />}
                    label="Résilience" 
                    value={latestAssessment.resilience_level} 
                  />
                  <MetricCard 
                    icon={<Users className="h-4 w-4" />}
                    label="Cohésion" 
                    value={latestAssessment.team_cohesion} 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Dernière évaluation : {format(new Date(latestAssessment.assessment_date), "d MMMM yyyy", { locale: fr })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs for detailed info */}
          <Card>
            <Tabs defaultValue="assessments">
              <CardHeader className="pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="assessments">Évaluations</TabsTrigger>
                    <TabsTrigger value="goals">Objectifs</TabsTrigger>
                    <TabsTrigger value="sessions">Séances</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Évaluation
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Nouvelle évaluation mentale</DialogTitle>
                        </DialogHeader>
                        <AssessmentForm 
                          onSave={(data) => addAssessmentMutation.mutate(data)} 
                          isLoading={addAssessmentMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Target className="h-4 w-4 mr-1" />
                          Objectif
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nouvel objectif mental</DialogTitle>
                        </DialogHeader>
                        <GoalForm 
                          onSave={(data) => addGoalMutation.mutate(data)} 
                          isLoading={addGoalMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Clock className="h-4 w-4 mr-1" />
                          Séance
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Nouvelle séance de préparation mentale</DialogTitle>
                        </DialogHeader>
                        <SessionForm 
                          onSave={(data) => addSessionMutation.mutate(data)} 
                          isLoading={addSessionMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Assessments Tab */}
                <TabsContent value="assessments" className="mt-0">
                  {assessments.length > 0 ? (
                    <div className="space-y-3">
                      {assessments.map((assessment: any) => (
                        <div key={assessment.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {ASSESSMENT_TYPES.find(t => t.value === assessment.assessment_type)?.label || assessment.assessment_type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(assessment.assessment_date), "d MMMM yyyy", { locale: fr })}
                              </span>
                            </div>
                            {assessment.assessed_by && (
                              <span className="text-xs text-muted-foreground">
                                Par {assessment.assessed_by}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-sm">
                            <div><span className="text-muted-foreground">Confiance</span><br/><strong>{assessment.confidence_level}/10</strong></div>
                            <div><span className="text-muted-foreground">Focus</span><br/><strong>{assessment.focus_level}/10</strong></div>
                            <div><span className="text-muted-foreground">Anxiété</span><br/><strong>{assessment.anxiety_level}/10</strong></div>
                            <div><span className="text-muted-foreground">Motivation</span><br/><strong>{assessment.motivation_level}/10</strong></div>
                            <div><span className="text-muted-foreground">Résilience</span><br/><strong>{assessment.resilience_level}/10</strong></div>
                            <div><span className="text-muted-foreground">Cohésion</span><br/><strong>{assessment.team_cohesion}/10</strong></div>
                          </div>
                          {(assessment.strengths || assessment.areas_to_improve) && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                              {assessment.strengths && (
                                <div>
                                  <p className="text-muted-foreground">Points forts</p>
                                  <p>{assessment.strengths}</p>
                                </div>
                              )}
                              {assessment.areas_to_improve && (
                                <div>
                                  <p className="text-muted-foreground">Axes d'amélioration</p>
                                  <p>{assessment.areas_to_improve}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune évaluation enregistrée
                    </p>
                  )}
                </TabsContent>

                {/* Goals Tab */}
                <TabsContent value="goals" className="mt-0">
                  {goals.length > 0 ? (
                    <div className="space-y-3">
                      {goals.map((goal: any) => (
                        <div key={goal.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                {goal.status === "achieved" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {goal.status === "active" && <Target className="h-4 w-4 text-primary" />}
                                {goal.goal_title}
                              </h4>
                              <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
                            </div>
                            <Badge variant={
                              goal.status === "achieved" ? "default" : 
                              goal.status === "abandoned" ? "secondary" : "outline"
                            }>
                              {GOAL_TYPES.find(t => t.value === goal.goal_type)?.label}
                            </Badge>
                          </div>
                          {goal.status === "active" && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progression</span>
                                <span>{goal.progress_percentage}%</span>
                              </div>
                              <Progress value={goal.progress_percentage} className="h-2" />
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateGoalMutation.mutate({
                                    goalId: goal.id,
                                    updates: { progress_percentage: Math.min(100, goal.progress_percentage + 10) }
                                  })}
                                >
                                  +10%
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateGoalMutation.mutate({
                                    goalId: goal.id,
                                    updates: { status: "achieved", progress_percentage: 100 }
                                  })}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Atteint
                                </Button>
                              </div>
                            </div>
                          )}
                          {goal.target_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Échéance : {format(new Date(goal.target_date), "d MMMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun objectif défini
                    </p>
                  )}
                </TabsContent>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="mt-0">
                  {sessions.length > 0 ? (
                    <div className="space-y-3">
                      {sessions.map((session: any) => (
                        <div key={session.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge>
                                {SESSION_TYPES.find(t => t.value === session.session_type)?.label || session.session_type}
                              </Badge>
                              <span className="text-sm">
                                {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
                              </span>
                              {session.duration_minutes && (
                                <span className="text-sm text-muted-foreground">
                                  • {session.duration_minutes} min
                                </span>
                              )}
                            </div>
                            {session.practitioner_name && (
                              <span className="text-sm text-muted-foreground">
                                {session.practitioner_name}
                              </span>
                            )}
                          </div>
                          {session.topics_covered && (
                            <p className="text-sm"><strong>Thèmes :</strong> {session.topics_covered}</p>
                          )}
                          {session.exercises_practiced && (
                            <p className="text-sm"><strong>Exercices :</strong> {session.exercises_practiced}</p>
                          )}
                          {session.homework && (
                            <p className="text-sm text-primary"><strong>À faire :</strong> {session.homework}</p>
                          )}
                          {session.next_session_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Prochaine séance : {format(new Date(session.next_session_date), "d MMMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune séance enregistrée
                    </p>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, inverse = false }: { icon: React.ReactNode; label: string; value: number; inverse?: boolean }) {
  const getColor = (val: number, inv: boolean) => {
    const normalized = inv ? 10 - val : val;
    if (normalized >= 7) return "text-green-500";
    if (normalized >= 4) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <div className={`flex justify-center mb-1 ${getColor(value, inverse)}`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${getColor(value, inverse)}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Assessment Form Component
function AssessmentForm({ onSave, isLoading }: { onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    assessment_date: new Date().toISOString().split("T")[0],
    assessment_type: "suivi",
    confidence_level: 5,
    focus_level: 5,
    anxiety_level: 5,
    motivation_level: 5,
    resilience_level: 5,
    team_cohesion: 5,
    strengths: "",
    areas_to_improve: "",
    mental_prep_notes: "",
    assessed_by: "",
  });

  const SliderField = ({ label, value, onChange, inverse = false }: { label: string; value: number; onChange: (v: number) => void; inverse?: boolean }) => (
    <div>
      <div className="flex justify-between mb-1">
        <Label>{label}</Label>
        <span className={`font-medium ${
          inverse 
            ? (value <= 3 ? "text-green-500" : value <= 6 ? "text-amber-500" : "text-red-500")
            : (value >= 7 ? "text-green-500" : value >= 4 ? "text-amber-500" : "text-red-500")
        }`}>{value}/10</span>
      </div>
      <Slider 
        value={[value]} 
        onValueChange={(v) => onChange(v[0])} 
        min={1} 
        max={10} 
        step={1}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.assessment_date} 
            onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Type d'évaluation</Label>
          <Select value={formData.assessment_type} onValueChange={(v) => setFormData({ ...formData, assessment_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SliderField 
          label="Confiance en soi" 
          value={formData.confidence_level} 
          onChange={(v) => setFormData({ ...formData, confidence_level: v })}
        />
        <SliderField 
          label="Concentration" 
          value={formData.focus_level} 
          onChange={(v) => setFormData({ ...formData, focus_level: v })}
        />
        <SliderField 
          label="Niveau d'anxiété" 
          value={formData.anxiety_level} 
          onChange={(v) => setFormData({ ...formData, anxiety_level: v })}
          inverse
        />
        <SliderField 
          label="Motivation" 
          value={formData.motivation_level} 
          onChange={(v) => setFormData({ ...formData, motivation_level: v })}
        />
        <SliderField 
          label="Résilience" 
          value={formData.resilience_level} 
          onChange={(v) => setFormData({ ...formData, resilience_level: v })}
        />
        <SliderField 
          label="Cohésion d'équipe" 
          value={formData.team_cohesion} 
          onChange={(v) => setFormData({ ...formData, team_cohesion: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Points forts</Label>
          <Textarea 
            value={formData.strengths} 
            onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
            placeholder="Forces mentales observées..."
          />
        </div>
        <div>
          <Label>Axes d'amélioration</Label>
          <Textarea 
            value={formData.areas_to_improve} 
            onChange={(e) => setFormData({ ...formData, areas_to_improve: e.target.value })}
            placeholder="Points à travailler..."
          />
        </div>
      </div>

      <div>
        <Label>Notes supplémentaires</Label>
        <Textarea 
          value={formData.mental_prep_notes} 
          onChange={(e) => setFormData({ ...formData, mental_prep_notes: e.target.value })}
          placeholder="Observations générales..."
        />
      </div>

      <div>
        <Label>Évaluateur</Label>
        <Input 
          value={formData.assessed_by} 
          onChange={(e) => setFormData({ ...formData, assessed_by: e.target.value })}
          placeholder="Nom du préparateur mental"
        />
      </div>

      <Button onClick={() => onSave(formData)} disabled={isLoading} className="w-full">
        {isLoading ? "Enregistrement..." : "Enregistrer l'évaluation"}
      </Button>
    </div>
  );
}

// Goal Form Component
function GoalForm({ onSave, isLoading }: { onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    goal_type: "short_term",
    goal_title: "",
    goal_description: "",
    target_date: "",
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Type d'objectif</Label>
        <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Titre de l'objectif</Label>
        <Input 
          value={formData.goal_title} 
          onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
          placeholder="Ex: Améliorer la gestion du stress en match"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea 
          value={formData.goal_description} 
          onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
          placeholder="Détails et indicateurs de réussite..."
        />
      </div>
      <div>
        <Label>Date cible (optionnel)</Label>
        <Input 
          type="date" 
          value={formData.target_date} 
          onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
        />
      </div>
      <Button 
        onClick={() => onSave(formData)} 
        disabled={isLoading || !formData.goal_title} 
        className="w-full"
      >
        {isLoading ? "Ajout..." : "Ajouter l'objectif"}
      </Button>
    </div>
  );
}

// Session Form Component
function SessionForm({ onSave, isLoading }: { onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    session_date: new Date().toISOString().split("T")[0],
    session_type: "individuel",
    duration_minutes: "",
    practitioner_name: "",
    topics_covered: "",
    exercises_practiced: "",
    homework: "",
    player_feedback: "",
    next_session_date: "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.session_date} 
            onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Durée (min)</Label>
          <Input 
            type="number" 
            value={formData.duration_minutes} 
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
            placeholder="45"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de séance</Label>
          <Select value={formData.session_type} onValueChange={(v) => setFormData({ ...formData, session_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Préparateur mental</Label>
          <Input 
            value={formData.practitioner_name} 
            onChange={(e) => setFormData({ ...formData, practitioner_name: e.target.value })}
            placeholder="Nom"
          />
        </div>
      </div>
      <div>
        <Label>Thèmes abordés</Label>
        <Textarea 
          value={formData.topics_covered} 
          onChange={(e) => setFormData({ ...formData, topics_covered: e.target.value })}
          placeholder="Gestion du stress, visualisation..."
        />
      </div>
      <div>
        <Label>Exercices pratiqués</Label>
        <Textarea 
          value={formData.exercises_practiced} 
          onChange={(e) => setFormData({ ...formData, exercises_practiced: e.target.value })}
          placeholder="Respiration 4-7-8, body scan..."
        />
      </div>
      <div>
        <Label>Travail à faire</Label>
        <Textarea 
          value={formData.homework} 
          onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
          placeholder="Exercices à pratiquer entre les séances..."
        />
      </div>
      <div>
        <Label>Prochaine séance (optionnel)</Label>
        <Input 
          type="date" 
          value={formData.next_session_date} 
          onChange={(e) => setFormData({ ...formData, next_session_date: e.target.value })}
        />
      </div>
      <Button 
        onClick={() => onSave({
          ...formData,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        })} 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? "Enregistrement..." : "Enregistrer la séance"}
      </Button>
    </div>
  );
}
