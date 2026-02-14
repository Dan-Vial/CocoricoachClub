import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { TRAINING_STYLES } from "@/lib/constants/trainingStyles";
import { cn } from "@/lib/utils";

interface TrainingMethodSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  showColorDot?: boolean;
}

export function TrainingMethodSelect({
  value,
  onValueChange,
  className,
  triggerClassName,
  showColorDot = false,
}: TrainingMethodSelectProps) {
  const selectedStyle = TRAINING_STYLES.find(s => s.value === value);
  
  return (
    <div className="flex items-center gap-1 w-full">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("h-8 text-xs flex-1", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cn("max-h-80", className)}>
          {TRAINING_STYLES.map((style) => (
            <SelectItem key={style.value} value={style.value}>
              <div className="flex items-center gap-2">
                {showColorDot && style.color && (
                  <div className={cn("w-2 h-2 rounded-full", style.color)} />
                )}
                <span>{style.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedStyle?.description && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="shrink-0 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="max-w-xs text-xs z-[9999]"
              align="center"
            >
              <p className="font-medium mb-1">{selectedStyle.label}</p>
              <p className="text-muted-foreground">{selectedStyle.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
