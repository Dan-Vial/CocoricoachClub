import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Play, Pause, Trash2, Edit, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgramBuilderDialog } from "./ProgramBuilderDialog";
import { AssignProgramDialog } from "./AssignProgramDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProgramsTabProps {
  categoryId: string;
}

export function ProgramsTab({ categoryId }: ProgramsTabProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [assigningProgram, setAssigningProgram] = useState<string | null>(null);

  const { data: programs, isLoading, refetch } = useQuery({
    queryKey: ["training-programs", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_programs")
        .select(`
          *,
          program_weeks(
            id,
            week_number,
            program_sessions(id)
          ),
          program_assignments(
            id,
            player_id,
            is_active,
            players(name)
          )
        `)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (programId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce programme ?")) return;

    const { error } = await supabase
      .from("training_programs")
      .delete()
      .eq("id", programId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Programme supprimé");
    refetch();
  };

  const toggleActive = async (programId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("training_programs")
      .update({ is_active: !currentStatus })
      .eq("id", programId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    toast.success(currentStatus ? "Programme désactivé" : "Programme activé");
    refetch();
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner": return "Débutant";
      case "intermediate": return "Intermédiaire";
      case "advanced": return "Avancé";
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/20 text-green-700";
      case "intermediate": return "bg-yellow-500/20 text-yellow-700";
      case "advanced": return "bg-red-500/20 text-red-700";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Programmes d'entraînement</h2>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau programme
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : !programs?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aucun programme créé pour cette catégorie
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier programme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program: any) => {
            const totalWeeks = program.program_weeks?.length || 0;
            const totalSessions = program.program_weeks?.reduce(
              (sum: number, week: any) => sum + (week.program_sessions?.length || 0),
              0
            ) || 0;
            const assignedPlayers = program.program_assignments?.filter((a: any) => a.is_active)?.length || 0;

            return (
              <Card key={program.id} className={program.is_active ? "border-primary/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getLevelColor(program.level)}>
                          {getLevelLabel(program.level)}
                        </Badge>
                        {program.is_active && (
                          <Badge variant="default" className="bg-green-500">Actif</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {program.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{totalWeeks} semaine{totalWeeks > 1 ? "s" : ""}</span>
                    <span>{totalSessions} séance{totalSessions > 1 ? "s" : ""}</span>
                    <span>{assignedPlayers} joueur{assignedPlayers > 1 ? "s" : ""}</span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Créé le {format(new Date(program.created_at), "dd MMM yyyy", { locale: fr })}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(program.id, program.is_active)}
                    >
                      {program.is_active ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activer
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssigningProgram(program.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Assigner
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingProgram(program.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(program.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showBuilder && (
        <ProgramBuilderDialog
          categoryId={categoryId}
          open={showBuilder}
          onOpenChange={(open) => {
            setShowBuilder(open);
            if (!open) refetch();
          }}
        />
      )}

      {editingProgram && (
        <ProgramBuilderDialog
          categoryId={categoryId}
          programId={editingProgram}
          open={!!editingProgram}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProgram(null);
              refetch();
            }
          }}
        />
      )}

      {assigningProgram && (
        <AssignProgramDialog
          categoryId={categoryId}
          programId={assigningProgram}
          open={!!assigningProgram}
          onOpenChange={(open) => {
            if (!open) {
              setAssigningProgram(null);
              refetch();
            }
          }}
        />
      )}
    </div>
  );
}
