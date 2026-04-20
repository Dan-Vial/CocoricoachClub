import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Bell, Trash2, Calendar, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, addWeeks, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Badge } from "@/components/ui/badge";

interface TestRemindersTabProps {
  categoryId: string;
}

interface TestReminder {
  id: string;
  category_id: string;
  test_type: string;
  frequency_weeks: number;
  is_active: boolean;
  last_notification_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at?: string;
}

// Generate session dates from start_date, every N weeks, up to ~6 months ahead
function generateSessionDates(startDate: string, frequencyWeeks: number): string[] {
  const dates: string[] = [];
  const today = startOfDay(new Date());
  const maxDate = addWeeks(today, 26); // ~6 months ahead
  let current = new Date(startDate);

  // Skip past dates
  while (isBefore(current, today)) {
    current = addWeeks(current, frequencyWeeks);
  }

  while (isBefore(current, maxDate)) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addWeeks(current, frequencyWeeks);
  }

  return dates;
}

export function TestRemindersTab({ categoryId }: TestRemindersTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    test_type: "VMA",
    frequency_weeks: 4,
    start_date: format(new Date(), "yyyy-MM-dd"),
  });
  const { isViewer } = useViewerModeContext();

  // Fetch reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ["test-reminders", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_reminders")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TestReminder[];
    },
  });

  // Count generated sessions per reminder
  const { data: sessionCounts } = useQuery({
    queryKey: ["test-reminder-session-counts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("test_reminder_id")
        .eq("category_id", categoryId)
        .not("test_reminder_id", "is", null)
        .gte("session_date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s: any) => {
        counts[s.test_reminder_id] = (counts[s.test_reminder_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Helper: create sessions for a reminder
  async function createSessionsForReminder(reminderId: string, testType: string, startDate: string, frequencyWeeks: number) {
    const dates = generateSessionDates(startDate, frequencyWeeks);
    if (dates.length === 0) return;

    const label = getTestTypeLabel(testType);
    const sessions = dates.map(date => ({
      category_id: categoryId,
      session_date: date,
      training_type: "test",
      notes: `📋 Test auto-planifié: ${label}`,
      test_reminder_id: reminderId,
    }));

    const { error } = await supabase.from("training_sessions").insert(sessions);
    if (error) throw error;
  }

  // Helper: delete future sessions for a reminder
  async function deleteFutureSessionsForReminder(reminderId: string) {
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("test_reminder_id", reminderId)
      .gte("session_date", today);
    if (error) throw error;
  }

  // Create reminder + generate sessions
  const createReminder = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("test_reminders").insert({
        category_id: categoryId,
        test_type: newReminder.test_type,
        frequency_weeks: newReminder.frequency_weeks,
        start_date: newReminder.start_date,
        is_active: true,
      }).select("id").single();

      if (error) throw error;

      // Generate sessions
      await createSessionsForReminder(
        data.id,
        newReminder.test_type,
        newReminder.start_date,
        newReminder.frequency_weeks
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["test-reminder-session-counts", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      setIsDialogOpen(false);
      setNewReminder({ test_type: "VMA", frequency_weeks: 4, start_date: format(new Date(), "yyyy-MM-dd") });
      toast({
        title: "Rappel créé",
        description: "Le rappel et les séances de test ont été créés automatiquement dans le calendrier",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Toggle reminder (activate/deactivate)
  const toggleReminder = useMutation({
    mutationFn: async ({ id, isActive, reminder }: { id: string; isActive: boolean; reminder: TestReminder }) => {
      const { error } = await supabase
        .from("test_reminders")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;

      if (isActive && reminder.start_date) {
        // Reactivating: regenerate future sessions
        await createSessionsForReminder(id, reminder.test_type, reminder.start_date, reminder.frequency_weeks);
      } else {
        // Deactivating: remove future sessions
        await deleteFutureSessionsForReminder(id);
      }
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["test-reminder-session-counts", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({
        title: isActive ? "Rappel activé" : "Rappel désactivé",
        description: isActive
          ? "Les séances de test ont été ajoutées au calendrier"
          : "Les séances futures ont été retirées du calendrier",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rappel",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete reminder + remove future sessions
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      await deleteFutureSessionsForReminder(id);
      const { error } = await supabase.from("test_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["test-reminder-session-counts", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({
        title: "Rappel supprimé",
        description: "Le rappel et les séances futures associées ont été supprimés",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rappel",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      VMA: "Test VMA (1600m)",
      Sprint: "Sprint 40m",
      Sprint_10m: "Sprint 10m",
      Sprint_20m: "Sprint 20m",
      Sprint_30m: "Sprint 30m",
      Force: "Tests de Force",
      Bench_Press: "Développé Couché 1RM",
      Squat: "Squat 1RM",
      Deadlift: "Soulevé de Terre 1RM",
      Pull_Ups: "Tractions Max",
      vertical_jump: "Saut Vertical (CMJ)",
      horizontal_jump: "Saut Horizontal",
      squat_jump: "Squat Jump",
      drop_jump: "Drop Jump",
      fms: "FMS (Functional Movement Screen)",
      hip: "Mobilité Hanche",
      shoulder: "Mobilité Épaule",
      ankle: "Mobilité Cheville",
      thomas_test: "Thomas Test",
      sit_and_reach: "Sit and Reach",
      yo_yo: "Yo-Yo Test",
      bronco: "Bronco Test",
      agility: "Test d'Agilité (T-Test)",
      illinois: "Illinois Agility Test",
      pro_agility: "Pro Agility (5-10-5)",
      beep_test: "Beep Test",
      body_comp: "Composition Corporelle",
      custom: "Test Personnalisé",
    };
    return labels[type] || type;
  };

  // Preview upcoming dates for new reminder
  const previewDates = generateSessionDates(newReminder.start_date, newReminder.frequency_weeks).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rappels de Tests</h2>
          <p className="text-muted-foreground">
            Les rappels créent automatiquement des séances de test dans le calendrier
          </p>
        </div>
        {!isViewer && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Rappel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un rappel de test</DialogTitle>
                <DialogDescription>
                  Les séances de test seront automatiquement ajoutées au calendrier
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-type">Type de test</Label>
                  <Select
                    value={newReminder.test_type}
                    onValueChange={(value) =>
                      setNewReminder({ ...newReminder, test_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Vitesse & Endurance —</div>
                      <SelectItem value="VMA">Test VMA (1600m)</SelectItem>
                      <SelectItem value="Sprint">Sprint 40m</SelectItem>
                      <SelectItem value="Sprint_10m">Sprint 10m</SelectItem>
                      <SelectItem value="Sprint_20m">Sprint 20m</SelectItem>
                      <SelectItem value="Sprint_30m">Sprint 30m</SelectItem>
                      <SelectItem value="yo_yo">Yo-Yo Test</SelectItem>
                      <SelectItem value="bronco">Bronco Test</SelectItem>
                      <SelectItem value="beep_test">Beep Test</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Force —</div>
                      <SelectItem value="Force">Tests de Force (Général)</SelectItem>
                      <SelectItem value="Bench_Press">Développé Couché 1RM</SelectItem>
                      <SelectItem value="Squat">Squat 1RM</SelectItem>
                      <SelectItem value="Deadlift">Soulevé de Terre 1RM</SelectItem>
                      <SelectItem value="Pull_Ups">Tractions Max</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Détente —</div>
                      <SelectItem value="vertical_jump">Saut Vertical (CMJ)</SelectItem>
                      <SelectItem value="squat_jump">Squat Jump</SelectItem>
                      <SelectItem value="drop_jump">Drop Jump</SelectItem>
                      <SelectItem value="horizontal_jump">Saut Horizontal</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Mobilité —</div>
                      <SelectItem value="fms">FMS (Functional Movement Screen)</SelectItem>
                      <SelectItem value="hip">Mobilité Hanche</SelectItem>
                      <SelectItem value="shoulder">Mobilité Épaule</SelectItem>
                      <SelectItem value="ankle">Mobilité Cheville</SelectItem>
                      <SelectItem value="thomas_test">Thomas Test</SelectItem>
                      <SelectItem value="sit_and_reach">Sit and Reach</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Agilité —</div>
                      <SelectItem value="agility">T-Test Agilité</SelectItem>
                      <SelectItem value="illinois">Illinois Agility Test</SelectItem>
                      <SelectItem value="pro_agility">Pro Agility (5-10-5)</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Autre —</div>
                      <SelectItem value="body_comp">Composition Corporelle</SelectItem>
                      <SelectItem value="custom">Test Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Date de début</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newReminder.start_date}
                    onChange={(e) =>
                      setNewReminder({
                        ...newReminder,
                        start_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fréquence</Label>
                  <Select
                    value={String(newReminder.frequency_weeks)}
                    onValueChange={(value) =>
                      setNewReminder({
                        ...newReminder,
                        frequency_weeks: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Toutes les 2 semaines</SelectItem>
                      <SelectItem value="3">Toutes les 3 semaines</SelectItem>
                      <SelectItem value="4">Toutes les 4 semaines</SelectItem>
                      <SelectItem value="6">Toutes les 6 semaines</SelectItem>
                      <SelectItem value="8">Toutes les 8 semaines</SelectItem>
                      <SelectItem value="12">Toutes les 12 semaines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview upcoming dates */}
                {previewDates.length > 0 && (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      Prochaines séances planifiées :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDates.map(d => (
                        <Badge key={d} variant="secondary" className="text-xs">
                          {format(new Date(d), "dd MMM yyyy", { locale: fr })}
                        </Badge>
                      ))}
                      {generateSessionDates(newReminder.start_date, newReminder.frequency_weeks).length > 4 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          +{generateSessionDates(newReminder.start_date, newReminder.frequency_weeks).length - 4} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => createReminder.mutate()}
                  disabled={createReminder.isPending}
                  className="w-full"
                >
                  {createReminder.isPending ? "Création..." : "Créer le rappel"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : reminders && reminders.length > 0 ? (
        <div className="grid gap-4">
          {reminders.map((reminder) => {
            const futureCount = sessionCounts?.[reminder.id] || 0;
            return (
              <Card key={reminder.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        {getTestTypeLabel(reminder.test_type)}
                      </CardTitle>
                      <CardDescription>
                        Début: {reminder.start_date 
                          ? format(new Date(reminder.start_date), "dd MMMM yyyy", { locale: fr })
                          : "Non défini"} • Tous les {reminder.frequency_weeks} semaines
                      </CardDescription>
                    </div>
                    {!isViewer ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.is_active}
                          onCheckedChange={(checked) =>
                            toggleReminder.mutate({
                              id: reminder.id,
                              isActive: checked,
                              reminder,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReminder.mutate(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarCheck className="h-4 w-4" />
                      <span>
                        {futureCount > 0
                          ? `${futureCount} séance${futureCount > 1 ? "s" : ""} planifiée${futureCount > 1 ? "s" : ""} dans le calendrier`
                          : "Aucune séance future planifiée"}
                      </span>
                    </div>
                    {reminder.last_notification_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Dernière notification:{" "}
                          {format(new Date(reminder.last_notification_date), "dd MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    )}
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        reminder.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reminder.is_active ? "Actif" : "Inactif"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun rappel configuré. Créez-en un pour planifier automatiquement des séances de test dans le calendrier.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
