import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FolderOpen, 
  Calendar, 
  Dumbbell, 
  Edit, 
  Users,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProgramDetailsDialogProps {
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (programId: string) => void;
}

export function ProgramDetailsDialog({
  programId,
  open,
  onOpenChange,
  onEdit,
}: ProgramDetailsDialogProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const { data: program, isLoading } = useQuery({
    queryKey: ["program-full-details", programId],
    queryFn: async () => {
      const { data: programData, error: programError } = await supabase
        .from("training_programs")
        .select(`
          *,
          program_assignments(
            id,
            is_active,
            players(id, name, position)
          )
        `)
        .eq("id", programId)
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

      return { ...programData, weeks };
    },
    enabled: open && !!programId,
  });

  const toggleWeek = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
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
      case "beginner": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "intermediate": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "advanced": return "bg-red-500/20 text-red-700 dark:text-red-400";
      default: return "bg-muted";
    }
  };

  const activeAssignments = program?.program_assignments?.filter((a: any) => a.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {program?.name || "Chargement..."}
            </DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(programId)}>
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : program ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Program info */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getLevelColor(program.level)}>
                    {getLevelLabel(program.level)}
                  </Badge>
                  {program.is_active && (
                    <Badge className="bg-green-500">Actif</Badge>
                  )}
                  {program.theme && (
                    <Badge variant="outline" className="capitalize">{program.theme}</Badge>
                  )}
                  {program.body_zone && (
                    <Badge variant="secondary">{program.body_zone}</Badge>
                  )}
                </div>
                
                {program.description && (
                  <p className="text-sm text-muted-foreground">{program.description}</p>
                )}
              </div>

              <Separator />

              {/* Assigned players */}
              {activeAssignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Athlètes assignés ({activeAssignments.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {activeAssignments.map((a: any) => (
                      <Badge key={a.id} variant="outline" className="text-xs">
                        {a.players?.name}
                      </Badge>
                    ))}
                  </div>
                  <Separator />
                </div>
              )}

              {/* Weeks structure */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Structure ({program.weeks?.length || 0} semaines)
                </h4>

                <div className="space-y-2">
                  {program.weeks?.map((week: any) => {
                    const isExpanded = expandedWeeks.has(week.id);
                    const totalExercises = week.program_sessions?.reduce(
                      (sum: number, s: any) => sum + (s.program_exercises?.length || 0), 0
                    ) || 0;

                    return (
                      <div key={week.id} className="border rounded-lg">
                        <button
                          className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          onClick={() => toggleWeek(week.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              Semaine {week.week_number}
                              {week.name && ` - ${week.name}`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {week.program_sessions?.length || 0} séances · {totalExercises} exercices
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            {week.program_sessions?.sort((a: any, b: any) => a.session_number - b.session_number).map((session: any) => (
                              <div key={session.id} className="bg-muted/30 rounded-md p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{session.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {session.program_exercises?.length || 0} exercices
                                  </Badge>
                                </div>
                                
                                {session.program_exercises?.length > 0 && (
                                  <div className="space-y-1">
                                    {session.program_exercises?.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => (
                                      <div key={ex.id} className="flex items-center gap-2 text-xs">
                                        <Dumbbell className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{ex.exercise_name}</span>
                                        <span className="text-muted-foreground">
                                          {ex.sets}×{ex.reps}
                                          {ex.percentage_1rm && ` @${ex.percentage_1rm}%`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
