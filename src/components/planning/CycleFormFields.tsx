import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CYCLE_TYPES = [
  { value: "PG", label: "PG - Préparation Générale" },
  { value: "PS", label: "PS - Préparation Spécifique" },
  { value: "PC", label: "PC - Préparation Compétition" },
  { value: "recuperation", label: "Récupération" },
];

function getSliderColor(value: number) {
  if (value <= 1) return "#facc15";
  if (value <= 2) return "#f59e0b";
  if (value <= 3) return "#f97316";
  if (value <= 4) return "#ef4444";
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
          {value}/5
        </span>
      </Label>
      <div className="relative flex items-center w-full h-6">
        <div className="absolute h-2 w-full rounded-full bg-secondary" />
        <div
          className="absolute h-2 rounded-full transition-all"
          style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-5 h-5 rounded-full border-2 bg-background shadow-sm transition-all pointer-events-none"
          style={{
            left: `calc(${(value / 5) * 100}% - 10px)`,
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
}

export function CycleFormFields({
  cycleType,
  onCycleTypeChange,
  intensity,
  onIntensityChange,
  volume,
  onVolumeChange,
}: CycleFormFieldsProps) {
  return (
    <>
      <div>
        <Label>Type de cycle</Label>
        <Select value={cycleType} onValueChange={onCycleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un type..." />
          </SelectTrigger>
          <SelectContent>
            {CYCLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <IntensitySlider label="Intensité" value={intensity} onChange={onIntensityChange} />
        <IntensitySlider label="Volume" value={volume} onChange={onVolumeChange} />
      </div>
    </>
  );
}
