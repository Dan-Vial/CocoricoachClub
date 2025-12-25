import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  optimalRange?: string;
  warningText?: string;
  className?: string;
}

export function MetricTooltip({
  children,
  title,
  description,
  optimalRange,
  warningText,
  className,
}: MetricTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
          {children}
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px] p-3 space-y-2">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {optimalRange && (
          <p className="text-xs text-status-optimal">
            <span className="font-medium">Zone optimale:</span> {optimalRange}
          </p>
        )}
        {warningText && (
          <p className="text-xs text-status-attention">
            <span className="font-medium">Attention:</span> {warningText}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Predefined tooltips for common metrics
export const METRIC_TOOLTIPS = {
  awcr: {
    title: "AWCR (Acute:Chronic Workload Ratio)",
    description: "Rapport entre la charge aiguë (7 jours) et la charge chronique (28 jours). Permet d'évaluer le risque de blessure lié à la surcharge.",
    optimalRange: "0.8 - 1.3",
    warningText: "> 1.5 = risque de blessure élevé | < 0.8 = désentraînement",
  },
  trainingLoad: {
    title: "Charge d'entraînement",
    description: "Calculée en multipliant la durée de la séance par le RPE (perception de l'effort). Unité arbitraire (UA).",
    optimalRange: "Variable selon le joueur",
  },
  wellness: {
    title: "Score Wellness",
    description: "Évaluation subjective du bien-être incluant sommeil, fatigue, stress, douleurs musculaires et humeur.",
    optimalRange: "1-2 (bon état)",
    warningText: "> 3 = surveillance recommandée",
  },
  rpe: {
    title: "RPE (Rate of Perceived Exertion)",
    description: "Échelle de perception de l'effort de 1 à 10. Permet d'évaluer l'intensité ressentie d'une séance.",
    optimalRange: "Variable selon l'objectif de la séance",
  },
  vma: {
    title: "VMA (Vitesse Maximale Aérobie)",
    description: "Vitesse de course à laquelle la consommation d'oxygène atteint son maximum. Indicateur clé de l'endurance.",
    optimalRange: "Dépend de la position et du niveau",
  },
  fitnessScore: {
    title: "Score de Forme Global",
    description: "Score composite calculé à partir de l'AWCR, du wellness et des performances aux tests. Échelle de 0 à 100.",
    optimalRange: "> 70",
    warningText: "< 50 = forme insuffisante",
  },
};
