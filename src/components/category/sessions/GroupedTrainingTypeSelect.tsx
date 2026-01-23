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
import { Plus, Dumbbell } from "lucide-react";

interface GroupedTrainingTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  sportType?: string;
  required?: boolean;
  placeholder?: string;
  showCustomOption?: boolean;
  showExerciseIcon?: boolean;
}

export function GroupedTrainingTypeSelect({
  value,
  onValueChange,
  sportType,
  required = false,
  placeholder = "Sélectionner un type",
  showCustomOption = false,
  showExerciseIcon = false,
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
        <SelectContent className="max-h-[400px] bg-popover z-50">
          {groups.map((group) => (
            <SelectGroup key={group.category.key}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted py-2 px-2 sticky -top-1 z-10">
                {group.category.label}
              </SelectLabel>
              {group.types.map((t) => (
                <SelectItem key={t.value} value={t.value} className="pl-6">
                  <span className="flex items-center gap-2">
                    {t.label}
                    {showExerciseIcon && t.hasExercises && (
                      <Dumbbell className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          {showCustomOption && (
            <SelectItem value="_custom">
              <span className="flex items-center gap-2 text-primary">
                <Plus className="h-3 w-3" />
                Autre (personnalisé)
              </span>
            </SelectItem>
          )}
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
      <SelectContent className="bg-popover z-50">
        {flatTypes.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            <span className="flex items-center gap-2">
              {t.label}
              {showExerciseIcon && t.hasExercises && (
                <Dumbbell className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </SelectItem>
        ))}
        {showCustomOption && (
          <SelectItem value="_custom">
            <span className="flex items-center gap-2 text-primary">
              <Plus className="h-3 w-3" />
              Autre (personnalisé)
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
