// Weighted Wellness Score Calculation
// Fatigue and pain indicators are weighted more heavily as they are stronger predictors of injury risk

export interface WellnessEntry {
  sleep_quality: number;
  sleep_duration: number;
  general_fatigue: number;
  stress_level: number;
  soreness_upper_body: number;
  soreness_lower_body: number;
  has_specific_pain?: boolean;
  pain_location?: string | null;
}

// Weights for wellness components (total = 1.0)
const WELLNESS_WEIGHTS = {
  sleep_quality: 0.12,      // 12%
  sleep_duration: 0.12,     // 12%
  general_fatigue: 0.22,    // 22% - High weight: fatigue is key injury predictor
  stress_level: 0.14,       // 14%
  soreness_upper_body: 0.18, // 18% - Moderate weight: pain indicates risk
  soreness_lower_body: 0.22, // 22% - High weight: lower body injuries most common in rugby
};

/**
 * Calculate weighted wellness score (1-5 scale)
 * Lower score = better wellness
 * Higher score = more concerning
 */
export function calculateWeightedWellnessScore(entry: WellnessEntry): number {
  const weightedSum = 
    entry.sleep_quality * WELLNESS_WEIGHTS.sleep_quality +
    entry.sleep_duration * WELLNESS_WEIGHTS.sleep_duration +
    entry.general_fatigue * WELLNESS_WEIGHTS.general_fatigue +
    entry.stress_level * WELLNESS_WEIGHTS.stress_level +
    entry.soreness_upper_body * WELLNESS_WEIGHTS.soreness_upper_body +
    entry.soreness_lower_body * WELLNESS_WEIGHTS.soreness_lower_body;

  return Math.round(weightedSum * 100) / 100;
}

/**
 * Get risk level from weighted wellness score
 */
export function getWellnessRiskLevel(score: number, hasSpecificPain: boolean): "low" | "medium" | "high" | "critical" {
  if (hasSpecificPain && score >= 3.5) return "critical";
  if (hasSpecificPain || score >= 4) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/**
 * Detect wellness trend over multiple days
 * Returns: "improving" | "stable" | "declining" | "rapid_decline"
 */
export function detectWellnessTrend(entries: WellnessEntry[]): {
  trend: "improving" | "stable" | "declining" | "rapid_decline";
  change: number;
  daysAnalyzed: number;
} {
  if (entries.length < 3) {
    return { trend: "stable", change: 0, daysAnalyzed: entries.length };
  }

  // Take last 7 days max
  const recentEntries = entries.slice(0, Math.min(7, entries.length));
  
  // Calculate scores for each day (oldest to newest for trend analysis)
  const scores = recentEntries.map(calculateWeightedWellnessScore).reverse();
  
  if (scores.length < 2) {
    return { trend: "stable", change: 0, daysAnalyzed: scores.length };
  }

  // Calculate average change per day
  let totalChange = 0;
  for (let i = 1; i < scores.length; i++) {
    totalChange += scores[i] - scores[i - 1];
  }
  const avgChange = totalChange / (scores.length - 1);

  // Determine trend based on average daily change
  let trend: "improving" | "stable" | "declining" | "rapid_decline" = "stable";
  
  if (avgChange <= -0.3) {
    trend = "improving"; // Score decreasing = wellness improving
  } else if (avgChange >= 0.5) {
    trend = "rapid_decline"; // Score increasing rapidly = wellness declining fast
  } else if (avgChange >= 0.2) {
    trend = "declining"; // Score increasing = wellness declining
  }

  // Check for consistent decline over 3+ days
  const recentScores = scores.slice(-3);
  const isConsistentlyDeclining = recentScores.every((score, i) => 
    i === 0 || score >= recentScores[i - 1]
  );
  
  if (isConsistentlyDeclining && avgChange > 0.1) {
    trend = avgChange >= 0.3 ? "rapid_decline" : "declining";
  }

  return {
    trend,
    change: Math.round(avgChange * 100) / 100,
    daysAnalyzed: scores.length,
  };
}

/**
 * Generate smart alert based on wellness data and trends
 */
export function generateWellnessAlert(
  currentScore: number,
  hasSpecificPain: boolean,
  trend: "improving" | "stable" | "declining" | "rapid_decline",
  awcr: number | null
): {
  type: "info" | "warning" | "critical";
  message: string;
  recommendations: string[];
} | null {
  const recommendations: string[] = [];
  
  // Critical: specific pain + high score or rapid decline
  if (hasSpecificPain && (currentScore >= 3.5 || trend === "rapid_decline")) {
    recommendations.push("Consultation médicale recommandée");
    recommendations.push("Repos actif ou repos complet selon douleur");
    recommendations.push("Éviter les impacts et charges lourdes");
    
    return {
      type: "critical",
      message: "Risque blessure critique - Douleur signalée avec fatigue élevée",
      recommendations,
    };
  }

  // Warning: rapid decline detected
  if (trend === "rapid_decline") {
    recommendations.push("Réduire l'intensité des séances");
    recommendations.push("Privilégier la récupération (sommeil, nutrition)");
    recommendations.push("Surveiller l'évolution quotidienne");
    
    return {
      type: "warning",
      message: "Détérioration rapide du wellness détectée sur les derniers jours",
      recommendations,
    };
  }

  // Warning: high score + declining trend
  if (currentScore >= 3.5 && trend === "declining") {
    recommendations.push("Adapter la charge d'entraînement");
    recommendations.push("Augmenter le temps de récupération");
    
    return {
      type: "warning",
      message: "Wellness en baisse - Fatigue accumulée",
      recommendations,
    };
  }

  // Warning: AWCR + wellness combined risk
  if (awcr !== null && (awcr > 1.4 || awcr < 0.85) && currentScore >= 3) {
    recommendations.push("Charge aiguë élevée combinée à fatigue");
    recommendations.push("Risque de blessure augmenté - Adapter le programme");
    
    return {
      type: "warning",
      message: "Combinaison AWCR + Wellness à risque",
      recommendations,
    };
  }

  // Info: declining trend but still acceptable
  if (trend === "declining" && currentScore >= 2.5) {
    return {
      type: "info",
      message: "Tendance à surveiller - Wellness en légère baisse",
      recommendations: ["Continuer le suivi quotidien"],
    };
  }

  return null;
}

/**
 * Calculate EWMA (Exponential Weighted Moving Average) for AWCR
 * More recent sessions have higher weight
 */
export function calculateEWMA(values: number[], lambda: number = 0.1): number {
  if (values.length === 0) return 0;
  
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }
  
  return Math.round(ewma * 100) / 100;
}