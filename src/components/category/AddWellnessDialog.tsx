import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HrvInputSection, emptyHrvData, type HrvData } from "./hrv/HrvInputSection";

interface AddWellnessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const scoreLabels = {
  sleep_quality: ["", "Excellent", "Bon", "Moyen", "Mauvais", "Très mauvais"],
  sleep_duration: ["", ">8h", "7-8h", "6-7h", "5-6h", "<5h"],
  general_fatigue: ["", "Très en forme", "En forme", "Normal", "Fatigué", "Épuisé"],
  stress_level: ["", "Très détendu", "Détendu", "Normal", "Stressé", "Très stressé"],
  soreness: ["", "Aucune gêne", "Légère gêne", "Gêne modérée", "Douleur", "Douleur limitante"],
};

export function AddWellnessDialog({ open, onOpenChange, categoryId }: AddWellnessDialogProps) {
  const queryClient = useQueryClient();
  const [playerId, setPlayerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepDuration, setSleepDuration] = useState(3);
  const [generalFatigue, setGeneralFatigue] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sorenessUpper, setSorenessUpper] = useState(1);
  const [sorenessLower, setSorenessLower] = useState(1);
  const [hasSpecificPain, setHasSpecificPain] = useState(false);
  const [painLocation, setPainLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [hrvData, setHrvData] = useState<HrvData>(emptyHrvData);

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("first_name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing wellness entries for the selected date
  const { data: existingWellness } = useQuery({
    queryKey: ["wellness_existing", categoryId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("player_id")
        .eq("category_id", categoryId)
        .eq("tracking_date", date);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filledPlayerIds = new Set(existingWellness?.map(w => w.player_id) || []);
  const availablePlayers = players?.filter(p => !filledPlayerIds.has(p.id));

  // Reset form values when player changes (except playerId and date)
  useEffect(() => {
    if (playerId) {
      setSleepQuality(3);
      setSleepDuration(3);
      setGeneralFatigue(3);
      setStressLevel(3);
      setSorenessUpper(1);
      setSorenessLower(1);
      setHasSpecificPain(false);
      setPainLocation("");
      setNotes("");
      setHrvData(emptyHrvData);
    }
  }, [playerId]);

  const addWellness = useMutation({
    mutationFn: async () => {
      const playerName = players?.find(p => p.id === playerId)?.name || "Athlète";
      const { error } = await supabase.from("wellness_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        tracking_date: date,
        sleep_quality: sleepQuality,
        sleep_duration: sleepDuration,
        general_fatigue: generalFatigue,
        stress_level: stressLevel,
        soreness_upper_body: sorenessUpper,
        soreness_lower_body: sorenessLower,
        has_specific_pain: hasSpecificPain,
        pain_location: hasSpecificPain ? painLocation : null,
        notes: notes.trim() || null,
      });
      if (error) throw error;

      // Save HRV data if any provided
      const hasHrvData = Object.values(hrvData).some((v) => v !== "");
      if (hasHrvData) {
        const { error: hrvError } = await supabase.from("hrv_records").insert({
          player_id: playerId,
          category_id: categoryId,
          record_date: date,
          record_type: "morning",
          hrv_ms: hrvData.hrv_ms ? parseFloat(hrvData.hrv_ms) : null,
          resting_hr_bpm: hrvData.resting_hr_bpm ? parseFloat(hrvData.resting_hr_bpm) : null,
          avg_hr_bpm: hrvData.avg_hr_bpm ? parseFloat(hrvData.avg_hr_bpm) : null,
          max_hr_bpm: hrvData.max_hr_bpm ? parseFloat(hrvData.max_hr_bpm) : null,
          zone1_minutes: hrvData.zone1_minutes ? parseFloat(hrvData.zone1_minutes) : null,
          zone2_minutes: hrvData.zone2_minutes ? parseFloat(hrvData.zone2_minutes) : null,
          zone3_minutes: hrvData.zone3_minutes ? parseFloat(hrvData.zone3_minutes) : null,
          zone4_minutes: hrvData.zone4_minutes ? parseFloat(hrvData.zone4_minutes) : null,
          zone5_minutes: hrvData.zone5_minutes ? parseFloat(hrvData.zone5_minutes) : null,
        });
        if (hrvError) console.error("HRV save error:", hrvError);
      }

      return playerName;
    },
    onSuccess: (playerName) => {
      queryClient.invalidateQueries({ queryKey: ["wellness_tracking", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["wellness_decision", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["wellness_existing", categoryId, date] });
      toast.success(`Wellness enregistré pour ${playerName}`);
      const currentDate = date;
      resetForm();
      setDate(currentDate);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Une entrée existe déjà pour ce joueur à cette date");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setDate(new Date().toISOString().split("T")[0]);
    setSleepQuality(3);
    setSleepDuration(3);
    setGeneralFatigue(3);
    setStressLevel(3);
    setSorenessUpper(1);
    setSorenessLower(1);
    setHasSpecificPain(false);
    setPainLocation("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) {
      toast.error("Veuillez sélectionner un athlète");
      return;
    }
    addWellness.mutate();
  };

  const ScoreButton = ({ 
    label, 
    value, 
    onChange, 
    labels 
  }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void;
    labels: string[];
  }) => (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((score) => (
          <Button
            key={score}
            type="button"
            variant={value === score ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(score)}
            className="flex-1 text-xs whitespace-normal h-auto py-2 px-1"
          >
            <span className="text-center line-clamp-2">{labels[score]}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle entrée Wellness & Soreness</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Joueur</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                {availablePlayers?.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.first_name ? `${player.first_name} ${player.name}` : player.name}
                    </SelectItem>
                  ))}
                  {availablePlayers?.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Tous les athlètes ont déjà rempli leur wellness
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">Wellness</h4>
            
            <ScoreButton
              label="Qualité du sommeil"
              value={sleepQuality}
              onChange={setSleepQuality}
              labels={scoreLabels.sleep_quality}
            />

            <ScoreButton
              label="Durée du sommeil"
              value={sleepDuration}
              onChange={setSleepDuration}
              labels={scoreLabels.sleep_duration}
            />

            <ScoreButton
              label="Fatigue générale"
              value={generalFatigue}
              onChange={setGeneralFatigue}
              labels={scoreLabels.general_fatigue}
            />

            <ScoreButton
              label="Stress / Charge mentale"
              value={stressLevel}
              onChange={setStressLevel}
              labels={scoreLabels.stress_level}
            />
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">Soreness (Douleurs musculaires)</h4>
            <p className="text-xs text-muted-foreground">
              1 = aucune gêne • 5 = douleur limitante
            </p>

            <ScoreButton
              label="Haut du corps"
              value={sorenessUpper}
              onChange={setSorenessUpper}
              labels={scoreLabels.soreness}
            />

            <ScoreButton
              label="Bas du corps"
              value={sorenessLower}
              onChange={setSorenessLower}
              labels={scoreLabels.soreness}
            />
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="specific-pain">Douleur spécifique / aiguë ?</Label>
              <Switch
                id="specific-pain"
                checked={hasSpecificPain}
                onCheckedChange={setHasSpecificPain}
              />
            </div>
            {hasSpecificPain && (
              <div className="space-y-2">
                <Label>Localisation de la douleur</Label>
                <Input
                  placeholder="Ex: genou droit, épaule gauche..."
                  value={painLocation}
                  onChange={(e) => setPainLocation(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notes / Commentaires section */}
          <div className="space-y-2">
            <Label htmlFor="wellness-notes">Notes / Commentaires du coach</Label>
            <Textarea
              id="wellness-notes"
              placeholder="Ex: Mauvaise nuit suite à un voyage, stress lié à un examen, fatigue post-compétition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Notez les raisons des scores élevés ou tout contexte important
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addWellness.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
