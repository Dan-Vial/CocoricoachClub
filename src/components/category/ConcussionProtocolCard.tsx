import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, User, AlertTriangle, Calendar, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, differenceInDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConcussionProtocolCardProps {
  protocol: any;
  categoryId: string;
}

// World Rugby GRTP Protocol - 6 phases with minimum delays
const PHASES = [
  { value: 1, label: "Phase 1: Repos complet", minDays: 0, description: "24-48h minimum de repos symptomatique" },
  { value: 2, label: "Phase 2: Activité légère", minDays: 1, description: "Marche, vélo stationnaire (FC < 70%)" },
  { value: 3, label: "Phase 3: Exercice spécifique", minDays: 2, description: "Exercices de course, sans contact" },
  { value: 4, label: "Phase 4: Entraînement sans contact", minDays: 3, description: "Entraînement technique complet" },
  { value: 5, label: "Phase 5: Entraînement avec contact", minDays: 4, description: "Participation complète après avis médical" },
  { value: 6, label: "Phase 6: Retour au jeu", minDays: 5, description: "Retour à la compétition" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "recovery", label: "En récupération" },
  { value: "cleared", label: "Retour validé" },
];

// Minimum rest days based on concussion history
const getMinRestDays = (concussionNumber: number) => {
  if (concussionNumber >= 3) return 21;
  if (concussionNumber === 2) return 14;
  return 7;
};

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

  // Calculate timeline dates based on incident date and concussion history
  const incidentDate = new Date(protocol.incident_date);
  const minRestDays = getMinRestDays(concussionNumber);
  
  const getPhaseTargetDate = (phaseValue: number) => {
    const phase = PHASES.find(p => p.value === phaseValue);
    if (!phase) return null;
    // Each phase requires minimum 24h after the previous
    const baseDays = minRestDays + (phaseValue - 1);
    return addDays(incidentDate, baseDays);
  };

  const canAdvanceToPhase = (targetPhase: number) => {
    const currentPhase = protocol.return_to_play_phase || 1;
    if (targetPhase <= currentPhase) return true;
    
    const targetDate = getPhaseTargetDate(targetPhase);
    if (!targetDate) return false;
    
    return !isBefore(new Date(), targetDate);
  };

  const getDaysUntilPhase = (phaseValue: number) => {
    const targetDate = getPhaseTargetDate(phaseValue);
    if (!targetDate) return 0;
    const diff = differenceInDays(targetDate, new Date());
    return Math.max(0, diff);
  };

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
    const targetPhase = parseInt(phase);
    
    // Validate delay
    if (!canAdvanceToPhase(targetPhase)) {
      const daysRemaining = getDaysUntilPhase(targetPhase);
      toast.error(`Délai minimum non respecté. Attendez encore ${daysRemaining} jour(s) selon le protocole World Rugby.`);
      return;
    }

    const updates: any = { return_to_play_phase: targetPhase };
    if (targetPhase === 6) {
      updates.status = "cleared";
      updates.clearance_date = new Date().toISOString().split("T")[0];
    } else if (targetPhase > 1) {
      updates.status = "recovery";
    }
    updateMutation.mutate(updates);
  };

  const handleStatusChange = (status: string) => {
    const updates: any = { status };
    if (status === "cleared") {
      // Check if all phases completed
      if ((protocol.return_to_play_phase || 1) < 6) {
        toast.error("Toutes les phases doivent être validées avant le retour au jeu");
        return;
      }
      updates.clearance_date = new Date().toISOString().split("T")[0];
    }
    updateMutation.mutate(updates);
  };

  // Check if protocol can be deleted (only active protocols, not cleared ones)
  const canDelete = protocol.status !== "cleared";

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
          {canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce protocole ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Les données médicales seront perdues.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Lock className="h-3 w-3" />
              <span>Historique protégé</span>
            </div>
          )}
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date incident:</span>
            <span>{format(incidentDate, "dd/MM/yyyy", { locale: fr })}</span>
          </div>

          {/* Timeline automatique */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Timeline GRTP World Rugby (Commotion n°{concussionNumber})
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Repos minimum:</span>
                <span className="ml-1 font-medium">{minRestDays} jours</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fin repos estimée:</span>
                <span className="ml-1 font-medium">{format(addDays(incidentDate, minRestDays), "dd/MM", { locale: fr })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Retour estimé:</span>
                <span className="ml-1 font-medium">{format(getPhaseTargetDate(6) || new Date(), "dd/MM", { locale: fr })}</span>
              </div>
              {protocol.status !== "cleared" && (
                <div>
                  <span className="text-muted-foreground">Prochaine phase:</span>
                  <span className={`ml-1 font-medium ${canAdvanceToPhase((protocol.return_to_play_phase || 1) + 1) ? "text-green-600" : "text-orange-500"}`}>
                    {canAdvanceToPhase((protocol.return_to_play_phase || 1) + 1) 
                      ? "Disponible" 
                      : `Dans ${getDaysUntilPhase((protocol.return_to_play_phase || 1) + 1)}j`}
                  </span>
                </div>
              )}
            </div>
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
              <SelectTrigger className="w-[280px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((phase) => {
                  const canAdvance = canAdvanceToPhase(phase.value);
                  const daysRemaining = getDaysUntilPhase(phase.value);
                  return (
                    <SelectItem 
                      key={phase.value} 
                      value={phase.value.toString()}
                      disabled={!canAdvance && phase.value > (protocol.return_to_play_phase || 1)}
                    >
                      <div className="flex items-center gap-2">
                        {phase.value <= (protocol.return_to_play_phase || 1) && (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        )}
                        <span>{phase.label}</span>
                        {!canAdvance && phase.value > (protocol.return_to_play_phase || 1) && (
                          <span className="text-xs text-muted-foreground ml-1">({daysRemaining}j)</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground italic">
            {PHASES.find(p => p.value === (protocol.return_to_play_phase || 1))?.description}
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