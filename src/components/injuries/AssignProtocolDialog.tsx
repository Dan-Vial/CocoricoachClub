import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RUGBY_INJURY_TYPES, DEFAULT_REHAB_PHASES } from "@/lib/constants/rugbyInjuries";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell } from "lucide-react";

interface AssignProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  injuryId: string;
  categoryId: string;
  injuryType: string;
}

export function AssignProtocolDialog({
  open,
  onOpenChange,
  playerId,
  injuryId,
  categoryId,
  injuryType,
}: AssignProtocolDialogProps) {
  const [selectedInjuryType, setSelectedInjuryType] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  // Find matching injury type from constants
  const matchingInjury = RUGBY_INJURY_TYPES.find(
    i => i.name.toLowerCase() === injuryType.toLowerCase()
  );

  // Fetch existing protocols for this category
  const { data: existingProtocols } = useQuery({
    queryKey: ["injury-protocols", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injury_protocols")
        .select("*")
        .or(`is_system_default.eq.true,category_id.eq.${categoryId}`);
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const assignProtocol = useMutation({
    mutationFn: async () => {
      const selectedType = RUGBY_INJURY_TYPES.find(i => i.name === selectedInjuryType);
      if (!selectedType) throw new Error("Type de blessure non trouvé");

      // Check if protocol already exists
      let protocolId: string;
      const existingProtocol = existingProtocols?.find(
        p => p.name === selectedType.name && (p.is_system_default || p.category_id === categoryId)
      );

      if (existingProtocol) {
        protocolId = existingProtocol.id;
      } else {
        // Create new protocol for this category
        const { data: newProtocol, error: protocolError } = await supabase
          .from("injury_protocols")
          .insert({
            name: selectedType.name,
            injury_category: selectedType.category,
            typical_duration_days_min: selectedType.durationMin,
            typical_duration_days_max: selectedType.durationMax,
            description: selectedType.description,
            category_id: categoryId,
            is_system_default: false,
          })
          .select()
          .single();

        if (protocolError) throw protocolError;
        protocolId = newProtocol.id;

        // Create default phases based on injury category
        const defaultPhases = DEFAULT_REHAB_PHASES[selectedType.category as keyof typeof DEFAULT_REHAB_PHASES] 
          || DEFAULT_REHAB_PHASES.musculaire;

        for (const phase of defaultPhases) {
          const { data: newPhase, error: phaseError } = await supabase
            .from("protocol_phases")
            .insert({
              protocol_id: protocolId,
              phase_number: phase.phase_number,
              name: phase.name,
              description: phase.description,
              duration_days_min: phase.duration_days_min,
              duration_days_max: phase.duration_days_max,
              objectives: phase.objectives,
              exit_criteria: phase.exit_criteria,
            })
            .select()
            .single();

          if (phaseError) throw phaseError;

          // Create default exercises for this phase
          for (let i = 0; i < phase.exercises.length; i++) {
            const exercise = phase.exercises[i];
            const { error: exerciseError } = await supabase
              .from("protocol_exercises")
              .insert({
                phase_id: newPhase.id,
                name: exercise.name,
                description: exercise.description,
                sets: exercise.sets,
                reps: exercise.reps,
                frequency: exercise.frequency,
                exercise_order: i,
              });

            if (exerciseError) throw exerciseError;
          }
        }
      }

      // Assign protocol to player's injury
      const { error: assignError } = await supabase
        .from("player_rehab_protocols")
        .insert({
          player_id: playerId,
          injury_id: injuryId,
          protocol_id: protocolId,
          category_id: categoryId,
          current_phase: 1,
          status: "in_progress",
          notes: notes || null,
        });

      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-rehab-protocol", injuryId] });
      queryClient.invalidateQueries({ queryKey: ["injury-protocols", categoryId] });
      toast.success("Protocole de réhabilitation assigné");
      onOpenChange(false);
      setSelectedInjuryType("");
      setNotes("");
    },
    onError: (error) => {
      console.error("Error assigning protocol:", error);
      toast.error("Erreur lors de l'assignation du protocole");
    },
  });

  const selectedType = RUGBY_INJURY_TYPES.find(i => i.name === selectedInjuryType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Assigner un protocole de réhabilitation
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le type de blessure pour charger le protocole correspondant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {matchingInjury && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm">
                <span className="font-medium">Suggestion:</span> {matchingInjury.name}
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => setSelectedInjuryType(matchingInjury.name)}
              >
                Utiliser cette suggestion
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Type de blessure *</Label>
            <Select value={selectedInjuryType} onValueChange={setSelectedInjuryType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type de blessure" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {RUGBY_INJURY_TYPES.map((injury) => (
                  <SelectItem key={injury.name} value={injury.name}>
                    <div className="flex items-center gap-2">
                      <span>{injury.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {injury.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedType.name}</span>
                <Badge>{selectedType.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedType.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Durée typique: {selectedType.durationMin} - {selectedType.durationMax} jours
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce protocole inclut 4-5 phases avec des exercices prédéfinis que vous pourrez modifier.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations particulières pour ce joueur..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => assignProtocol.mutate()}
            disabled={!selectedInjuryType || assignProtocol.isPending}
          >
            {assignProtocol.isPending ? "Création..." : "Assigner le protocole"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
