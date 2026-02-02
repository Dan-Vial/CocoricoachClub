import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Bell, Trash2, Calendar } from "lucide-react";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

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

export function TestRemindersTab({ categoryId }: TestRemindersTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    test_type: "VMA",
    frequency_weeks: 6,
    start_date: format(new Date(), "yyyy-MM-dd"),
  });
  const { isViewer } = useViewerModeContext();

  // Récupérer les rappels
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

  // Créer un rappel
  const createReminder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("test_reminders").insert({
        category_id: categoryId,
        test_type: newReminder.test_type,
        frequency_weeks: newReminder.frequency_weeks,
        start_date: newReminder.start_date,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      setIsDialogOpen(false);
      setNewReminder({ test_type: "VMA", frequency_weeks: 6, start_date: format(new Date(), "yyyy-MM-dd") });
      toast({
        title: "Rappel créé",
        description: "Le rappel de test a été créé avec succès",
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

  // Activer/désactiver un rappel
  const toggleReminder = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("test_reminders")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      toast({
        title: "Rappel mis à jour",
        description: "Le statut du rappel a été modifié",
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

  // Supprimer un rappel
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("test_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-reminders", categoryId] });
      toast({
        title: "Rappel supprimé",
        description: "Le rappel a été supprimé avec succès",
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
      // Vitesse & Endurance
      VMA: "Test VMA (1600m)",
      Sprint: "Sprint 40m",
      // Force
      Force: "Tests de Force",
      // Détente
      vertical_jump: "Saut Vertical (CMJ)",
      horizontal_jump: "Saut Horizontal",
      // Mobilité
      fms: "FMS (Functional Movement Screen)",
      hip: "Mobilité Hanche",
      shoulder: "Mobilité Épaule",
      ankle: "Mobilité Cheville",
      // Tests Rugby
      yo_yo: "Yo-Yo Test",
      bronco: "Bronco Test",
      agility: "Test d'Agilité",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rappels de Tests</h2>
          <p className="text-muted-foreground">
            Configurez des rappels automatiques pour les tests physiques périodiques
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
                  Configurez un rappel automatique pour un type de test
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
                    <SelectContent>
                      <SelectItem value="VMA" className="font-medium">Test VMA (1600m)</SelectItem>
                      <SelectItem value="Sprint">Sprint 40m</SelectItem>
                      <SelectItem value="Force" className="font-medium">Tests de Force</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Détente —</div>
                      <SelectItem value="vertical_jump">Saut Vertical (CMJ)</SelectItem>
                      <SelectItem value="horizontal_jump">Saut Horizontal</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Mobilité —</div>
                      <SelectItem value="fms">FMS (Functional Movement Screen)</SelectItem>
                      <SelectItem value="hip">Mobilité Hanche</SelectItem>
                      <SelectItem value="shoulder">Mobilité Épaule</SelectItem>
                      <SelectItem value="ankle">Mobilité Cheville</SelectItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">— Tests Rugby —</div>
                      <SelectItem value="yo_yo">Yo-Yo Test</SelectItem>
                      <SelectItem value="bronco">Bronco Test</SelectItem>
                      <SelectItem value="agility">Test d'Agilité</SelectItem>
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
                  <p className="text-xs text-muted-foreground">
                    Premier rappel à cette date, puis selon la fréquence
                  </p>
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
                      <SelectItem value="4">Toutes les 4 semaines</SelectItem>
                      <SelectItem value="6">Toutes les 6 semaines</SelectItem>
                      <SelectItem value="8">Toutes les 8 semaines</SelectItem>
                      <SelectItem value="12">Toutes les 12 semaines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createReminder.mutate()}
                  disabled={createReminder.isPending}
                  className="w-full"
                >
                  Créer le rappel
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
          {reminders.map((reminder) => (
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
                        : "Non défini"} • Fréquence: Tous les {reminder.frequency_weeks} semaines
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
                    <Calendar className="h-4 w-4" />
                    {reminder.last_notification_date ? (
                      <span>
                        Dernière notification:{" "}
                        {format(
                          new Date(reminder.last_notification_date),
                          "dd MMMM yyyy",
                          { locale: fr }
                        )}
                      </span>
                    ) : (
                      <span>Aucune notification envoyée</span>
                    )}
                  </div>
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
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun rappel configuré. Créez-en un pour recevoir des notifications
            automatiques.
          </CardContent>
        </Card>
      )}
    </div>
  );
}