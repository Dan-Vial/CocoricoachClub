import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddSessionDialog } from "./AddSessionDialog";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["training_sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("session_time", { ascending: false });
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

  const sessionsForSelectedDate = sessions?.filter((session) =>
    selectedDate ? isSameDay(new Date(session.session_date), selectedDate) : false
  );

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
          <div className="flex justify-between items-center">
            <CardTitle>Calendrier des entraînements</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une séance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              className="rounded-md border bg-card"
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

      {selectedDate && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle>
              Séances du {format(selectedDate, "d MMMM yyyy", { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsForSelectedDate && sessionsForSelectedDate.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune séance ce jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionsForSelectedDate?.map((session) => (
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
                          <span className="font-semibold">
                            {trainingTypeLabels[session.training_type]}
                          </span>
                          {session.session_time && (
                            <span className="text-sm text-muted-foreground">
                              • {session.session_time}
                            </span>
                          )}
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
