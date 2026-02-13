import { useState } from "react";
import { getDisplayNotes } from "@/lib/utils/sessionNotes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Clock, Dumbbell, Trash2, Edit, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SessionFormDialog } from "./SessionFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface SessionsTabProps {
  categoryId: string;
}

const trainingTypeLabels: Record<string, string> = {
  collectif: "Collectif",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  reathlétisation: "Réathlétisation",
  repos: "Repos",
  test: "Test",
};

export function SessionsTab({ categoryId }: SessionsTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isViewer } = useViewerModeContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handlePrintSession = async (session: any) => {
    // Fetch exercises for this session
    const { data: exercises } = await supabase
      .from("gym_session_exercises")
      .select("*")
      .eq("training_session_id", session.id)
      .order("order_index");

    // Deduplicate exercises
    const seen = new Map<string, any>();
    exercises?.forEach((ex) => {
      const key = `${ex.exercise_name}-${ex.order_index}`;
      if (!seen.has(key)) {
        seen.set(key, ex);
      }
    });
    const uniqueExercises = Array.from(seen.values());

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const sessionDate = format(new Date(session.session_date), "EEEE d MMMM yyyy", { locale: fr });
    const trainingType = trainingTypeLabels[session.training_type] || session.training_type;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Séance - ${sessionDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 5px; }
          .meta { color: #666; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px; margin-right: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f5f5f5; font-weight: 600; }
          .notes { font-style: italic; color: #666; margin-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Séance d'entraînement</h1>
        <div class="meta">
          <span class="badge">${trainingType}</span>
          ${session.intensity ? `<span class="badge">Intensité ${session.intensity}/10</span>` : ""}
          <br/><br/>
          📅 ${sessionDate}
          ${session.session_start_time ? ` • 🕐 ${session.session_start_time.slice(0, 5)}${session.session_end_time ? ` - ${session.session_end_time.slice(0, 5)}` : ""}` : ""}
        </div>
        ${session.notes && !session.notes.match(/^<!--TESTS:/) ? `<p class="notes">Notes: ${session.notes.replace(/\n?<!--TESTS:.*?-->/g, "").trim()}</p>` : ""}
        ${uniqueExercises.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Exercice</th>
                <th>Type</th>
                <th>Séries</th>
                <th>Reps</th>
                <th>Poids</th>
                <th>Repos</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${uniqueExercises.map((ex, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${ex.exercise_name}</td>
                  <td>${ex.set_type || "Normal"}</td>
                  <td>${ex.sets || "-"}</td>
                  <td>${ex.reps || "-"}</td>
                  <td>${ex.weight_kg ? ex.weight_kg + " kg" : "-"}</td>
                  <td>${ex.rest_seconds ? ex.rest_seconds + "s" : "-"}</td>
                  <td>${ex.notes || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : "<p>Aucun exercice détaillé pour cette séance.</p>"}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Fetch sessions with exercise counts
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["training_sessions", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`
          id,
          session_date,
          session_start_time,
          session_end_time,
          training_type,
          intensity,
          notes
        `)
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .order("session_start_time", { ascending: false });

      if (error) throw error;

      // Get exercise counts for each session
      const sessionIds = data?.map((s) => s.id) || [];
      if (sessionIds.length > 0) {
        const { data: exerciseCounts } = await supabase
          .from("gym_session_exercises")
          .select("training_session_id")
          .in("training_session_id", sessionIds);

        const countMap = new Map<string, number>();
        exerciseCounts?.forEach((ex) => {
          const current = countMap.get(ex.training_session_id) || 0;
          countMap.set(ex.training_session_id, current + 1);
        });

        return data?.map((s) => ({
          ...s,
          exerciseCount: countMap.get(s.id) || 0,
        }));
      }

      return data?.map((s) => ({ ...s, exerciseCount: 0 })) || [];
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Delete related records first
      await supabase.from("gym_session_exercises").delete().eq("training_session_id", sessionId);
      await supabase.from("training_attendance").delete().eq("training_session_id", sessionId);
      await supabase.from("awcr_tracking").delete().eq("training_session_id", sessionId);
      const { error } = await supabase.from("training_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_session_exercises"] });
      toast.success("Séance supprimée");
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleEdit = (session: any) => {
    setEditingSession(session);
    setFormOpen(true);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSession(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Séances d'entraînement</h2>
        {!isViewer && (
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle séance
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : sessions?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune séance créée</p>
            <p className="text-sm mt-1">Cliquez sur "Nouvelle séance" pour commencer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions?.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-medium">
                        {trainingTypeLabels[session.training_type] || session.training_type}
                      </Badge>
                      {session.intensity && (
                        <Badge variant="secondary">Intensité {session.intensity}/10</Badge>
                      )}
                      {session.exerciseCount > 0 && (
                        <Badge variant="default" className="bg-primary/80">
                          <Dumbbell className="h-3 w-3 mr-1" />
                          {session.exerciseCount} exercice(s)
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(session.session_date), "EEEE d MMMM yyyy", { locale: fr })}
                      </span>
                      {session.session_start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {session.session_start_time.slice(0, 5)}
                          {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                        </span>
                      )}
                    </div>
                    {session.notes && getDisplayNotes(session.notes) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{getDisplayNotes(session.notes)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isViewer && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(session)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrintSession(session)}
                      title="Imprimer"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {!isViewer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteClick(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        categoryId={categoryId}
        editSession={editingSession}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette séance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les exercices, présences et données AWCR associés seront
              également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && deleteSession.mutate(sessionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
