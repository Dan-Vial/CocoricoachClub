import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AddConcussionProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: { id: string; name: string }[];
}

const COMMON_SYMPTOMS = [
  "Maux de tête",
  "Vertiges",
  "Nausées",
  "Vision floue",
  "Sensibilité à la lumière",
  "Sensibilité au bruit",
  "Confusion",
  "Perte de mémoire",
  "Difficultés de concentration",
  "Fatigue",
  "Troubles du sommeil",
  "Irritabilité",
];

export function AddConcussionProtocolDialog({ open, onOpenChange, categoryId, players }: AddConcussionProtocolDialogProps) {
  const [playerId, setPlayerId] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("concussion_protocols").insert({
        player_id: playerId,
        category_id: categoryId,
        incident_date: incidentDate,
        incident_description: description || null,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : null,
        medical_notes: medicalNotes || null,
        status: "active",
        return_to_play_phase: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concussion_protocols", categoryId] });
      toast.success("Protocole commotion créé");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setDescription("");
    setSelectedSymptoms([]);
    setMedicalNotes("");
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) {
      toast.error("Veuillez sélectionner un joueur");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Signaler une commotion cérébrale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Joueur *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un joueur" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date de l'incident</Label>
            <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description de l'incident</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les circonstances de l'incident..."
            />
          </div>

          <div className="space-y-2">
            <Label>Symptômes observés</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <div key={symptom} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom}
                    checked={selectedSymptoms.includes(symptom)}
                    onCheckedChange={() => toggleSymptom(symptom)}
                  />
                  <label htmlFor={symptom} className="text-sm cursor-pointer">
                    {symptom}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes médicales</Label>
            <Textarea
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Notes du médecin ou observations..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Création..." : "Créer le protocole"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
