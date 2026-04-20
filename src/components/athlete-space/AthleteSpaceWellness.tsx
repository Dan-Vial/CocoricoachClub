import { useState } from "react";
import { AthleteSpaceWellnessHistory } from "./AthleteSpaceWellnessHistory";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Heart, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { toast } from "sonner";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { cn } from "@/lib/utils";
import { PAIN_ZONES } from "@/lib/constants/pain-locations";

interface Props {
  playerId: string;
  categoryId: string;
}

const SLEEP_HOURS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const WELLNESS_FIELDS = [
  {
    key: "sleep_quality",
    label: "Qualité du sommeil",
    emoji: "😴",
    options: [
      { value: 1, label: "Très mal dormi" },
      { value: 2, label: "Mal dormi" },
      { value: 3, label: "Moyennement dormi" },
      { value: 4, label: "Bien dormi" },
      { value: 5, label: "Très bien dormi" },
    ],
  },
  { key: "sleep_duration", label: "Heures de sommeil", emoji: "🛏️", isNumber: true },
  {
    key: "general_fatigue",
    label: "Fatigue générale",
    emoji: "🔋",
    inverted: true,
    options: [
      { value: 1, label: "Très en forme" },
      { value: 2, label: "En forme" },
      { value: 3, label: "Fatigué" },
      { value: 4, label: "Très fatigué" },
      { value: 5, label: "Épuisé" },
    ],
  },
  {
    key: "soreness_upper_body",
    label: "Douleurs haut du corps",
    emoji: "💪",
    inverted: true,
    options: [
      { value: 1, label: "Aucune douleur" },
      { value: 2, label: "Légère gêne" },
      { value: 3, label: "Douleur modérée" },
      { value: 4, label: "Douleur forte" },
      { value: 5, label: "Douleur intense" },
    ],
  },
  {
    key: "soreness_lower_body",
    label: "Douleurs bas du corps",
    emoji: "🦵",
    inverted: true,
    options: [
      { value: 1, label: "Aucune douleur" },
      { value: 2, label: "Légère gêne" },
      { value: 3, label: "Douleur modérée" },
      { value: 4, label: "Douleur forte" },
      { value: 5, label: "Douleur intense" },
    ],
  },
  {
    key: "stress_level",
    label: "Stress",
    emoji: "🧠",
    inverted: true,
    options: [
      { value: 1, label: "Très détendu" },
      { value: 2, label: "Détendu" },
      { value: 3, label: "Un peu stressé" },
      { value: 4, label: "Stressé" },
      { value: 5, label: "Très stressé" },
    ],
  },
] as const;

export function AthleteSpaceWellness({ playerId, categoryId }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [expanded, setExpanded] = useState(false);

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
    sleep_quality: 0,
    sleep_duration: 0,
    general_fatigue: 0,
    soreness_upper_body: 0,
    soreness_lower_body: 0,
    stress_level: 0,
  });
  const [hasSpecificPain, setHasSpecificPain] = useState(false);
  const [painZone, setPainZone] = useState("");
  const [painLocation, setPainLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [showHrv, setShowHrv] = useState(false);
  const [hrvMs, setHrvMs] = useState("");
  const [restingHr, setRestingHr] = useState("");

  const allFieldsFilled = values.sleep_quality > 0 && values.sleep_duration > 0 &&
    values.general_fatigue > 0 && values.soreness_upper_body > 0 &&
    values.soreness_lower_body > 0 && values.stress_level > 0;

  const selectedZoneLocations = PAIN_ZONES.find(z => z.zone === painZone)?.locations || [];

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
        pain_zone: hasSpecificPain ? painZone : null,
        pain_location: hasSpecificPain ? painLocation : null,
        notes: notes || null,
      });
      if (error) throw error;

      // Insert HRV morning data if provided
      if (showHrv && (hrvMs || restingHr)) {
        const { error: hrvError } = await supabase.from("hrv_records").insert({
          player_id: playerId,
          category_id: categoryId,
          record_date: today,
          record_type: "morning",
          hrv_ms: hrvMs ? parseFloat(hrvMs) : null,
          resting_hr_bpm: restingHr ? parseFloat(restingHr) : null,
        });
        if (hrvError) {
          console.error("HRV insert error:", hrvError);
          toast.error("Wellness enregistré mais erreur HRV");
        }
      }
    },
    onSuccess: () => {
      toast.success("Wellness enregistré !");
      queryClient.invalidateQueries({ queryKey: ["athlete-space-wellness"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-space-wellness-today"] });
      if (showHrv) {
        queryClient.invalidateQueries({ queryKey: ["hrv_records"] });
      }
      setExpanded(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  if (isLoading) return null;

  // Already filled
  if (existingWellness) {
    const score = Math.round(
      ((existingWellness.sleep_quality || 3) +
        (6 - (existingWellness.general_fatigue || 3)) +
        (6 - (existingWellness.soreness_lower_body || 3)) +
        (6 - (existingWellness.soreness_upper_body || 3)) +
        (6 - (existingWellness.stress_level || 3))) / 5 * 20
    );

    return (
      <>
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NAV_COLORS.sante.base}20` }}>
              <CheckCircle2 className="h-5 w-5 text-status-optimal" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Wellness du jour enregistré</p>
              <p className="text-xs text-muted-foreground">Score global : <span className="font-bold text-foreground">{score}%</span></p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-status-optimal" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
            {WELLNESS_FIELDS.map(f => (
              <div key={f.key} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${NAV_COLORS.sante.base}08` }}>
                <p className="text-lg font-bold" style={{ color: NAV_COLORS.sante.base }}>{(existingWellness as any)[f.key]}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <AthleteSpaceWellnessHistory playerId={playerId} categoryId={categoryId} />
      </>
    );
  }

  // Not filled yet
  return (
    <>
    <Card className="shadow-md border-2" style={{ borderColor: `${NAV_COLORS.sante.base}40`, backgroundColor: `${NAV_COLORS.sante.base}06` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${NAV_COLORS.sante.base}20` }}>
                <Heart className="h-4 w-4" style={{ color: NAV_COLORS.sante.base }} />
              </div>
              <span style={{ color: NAV_COLORS.sante.base }}>Wellness du jour à remplir</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs" style={{ borderColor: NAV_COLORS.sante.base, color: NAV_COLORS.sante.base }}>À remplir</Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4" style={{ color: NAV_COLORS.sante.base }} />
              ) : (
                <ChevronDown className="h-4 w-4" style={{ color: NAV_COLORS.sante.base }} />
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {WELLNESS_FIELDS.map(field => {
            const currentValue = (values as any)[field.key];

            if ('isNumber' in field && field.isNumber) {
              return (
                <div key={field.key}>
                  <Label className="text-sm flex items-center gap-1.5 mb-3">
                    <span className="text-base">{field.emoji}</span>
                    {field.label}
                    {currentValue > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs font-bold">{currentValue}h</Badge>
                    )}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SLEEP_HOURS.map(hour => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setValues(prev => ({ ...prev, [field.key]: hour }))}
                        className={cn(
                          "h-10 w-12 rounded-xl text-sm font-semibold transition-all duration-200",
                          "border-2 hover:scale-105 active:scale-95",
                          currentValue === hour
                            ? "text-white shadow-md scale-105"
                            : "bg-background border-border text-foreground hover:border-primary/50"
                        )}
                        style={currentValue === hour ? { backgroundColor: NAV_COLORS.sante.base, borderColor: NAV_COLORS.sante.base } : {}}
                      >
                        {hour}h
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            const fieldOptions = 'options' in field ? field.options : [];

            return (
              <div key={field.key}>
                <Label className="text-sm flex items-center gap-1.5 mb-3">
                  <span className="text-base">{field.emoji}</span>
                  {field.label}
                  {currentValue > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs font-bold">{currentValue}/5</Badge>
                  )}
                </Label>
                <div className="flex flex-col gap-2">
                  {fieldOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValues(prev => ({ ...prev, [field.key]: opt.value }))}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200",
                        "border-2 hover:scale-[1.01] active:scale-[0.99]",
                        currentValue === opt.value
                          ? "shadow-md text-white font-semibold"
                          : "bg-background border-border text-foreground hover:border-primary/50"
                      )}
                      style={currentValue === opt.value ? { backgroundColor: NAV_COLORS.sante.base, borderColor: NAV_COLORS.sante.base } : {}}
                    >
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2">
            <Checkbox checked={hasSpecificPain} onCheckedChange={(v) => {
              setHasSpecificPain(!!v);
              if (!v) { setPainZone(""); setPainLocation(""); }
            }} />
            <Label className="text-sm">J'ai une douleur spécifique</Label>
          </div>

          {hasSpecificPain && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-1.5 block">Zone du corps</Label>
                <Select value={painZone} onValueChange={(v) => { setPainZone(v); setPainLocation(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIN_ZONES.map(z => (
                      <SelectItem key={z.zone} value={z.zone}>{z.zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {painZone && (
                <div>
                  <Label className="text-sm mb-1.5 block">Préciser la localisation</Label>
                  <Select value={painLocation} onValueChange={setPainLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la localisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedZoneLocations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
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

          {/* HRV morning data (optional) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={showHrv} onCheckedChange={(v) => {
                setShowHrv(!!v);
                if (!v) { setHrvMs(""); setRestingHr(""); }
              }} />
              <Label className="text-sm flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" style={{ color: NAV_COLORS.sante.base }} />
                Ajouter mes données HRV (matin repos)
              </Label>
            </div>

            {showHrv && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs">HRV (ms)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="300"
                    placeholder="Ex: 65"
                    value={hrvMs}
                    onChange={(e) => setHrvMs(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">FC repos (bpm)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="120"
                    placeholder="Ex: 55"
                    value={restingHr}
                    onChange={(e) => setRestingHr(e.target.value)}
                    className="h-9"
                  />
                </div>
                <p className="col-span-2 text-[10px] text-muted-foreground">
                  Ces données seront visibles dans Santé → HRV
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={() => submitWellness.mutate()}
            disabled={submitWellness.isPending || !allFieldsFilled}
            className="w-full"
            style={{ backgroundColor: NAV_COLORS.sante.base }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Enregistrer mon wellness
          </Button>
        </CardContent>
      )}
    </Card>

    {/* Wellness History Charts */}
    <AthleteSpaceWellnessHistory playerId={playerId} categoryId={categoryId} />
    </>
  );
}
