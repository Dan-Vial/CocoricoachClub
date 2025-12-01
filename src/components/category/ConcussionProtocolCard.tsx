import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronRight, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConcussionProtocolCardProps {
  protocol: any;
  categoryId: string;
}

const PHASES = [
  { value: 1, label: "Phase 1: Repos complet" },
  { value: 2, label: "Phase 2: Activité légère" },
  { value: 3, label: "Phase 3: Exercice spécifique" },
  { value: 4, label: "Phase 4: Entraînement sans contact" },
  { value: 5, label: "Phase 5: Entraînement avec contact" },
  { value: 6, label: "Phase 6: Retour au jeu" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "recovery", label: "En récupération" },
  { value: "cleared", label: "Retour validé" },
];

const getConcussionBadgeVariant = (number: number) => {
  if (number >= 3) return "destructive";
  if (number === 2) return "secondary";
  return "outline";
};

export function ConcussionProtocolCard({ protocol, categoryId }: ConcussionProtocolCardProps) {
  const queryClient = useQueryClient();

  // Get total concussion count for this player
  const { data: allPlayerConcussions } = useQuery({
    queryKey: ["player_concussions_count", protocol.player_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concussion_protocols")
        .select("id, incident_date")
        .eq("player_id", protocol.player_id)
        .order("incident_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate which concussion number this is
  const concussionNumber = allPlayerConcussions
    ? allPlayerConcussions.findIndex((c: any) => c.id === protocol.id) + 1
    : 1;
  const totalConcussions = allPlayerConcussions?.length || 1;

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("concussion_protocols")
        .update(updates)
        .eq("id", protocol.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concussion_protocols", categoryId] });
      toast.success("Protocole mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("concussion_protocols").delete().eq("id", protocol.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concussion_protocols", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_concussions_count", protocol.player_id] });
      toast.success("Protocole supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handlePhaseChange = (phase: string) => {
    const updates: any = { return_to_play_phase: parseInt(phase) };
    if (parseInt(phase) === 6) {
      updates.status = "cleared";
      updates.clearance_date = new Date().toISOString().split("T")[0];
    } else if (parseInt(phase) > 1) {
      updates.status = "recovery";
    }
    updateMutation.mutate(updates);
  };

  const handleStatusChange = (status: string) => {
    const updates: any = { status };
    if (status === "cleared") {
      updates.clearance_date = new Date().toISOString().split("T")[0];
    }
    updateMutation.mutate(updates);
  };

  return (
    <Card className={`bg-card/50 ${totalConcussions >= 3 ? "border-destructive/50" : totalConcussions === 2 ? "border-yellow-500/50" : ""}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{protocol.players?.name}</span>
            <Badge 
              variant={getConcussionBadgeVariant(totalConcussions)} 
              className={`text-xs ${totalConcussions === 2 ? "bg-yellow-500/20 text-yellow-600 border-yellow-500" : ""}`}
            >
              {totalConcussions >= 3 && <AlertTriangle className="h-3 w-3 mr-1" />}
              Commotion n°{concussionNumber}/{totalConcussions}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date incident:</span>
            <span>{format(new Date(protocol.incident_date), "dd/MM/yyyy", { locale: fr })}</span>
          </div>

          {protocol.incident_description && (
            <div>
              <span className="text-muted-foreground">Description:</span>
              <p className="mt-1">{protocol.incident_description}</p>
            </div>
          )}

          {protocol.symptoms && protocol.symptoms.length > 0 && (
            <div>
              <span className="text-muted-foreground">Symptômes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {protocol.symptoms.map((symptom: string) => (
                  <Badge key={symptom} variant="outline" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Phase:</span>
            <Select
              value={protocol.return_to_play_phase?.toString()}
              onValueChange={handlePhaseChange}
              disabled={protocol.status === "cleared"}
            >
              <SelectTrigger className="w-[250px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value.toString()}>
                    {phase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Statut:</span>
            <Select value={protocol.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {protocol.clearance_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date retour:</span>
              <span className="text-green-600">
                {format(new Date(protocol.clearance_date), "dd/MM/yyyy", { locale: fr })}
              </span>
            </div>
          )}

          {protocol.medical_notes && (
            <div>
              <span className="text-muted-foreground">Notes médicales:</span>
              <p className="mt-1 text-xs bg-muted p-2 rounded">{protocol.medical_notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
