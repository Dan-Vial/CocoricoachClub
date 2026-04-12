import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { ProphylaxisProgramDialog } from "./ProphylaxisProgramDialog";
import { Badge } from "@/components/ui/badge";

interface ProphylaxisTabProps {
  categoryId: string;
}

export function ProphylaxisTab({ categoryId }: ProphylaxisTabProps) {
  const { isViewer } = useViewerModeContext();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: programs, isLoading, refetch } = useQuery({
    queryKey: ["prophylaxis-programs", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prophylaxis_programs")
        .select(`
          *,
          prophylaxis_exercises(*),
          prophylaxis_assignments(id, player_id, is_active)
        `)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch player names for assignments separately
      if (data && data.length > 0) {
        const playerIds = new Set<string>();
        data.forEach((p: any) => {
          if (p.player_id) playerIds.add(p.player_id);
          (p.prophylaxis_assignments || []).forEach((a: any) => {
            if (a.player_id) playerIds.add(a.player_id);
          });
        });
        
        if (playerIds.size > 0) {
          const { data: players } = await supabase
            .from("players")
            .select("id, name, first_name")
            .in("id", Array.from(playerIds));
          
          const playerMap = new Map((players || []).map(p => [p.id, p]));
          
          data.forEach((p: any) => {
            if (p.player_id) p.player_info = playerMap.get(p.player_id);
            (p.prophylaxis_assignments || []).forEach((a: any) => {
              a.player_info = playerMap.get(a.player_id);
            });
          });
        }
      }
      
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce programme de prophylaxie ?")) return;
    const { error } = await supabase.from("prophylaxis_programs").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Programme supprimé");
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Programmes Prophylaxie</h2>
        </div>
        {!isViewer && (
          <Button onClick={() => setShowDialog(true)}>
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
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aucun programme de prophylaxie créé
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Créez des routines préventives pour les athlètes présentant des faiblesses ou blessures récurrentes
            </p>
            {!isViewer && (
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un programme
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program: any) => {
            const exercises = program.prophylaxis_exercises || [];
            const assignments = program.prophylaxis_assignments || [];
            const isExpanded = expandedId === program.id;
            const assignedNames = assignments.length > 0
              ? assignments.map((a: any) => {
                  const p = a.player_info;
                  return p ? `${p.first_name || ""} ${p.name || ""}`.trim() : "";
                }).filter(Boolean)
              : program.player_info
                ? [`${program.player_info.first_name || ""} ${program.player_info.name}`.trim()]
                : [];

            return (
              <Card key={program.id} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">{program.name}</h3>
                      <Badge variant="outline" className="text-xs">{program.body_zone}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {!isViewer && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(program.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(program.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>👤 {assignedNames.length > 0 ? (assignedNames.length <= 2 ? assignedNames.join(", ") : `${assignedNames.length} athlètes`) : "Non assigné"}</p>
                    <p>📅 Fréquence : {program.frequency || "quotidien"}</p>
                    <p>📋 {exercises.length} exercice{exercises.length > 1 ? "s" : ""}</p>
                    {!program.is_active && <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                  </div>

                  {program.description && (
                    <p className="text-xs text-muted-foreground italic">{program.description}</p>
                  )}

                  {exercises.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setExpandedId(isExpanded ? null : program.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      {isExpanded ? "Masquer" : "Voir les exercices"}
                    </Button>
                  )}

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t">
                      {exercises
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((ex: any, i: number) => (
                          <div key={ex.id} className="text-xs p-2 bg-muted/50 rounded">
                            <span className="font-medium">{i + 1}. {ex.exercise_name}</span>
                            <div className="text-muted-foreground mt-0.5">
                              {ex.sets && <span>{ex.sets} séries</span>}
                              {ex.reps && <span> × {ex.reps}</span>}
                              {ex.duration_seconds && <span> • {ex.duration_seconds}s</span>}
                              {ex.rest_seconds && <span> • Repos: {ex.rest_seconds}s</span>}
                            </div>
                            {ex.notes && <p className="text-muted-foreground italic mt-0.5">{ex.notes}</p>}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(showDialog || editingId) && (
        <ProphylaxisProgramDialog
          categoryId={categoryId}
          programId={editingId}
          open={showDialog || !!editingId}
          onOpenChange={(open) => {
            if (!open) {
              setShowDialog(false);
              setEditingId(null);
              refetch();
            }
          }}
        />
      )}
    </div>
  );
}
