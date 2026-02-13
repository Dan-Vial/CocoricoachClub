import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Heart, Moon, Zap, Frown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  playerId: string;
  categoryId: string;
}

const WELLNESS_FIELDS = [
  { key: "sleep_quality", label: "Qualité du sommeil", icon: Moon, low: "Mauvais", high: "Excellent" },
  { key: "sleep_duration", label: "Heures de sommeil", isNumber: true },
  { key: "general_fatigue", label: "Fatigue générale", icon: Zap, low: "Aucune", high: "Épuisé" },
  { key: "soreness_upper_body", label: "Douleurs haut du corps", icon: Frown, low: "Aucune", high: "Très fortes" },
  { key: "soreness_lower_body", label: "Douleurs bas du corps", icon: Frown, low: "Aucune", high: "Très fortes" },
  { key: "stress_level", label: "Stress", icon: Frown, low: "Détendu", high: "Très stressé" },
] as const;

export function AthleteSpaceWellness({ playerId, categoryId }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existingWellness, isLoading } = useQuery({
    queryKey: ["athlete-space-wellness", playerId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("*")
        .eq("player_id", playerId)
        .eq("tracking_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [values, setValues] = useState({
    sleep_quality: 3,
    sleep_duration: 7,
    general_fatigue: 3,
    soreness_upper_body: 3,
    soreness_lower_body: 3,
    stress_level: 3,
  });
  const [hasSpecificPain, setHasSpecificPain] = useState(false);
  const [painLocation, setPainLocation] = useState("");
  const [notes, setNotes] = useState("");

  const submitWellness = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wellness_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        tracking_date: today,
        sleep_quality: values.sleep_quality,
        sleep_duration: values.sleep_duration,
        general_fatigue: values.general_fatigue,
        soreness_upper_body: values.soreness_upper_body,
        soreness_lower_body: values.soreness_lower_body,
        stress_level: values.stress_level,
        has_specific_pain: hasSpecificPain,
        pain_location: hasSpecificPain ? painLocation : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Wellness enregistré !");
      queryClient.invalidateQueries({ queryKey: ["athlete-space-wellness"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-space-wellness-today"] });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  if (isLoading) return null;

  if (existingWellness) {
    const score = Math.round(
      ((existingWellness.sleep_quality || 3) +
        (6 - (existingWellness.general_fatigue || 3)) +
        (6 - (existingWellness.soreness_lower_body || 3)) +
        (6 - (existingWellness.soreness_upper_body || 3)) +
        (6 - (existingWellness.stress_level || 3))) / 5 * 20
    );

    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-status-optimal mx-auto" />
          <div>
            <p className="text-lg font-semibold">Wellness du jour enregistré</p>
            <p className="text-muted-foreground text-sm">Score global: <span className="font-bold text-foreground">{score}%</span></p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-md mx-auto">
            {WELLNESS_FIELDS.map(f => (
              <div key={f.key} className="text-center">
                <p className="text-lg font-bold">{(existingWellness as any)[f.key]}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-destructive" />
          Comment te sens-tu aujourd'hui ?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {WELLNESS_FIELDS.map(field => {
          if ('isNumber' in field && field.isNumber) {
            return (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">{field.label}</Label>
                  <span className="text-lg font-bold">{(values as any)[field.key]}h</span>
                </div>
                <Slider
                  value={[(values as any)[field.key]]}
                  onValueChange={([v]) => setValues(prev => ({ ...prev, [field.key]: v }))}
                  min={3}
                  max={12}
                  step={0.5}
                />
              </div>
            );
          }
          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm flex items-center gap-1.5">
                  {'icon' in field && field.icon && <field.icon className="h-3.5 w-3.5 text-muted-foreground" />}
                  {field.label}
                </Label>
                <span className="text-lg font-bold">{(values as any)[field.key]}/5</span>
              </div>
              <Slider
                value={[(values as any)[field.key]]}
                onValueChange={([v]) => setValues(prev => ({ ...prev, [field.key]: v }))}
                min={1}
                max={5}
                step={1}
              />
              {'low' in field && (
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>{field.low}</span>
                  <span>{field.high}</span>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2">
          <Checkbox checked={hasSpecificPain} onCheckedChange={(v) => setHasSpecificPain(!!v)} />
          <Label className="text-sm">J'ai une douleur spécifique</Label>
        </div>

        {hasSpecificPain && (
          <Input
            value={painLocation}
            onChange={e => setPainLocation(e.target.value)}
            placeholder="Localisation de la douleur (ex: genou droit)"
          />
        )}

        <div>
          <Label className="text-sm">Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Remarques, sensations..."
            className="mt-1"
            rows={2}
          />
        </div>

        <Button onClick={() => submitWellness.mutate()} disabled={submitWellness.isPending} className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Enregistrer mon wellness
        </Button>
      </CardContent>
    </Card>
  );
}
