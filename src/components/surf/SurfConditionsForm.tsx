import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Waves, Wind, Droplets, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SurfConditionsFormProps {
  matchId?: string;
  trainingSessionId?: string;
  categoryId: string;
  isViewer?: boolean;
}

const TIDE_LEVELS = [
  { value: "low", label: "Basse" },
  { value: "mid", label: "Mi-marée" },
  { value: "high", label: "Haute" },
];

const TIDE_PHASES = [
  { value: "rising", label: "Montante" },
  { value: "falling", label: "Descendante" },
  { value: "slack", label: "Étale" },
];

const BOTTOM_TYPES = [
  { value: "beach_break", label: "Beach Break (sable)" },
  { value: "reef", label: "Reef Break (récif)" },
  { value: "point_break", label: "Point Break" },
  { value: "shore_break", label: "Shore Break" },
  { value: "river_mouth", label: "Embouchure" },
];

const WIND_DIRECTIONS = [
  { value: "N", label: "N" }, { value: "NE", label: "NE" },
  { value: "E", label: "E" }, { value: "SE", label: "SE" },
  { value: "S", label: "S" }, { value: "SW", label: "SW" },
  { value: "W", label: "W" }, { value: "NW", label: "NW" },
];

export function SurfConditionsForm({ matchId, trainingSessionId, categoryId, isViewer }: SurfConditionsFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [swellHeight, setSwellHeight] = useState("");
  const [swellPeriod, setSwellPeriod] = useState("");
  const [swellDirection, setSwellDirection] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [tideLevel, setTideLevel] = useState("");
  const [tideCoefficient, setTideCoefficient] = useState("");
  const [tidePhase, setTidePhase] = useState("");
  const [spotName, setSpotName] = useState("");
  const [spotQuality, setSpotQuality] = useState("");
  const [bottomType, setBottomType] = useState("");
  const [bottomNotes, setBottomNotes] = useState("");
  const [waveQuality, setWaveQuality] = useState("");
  const [notes, setNotes] = useState("");

  const queryKey = ["surf_conditions", matchId || trainingSessionId];

  const { data: existing } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from("surf_conditions").select("*").eq("category_id", categoryId);
      if (matchId) query = query.eq("match_id", matchId);
      else if (trainingSessionId) query = query.eq("training_session_id", trainingSessionId);
      else return null;
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(matchId || trainingSessionId),
  });

  useEffect(() => {
    if (existing) {
      setSwellHeight(existing.swell_height_m?.toString() || "");
      setSwellPeriod(existing.swell_period_s?.toString() || "");
      setSwellDirection(existing.swell_direction || "");
      setWindSpeed(existing.wind_speed_kmh?.toString() || "");
      setWindDirection(existing.wind_direction || "");
      setTideLevel(existing.tide_level || "");
      setTideCoefficient(existing.tide_coefficient?.toString() || "");
      setTidePhase(existing.tide_phase || "");
      setSpotName(existing.spot_name || "");
      setSpotQuality(existing.spot_quality?.toString() || "");
      setBottomType(existing.bottom_type || "");
      setBottomNotes(existing.bottom_notes || "");
      setWaveQuality(existing.wave_quality?.toString() || "");
      setNotes(existing.notes || "");
      setIsOpen(true);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        category_id: categoryId,
        match_id: matchId || null,
        training_session_id: trainingSessionId || null,
        swell_height_m: swellHeight ? parseFloat(swellHeight) : null,
        swell_period_s: swellPeriod ? parseFloat(swellPeriod) : null,
        swell_direction: swellDirection || null,
        wind_speed_kmh: windSpeed ? parseFloat(windSpeed) : null,
        wind_direction: windDirection || null,
        tide_level: tideLevel || null,
        tide_coefficient: tideCoefficient ? parseInt(tideCoefficient) : null,
        tide_phase: tidePhase || null,
        spot_name: spotName || null,
        spot_quality: spotQuality ? parseInt(spotQuality) : null,
        bottom_type: bottomType || null,
        bottom_notes: bottomNotes || null,
        wave_quality: waveQuality ? parseInt(waveQuality) : null,
        notes: notes || null,
      };
      if (existing) {
        const { error } = await supabase.from("surf_conditions").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("surf_conditions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Conditions sauvegardées");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  if (isViewer && !existing) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Waves className="h-4 w-4" />
              Conditions de surf
              {existing && <span className="text-xs text-muted-foreground ml-2">(renseignées)</span>}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Houle */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Waves className="h-3 w-3" /> HOULE
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Hauteur (m)</Label>
                  <Input type="number" step="0.1" value={swellHeight} onChange={e => setSwellHeight(e.target.value)} placeholder="1.5" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Période (s)</Label>
                  <Input type="number" step="1" value={swellPeriod} onChange={e => setSwellPeriod(e.target.value)} placeholder="12" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Direction</Label>
                  <Select value={swellDirection} onValueChange={setSwellDirection} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {WIND_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Vent */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Wind className="h-3 w-3" /> VENT
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Vitesse (km/h)</Label>
                  <Input type="number" step="1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} placeholder="15" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Direction</Label>
                  <Select value={windDirection} onValueChange={setWindDirection} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {WIND_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Marée */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Droplets className="h-3 w-3" /> MARÉE
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Niveau</Label>
                  <Select value={tideLevel} onValueChange={setTideLevel} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {TIDE_LEVELS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Coefficient</Label>
                  <Input type="number" value={tideCoefficient} onChange={e => setTideCoefficient(e.target.value)} placeholder="85" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Phase</Label>
                  <Select value={tidePhase} onValueChange={setTidePhase} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {TIDE_PHASES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Spot */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> SPOT
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nom du spot</Label>
                  <Input value={spotName} onChange={e => setSpotName(e.target.value)} placeholder="Ex: La Gravière" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Type de fond</Label>
                  <Select value={bottomType} onValueChange={setBottomType} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {BOTTOM_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Qualité spot (1-10)</Label>
                  <Input type="number" min={1} max={10} value={spotQuality} onChange={e => setSpotQuality(e.target.value)} disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Qualité vagues (1-10)</Label>
                  <Input type="number" min={1} max={10} value={waveQuality} onChange={e => setWaveQuality(e.target.value)} disabled={isViewer} />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Notes fond / évolution spot</Label>
                <Textarea value={bottomNotes} onChange={e => setBottomNotes(e.target.value)} placeholder="Évolution des bancs de sable, courants..." rows={2} disabled={isViewer} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes générales</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..." rows={2} disabled={isViewer} />
            </div>

            {!isViewer && (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full" size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder les conditions"}
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
