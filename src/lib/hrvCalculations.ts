/**
 * HRV (Heart Rate Variability) Calculations Module
 * Implements CV%, HRV Score normalisé, and ACWR+HRV correlation
 */

export interface HrvDailyData {
  date: string;
  hrvMs: number | null;
  restingHrBpm: number | null;
  avgHrBpm: number | null;
  maxHrBpm: number | null;
  playerId: string;
  recordType: string;
}

export interface HrvAnalysis {
  date: string;
  hrvMs: number | null;
  restingHrBpm: number | null;
  // CV% (7-day)
  cvPercent: number | null;
  cvStatus: "stable" | "adapting" | "unstable" | null;
  // HRV Score normalisé (vs baseline)
  hrvScore: number | null;
  hrvScoreStatus: "optimal" | "normal" | "under_recovery" | "overtraining" | null;
  // Baseline info
  baselineMean: number | null;
  baselineStd: number | null;
  baselineDays: number;
}

export interface AcwrHrvCorrelation {
  date: string;
  acwr: number | null;
  hrvTrend: "improving" | "stable" | "declining" | null;
  riskLevel: "low" | "moderate" | "high" | "very_high";
  recommendation: string;
  color: string;
}

/**
 * Calculate CV% (Coefficient of Variation) over a 7-day rolling window
 * CV% = (std / mean) × 100
 */
function calculateCV(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return null;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  return (std / mean) * 100;
}

/**
 * Get CV% status interpretation
 */
function getCvStatus(cv: number): "stable" | "adapting" | "unstable" {
  if (cv < 5) return "stable";
  if (cv <= 8) return "adapting";
  return "unstable";
}

/**
 * Get HRV Score status interpretation
 */
function getHrvScoreStatus(score: number): "optimal" | "normal" | "under_recovery" | "overtraining" {
  if (score > 1) return "optimal";
  if (score >= -1) return "normal";
  if (score >= -2) return "under_recovery";
  return "overtraining";
}

/**
 * Calculate full HRV analysis series for a player
 * Uses progressive baseline (starts from 7 days, improves over time up to 60 days)
 */
export function calculateHrvAnalysis(
  hrvData: HrvDailyData[],
  baselineDays: number = 60
): HrvAnalysis[] {
  // Filter to morning records with valid HRV for baseline, but keep all for display
  const sorted = [...hrvData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const morningHrvValues: { date: string; hrv: number }[] = [];
  const results: HrvAnalysis[] = [];

  sorted.forEach((day) => {
    if (day.hrvMs != null && day.recordType === "morning") {
      morningHrvValues.push({ date: day.date, hrv: day.hrvMs });
    }

    // Calculate 7-day CV%
    const recent7 = morningHrvValues
      .slice(-7)
      .map((v) => v.hrv);
    const cv = calculateCV(recent7);
    const cvStatus = cv != null ? getCvStatus(cv) : null;

    // Calculate baseline (up to baselineDays, min 7 days for progressive)
    const allHrvValues = morningHrvValues.map((v) => v.hrv);
    const baselineWindow = allHrvValues.slice(-baselineDays);
    const usableDays = baselineWindow.length;

    let hrvScore: number | null = null;
    let hrvScoreStatus: HrvAnalysis["hrvScoreStatus"] = null;
    let baselineMean: number | null = null;
    let baselineStd: number | null = null;

    if (usableDays >= 7 && day.hrvMs != null) {
      baselineMean =
        baselineWindow.reduce((a, b) => a + b, 0) / baselineWindow.length;
      const variance =
        baselineWindow.reduce(
          (sum, v) => sum + Math.pow(v - baselineMean!, 2),
          0
        ) / baselineWindow.length;
      baselineStd = Math.sqrt(variance);

      if (baselineStd > 0) {
        hrvScore =
          Math.round(((day.hrvMs - baselineMean) / baselineStd) * 100) / 100;
        hrvScoreStatus = getHrvScoreStatus(hrvScore);
      }
    }

    results.push({
      date: day.date,
      hrvMs: day.hrvMs,
      restingHrBpm: day.restingHrBpm,
      cvPercent: cv != null ? Math.round(cv * 100) / 100 : null,
      cvStatus,
      hrvScore,
      hrvScoreStatus,
      baselineMean:
        baselineMean != null ? Math.round(baselineMean * 10) / 10 : null,
      baselineStd:
        baselineStd != null ? Math.round(baselineStd * 10) / 10 : null,
      baselineDays: usableDays,
    });
  });

  return results;
}

/**
 * Correlate ACWR/EWMA ratios with HRV trends
 * Returns risk matrix interpretation
 */
export function correlateAcwrHrv(
  loadRatios: { date: string; ratio: number }[],
  hrvAnalysis: HrvAnalysis[]
): AcwrHrvCorrelation[] {
  const hrvByDate = new Map(hrvAnalysis.map((h) => [h.date, h]));

  return loadRatios.map((load) => {
    const hrv = hrvByDate.get(load.date);
    const acwr = load.ratio;

    // Determine HRV trend from score
    let hrvTrend: AcwrHrvCorrelation["hrvTrend"] = null;
    if (hrv?.hrvScore != null) {
      if (hrv.hrvScore > 0.5) hrvTrend = "improving";
      else if (hrv.hrvScore >= -0.5) hrvTrend = "stable";
      else hrvTrend = "declining";
    }

    // Risk matrix: ACWR zone × HRV trend
    const { riskLevel, recommendation, color } = getAcwrHrvRisk(
      acwr,
      hrvTrend
    );

    return {
      date: load.date,
      acwr,
      hrvTrend,
      riskLevel,
      recommendation,
      color,
    };
  });
}

function getAcwrHrvRisk(
  acwr: number,
  hrvTrend: AcwrHrvCorrelation["hrvTrend"]
): { riskLevel: AcwrHrvCorrelation["riskLevel"]; recommendation: string; color: string } {
  // High ACWR (>1.3) + declining HRV = very high risk
  if (acwr > 1.3 && hrvTrend === "declining") {
    return {
      riskLevel: "very_high",
      recommendation:
        "🚨 Surcharge + sous-récupération. Repos ou séance très légère obligatoire.",
      color: "text-red-600",
    };
  }
  // High ACWR + stable/no HRV
  if (acwr > 1.3 && (hrvTrend === "stable" || hrvTrend === null)) {
    return {
      riskLevel: "high",
      recommendation:
        "⚠️ Charge élevée. Surveiller la récupération de près.",
      color: "text-orange-500",
    };
  }
  // High ACWR + improving HRV = moderate (body handles it)
  if (acwr > 1.3 && hrvTrend === "improving") {
    return {
      riskLevel: "moderate",
      recommendation:
        "📊 Charge élevée mais bonne tolérance. Continuer avec vigilance.",
      color: "text-yellow-500",
    };
  }
  // Optimal ACWR + declining HRV = moderate
  if (acwr >= 0.85 && acwr <= 1.3 && hrvTrend === "declining") {
    return {
      riskLevel: "moderate",
      recommendation:
        "⚠️ Charge OK mais récupération insuffisante. Privilégier le sommeil.",
      color: "text-yellow-500",
    };
  }
  // Optimal ACWR + stable/improving HRV = low risk
  if (acwr >= 0.85 && acwr <= 1.3) {
    return {
      riskLevel: "low",
      recommendation: "✅ Charge et récupération optimales. Continuer ainsi.",
      color: "text-green-500",
    };
  }
  // Low ACWR (<0.85) + any HRV
  if (acwr < 0.85 && hrvTrend === "improving") {
    return {
      riskLevel: "low",
      recommendation:
        "💤 Sous-charge mais bonne récupération. Augmenter progressivement.",
      color: "text-blue-500",
    };
  }
  if (acwr < 0.85 && hrvTrend === "declining") {
    return {
      riskLevel: "moderate",
      recommendation:
        "⚠️ Sous-charge ET sous-récupération. Investiguer (stress, sommeil, maladie).",
      color: "text-orange-500",
    };
  }

  return {
    riskLevel: "low",
    recommendation: "✅ Situation stable.",
    color: "text-green-500",
  };
}

/**
 * Get color classes for CV% status
 */
export function getCvStatusColor(status: HrvAnalysis["cvStatus"]): string {
  switch (status) {
    case "stable": return "text-green-500";
    case "adapting": return "text-yellow-500";
    case "unstable": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

/**
 * Get color classes for HRV Score status
 */
export function getHrvScoreColor(status: HrvAnalysis["hrvScoreStatus"]): string {
  switch (status) {
    case "optimal": return "text-green-500";
    case "normal": return "text-primary";
    case "under_recovery": return "text-orange-500";
    case "overtraining": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

/**
 * Get label for CV status
 */
export function getCvStatusLabel(status: HrvAnalysis["cvStatus"]): string {
  switch (status) {
    case "stable": return "Stable";
    case "adapting": return "Adaptation";
    case "unstable": return "Instable";
    default: return "—";
  }
}

/**
 * Get label for HRV Score status
 */
export function getHrvScoreLabel(status: HrvAnalysis["hrvScoreStatus"]): string {
  switch (status) {
    case "optimal": return "Récupération optimale";
    case "normal": return "Zone normale";
    case "under_recovery": return "Sous-récupération";
    case "overtraining": return "Surmenage";
    default: return "—";
  }
}

/**
 * Get risk level color
 */
export function getCorrelationRiskColor(riskLevel: AcwrHrvCorrelation["riskLevel"]): string {
  switch (riskLevel) {
    case "low": return "bg-green-500/10 border-green-500/20";
    case "moderate": return "bg-yellow-500/10 border-yellow-500/20";
    case "high": return "bg-orange-500/10 border-orange-500/20";
    case "very_high": return "bg-red-500/10 border-red-500/20";
  }
}

export function getCorrelationRiskLabel(riskLevel: AcwrHrvCorrelation["riskLevel"]): string {
  switch (riskLevel) {
    case "low": return "Risque faible";
    case "moderate": return "Risque modéré";
    case "high": return "Risque élevé";
    case "very_high": return "Risque très élevé";
  }
}
