import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mountain, Wind, Eye, Save, Snowflake, Sun, Droplets, TriangleAlert } from "lucide-react";
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
  { value: "packed", label: "Compacte / Damée" },
  { value: "icy", label: "Glacée / Verglacée" },
  { value: "wet", label: "Transformée / Humide" },
  { value: "spring", label: "De printemps" },
  { value: "crust", label: "Croûtée" },
  { value: "artificial", label: "Artificielle" },
  { value: "fresh", label: "Fraîche" },
];

const SNOW_GRANULOMETRY = [
  { value: "fine", label: "Fine (grains fins)" },
  { value: "medium", label: "Moyenne" },
  { value: "coarse", label: "Gros grains" },
  { value: "sugar", label: "Sucre (grains ronds)" },
];

const SNOW_HUMIDITY_OPTIONS = [
  { value: "dry", label: "Sèche" },
  { value: "slightly_wet", label: "Légèrement humide" },
  { value: "wet", label: "Humide" },
  { value: "very_wet", label: "Très humide / Mouillée" },
];

const SNOW_EVOLUTION = [
  { value: "stable", label: "Stable" },
  { value: "softening", label: "Ramollit au fil de la journée" },
  { value: "hardening", label: "Durcit (regel)" },
  { value: "degrading", label: "Se dégrade rapidement" },
  { value: "improving", label: "S'améliore (damage / vent)" },
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

const SUNSHINE_OPTIONS = [
  { value: "full_sun", label: "Plein soleil" },
  { value: "partial_shade", label: "Mi-ombre" },
  { value: "shade", label: "Ombre" },
  { value: "variable", label: "Variable" },
];

const PRECIPITATION_OPTIONS = [
  { value: "none", label: "Aucune" },
  { value: "light_snow", label: "Neige légère" },
  { value: "moderate_snow", label: "Neige modérée" },
  { value: "heavy_snow", label: "Neige forte" },
  { value: "rain", label: "Pluie" },
  { value: "sleet", label: "Neige mouillée / Grésil" },
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

const SLOPE_HARDNESS = [
  { value: "soft", label: "Souple / Molle" },
  { value: "medium", label: "Moyenne" },
  { value: "hard", label: "Dure" },
  { value: "very_hard", label: "Très dure / Glacée" },
];

const PISTE_CONDITIONS = [
  { value: "excellent", label: "Excellente" },
  { value: "good", label: "Bonne" },
  { value: "average", label: "Moyenne" },
  { value: "poor", label: "Mauvaise" },
  { value: "dangerous", label: "Dangereuse" },
];

const PISTE_EVOLUTION = [
  { value: "stable", label: "Stable toute la journée" },
  { value: "rutted", label: "Creusée / Bosselée en fin de journée" },
  { value: "icy_patches", label: "Plaques de glace apparaissent" },
  { value: "slushy", label: "Devient soupe / fondante" },
  { value: "degrading", label: "Se dégrade fortement" },
];

type SectionKey = "snow" | "weather" | "terrain";

export function SkiConditionsForm({ matchId, trainingSessionId, categoryId, isViewer }: SkiConditionsFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(["snow", "weather", "terrain"]));

  const [snowType, setSnowType] = useState("");
  const [snowQuality, setSnowQuality] = useState("");
  const [snowTemp, setSnowTemp] = useState("");
  const [snowHumidity, setSnowHumidity] = useState("");
  const [snowGranulometry, setSnowGranulometry] = useState("");
  const [snowEvolution, setSnowEvolution] = useState("");
  const [airTemp, setAirTemp] = useState("");
  const [visibility, setVisibility] = useState("");
  const [weather, setWeather] = useState("");
  const [sunshine, setSunshine] = useState("");
  const [precipitation, setPrecipitation] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [altitude, setAltitude] = useState("");
  const [slopeName, setSlopeName] = useState("");
  const [slopeDifficulty, setSlopeDifficulty] = useState("");
  const [slopeHardness, setSlopeHardness] = useState("");
  const [gateSetup, setGateSetup] = useState("");
  const [pisteCondition, setPisteCondition] = useState("");
  const [pisteEvolution, setPisteEvolution] = useState("");
  const [avalancheRisk, setAvalancheRisk] = useState("");
  const [notes, setNotes] = useState("");

  const queryKey = ["ski_conditions", matchId || trainingSessionId];

  const { data: existing } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from("ski_conditions").select("*").eq("category_id", categoryId);
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
      setSnowType(existing.snow_type || "");
      setSnowQuality(existing.snow_quality?.toString() || "");
      setSnowTemp(existing.snow_temperature_celsius?.toString() || "");
      setSnowHumidity(existing.snow_humidity || "");
      setSnowGranulometry(existing.snow_granulometry || "");
      setSnowEvolution(existing.snow_evolution || "");
      setAirTemp(existing.air_temperature_celsius?.toString() || "");
      setVisibility(existing.visibility || "");
      setWeather(existing.weather || "");
      setSunshine(existing.sunshine || "");
      setPrecipitation(existing.precipitation || "");
      setWindSpeed(existing.wind_speed_kmh?.toString() || "");
      setWindDirection(existing.wind_direction || "");
      setAltitude(existing.altitude_m?.toString() || "");
      setSlopeName(existing.slope_name || "");
      setSlopeDifficulty(existing.slope_difficulty || "");
      setSlopeHardness(existing.slope_hardness || "");
      setGateSetup(existing.gate_setup || "");
      setPisteCondition(existing.piste_condition || "");
      setPisteEvolution(existing.piste_evolution || "");
      setAvalancheRisk(existing.avalanche_risk?.toString() || "");
      setNotes(existing.notes || "");
      setIsOpen(true);
    }
  }, [existing]);

  const toggleSection = (key: SectionKey) => {
    const next = new Set(openSections);
    if (next.has(key)) next.delete(key); else next.add(key);
    setOpenSections(next);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        category_id: categoryId,
        match_id: matchId || null,
        training_session_id: trainingSessionId || null,
        snow_type: snowType || null,
        snow_quality: snowQuality ? parseInt(snowQuality) : null,
        snow_temperature_celsius: snowTemp ? parseFloat(snowTemp) : null,
        snow_humidity: snowHumidity || null,
        snow_granulometry: snowGranulometry || null,
        snow_evolution: snowEvolution || null,
        air_temperature_celsius: airTemp ? parseFloat(airTemp) : null,
        visibility: visibility || null,
        weather: weather || null,
        sunshine: sunshine || null,
        precipitation: precipitation || null,
        wind_speed_kmh: windSpeed ? parseFloat(windSpeed) : null,
        wind_direction: windDirection || null,
        altitude_m: altitude ? parseInt(altitude) : null,
        slope_name: slopeName || null,
        slope_difficulty: slopeDifficulty || null,
        slope_hardness: slopeHardness || null,
        gate_setup: gateSetup || null,
        piste_condition: pisteCondition || null,
        piste_evolution: pisteEvolution || null,
        avalanche_risk: avalancheRisk ? parseInt(avalancheRisk) : null,
        notes: notes || null,
      };
      if (existing) {
        const { error } = await supabase.from("ski_conditions").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ski_conditions").insert(payload);
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

            {/* Section toggles */}
            <div className="flex flex-wrap gap-3">
              {([
                { key: "snow" as SectionKey, label: "❄️ Neige", icon: Snowflake },
                { key: "weather" as SectionKey, label: "🌡️ Météo", icon: Sun },
                { key: "terrain" as SectionKey, label: "🏔️ Terrain", icon: Mountain },
              ]).map(s => (
                <label key={s.key} className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <Checkbox checked={openSections.has(s.key)} onCheckedChange={() => toggleSection(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>

            {/* ❄️ Neige */}
            {openSections.has("snow") && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Snowflake className="h-3 w-3" /> NEIGE
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={snowType} onValueChange={setSnowType} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SNOW_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Humidité</Label>
                    <Select value={snowHumidity} onValueChange={setSnowHumidity} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SNOW_HUMIDITY_OPTIONS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Granulométrie</Label>
                    <Select value={snowGranulometry} onValueChange={setSnowGranulometry} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SNOW_GRANULOMETRY.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Évolution journée</Label>
                    <Select value={snowEvolution} onValueChange={setSnowEvolution} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SNOW_EVOLUTION.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* 🌡️ Météo */}
            {openSections.has("weather") && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Sun className="h-3 w-3" /> MÉTÉO & VENT
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Temps</Label>
                    <Select value={weather} onValueChange={setWeather} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{WEATHER_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
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
                      <SelectContent>{VISIBILITY_LEVELS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Ensoleillement</Label>
                    <Select value={sunshine} onValueChange={setSunshine} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SUNSHINE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Précipitations</Label>
                    <Select value={precipitation} onValueChange={setPrecipitation} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{PRECIPITATION_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Vent (km/h)</Label>
                    <Input type="number" step="1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} placeholder="20" disabled={isViewer} />
                  </div>
                  <div>
                    <Label className="text-xs">Direction</Label>
                    <Select value={windDirection} onValueChange={setWindDirection} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{WIND_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* 🏔️ Terrain */}
            {openSections.has("terrain") && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Mountain className="h-3 w-3" /> TERRAIN / PISTE
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Nom de la piste</Label>
                    <Input value={slopeName} onChange={e => setSlopeName(e.target.value)} placeholder="Face de Bellevarde" disabled={isViewer} />
                  </div>
                  <div>
                    <Label className="text-xs">Difficulté</Label>
                    <Select value={slopeDifficulty} onValueChange={setSlopeDifficulty} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SLOPE_DIFFICULTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Altitude (m)</Label>
                    <Input type="number" value={altitude} onChange={e => setAltitude(e.target.value)} placeholder="2500" disabled={isViewer} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Dureté piste</Label>
                    <Select value={slopeHardness} onValueChange={setSlopeHardness} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{SLOPE_HARDNESS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">État piste</Label>
                    <Select value={pisteCondition} onValueChange={setPisteCondition} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{PISTE_CONDITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Évolution piste</Label>
                    <Select value={pisteEvolution} onValueChange={setPisteEvolution} disabled={isViewer}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{PISTE_EVOLUTION.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tracé / Portes (slalom, géant...)</Label>
                    <Input value={gateSetup} onChange={e => setGateSetup(e.target.value)} placeholder="Ex: 52 portes, écartement serré" disabled={isViewer} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><TriangleAlert className="h-3 w-3" /> Risque avalanche (1-5)</Label>
                    <Input type="number" min={1} max={5} value={avalancheRisk} onChange={e => setAvalancheRisk(e.target.value)} disabled={isViewer} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Notes générales</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations supplémentaires..." rows={2} disabled={isViewer} />
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