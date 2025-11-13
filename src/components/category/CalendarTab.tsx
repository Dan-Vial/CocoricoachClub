import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AddSessionDialog } from "./AddSessionDialog";
import { format, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

interface CalendarTabProps {
  categoryId: string;
}

const trainingTypeLabels: Record<string, string> = {
  collectif: "Collectif",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
};

const trainingTypeColors: Record<string, string> = {
  collectif: "bg-training-collectif",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
};

export function CalendarTab({ categoryId }: CalendarTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["training_sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("session_start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      toast.success("Séance supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la séance");
    },
  });

  const filteredSessions = sessions?.filter((session) => {
    if (!dateRange?.from) return false;
    const sessionDate = new Date(session.session_date);
    
    if (dateRange.to) {
      return isWithinInterval(sessionDate, { start: dateRange.from, end: dateRange.to });
    }
    return isSameDay(sessionDate, dateRange.from);
  });

  const getDayContent = (day: Date) => {
    const daySessions = sessions?.filter((session) =>
      isSameDay(new Date(session.session_date), day)
    );

    if (!daySessions || daySessions.length === 0) return null;

    return (
      <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
        {daySessions.slice(0, 3).map((session, index) => (
          <div
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${trainingTypeColors[session.training_type]}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>Calendrier des entraînements</CardTitle>
            <div className="flex gap-2">
              {dateRange?.from && (
                <Button 
                  onClick={() => setDateRange(undefined)} 
                  variant="outline" 
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une séance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Sélectionnez une période pour filtrer les séances
              </p>
              {dateRange?.from && (
                <p className="text-sm font-medium">
                  {dateRange.to ? (
                    <>
                      Du {format(dateRange.from, "d MMM yyyy", { locale: fr })} au{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "d MMMM yyyy", { locale: fr })
                  )}
                </p>
              )}
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              locale={fr}
              numberOfMonths={1}
              className="rounded-md border bg-card pointer-events-auto"
              modifiers={{
                hasSession: (day) =>
                  sessions?.some((session) =>
                    isSameDay(new Date(session.session_date), day)
                  ) || false,
              }}
              modifiersClassNames={{
                hasSession: "font-bold",
              }}
              components={{
                DayContent: ({ date }) => (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <span>{format(date, "d")}</span>
                    {getDayContent(date)}
                  </div>
                ),
              }}
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-center text-sm">
            {Object.entries(trainingTypeLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${trainingTypeColors[key]}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {dateRange?.from && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle>
              {dateRange.to ? (
                <>
                  Séances du {format(dateRange.from, "d MMM", { locale: fr })} au{" "}
                  {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                </>
              ) : (
                <>Séances du {format(dateRange.from, "d MMMM yyyy", { locale: fr })}</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSessions && filteredSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune séance sur cette période</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions?.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors animate-fade-in"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`h-12 w-1.5 rounded-full ${
                          trainingTypeColors[session.training_type]
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.session_date), "d MMM yyyy", { locale: fr })}
                          </span>
                          {session.session_start_time && session.session_end_time ? (
                            <span className="text-xs text-muted-foreground">
                              • {session.session_start_time} - {session.session_end_time}
                            </span>
                          ) : session.session_start_time ? (
                            <span className="text-xs text-muted-foreground">
                              • {session.session_start_time}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {trainingTypeLabels[session.training_type]}
                          </span>
                        </div>
                        {session.intensity && (
                          <p className="text-sm text-muted-foreground">
                            Intensité: {session.intensity}/10
                          </p>
                        )}
                        {session.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          confirm("Êtes-vous sûr de vouloir supprimer cette séance ?")
                        ) {
                          deleteSession.mutate(session.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AddSessionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
