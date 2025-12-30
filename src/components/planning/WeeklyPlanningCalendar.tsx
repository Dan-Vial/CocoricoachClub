import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeeklyPlanningCalendarProps {
  categoryId: string;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface PlanningItem {
  id: string;
  day_of_week: number;
  time_slot: string | null;
  custom_title: string | null;
  location: string | null;
  status: string | null;
  template_id: string | null;
  template?: {
    name: string;
    session_type: string;
    duration_minutes: number | null;
    intensity: string | null;
  } | null;
}

export function WeeklyPlanningCalendar({ categoryId }: WeeklyPlanningCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemTime, setNewItemTime] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  const { data: planning, isLoading } = useQuery({
    queryKey: ["weekly-planning", categoryId, weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_planning")
        .select(`
          *,
          template:session_templates(name, session_type, duration_minutes, intensity)
        `)
        .eq("category_id", categoryId)
        .eq("week_start_date", weekStartStr);
      if (error) throw error;
      return data as PlanningItem[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["session-templates", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates")
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data;
    },
  });

  const addPlanningItem = useMutation({
    mutationFn: async () => {
      if (selectedDay === null) return;
      
      const { error } = await supabase.from("weekly_planning").insert({
        category_id: categoryId,
        week_start_date: weekStartStr,
        day_of_week: selectedDay,
        time_slot: newItemTime || null,
        custom_title: newItemTitle || null,
        location: newItemLocation || null,
        template_id: selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-planning", categoryId, weekStartStr] });
      toast.success("Séance ajoutée");
      resetAddDialog();
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    },
  });

  const deletePlanningItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_planning").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-planning", categoryId, weekStartStr] });
      toast.success("Séance supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const resetAddDialog = () => {
    setAddDialogOpen(false);
    setSelectedDay(null);
    setNewItemTitle("");
    setNewItemTime("");
    setNewItemLocation("");
    setSelectedTemplateId("");
  };

  const handleDropOnDay = (dayIndex: number, templateData: string) => {
    try {
      const template = JSON.parse(templateData);
      setSelectedDay(dayIndex);
      setSelectedTemplateId(template.id);
      setNewItemTitle("");
      setAddDialogOpen(true);
    } catch (e) {
      console.error("Failed to parse dropped template:", e);
    }
  };

  const planningByDay = useMemo(() => {
    const result: Record<number, PlanningItem[]> = {};
    DAYS.forEach((_, i) => {
      result[i] = [];
    });
    planning?.forEach((item) => {
      if (result[item.day_of_week]) {
        result[item.day_of_week].push(item);
      }
    });
    return result;
  }, [planning]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Planification hebdomadaire</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                Semaine du {format(currentWeekStart, "d MMMM yyyy", { locale: fr })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "min-h-[200px] border rounded-lg p-2 transition-colors",
                  "hover:border-primary/50"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-primary/10");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("bg-primary/10");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-primary/10");
                  const templateData = e.dataTransfer.getData("template");
                  if (templateData) {
                    handleDropOnDay(index, templateData);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium">{day}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(addDays(currentWeekStart, index), "d MMM", { locale: fr })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedDay(index);
                      setAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {planningByDay[index]?.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-primary/10 rounded p-2 text-xs"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deletePlanningItem.mutate(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="font-medium truncate">
                        {item.template?.name || item.custom_title || "Séance"}
                      </p>
                      {item.time_slot && (
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {item.time_slot.substring(0, 5)}
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Glissez-déposez un template depuis la liste pour l'ajouter à un jour
          </p>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajouter une séance - {selectedDay !== null ? DAYS[selectedDay] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template (optionnel)</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun template</SelectItem>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!selectedTemplateId || selectedTemplateId === "none") && (
              <div className="space-y-2">
                <Label>Titre personnalisé</Label>
                <Input
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Ex: Entraînement collectif"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={newItemTime}
                  onChange={(e) => setNewItemTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input
                  value={newItemLocation}
                  onChange={(e) => setNewItemLocation(e.target.value)}
                  placeholder="Terrain principal"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetAddDialog}>
                Annuler
              </Button>
              <Button 
                onClick={() => addPlanningItem.mutate()}
                disabled={((!selectedTemplateId || selectedTemplateId === "none") && !newItemTitle) || addPlanningItem.isPending}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
