import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";

const BOWLING_SESSION_TYPES = [
  { value: "bowling_spare", label: "Entraînement Précision" },
  { value: "bowling_game", label: "Parties d'Entraînement" },
  { value: "bowling_practice", label: "Pratique Libre" },
  { value: "bowling_technique", label: "Travail Technique" },
  { value: "bowling_approche", label: "Travail d'Approche" },
  { value: "bowling_release", label: "Travail de Lâcher" },
];

interface AthleteCreateSessionProps {
  token?: string;
  onSessionCreated: () => void;
}

export function AthleteCreateSession({ token, onSessionCreated }: AthleteCreateSessionProps) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [trainingType, setTrainingType] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!sessionDate || !trainingType) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(buildAthletePortalFunctionUrl("create-session", token), {
        method: "POST",
        headers: athletePortalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          session_date: sessionDate,
          training_type: trainingType,
          duration_minutes: parseInt(durationMinutes) || 60,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Séance ajoutée !");
        setTrainingType("");
        onSessionCreated();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarPlus className="h-5 w-5" />
          Ajouter une séance
        </CardTitle>
        <CardDescription>
          Crée une séance personnelle pour saisir tes stats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Type de séance</Label>
          <Select value={trainingType} onValueChange={setTrainingType}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir le type" />
            </SelectTrigger>
            <SelectContent>
              {BOWLING_SESSION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Durée (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting || !trainingType} className="w-full">
          {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : "Créer la séance"}
        </Button>
      </CardContent>
    </Card>
  );
}
