import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTrainingTypesForSport,
  getTrainingTypesGrouped,
  hasGroupedTrainingTypes,
  type TrainingTypeOption,
} from "@/lib/constants/trainingTypes";

interface GroupedTrainingTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  sportType?: string;
  required?: boolean;
  placeholder?: string;
}

export function GroupedTrainingTypeSelect({
  value,
  onValueChange,
  sportType,
  required = false,
  placeholder = "Sélectionner un type",
}: GroupedTrainingTypeSelectProps) {
  const hasGroups = hasGroupedTrainingTypes(sportType);
  const groups = getTrainingTypesGrouped(sportType);
  const flatTypes = getTrainingTypesForSport(sportType);

  if (hasGroups && groups.length > 0) {
    // Render grouped select for athletics
    return (
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {groups.map((group) => (
            <SelectGroup key={group.category.key}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 py-2">
                {group.category.label}
              </SelectLabel>
              {group.types.map((t) => (
                <SelectItem key={t.value} value={t.value} className="pl-6">
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Render flat select for other sports
  return (
    <Select value={value} onValueChange={onValueChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {flatTypes.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
