import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Plus, ExternalLink, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ProgramBuilderDialog } from "@/components/category/programs/ProgramBuilderDialog";

interface ProtocolPhaseProgramLinkProps {
  categoryId: string;
  linkedProgramId?: string | null;
  phaseName: string;
  onProgramLinked: (programId: string | null) => void;
}

export function ProtocolPhaseProgramLink({
  categoryId,
  linkedProgramId,
  phaseName,
  onProgramLinked,
}: ProtocolPhaseProgramLinkProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch linked program details
  const { data: program } = useQuery({
    queryKey: ["linked-program", linkedProgramId],
    queryFn: async () => {
      if (!linkedProgramId) return null;
      const { data, error } = await supabase
        .from("training_programs")
        .select(`
          id,
          name,
          theme,
          program_weeks:program_weeks(
            id,
            week_number,
            block_name,
            block_order,
            program_sessions:program_sessions(
              id,
              session_number,
              name,
              program_exercises:program_exercises(id)
            )
          )
        `)
        .eq("id", linkedProgramId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedProgramId,
  });

  // Group weeks by block
  const blocks = program?.program_weeks?.reduce((acc: Record<string, any[]>, week: any) => {
    const blockName = week.block_name || "Général";
    if (!acc[blockName]) acc[blockName] = [];
    acc[blockName].push(week);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const totalWeeks = program?.program_weeks?.length || 0;
  const totalSessions = program?.program_weeks?.reduce(
    (sum: number, w: any) => sum + (w.program_sessions?.length || 0), 0
  ) || 0;
  const totalExercises = program?.program_weeks?.reduce(
    (sum: number, w: any) => sum + w.program_sessions?.reduce(
      (s: number, sess: any) => s + (sess.program_exercises?.length || 0), 0
    ), 0
  ) || 0;

  const handleBuilderClose = (open: boolean) => {
    setIsBuilderOpen(open);
    // After closing the builder, we need to check if a program was created
    // The ProgramBuilderDialog saves directly to DB, so we just need the ID
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Programme de réathlétisation</span>
        </div>
      </div>

      {linkedProgramId && program ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{program.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {Object.keys(blocks).length} bloc(s)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalWeeks} semaine(s)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalSessions} séance(s)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalExercises} exercice(s)
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsBuilderOpen(true)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onProgramLinked(null)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {showDetails && (
              <div className="space-y-2 pt-2 border-t">
                {Object.entries(blocks).map(([blockName, weeks]) => (
                  <div key={blockName} className="space-y-1">
                    <p className="text-xs font-semibold text-primary">📦 {blockName}</p>
                    {(weeks as any[]).sort((a, b) => a.week_number - b.week_number).map((week: any) => (
                      <div key={week.id} className="pl-4">
                        <p className="text-xs text-muted-foreground">
                          Semaine {week.week_number} — {week.program_sessions?.length || 0} séance(s)
                        </p>
                        {week.program_sessions?.sort((a: any, b: any) => a.session_number - b.session_number).map((session: any) => (
                          <p key={session.id} className="text-xs pl-4 text-muted-foreground/80">
                            • {session.name || `Séance ${session.session_number}`} ({session.program_exercises?.length || 0} exercices)
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed"
          onClick={() => setIsBuilderOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Créer le programme d'exercices (Blocs / Semaines / Séances)
        </Button>
      )}

      {isBuilderOpen && (
        <ProgramBuilderDialog
          categoryId={categoryId}
          programId={linkedProgramId || undefined}
          open={isBuilderOpen}
          onOpenChange={handleBuilderClose}
          rehabMode
          rehabPhaseName={phaseName}
          onProgramSaved={(programId) => {
            onProgramLinked(programId);
            setIsBuilderOpen(false);
          }}
        />
      )}
    </div>
  );
}
