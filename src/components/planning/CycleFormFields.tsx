import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CYCLE_TYPES = [
  { value: "PG", label: "PG - Préparation Générale" },
  { value: "PS", label: "PS - Préparation Spécifique" },
  { value: "PC", label: "PC - Préparation Compétition" },
  { value: "recuperation", label: "Récupération" },
];

const PHYSICAL_QUALITIES = [
  { value: "force", label: "Force" },
  { value: "puissance", label: "Puissance" },
  { value: "vitesse", label: "Vitesse / Explosivité" },
  { value: "endurance_aerobie", label: "Endurance aérobie" },
  { value: "endurance_anaerobie", label: "Endurance anaérobie" },
  { value: "endurance_force", label: "Endurance de force" },
  { value: "hypertrophie", label: "Hypertrophie" },
  { value: "mobilite", label: "Mobilité / Souplesse" },
  { value: "prevention", label: "Prévention / Prophylaxie" },
  { value: "mixte", label: "Mixte / Polyvalent" },
];

const SPORT_QUALITIES = [
  { value: "technique", label: "Technique" },
  { value: "tactique", label: "Tactique" },
];

const MENTAL_QUALITIES = [
  { value: "visualisation", label: "Visualisation" },
  { value: "routines", label: "Routines" },
  { value: "respiration", label: "Respiration" },
  { value: "gestion_emotions", label: "Gestion des émotions" },
  { value: "switch", label: "Switch" },
  { value: "concentration", label: "Concentration" },
];

const ALL_QUALITIES = [
  ...SPORT_QUALITIES,
  ...PHYSICAL_QUALITIES,
  ...MENTAL_QUALITIES,
];

function getQualitiesForLine(lineName?: string) {
  if (!lineName) return ALL_QUALITIES;
  const n = lineName.toLowerCase();
  if (n.includes("mental")) return MENTAL_QUALITIES;
  if (n.includes("physique")) return PHYSICAL_QUALITIES;
  return SPORT_QUALITIES;
}

function getSliderColor(value: number) {
  if (value <= 2) return "#22c55e";
  if (value <= 4) return "#facc15";
  if (value <= 6) return "#f59e0b";
  if (value <= 8) return "#ef4444";
  return "#dc2626";
}

function IntensitySlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const color = getSliderColor(value);
  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        {label}
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {value}/10
        </span>
      </Label>
      <div className="relative flex items-center w-full h-6">
        <div className="absolute h-2 w-full rounded-full bg-secondary" />
        <div
          className="absolute h-2 rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-5 h-5 rounded-full border-2 bg-background shadow-sm transition-all pointer-events-none"
          style={{
            left: `calc(${(value / 10) * 100}% - 10px)`,
            borderColor: color,
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Faible</span>
        <span>Max</span>
      </div>
    </div>
  );
}

interface CycleFormFieldsProps {
  cycleType: string;
  onCycleTypeChange: (value: string) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  dominantQuality?: string;
  onDominantQualityChange?: (value: string) => void;
  periodizationLineName?: string;
}

export function CycleFormFields({
  cycleType,
  onCycleTypeChange,
  intensity,
  onIntensityChange,
  volume,
  onVolumeChange,
  dominantQuality = "",
  onDominantQualityChange,
  periodizationLineName,
}: CycleFormFieldsProps) {
  const qualities = getQualitiesForLine(periodizationLineName);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type de cycle</Label>
          <Select
            value={cycleType || "__none__"}
            onValueChange={(v) => onCycleTypeChange(v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Aucun type</span>
              </SelectItem>
              {CYCLE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onDominantQualityChange && (
          <div>
            <Label>Thématique</Label>
            <Select value={dominantQuality} onValueChange={onDominantQualityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {qualities.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <IntensitySlider label="Intensité" value={intensity} onChange={onIntensityChange} />
        <IntensitySlider label="Volume" value={volume} onChange={onVolumeChange} />
      </div>

    </>
  );
}
