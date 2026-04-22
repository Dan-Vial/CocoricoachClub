import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { computeDelta } from "@/lib/athletics/recordsHelpers";
import { getMinimaLevel } from "@/lib/athletics/minimaLevels";

interface DeltaItem {
  /** Reference label (PB, SB, or minima level label) */
  label: string;
  /** Reference value to compare against */
  reference: number;
  /** Unit string (e.g. "m", "sec", "pts") */
  unit: string;
  /** Optional minima level key (for color badging) */
  level?: string;
}

interface Props {
  /** Actual performance value */
  actual: number | null | undefined;
  /** Whether lower values are better (time events) */
  lowerIsBetter: boolean;
  /** References to compare against (PB, SB, minimas) */
  references: DeltaItem[];
  /** Compact horizontal layout */
  compact?: boolean;
}

/**
 * Renders a row of deltas for an athletics performance versus
 * personal records and federation minimas, with color-coded indicators.
 */
export function AthleticsDeltaBadge({ actual, lowerIsBetter, references, compact = false }: Props) {
  if (actual == null || references.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-1", compact ? "justify-center" : "")}>
        {references.map((ref, idx) => {
          const delta = computeDelta(actual, ref.reference, lowerIsBetter, ref.unit);
          if (!delta) return null;

          const lvl = ref.level ? getMinimaLevel(ref.level) : null;
          const Icon = delta.isBetter
            ? TrendingUp
            : Math.abs(delta.delta) < 0.01
              ? Minus
              : TrendingDown;

          return (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 font-mono text-[10px] px-1.5 py-0.5 border-transparent",
                    delta.isBetter
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="font-semibold normal-case">{ref.label}</span>
                  <span>{delta.display}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">
                    {lvl?.label || ref.label} : {ref.reference} {ref.unit}
                  </div>
                  <div>Performance : {actual} {ref.unit}</div>
                  <div className={delta.isBetter ? "text-emerald-600" : "text-destructive"}>
                    {delta.isBetter
                      ? `✅ Référence battue de ${Math.abs(delta.delta).toFixed(2)} ${ref.unit}`
                      : `Manque ${Math.abs(delta.delta).toFixed(2)} ${ref.unit}`}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
