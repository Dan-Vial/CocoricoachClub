import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Pause
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReturnToPlayProtocolProps {
  injuryId: string;
  categoryId: string;
  playerId: string;
  playerName: string;
  injuryType: string;
}

// Phases du protocole de retour au jeu (basé sur les protocoles médicaux standard)
const RTP_PHASES = [
  {
    phase: 1,
    name: "Repos et récupération",
    description: "Repos complet, gestion de la douleur",
    checklist: [
      "Absence de douleur au repos",
      "Diminution de l'inflammation",
      "Amplitude articulaire passive récupérée",
      "Évaluation médicale validée"
    ]
  },
  {
    phase: 2,
    name: "Mobilité et renforcement léger",
    description: "Exercices de mobilité, renforcement isométrique",
    checklist: [
      "Amplitude articulaire active complète",
      "Renforcement isométrique sans douleur",
      "Marche normale sans boiterie",
      "Exercices proprioceptifs de base"
    ]
  },
  {
    phase: 3,
    name: "Renforcement progressif",
    description: "Renforcement concentrique/excentrique, cardio léger",
    checklist: [
      "Force à 70% du membre sain",
      "Exercices de renforcement dynamiques",
      "Cardio basse intensité (vélo, natation)",
      "Équilibre unipodal stable"
    ]
  },
  {
    phase: 4,
    name: "Entraînement spécifique",
    description: "Course, exercices spécifiques au rugby",
    checklist: [
      "Course en ligne droite sans douleur",
      "Changements de direction progressifs",
      "Exercices de sauts et réceptions",
      "Force à 90% du membre sain"
    ]
  },
  {
    phase: 5,
    name: "Entraînement avec contact limité",
    description: "Participation progressive aux entraînements",
    checklist: [
      "Entraînement collectif sans opposition",
      "Plaquages sur sacs",
      "Sprints et accélérations",
      "Tests fonctionnels validés"
    ]
  },
  {
    phase: 6,
    name: "Retour complet",
    description: "Entraînement complet et match",
    checklist: [
      "Entraînement complet avec contact",
      "Validation médicale finale",
      "Confiance du joueur",
      "Feu vert du staff médical et technique"
    ]
  }
];

export function ReturnToPlayProtocol({
  injuryId,
  categoryId,
  playerId,
  playerName,
  injuryType,
}: ReturnToPlayProtocolProps) {
  const queryClient = useQueryClient();
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [validatingPhase, setValidatingPhase] = useState<number | null>(null);
  const [validatedBy, setValidatedBy] = useState("");
  const [validationNotes, setValidationNotes] = useState("");

  // Fetch existing protocol
  const { data: protocol, isLoading } = useQuery({
    queryKey: ["rtp_protocol", injuryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_to_play_protocols")
        .select("*")
        .eq("injury_id", injuryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch phase completions
  const { data: phaseCompletions } = useQuery({
    queryKey: ["rtp_phases", protocol?.id],
    queryFn: async () => {
      if (!protocol?.id) return [];
      const { data, error } = await supabase
        .from("rtp_phase_completions")
        .select("*")
        .eq("protocol_id", protocol.id)
        .order("phase_number");
      if (error) throw error;
      return data;
    },
    enabled: !!protocol?.id,
  });

  // Create protocol
  const createProtocol = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("return_to_play_protocols")
        .insert({
          injury_id: injuryId,
          category_id: categoryId,
          player_id: playerId,
          status: "in_progress",
          current_phase: 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Create all phases
      const phases = RTP_PHASES.map((p) => ({
        protocol_id: data.id,
        phase_number: p.phase,
        phase_name: p.name,
        status: p.phase === 1 ? "in_progress" : "pending",
        started_at: p.phase === 1 ? new Date().toISOString() : null,
        checklist_completed: [],
      }));

      const { error: phasesError } = await supabase
        .from("rtp_phase_completions")
        .insert(phases);
      if (phasesError) throw phasesError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rtp_protocol", injuryId] });
      toast.success("Protocole de retour au jeu démarré");
    },
    onError: () => {
      toast.error("Erreur lors de la création du protocole");
    },
  });

  // Update checklist item
  const updateChecklist = useMutation({
    mutationFn: async ({
      phaseId,
      itemIndex,
      checked,
    }: {
      phaseId: string;
      itemIndex: number;
      checked: boolean;
    }) => {
      const phase = phaseCompletions?.find((p) => p.id === phaseId);
      if (!phase) throw new Error("Phase not found");

      const currentChecklist = (phase.checklist_completed as number[]) || [];
      let newChecklist: number[];

      if (checked) {
        newChecklist = [...currentChecklist, itemIndex];
      } else {
        newChecklist = currentChecklist.filter((i) => i !== itemIndex);
      }

      const { error } = await supabase
        .from("rtp_phase_completions")
        .update({ checklist_completed: newChecklist })
        .eq("id", phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rtp_phases", protocol?.id] });
    },
  });

  // Validate phase
  const validatePhase = useMutation({
    mutationFn: async (phaseNumber: number) => {
      const phase = phaseCompletions?.find((p) => p.phase_number === phaseNumber);
      if (!phase) throw new Error("Phase not found");

      // Complete current phase
      await supabase
        .from("rtp_phase_completions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          validated_by: validatedBy,
          validation_notes: validationNotes,
        })
        .eq("id", phase.id);

      // Start next phase or complete protocol
      if (phaseNumber < 6) {
        const nextPhase = phaseCompletions?.find((p) => p.phase_number === phaseNumber + 1);
        if (nextPhase) {
          await supabase
            .from("rtp_phase_completions")
            .update({
              status: "in_progress",
              started_at: new Date().toISOString(),
            })
            .eq("id", nextPhase.id);
        }

        await supabase
          .from("return_to_play_protocols")
          .update({ current_phase: phaseNumber + 1 })
          .eq("id", protocol?.id);
      } else {
        await supabase
          .from("return_to_play_protocols")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", protocol?.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rtp_protocol", injuryId] });
      queryClient.invalidateQueries({ queryKey: ["rtp_phases", protocol?.id] });
      setIsValidationOpen(false);
      setValidatingPhase(null);
      setValidatedBy("");
      setValidationNotes("");
      toast.success("Phase validée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la validation");
    },
  });

  const getPhaseStatus = (phaseNumber: number) => {
    const phase = phaseCompletions?.find((p) => p.phase_number === phaseNumber);
    return phase?.status || "pending";
  };

  const getPhaseCompletion = (phaseNumber: number) => {
    const phase = phaseCompletions?.find((p) => p.phase_number === phaseNumber);
    if (!phase) return 0;
    const completed = (phase.checklist_completed as number[])?.length || 0;
    const total = RTP_PHASES[phaseNumber - 1].checklist.length;
    return Math.round((completed / total) * 100);
  };

  const isPhaseComplete = (phaseNumber: number) => {
    const phase = phaseCompletions?.find((p) => p.phase_number === phaseNumber);
    if (!phase) return false;
    const completed = (phase.checklist_completed as number[])?.length || 0;
    return completed === RTP_PHASES[phaseNumber - 1].checklist.length;
  };

  const overallProgress = protocol
    ? ((protocol.current_phase - 1) / 6) * 100 + (getPhaseCompletion(protocol.current_phase) / 6)
    : 0;

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  if (!protocol) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Protocole de Retour au Jeu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Aucun protocole de retour au jeu n'est en cours pour cette blessure.
          </p>
          <Button onClick={() => createProtocol.mutate()} disabled={createProtocol.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {createProtocol.isPending ? "Création..." : "Démarrer le protocole"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Protocole de Retour au Jeu</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {playerName} - {injuryType}
              </p>
            </div>
            <Badge
              variant={protocol.status === "completed" ? "default" : "secondary"}
              className={protocol.status === "completed" ? "bg-green-500" : ""}
            >
              {protocol.status === "completed"
                ? "Terminé"
                : protocol.status === "suspended"
                ? "Suspendu"
                : `Phase ${protocol.current_phase}/6`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Début: </span>
              {protocol.started_at && format(new Date(protocol.started_at), "dd MMM yyyy", { locale: fr })}
            </div>
            {protocol.completed_at && (
              <div>
                <span className="text-muted-foreground">Fin: </span>
                {format(new Date(protocol.completed_at), "dd MMM yyyy", { locale: fr })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <Accordion type="single" collapsible defaultValue={`phase-${protocol.current_phase}`}>
        {RTP_PHASES.map((phase) => {
          const status = getPhaseStatus(phase.phase);
          const completion = getPhaseCompletion(phase.phase);
          const phaseData = phaseCompletions?.find((p) => p.phase_number === phase.phase);

          return (
            <AccordionItem key={phase.phase} value={`phase-${phase.phase}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      status === "completed"
                        ? "bg-green-500 text-white"
                        : status === "in_progress"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      phase.phase
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{phase.name}</p>
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </div>
                  {status === "in_progress" && (
                    <Badge variant="outline" className="mr-2">
                      {completion}%
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-11 space-y-4">
                  {/* Checklist */}
                  <div className="space-y-2">
                    {phase.checklist.map((item, index) => {
                      const isChecked = ((phaseData?.checklist_completed as number[]) || []).includes(index);
                      const canEdit = status === "in_progress";

                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Checkbox
                            id={`phase-${phase.phase}-item-${index}`}
                            checked={isChecked}
                            disabled={!canEdit}
                            onCheckedChange={(checked) => {
                              if (phaseData) {
                                updateChecklist.mutate({
                                  phaseId: phaseData.id,
                                  itemIndex: index,
                                  checked: checked as boolean,
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`phase-${phase.phase}-item-${index}`}
                            className={`text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}
                          >
                            {item}
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase info */}
                  {phaseData?.validated_by && (
                    <div className="text-sm bg-muted/50 p-3 rounded-lg">
                      <p>
                        <strong>Validé par:</strong> {phaseData.validated_by}
                      </p>
                      {phaseData.validation_notes && (
                        <p className="mt-1">
                          <strong>Notes:</strong> {phaseData.validation_notes}
                        </p>
                      )}
                      {phaseData.completed_at && (
                        <p className="mt-1 text-muted-foreground">
                          {format(new Date(phaseData.completed_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Validate button */}
                  {status === "in_progress" && isPhaseComplete(phase.phase) && (
                    <Button
                      onClick={() => {
                        setValidatingPhase(phase.phase);
                        setIsValidationOpen(true);
                      }}
                      className="w-full"
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Valider la phase {phase.phase}
                    </Button>
                  )}

                  {status === "in_progress" && !isPhaseComplete(phase.phase) && (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Complétez tous les critères pour valider cette phase
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Validation dialog */}
      <Dialog open={isValidationOpen} onOpenChange={setIsValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la Phase {validatingPhase}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Validé par *</Label>
              <Input
                value={validatedBy}
                onChange={(e) => setValidatedBy(e.target.value)}
                placeholder="Nom du médecin/kiné"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes de validation</Label>
              <Textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Observations, recommandations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidationOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => validatingPhase && validatePhase.mutate(validatingPhase)}
              disabled={!validatedBy || validatePhase.isPending}
            >
              {validatePhase.isPending ? "Validation..." : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
