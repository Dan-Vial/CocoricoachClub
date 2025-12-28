import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

interface RehabProgressBarProps {
  totalEvents: number;
  completedEvents: number;
  currentPhase?: number;
  totalPhases?: number;
}

export function RehabProgressBar({ 
  totalEvents, 
  completedEvents,
  currentPhase,
  totalPhases 
}: RehabProgressBarProps) {
  const progressPercent = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {progressPercent === 100 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600" />
          )}
          <span className="font-medium">
            {progressPercent === 100 
              ? "Protocole terminé" 
              : currentPhase && totalPhases 
                ? `Phase ${currentPhase}/${totalPhases}` 
                : "En cours"
            }
          </span>
        </div>
        <span className="text-muted-foreground">
          {completedEvents}/{totalEvents} étapes ({Math.round(progressPercent)}%)
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
}