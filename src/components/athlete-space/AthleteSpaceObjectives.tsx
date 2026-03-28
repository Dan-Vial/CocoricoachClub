import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, Users, User, TrendingUp, Flag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  playerId: string;
  categoryId: string;
}

const goalTypeLabels: Record<string, string> = {
  team: "Équipe",
  physical: "Physique",
  tactical: "Tactique",
  technical: "Technique",
  mental: "Mental",
};

const goalTypeColors: Record<string, string> = {
  team: "bg-blue-500",
  physical: "bg-emerald-500",
  tactical: "bg-purple-500",
  technical: "bg-orange-500",
  mental: "bg-sky-500",
};

const statusLabels: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
};

const currentYear = new Date().getFullYear();

export function AthleteSpaceObjectives({ playerId, categoryId }: Props) {
  // Team objectives (season_goals)
  const { data: teamGoals = [] } = useQuery({
    queryKey: ["athlete-team-goals", categoryId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("season_goals")
        .select("*")
        .eq("category_id", categoryId)
        .eq("season_year", currentYear)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Personal objectives (player_objectives)
  const { data: personalObjectives = [] } = useQuery({
    queryKey: ["athlete-personal-objectives", playerId, categoryId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_objectives")
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .eq("season_year", currentYear)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Test reminders
  const { data: testReminders = [] } = useQuery({
    queryKey: ["athlete-space-test-reminders", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_reminders")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("start_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const teamCompletedCount = teamGoals.filter(g => g.status === "completed").length;
  const personalCompletedCount = personalObjectives.filter(o => o.status === "completed").length;
  const totalPersonal = personalObjectives.length;
  const personalProgress = totalPersonal > 0
    ? Math.round(personalObjectives.reduce((s, o) => s + (o.progress_percentage || 0), 0) / totalPersonal)
    : 0;

  return (
    <div className="space-y-6">
      {/* Personal objectives */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Mes Objectifs Personnels
          </CardTitle>
          {totalPersonal > 0 && (
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                {personalCompletedCount}/{totalPersonal} terminés
              </Badge>
              <Badge variant="outline" className="text-xs">
                Progression: {personalProgress}%
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {personalObjectives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun objectif personnel défini. Ton staff peut t'en assigner depuis la planification.
            </p>
          ) : (
            <div className="space-y-3">
              {personalObjectives.map(obj => (
                <div key={obj.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${goalTypeColors[obj.goal_type] || "bg-muted"}`} />
                      <span className="font-medium text-sm">{obj.title}</span>
                    </div>
                    <Badge variant={obj.status === "completed" ? "default" : "secondary"} className="text-xs shrink-0">
                      {statusLabels[obj.status]}
                    </Badge>
                  </div>
                  {obj.description && (
                    <p className="text-xs text-muted-foreground">{obj.description}</p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      {obj.objective_type === "measurable" && obj.target_value ? (
                        <span>{obj.metric_name}: {obj.current_value || 0} / {obj.target_value} {obj.metric_unit || ""}</span>
                      ) : (
                        <span>Progression</span>
                      )}
                      <span>{obj.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={obj.progress_percentage || 0} className="h-1.5" />
                  </div>
                  {obj.target_date && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Échéance: {format(new Date(obj.target_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {goalTypeLabels[obj.goal_type]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team objectives */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            Objectifs d'Équipe
          </CardTitle>
          {teamGoals.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1 w-fit mt-1">
              {teamCompletedCount}/{teamGoals.length} terminés
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {teamGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun objectif d'équipe défini pour cette saison.
            </p>
          ) : (
            <div className="space-y-3">
              {teamGoals.map(goal => (
                <div key={goal.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${goalTypeColors[goal.goal_type] || "bg-muted"}`} />
                      <span className="font-medium text-sm">{goal.title}</span>
                    </div>
                    <Badge variant={goal.status === "completed" ? "default" : "secondary"} className="text-xs shrink-0">
                      {statusLabels[goal.status]}
                    </Badge>
                  </div>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progression</span>
                      <span>{goal.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={goal.progress_percentage || 0} className="h-1.5" />
                  </div>
                  {goal.target_date && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Échéance: {format(new Date(goal.target_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {goalTypeLabels[goal.goal_type]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test reminders */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4 text-warning" />
            Tests prévus
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testReminders.length > 0 ? (
            <div className="space-y-2">
              {testReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{reminder.test_type}</p>
                    <p className="text-xs text-muted-foreground">Tous les {reminder.frequency_weeks} semaines</p>
                  </div>
                  {reminder.start_date && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      {format(new Date(reminder.start_date), "dd MMM", { locale: fr })}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun test prévu pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
