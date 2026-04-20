import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Target, User, TrendingUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlayerObjectivesSectionProps {
  categoryId: string;
}

const goalTypeLabels: Record<string, string> = {
  physical: "Physique",
  tactical: "Tactique",
  technical: "Technique",
  mental: "Mental",
  team: "Équipe",
};

const goalTypeColors: Record<string, string> = {
  physical: "bg-emerald-500",
  tactical: "bg-purple-500",
  technical: "bg-orange-500",
  mental: "bg-sky-500",
  team: "bg-blue-500",
};

const statusLabels: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
};

const currentYear = new Date().getFullYear();

export function PlayerObjectivesSection({ categoryId }: PlayerObjectivesSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState(currentYear);

  // Form
  const [formPlayerId, setFormPlayerId] = useState("");
  const [formGoalType, setFormGoalType] = useState("physical");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formIsMeasurable, setFormIsMeasurable] = useState(false);
  const [formMetricName, setFormMetricName] = useState("");
  const [formMetricUnit, setFormMetricUnit] = useState("");
  const [formTargetValue, setFormTargetValue] = useState("");

  const { data: players = [] } = useQuery({
    queryKey: ["category-players-objectives", categoryId],
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

  const { data: objectives = [] } = useQuery({
    queryKey: ["player-objectives", categoryId, selectedSeason, selectedPlayerId],
    queryFn: async () => {
      let query = supabase
        .from("player_objectives")
        .select("*, players!player_objectives_player_id_fkey(name, first_name)")
        .eq("category_id", categoryId)
        .eq("season_year", selectedSeason)
        .order("created_at", { ascending: false });

      if (selectedPlayerId !== "all") {
        query = query.eq("player_id", selectedPlayerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("player_objectives").insert({
        category_id: categoryId,
        player_id: formPlayerId,
        season_year: selectedSeason,
        objective_type: formIsMeasurable ? "measurable" : "text",
        goal_type: formGoalType,
        title: formTitle,
        description: formDescription || null,
        target_date: formTargetDate || null,
        metric_name: formIsMeasurable ? formMetricName : null,
        metric_unit: formIsMeasurable ? formMetricUnit : null,
        target_value: formIsMeasurable && formTargetValue ? parseFloat(formTargetValue) : null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-objectives"] });
      toast.success("Objectif individuel ajouté");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; status?: string; progress?: number; current_value?: number }) => {
      const updates: Record<string, any> = {};
      if (params.status !== undefined) updates.status = params.status;
      if (params.progress !== undefined) updates.progress_percentage = params.progress;
      if (params.current_value !== undefined) updates.current_value = params.current_value;
      const { error } = await supabase.from("player_objectives").update(updates).eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-objectives"] });
      toast.success("Objectif mis à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_objectives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-objectives"] });
      toast.success("Objectif supprimé");
    },
  });

  const resetForm = () => {
    setFormPlayerId("");
    setFormGoalType("physical");
    setFormTitle("");
    setFormDescription("");
    setFormTargetDate("");
    setFormIsMeasurable(false);
    setFormMetricName("");
    setFormMetricUnit("");
    setFormTargetValue("");
  };

  const getPlayerName = (obj: any) => {
    const p = obj.players;
    if (!p) return "Inconnu";
    return p.first_name ? `${p.first_name} ${p.name}` : p.name;
  };

  const completedCount = objectives.filter(o => o.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Objectifs Individuels
          </h3>
          <p className="text-sm text-muted-foreground">Objectifs personnalisés par joueur</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les joueurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les joueurs</SelectItem>
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name ? `${p.first_name} ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Objectif
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvel Objectif Individuel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Joueur</Label>
                  <Select value={formPlayerId} onValueChange={setFormPlayerId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un joueur" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name ? `${p.first_name} ${p.name}` : p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formGoalType} onValueChange={setFormGoalType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalTypeLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titre</Label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Améliorer le taux de pénalités à 80%" className="mt-1" />
                </div>
                <div>
                  <Label>Description (optionnel)</Label>
                  <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Détails..." className="mt-1" />
                </div>
                <div>
                  <Label>Date cible (optionnel)</Label>
                  <Input type="date" value={formTargetDate} onChange={e => setFormTargetDate(e.target.value)} className="mt-1" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Switch checked={formIsMeasurable} onCheckedChange={setFormIsMeasurable} />
                  <div>
                    <Label className="text-sm font-medium">Objectif mesurable (KPI)</Label>
                    <p className="text-xs text-muted-foreground">Suivi automatique de la progression</p>
                  </div>
                </div>

                {formIsMeasurable && (
                  <div className="space-y-3 p-3 rounded-lg border border-accent/30">
                    <div>
                      <Label className="text-xs">Métrique</Label>
                      <Input value={formMetricName} onChange={e => setFormMetricName(e.target.value)} placeholder="Ex: Taux de réussite pénalités" className="mt-1 h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Valeur cible</Label>
                        <Input type="number" value={formTargetValue} onChange={e => setFormTargetValue(e.target.value)} placeholder="Ex: 80" className="mt-1 h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Unité</Label>
                        <Input value={formMetricUnit} onChange={e => setFormMetricUnit(e.target.value)} placeholder="Ex: %" className="mt-1 h-8" />
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={() => addMutation.mutate()} disabled={!formPlayerId || !formTitle} className="w-full">
                  Ajouter l'objectif
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="gap-1">
          <Target className="h-3 w-3" /> {objectives.length} objectifs
        </Badge>
        <Badge variant="secondary" className="gap-1 text-status-optimal">
          <TrendingUp className="h-3 w-3" /> {completedCount} terminés
        </Badge>
      </div>

      {/* Objectives list */}
      {objectives.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              Aucun objectif individuel défini. Cliquez sur "Objectif" pour en créer un.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj) => (
            <Card key={obj.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${goalTypeColors[obj.goal_type] || "bg-muted"}`} />
                    <span className="font-medium text-sm truncate">{obj.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">{getPlayerName(obj)}</Badge>
                    <Badge variant={obj.status === "completed" ? "default" : "secondary"} className="text-xs">
                      {statusLabels[obj.status]}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(obj.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                {obj.description && (
                  <p className="text-xs text-muted-foreground">{obj.description}</p>
                )}

                {obj.objective_type === "measurable" && obj.target_value ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{obj.metric_name}: {obj.current_value || 0} / {obj.target_value} {obj.metric_unit || ""}</span>
                      <span>{obj.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={obj.progress_percentage || 0} className="h-1.5" />
                    <div className="flex gap-2 items-center mt-1">
                      <Label className="text-xs shrink-0">Valeur actuelle:</Label>
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={obj.current_value || 0}
                        onChange={e => updateMutation.mutate({ id: obj.id, current_value: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">{obj.metric_unit}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progression</span>
                      <span>{obj.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={obj.progress_percentage || 0} className="h-1.5" />
                    <div className="flex gap-2 items-center mt-1">
                      <Select
                        value={obj.status}
                        onValueChange={status => updateMutation.mutate({
                          id: obj.id,
                          status,
                          progress: status === "completed" ? 100 : obj.progress_percentage || 0,
                        })}
                      >
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">À faire</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="completed">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-16 h-7 text-xs"
                        value={obj.progress_percentage || 0}
                        onChange={e => updateMutation.mutate({ id: obj.id, status: obj.status, progress: Number(e.target.value) })}
                      />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                )}

                {obj.target_date && (
                  <p className="text-[10px] text-muted-foreground">
                    Échéance: {format(new Date(obj.target_date), "d MMM yyyy", { locale: fr })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
