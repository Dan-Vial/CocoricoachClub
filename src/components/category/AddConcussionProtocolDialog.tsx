import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle } from "lucide-react";
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

const REST_RECOMMENDATIONS = {
  1: {
    minDays: 7,
    description: "Première commotion - Repos minimum de 7 jours avant de commencer le protocole de retour au jeu.",
  },
  2: {
    minDays: 14,
    description: "Deuxième commotion - Repos minimum de 14 jours recommandé. Consultation spécialisée conseillée.",
  },
  3: {
    minDays: 21,
    description: "Troisième commotion ou plus - Repos minimum de 21 jours. Consultation neurologique OBLIGATOIRE avant tout retour au jeu.",
  },
};

export function AddConcussionProtocolDialog({ open, onOpenChange, categoryId, players }: AddConcussionProtocolDialogProps) {
  const [playerId, setPlayerId] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState("");
  const queryClient = useQueryClient();

  // Fetch previous concussions for the selected player
  const { data: previousConcussions } = useQuery({
    queryKey: ["player_concussions", playerId],
    queryFn: async () => {
      if (!playerId) return [];
      const { data, error } = await supabase
        .from("concussion_protocols")
        .select("*")
        .eq("player_id", playerId)
        .order("incident_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const concussionNumber = (previousConcussions?.length || 0) + 1;
  const restRecommendation = REST_RECOMMENDATIONS[Math.min(concussionNumber, 3) as 1 | 2 | 3];

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
      queryClient.invalidateQueries({ queryKey: ["player_concussions", playerId] });
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

  const selectedPlayer = players.find(p => p.id === playerId);

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

          {/* Warning for repeated concussions */}
          {playerId && previousConcussions && previousConcussions.length > 0 && (
            <Alert variant={concussionNumber >= 3 ? "destructive" : "default"} className={concussionNumber === 2 ? "border-yellow-500 bg-yellow-500/10" : ""}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {concussionNumber >= 3 ? "⚠️ ALERTE CRITIQUE" : "⚠️ Attention"}
                {" - "}Commotion n°{concussionNumber} pour {selectedPlayer?.name}
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p className="font-medium">{restRecommendation.description}</p>
                <div className="text-sm mt-2">
                  <p className="font-semibold">Historique des commotions :</p>
                  <ul className="list-disc list-inside mt-1">
                    {previousConcussions.map((c: any, idx: number) => (
                      <li key={c.id}>
                        {new Date(c.incident_date).toLocaleDateString("fr-FR")}
                        {c.status === "cleared" ? " (retour validé)" : c.status === "recovery" ? " (en récupération)" : " (actif)"}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* First concussion info */}
          {playerId && previousConcussions && previousConcussions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Première commotion enregistrée</AlertTitle>
              <AlertDescription>
                {restRecommendation.description}
              </AlertDescription>
            </Alert>
          )}

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
