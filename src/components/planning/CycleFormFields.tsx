import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            Intensité
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${getSliderColor(intensity)}20`, color: getSliderColor(intensity) }}
            >
              {intensity}/5
            </span>
          </Label>
          <Slider
            min={0}
            max={5}
            step={1}
            value={[intensity]}
            onValueChange={([v]) => onIntensityChange(v)}
            className="[&_[role=slider]]:border-2"
            style={{
              // @ts-ignore
              "--slider-track": `${getSliderColor(intensity)}40`,
              "--slider-range": getSliderColor(intensity),
              "--slider-thumb-border": getSliderColor(intensity),
            } as React.CSSProperties}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Faible</span>
            <span>Max</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            Volume
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${getSliderColor(volume)}20`, color: getSliderColor(volume) }}
            >
              {volume}/5
            </span>
          </Label>
          <Slider
            min={0}
            max={5}
            step={1}
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            className="[&_[role=slider]]:border-2"
            style={{
              // @ts-ignore
              "--slider-track": `${getSliderColor(volume)}40`,
              "--slider-range": getSliderColor(volume),
              "--slider-thumb-border": getSliderColor(volume),
            } as React.CSSProperties}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Faible</span>
            <span>Max</span>
          </div>
        </div>
      </div>
    </>
  );
}
