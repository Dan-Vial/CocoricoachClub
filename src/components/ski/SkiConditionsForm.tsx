import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mountain, Wind, Thermometer, Eye, Save, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SkiConditionsFormProps {
  matchId?: string;
  trainingSessionId?: string;
  categoryId: string;
  isViewer?: boolean;
}

const SNOW_TYPES = [
  { value: "powder", label: "Poudreuse" },
  { value: "packed", label: "Damée" },
  { value: "icy", label: "Glacée / Verglacée" },
  { value: "wet", label: "Humide / Lourde" },
  { value: "spring", label: "De printemps" },
  { value: "crust", label: "Croûtée" },
  { value: "artificial", label: "Artificielle" },
];

const VISIBILITY_LEVELS = [
  { value: "excellent", label: "Excellente" },
  { value: "good", label: "Bonne" },
  { value: "moderate", label: "Moyenne" },
  { value: "poor", label: "Mauvaise" },
  { value: "whiteout", label: "Whiteout / Brouillard" },
];

const WEATHER_OPTIONS = [
  { value: "sunny", label: "☀️ Ensoleillé" },
  { value: "partly_cloudy", label: "⛅ Partiellement nuageux" },
  { value: "cloudy", label: "☁️ Couvert" },
  { value: "snowing", label: "🌨️ Neige" },
  { value: "heavy_snow", label: "❄️ Fortes chutes" },
  { value: "rain", label: "🌧️ Pluie" },
  { value: "fog", label: "🌫️ Brouillard" },
  { value: "storm", label: "⛈️ Tempête" },
];

const WIND_DIRECTIONS = [
  { value: "N", label: "N" }, { value: "NE", label: "NE" },
  { value: "E", label: "E" }, { value: "SE", label: "SE" },
  { value: "S", label: "S" }, { value: "SW", label: "SW" },
  { value: "W", label: "W" }, { value: "NW", label: "NW" },
];

const SLOPE_DIFFICULTIES = [
  { value: "green", label: "🟢 Verte" },
  { value: "blue", label: "🔵 Bleue" },
  { value: "red", label: "🔴 Rouge" },
  { value: "black", label: "⚫ Noire" },
  { value: "off_piste", label: "🏔️ Hors-piste" },
  { value: "park", label: "🎿 Snowpark" },
];

const PISTE_CONDITIONS = [
  { value: "excellent", label: "Excellente" },
  { value: "good", label: "Bonne" },
  { value: "average", label: "Moyenne" },
  { value: "poor", label: "Mauvaise" },
  { value: "dangerous", label: "Dangereuse" },
];

export function SkiConditionsForm({ matchId, trainingSessionId, categoryId, isViewer }: SkiConditionsFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [snowType, setSnowType] = useState("");
  const [snowQuality, setSnowQuality] = useState("");
  const [snowTemp, setSnowTemp] = useState("");
  const [airTemp, setAirTemp] = useState("");
  const [visibility, setVisibility] = useState("");
  const [weather, setWeather] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [altitude, setAltitude] = useState("");
  const [slopeName, setSlopeName] = useState("");
  const [slopeDifficulty, setSlopeDifficulty] = useState("");
  const [avalancheRisk, setAvalancheRisk] = useState("");
  const [pisteCondition, setPisteCondition] = useState("");
  const [notes, setNotes] = useState("");

  const queryKey = ["ski_conditions", matchId || trainingSessionId];

  const { data: existing } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from("ski_conditions" as any).select("*").eq("category_id", categoryId);
      if (matchId) query = query.eq("match_id", matchId);
      else if (trainingSessionId) query = query.eq("training_session_id", trainingSessionId);
      else return null;
      const { data, error } = await (query as any).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!(matchId || trainingSessionId),
  });

  useEffect(() => {
    if (existing) {
      setSnowType(existing.snow_type || "");
      setSnowQuality(existing.snow_quality?.toString() || "");
      setSnowTemp(existing.snow_temperature_celsius?.toString() || "");
      setAirTemp(existing.air_temperature_celsius?.toString() || "");
      setVisibility(existing.visibility || "");
      setWeather(existing.weather || "");
      setWindSpeed(existing.wind_speed_kmh?.toString() || "");
      setWindDirection(existing.wind_direction || "");
      setAltitude(existing.altitude_m?.toString() || "");
      setSlopeName(existing.slope_name || "");
      setSlopeDifficulty(existing.slope_difficulty || "");
      setAvalancheRisk(existing.avalanche_risk?.toString() || "");
      setPisteCondition(existing.piste_condition || "");
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
        snow_type: snowType || null,
        snow_quality: snowQuality ? parseInt(snowQuality) : null,
        snow_temperature_celsius: snowTemp ? parseFloat(snowTemp) : null,
        air_temperature_celsius: airTemp ? parseFloat(airTemp) : null,
        visibility: visibility || null,
        weather: weather || null,
        wind_speed_kmh: windSpeed ? parseFloat(windSpeed) : null,
        wind_direction: windDirection || null,
        altitude_m: altitude ? parseInt(altitude) : null,
        slope_name: slopeName || null,
        slope_difficulty: slopeDifficulty || null,
        avalanche_risk: avalancheRisk ? parseInt(avalancheRisk) : null,
        piste_condition: pisteCondition || null,
        notes: notes || null,
      };
      if (existing) {
        const { error } = await supabase.from("ski_conditions" as any).update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ski_conditions" as any).insert(payload);
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
              <Mountain className="h-4 w-4" />
              Conditions de ski / neige
              {existing && <span className="text-xs text-muted-foreground ml-2">(renseignées)</span>}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Neige */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Snowflake className="h-3 w-3" /> NEIGE
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={snowType} onValueChange={setSnowType} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {SNOW_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Qualité (1-10)</Label>
                  <Input type="number" min={1} max={10} value={snowQuality} onChange={e => setSnowQuality(e.target.value)} disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Temp. neige (°C)</Label>
                  <Input type="number" step="0.5" value={snowTemp} onChange={e => setSnowTemp(e.target.value)} placeholder="-5" disabled={isViewer} />
                </div>
              </div>
            </div>

            {/* Météo */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> MÉTÉO
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Temps</Label>
                  <Select value={weather} onValueChange={setWeather} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {WEATHER_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Temp. air (°C)</Label>
                  <Input type="number" step="0.5" value={airTemp} onChange={e => setAirTemp(e.target.value)} placeholder="-10" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Visibilité</Label>
                  <Select value={visibility} onValueChange={setVisibility} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_LEVELS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
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
                  <Input type="number" step="1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} placeholder="20" disabled={isViewer} />
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

            {/* Piste */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Mountain className="h-3 w-3" /> PISTE / TERRAIN
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nom de la piste / spot</Label>
                  <Input value={slopeName} onChange={e => setSlopeName(e.target.value)} placeholder="Ex: Face de Bellevarde" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">Difficulté</Label>
                  <Select value={slopeDifficulty} onValueChange={setSlopeDifficulty} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {SLOPE_DIFFICULTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Altitude (m)</Label>
                  <Input type="number" value={altitude} onChange={e => setAltitude(e.target.value)} placeholder="2500" disabled={isViewer} />
                </div>
                <div>
                  <Label className="text-xs">État piste</Label>
                  <Select value={pisteCondition} onValueChange={setPisteCondition} disabled={isViewer}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {PISTE_CONDITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Risque avalanche (1-5)</Label>
                  <Input type="number" min={1} max={5} value={avalancheRisk} onChange={e => setAvalancheRisk(e.target.value)} disabled={isViewer} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
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
