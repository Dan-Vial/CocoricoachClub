import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  current: number;
  previous: number | null;
  higherIsBetter?: boolean;
  className?: string;
  showPercentage?: boolean;
}

export function TrendIndicator({
  current,
  previous,
  higherIsBetter = true,
  className,
  showPercentage = false,
}: TrendIndicatorProps) {
  if (previous === null || previous === 0) {
    return <Minus className={cn("h-4 w-4 text-muted-foreground", className)} />;
  }

  const diff = current - previous;
  const percentChange = ((diff / previous) * 100).toFixed(1);
  const isPositive = diff > 0;
  const isNeutral = Math.abs(diff) < 0.01;
  
  // Determine if the change is good or bad based on context
  const isGood = higherIsBetter ? isPositive : !isPositive;

  if (isNeutral) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-muted-foreground", className)}>
        <Minus className="h-4 w-4" />
        {showPercentage && <span className="text-xs">0%</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        isGood ? "text-status-optimal" : "text-status-critical",
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      {showPercentage && (
        <span className="text-xs font-medium">
          {isPositive ? "+" : ""}{percentChange}%
        </span>
      )}
    </span>
  );
}

// Simple arrow indicator
interface SimpleArrowProps {
  direction: "up" | "down" | "stable";
  good?: boolean;
  className?: string;
}

export function SimpleArrow({ direction, good, className }: SimpleArrowProps) {
  const colorClass = good === undefined 
    ? "text-muted-foreground"
    : good 
      ? "text-status-optimal" 
      : "text-status-critical";

  switch (direction) {
    case "up":
      return <span className={cn("font-bold", colorClass, className)}>↑</span>;
    case "down":
      return <span className={cn("font-bold", colorClass, className)}>↓</span>;
    default:
      return <span className={cn("font-bold text-muted-foreground", className)}>→</span>;
  }
}
