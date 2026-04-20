import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { ProgramBuilderDialog } from "./ProgramBuilderDialog";
import { AssignProgramDialog } from "./AssignProgramDialog";
import { ProgramDetailsDialog } from "./ProgramDetailsDialog";
import { ProgramCard } from "./ProgramCard";
import { toast } from "sonner";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface TrainingProgramsListProps {
  categoryId: string;
}

export function TrainingProgramsList({ categoryId }: TrainingProgramsListProps) {
  const { isViewer } = useViewerModeContext();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [assigningProgram, setAssigningProgram] = useState<string | null>(null);
  const [viewingProgram, setViewingProgram] = useState<string | null>(null);

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

  const handleDuplicate = async (programId: string) => {
    const program = programs?.find(p => p.id === programId);
    if (!program) return;

    try {
      const { data: newProgram, error: programError } = await supabase
        .from("training_programs")
        .insert({
          category_id: categoryId,
          name: `${program.name} (copie)`,
          description: program.description,
          level: program.level,
          body_zone: program.body_zone,
          theme: program.theme,
          reathletisation_phase: program.reathletisation_phase,
          is_active: false,
        })
        .select()
        .single();

      if (programError) throw programError;

      const { data: weeks, error: weeksError } = await supabase
        .from("program_weeks")
        .select(`
          *,
          program_sessions(
            *,
            program_exercises(*)
          )
        `)
        .eq("program_id", programId)
        .order("week_number");

      if (weeksError) throw weeksError;

      for (const week of weeks || []) {
        const { data: newWeek, error: weekError } = await supabase
          .from("program_weeks")
          .insert({
            program_id: newProgram.id,
            week_number: week.week_number,
            name: week.name,
          })
          .select()
          .single();

        if (weekError) throw weekError;

        for (const session of week.program_sessions || []) {
          const { data: newSession, error: sessionError } = await supabase
            .from("program_sessions")
            .insert({
              week_id: newWeek.id,
              session_number: session.session_number,
              name: session.name,
              day_of_week: session.day_of_week,
              scheduled_day: session.scheduled_day,
            })
            .select()
            .single();

          if (sessionError) throw sessionError;

          const exercises = session.program_exercises || [];
          if (exercises.length > 0) {
            const exercisesToInsert = exercises.map((ex: any) => ({
              session_id: newSession.id,
              exercise_name: ex.exercise_name,
              library_exercise_id: ex.library_exercise_id,
              exercise_category: ex.exercise_category,
              order_index: ex.order_index,
              method: ex.method,
              sets: ex.sets,
              reps: ex.reps,
              percentage_1rm: ex.percentage_1rm,
              tempo: ex.tempo,
              rest_seconds: ex.rest_seconds,
              group_id: ex.group_id,
              group_order: ex.group_order,
              notes: ex.notes,
              drop_sets: ex.drop_sets,
              cluster_sets: ex.cluster_sets,
              is_rm_test: ex.is_rm_test,
              rm_test_type: ex.rm_test_type,
              target_velocity: ex.target_velocity,
              target_force_newton: ex.target_force_newton,
              erg_data: ex.erg_data,
              running_data: ex.running_data,
            }));

            await supabase.from("program_exercises").insert(exercisesToInsert);
          }
        }
      }

      toast.success("Programme dupliqué avec succès");
      refetch();
    } catch (error: any) {
      console.error("Duplicate error:", error);
      toast.error("Erreur lors de la duplication: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Programmes d'entraînement</h2>
        </div>
        {!isViewer && (
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau programme
          </Button>
        )}
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
            {!isViewer && (
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer mon premier programme
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program: any) => (
            <ProgramCard
              key={program.id}
              program={program}
              isViewer={isViewer}
              onEdit={setEditingProgram}
              onDuplicate={handleDuplicate}
              onAssign={setAssigningProgram}
              onDelete={handleDelete}
              onViewDetails={setViewingProgram}
            />
          ))}
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

      {viewingProgram && (
        <ProgramDetailsDialog
          programId={viewingProgram}
          open={!!viewingProgram}
          onOpenChange={(open) => {
            if (!open) setViewingProgram(null);
          }}
          onEdit={(programId) => {
            setViewingProgram(null);
            setEditingProgram(programId);
          }}
        />
      )}
    </div>
  );
}
