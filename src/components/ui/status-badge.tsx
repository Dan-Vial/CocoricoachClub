import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: "optimal" | "attention" | "critical";
  children: React.ReactNode;
  animated?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  children,
  animated = false,
  showIcon = false,
  className,
}: StatusBadgeProps) {
  const statusStyles = {
    optimal: "bg-status-optimal/15 text-status-optimal border-status-optimal/30 dark:bg-status-optimal/20",
    attention: "bg-status-attention/15 text-status-attention border-status-attention/30 dark:bg-status-attention/20",
    critical: "bg-status-critical/15 text-status-critical border-status-critical/30 dark:bg-status-critical/20",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        statusStyles[status],
        animated && status === "critical" && "animate-pulse-alert",
        animated && status === "attention" && "animate-bounce-subtle",
        className
      )}
    >
      {showIcon && status === "critical" && (
        <AlertTriangle className="h-3 w-3 mr-1" />
      )}
      {children}
    </Badge>
  );
}

// AWCR specific badge
interface AwcrBadgeProps {
  value: number | null;
  animated?: boolean;
  className?: string;
}

export function AwcrBadge({ value, animated = true, className }: AwcrBadgeProps) {
  if (value === null) return null;

  let status: "optimal" | "attention" | "critical";
  let label: string;

  if (value >= 0.8 && value <= 1.3) {
    status = "optimal";
    label = "Optimal";
  } else if (value > 1.3 && value <= 1.5) {
    status = "attention";
    label = "Élevé";
  } else if (value < 0.8 && value >= 0.6) {
    status = "attention";
    label = "Faible";
  } else if (value > 1.5) {
    status = "critical";
    label = "Critique";
  } else {
    status = "critical";
    label = "Très faible";
  }

  return (
    <StatusBadge 
      status={status} 
      animated={animated && status !== "optimal"}
      showIcon={status === "critical"}
      className={className}
    >
      {value.toFixed(2)} - {label}
    </StatusBadge>
  );
}

// Wellness score badge
interface WellnessBadgeProps {
  score: number | null;
  animated?: boolean;
  className?: string;
}

export function WellnessBadge({ score, animated = false, className }: WellnessBadgeProps) {
  if (score === null) return null;

  let status: "optimal" | "attention" | "critical";

  // Lower is better for wellness (1-5 scale, 1 being best)
  if (score <= 2) {
    status = "optimal";
  } else if (score <= 3.5) {
    status = "attention";
  } else {
    status = "critical";
  }

  return (
    <StatusBadge 
      status={status} 
      animated={animated && status !== "optimal"}
      className={className}
    >
      {score.toFixed(1)}
    </StatusBadge>
  );
}

// Fitness score badge
interface FitnessScoreBadgeProps {
  score: number | null;
  animated?: boolean;
  className?: string;
}

export function FitnessScoreBadge({ score, animated = false, className }: FitnessScoreBadgeProps) {
  if (score === null) return null;

  let status: "optimal" | "attention" | "critical";

  if (score >= 70) {
    status = "optimal";
  } else if (score >= 50) {
    status = "attention";
  } else {
    status = "critical";
  }

  return (
    <StatusBadge 
      status={status} 
      animated={animated && status === "critical"}
      className={className}
    >
      {Math.round(score)}/100
    </StatusBadge>
  );
}
