/**
 * Calculate a global fitness score (0-100) combining multiple metrics
 */

interface FitnessScoreInput {
  awcr: number | null;
  wellnessAvg: number | null; // 1-5 scale, lower is better
  recentTestPerformance: number | null; // 0-100 percentile
  injuryStatus: "none" | "recovering" | "active";
  trainingLoadTrend: "stable" | "increasing" | "decreasing" | "unknown";
}

interface FitnessScoreResult {
  score: number;
  breakdown: {
    awcrScore: number;
    wellnessScore: number;
    performanceScore: number;
    injuryScore: number;
  };
  status: "optimal" | "attention" | "critical";
  recommendations: string[];
}

export function calculateFitnessScore(input: FitnessScoreInput): FitnessScoreResult {
  const breakdown = {
    awcrScore: 0,
    wellnessScore: 0,
    performanceScore: 0,
    injuryScore: 0,
  };
  const recommendations: string[] = [];

  // AWCR Score (30% of total)
  if (input.awcr !== null) {
    if (input.awcr >= 0.8 && input.awcr <= 1.3) {
      breakdown.awcrScore = 30;
    } else if (input.awcr > 1.3 && input.awcr <= 1.5) {
      breakdown.awcrScore = 20;
      recommendations.push("Réduire légèrement la charge d'entraînement");
    } else if (input.awcr < 0.8 && input.awcr >= 0.6) {
      breakdown.awcrScore = 15;
      recommendations.push("Augmenter progressivement la charge d'entraînement");
    } else if (input.awcr > 1.5) {
      breakdown.awcrScore = 5;
      recommendations.push("URGENT: Réduire significativement la charge");
    } else {
      breakdown.awcrScore = 5;
      recommendations.push("URGENT: Reprendre l'entraînement progressivement");
    }
  } else {
    breakdown.awcrScore = 15; // Default if no data
  }

  // Wellness Score (25% of total)
  if (input.wellnessAvg !== null) {
    // Convert 1-5 scale (lower better) to 0-25 score
    if (input.wellnessAvg <= 1.5) {
      breakdown.wellnessScore = 25;
    } else if (input.wellnessAvg <= 2.5) {
      breakdown.wellnessScore = 20;
    } else if (input.wellnessAvg <= 3.5) {
      breakdown.wellnessScore = 12;
      recommendations.push("Surveiller la récupération et le sommeil");
    } else {
      breakdown.wellnessScore = 5;
      recommendations.push("Prioriser la récupération");
    }
  } else {
    breakdown.wellnessScore = 12; // Default if no data
  }

  // Performance Score (25% of total)
  if (input.recentTestPerformance !== null) {
    breakdown.performanceScore = Math.round((input.recentTestPerformance / 100) * 25);
  } else {
    breakdown.performanceScore = 12; // Default if no data
  }

  // Injury Score (20% of total)
  switch (input.injuryStatus) {
    case "none":
      breakdown.injuryScore = 20;
      break;
    case "recovering":
      breakdown.injuryScore = 10;
      recommendations.push("Respecter le protocole de retour au jeu");
      break;
    case "active":
      breakdown.injuryScore = 0;
      recommendations.push("Priorité à la guérison de la blessure");
      break;
  }

  const totalScore = 
    breakdown.awcrScore + 
    breakdown.wellnessScore + 
    breakdown.performanceScore + 
    breakdown.injuryScore;

  let status: "optimal" | "attention" | "critical";
  if (totalScore >= 70) {
    status = "optimal";
  } else if (totalScore >= 50) {
    status = "attention";
  } else {
    status = "critical";
  }

  return {
    score: totalScore,
    breakdown,
    status,
    recommendations,
  };
}

/**
 * Get color class based on score
 */
export function getScoreColorClass(score: number): string {
  if (score >= 70) return "text-status-optimal";
  if (score >= 50) return "text-status-attention";
  return "text-status-critical";
}

/**
 * Get background color class based on score
 */
export function getScoreBgClass(score: number): string {
  if (score >= 70) return "bg-status-optimal/10";
  if (score >= 50) return "bg-status-attention/10";
  return "bg-status-critical/10";
}
