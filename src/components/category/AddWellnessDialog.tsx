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

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
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

  const ScoreSlider = ({ 
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
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">
          {value} - {labels[value]}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={5}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1</span>
        <span>5</span>
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
                      {player.name}
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
            
            <ScoreSlider
              label="Qualité du sommeil"
              value={sleepQuality}
              onChange={setSleepQuality}
              labels={scoreLabels.sleep_quality}
            />

            <ScoreSlider
              label="Durée du sommeil"
              value={sleepDuration}
              onChange={setSleepDuration}
              labels={scoreLabels.sleep_duration}
            />

            <ScoreSlider
              label="Fatigue générale"
              value={generalFatigue}
              onChange={setGeneralFatigue}
              labels={scoreLabels.general_fatigue}
            />

            <ScoreSlider
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

            <ScoreSlider
              label="Haut du corps"
              value={sorenessUpper}
              onChange={setSorenessUpper}
              labels={scoreLabels.soreness}
            />

            <ScoreSlider
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
