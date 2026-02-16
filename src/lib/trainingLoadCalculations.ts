/**
 * Training Load Calculations Module
 * Implements EWMA (Exponential Weighted Moving Average) and AWCR calculations
 * for comprehensive training load monitoring
 */

export type MetricType = 
  | "ewma_srpe" 
  | "ewma_hsr" 
  | "ewma_acc_dec" 
  | "ewma_player_load"
  | "awcr_srpe" 
  | "awcr_hsr" 
  | "awcr_acc_dec"
  | "awcr_player_load";

export interface DailyLoadData {
  date: string;
  rpe: number;
  duration: number;
  sRPE: number;
  // GPS metrics
  totalDistance?: number;
  relativeDistance?: number;
  hsr?: number;
  sprintCount?: number;
  maxSpeed?: number;
  accelerations?: number;
  decelerations?: number;
  playerLoad?: number;
}

export interface EWMAResult {
  acute: number;
  chronic: number;
  ratio: number;
  rawValue: number;
  date: string;
  riskLevel: "optimal" | "warning" | "danger";
}

export interface LoadSummary {
  currentLoad: number;
  ewmaAcute: number;
  ewmaChronic: number;
  ewmaRatio: number;
  weeklyChange: number;
  riskLevel: "optimal" | "warning" | "danger";
  trend: "increasing" | "stable" | "decreasing";
}

// EWMA decay constants
const LAMBDA_ACUTE = 2 / (7 + 1);    // ~0.25 for 7-day equivalent
const LAMBDA_CHRONIC = 2 / (28 + 1); // ~0.069 for 28-day equivalent

/**
 * Calculate EWMA for a series of values
 * More recent values have higher weight
 */
export function calculateEWMAValue(values: number[], lambda: number): number {
  if (values.length === 0) return 0;
  
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }
  
  return Math.round(ewma * 100) / 100;
}

/**
 * Calculate EWMA Acute (7-day equivalent) and Chronic (28-day equivalent)
 * with ratio for a complete time series
 */
export function calculateEWMASeries(dailyData: DailyLoadData[], metricKey: keyof DailyLoadData): EWMAResult[] {
  if (dailyData.length === 0) return [];

  const results: EWMAResult[] = [];
  let ewmaAcute = 0;
  let ewmaChronic = 0;

  // Sort by date ascending for proper calculation
  const sortedData = [...dailyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedData.forEach((day, index) => {
    const value = (day[metricKey] as number) || 0;
    
    if (index === 0) {
      ewmaAcute = value;
      ewmaChronic = value;
    } else {
      ewmaAcute = LAMBDA_ACUTE * value + (1 - LAMBDA_ACUTE) * ewmaAcute;
      ewmaChronic = LAMBDA_CHRONIC * value + (1 - LAMBDA_CHRONIC) * ewmaChronic;
    }

    const ratio = ewmaChronic > 0 ? ewmaAcute / ewmaChronic : 0;
    const riskLevel = getRiskLevel(ratio);

    results.push({
      date: day.date,
      rawValue: value,
      acute: Math.round(ewmaAcute * 100) / 100,
      chronic: Math.round(ewmaChronic * 100) / 100,
      ratio: Math.round(ratio * 100) / 100,
      riskLevel,
    });
  });

  return results;
}

/**
 * Calculate simple moving average (AWCR style)
 * Acute = 7-day average, Chronic = 28-day average
 */
export function calculateAWCR(dailyData: DailyLoadData[], metricKey: keyof DailyLoadData): EWMAResult[] {
  if (dailyData.length === 0) return [];

  const results: EWMAResult[] = [];
  
  // Sort by date ascending
  const sortedData = [...dailyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedData.forEach((day, index) => {
    const value = (day[metricKey] as number) || 0;
    
    // Calculate 7-day acute (simple average)
    const acuteWindow = sortedData.slice(Math.max(0, index - 6), index + 1);
    const acute = acuteWindow.reduce((sum, d) => sum + ((d[metricKey] as number) || 0), 0) / acuteWindow.length;
    
    // Calculate 28-day chronic (simple average)
    const chronicWindow = sortedData.slice(Math.max(0, index - 27), index + 1);
    const chronic = chronicWindow.reduce((sum, d) => sum + ((d[metricKey] as number) || 0), 0) / chronicWindow.length;

    const ratio = chronic > 0 ? acute / chronic : 0;
    const riskLevel = getRiskLevel(ratio);

    results.push({
      date: day.date,
      rawValue: value,
      acute: Math.round(acute * 100) / 100,
      chronic: Math.round(chronic * 100) / 100,
      ratio: Math.round(ratio * 100) / 100,
      riskLevel,
    });
  });

  return results;
}

/**
 * Get risk level based on ratio value
 */
export function getRiskLevel(ratio: number): "optimal" | "warning" | "danger" {
  if (ratio < 0.8 || ratio > 1.5) return "danger";
  if (ratio < 0.85 || ratio > 1.3) return "warning";
  return "optimal";
}

/**
 * Get color based on risk level
 */
export function getRiskColor(riskLevel: "optimal" | "warning" | "danger"): string {
  switch (riskLevel) {
    case "optimal": return "text-green-500";
    case "warning": return "text-yellow-500";
    case "danger": return "text-red-500";
  }
}

/**
 * Get background color for zones
 */
export function getZoneColor(riskLevel: "optimal" | "warning" | "danger"): string {
  switch (riskLevel) {
    case "optimal": return "hsl(142, 76%, 36%)"; // green
    case "warning": return "hsl(45, 93%, 47%)"; // yellow
    case "danger": return "hsl(0, 84%, 60%)"; // red
  }
}

/**
 * Calculate load summary for an athlete
 */
export function calculateLoadSummary(
  dailyData: DailyLoadData[], 
  metricKey: keyof DailyLoadData = "sRPE"
): LoadSummary | null {
  if (dailyData.length === 0) return null;

  const ewmaResults = calculateEWMASeries(dailyData, metricKey);
  if (ewmaResults.length === 0) return null;

  const latest = ewmaResults[ewmaResults.length - 1];
  const currentLoad = latest.rawValue;
  
  // Calculate weekly change
  const oneWeekAgo = ewmaResults.length >= 7 ? ewmaResults[ewmaResults.length - 7] : ewmaResults[0];
  const weeklyChange = oneWeekAgo.acute > 0 
    ? ((latest.acute - oneWeekAgo.acute) / oneWeekAgo.acute) * 100 
    : 0;

  // Determine trend
  let trend: "increasing" | "stable" | "decreasing" = "stable";
  if (weeklyChange > 10) trend = "increasing";
  else if (weeklyChange < -10) trend = "decreasing";

  return {
    currentLoad,
    ewmaAcute: latest.acute,
    ewmaChronic: latest.chronic,
    ewmaRatio: latest.ratio,
    weeklyChange: Math.round(weeklyChange * 10) / 10,
    riskLevel: latest.riskLevel,
    trend,
  };
}

/**
 * Available metrics configuration
 */
export const METRICS_CONFIG: Record<MetricType, {
  label: string;
  shortLabel: string;
  description: string;
  dataKey: keyof DailyLoadData;
  isGps: boolean;
  unit: string;
}> = {
  ewma_srpe: {
    label: "EWMA sRPE (Charge interne)",
    shortLabel: "sRPE",
    description: "Moyenne pondérée de la charge subjective (RPE × Durée). Accorde plus de poids aux séances récentes. Ratio optimal entre 0.85 et 1.30.",
    dataKey: "sRPE",
    isGps: false,
    unit: "UA",
  },
  ewma_hsr: {
    label: "EWMA HSR (High Speed Running)",
    shortLabel: "HSR",
    description: "Distance parcourue à haute vitesse (>19.8 km/h) mesurée par GPS. Indicateur clé de la charge neuromusculaire et du risque de blessure.",
    dataKey: "hsr",
    isGps: true,
    unit: "m",
  },
  ewma_acc_dec: {
    label: "EWMA Acc/Déc (Charge mécanique)",
    shortLabel: "Acc/Déc",
    description: "Somme des accélérations et décélérations haute intensité (>3 m/s²). Représente la charge mécanique sur les articulations.",
    dataKey: "accelerations",
    isGps: true,
    unit: "",
  },
  ewma_player_load: {
    label: "EWMA Player Load GPS",
    shortLabel: "Player Load",
    description: "Charge externe totale combinant accélérations 3D (Catapult/STATSports). Plus sensible que la distance seule aux mouvements non-locomoteurs.",
    dataKey: "playerLoad",
    isGps: true,
    unit: "UA",
  },
  awcr_srpe: {
    label: "AWCR sRPE (Traditionnel)",
    shortLabel: "AWCR sRPE",
    description: "Ratio traditionnel entre la charge des 7 derniers jours et celle des 28 derniers jours. Méthode de Gabbett, mêmes zones de risque que l'EWMA.",
    dataKey: "sRPE",
    isGps: false,
    unit: "UA",
  },
  awcr_hsr: {
    label: "AWCR HSR",
    shortLabel: "AWCR HSR",
    description: "Ratio aiguë/chronique basé sur la distance à haute vitesse GPS. Permet de monitorer les efforts de sprint dans le temps.",
    dataKey: "hsr",
    isGps: true,
    unit: "m",
  },
  awcr_acc_dec: {
    label: "AWCR Acc/Déc",
    shortLabel: "AWCR Acc/Déc",
    description: "Ratio aiguë/chronique basé sur les accélérations GPS. Important pour la planification de retour de blessure.",
    dataKey: "accelerations",
    isGps: true,
    unit: "",
  },
  awcr_player_load: {
    label: "AWCR Player Load",
    shortLabel: "AWCR PL",
    description: "Ratio aiguë/chronique basé sur le Player Load GPS. Vue globale de la charge externe avec méthode traditionnelle.",
    dataKey: "playerLoad",
    isGps: true,
    unit: "UA",
  },
};

/**
 * Get available metrics based on sport type
 */
export function getAvailableMetrics(sportType: string, hasGpsData: boolean): MetricType[] {
  const baseMetrics: MetricType[] = ["ewma_srpe", "awcr_srpe"];
  
  // GPS metrics only for Football and Rugby
  const gpsEnabledSports = ["XV", "7s", "XIII", "Football", "rugby"];
  const isGpsSport = gpsEnabledSports.some(s => 
    sportType.toLowerCase().includes(s.toLowerCase())
  );

  if (isGpsSport && hasGpsData) {
    return [
      ...baseMetrics,
      "ewma_hsr",
      "ewma_acc_dec",
      "ewma_player_load",
      "awcr_hsr",
      "awcr_acc_dec",
      "awcr_player_load",
    ];
  }

  return baseMetrics;
}

/**
 * Transform raw data from database to DailyLoadData format
 */
export function transformToDailyLoadData(
  awcrData: any[],
  gpsData: any[]
): DailyLoadData[] {
  // Group by date, averaging across players for team view
  const dataByDate = new Map<string, { totals: DailyLoadData; playerCount: number }>();

  // Process AWCR data - track unique players per date for averaging
  const playersByDate = new Map<string, Set<string>>();

  awcrData.forEach(entry => {
    const date = entry.session_date;
    if (!playersByDate.has(date)) playersByDate.set(date, new Set());
    playersByDate.get(date)!.add(entry.player_id);

    const existing = dataByDate.get(date) || {
      totals: { date, rpe: 0, duration: 0, sRPE: 0 } as DailyLoadData,
      playerCount: 0,
    };

    existing.totals.rpe += entry.rpe || 0;
    existing.totals.duration += entry.duration_minutes || 0;
    existing.totals.sRPE += entry.training_load || (entry.rpe * entry.duration_minutes) || 0;
    existing.playerCount = playersByDate.get(date)!.size;

    dataByDate.set(date, existing);
  });

  // Process GPS data
  gpsData.forEach(entry => {
    const date = entry.session_date;
    if (!playersByDate.has(date)) playersByDate.set(date, new Set());
    playersByDate.get(date)!.add(entry.player_id);

    const existing = dataByDate.get(date) || {
      totals: { date, rpe: 0, duration: 0, sRPE: 0 } as DailyLoadData,
      playerCount: 0,
    };

    existing.totals.totalDistance = (existing.totals.totalDistance || 0) + (entry.total_distance_m || 0);
    existing.totals.hsr = (existing.totals.hsr || 0) + (entry.high_speed_distance_m || 0);
    existing.totals.sprintCount = (existing.totals.sprintCount || 0) + (entry.sprint_count || 0);
    existing.totals.maxSpeed = Math.max(existing.totals.maxSpeed || 0, entry.max_speed_ms || 0);
    existing.totals.accelerations = (existing.totals.accelerations || 0) + (entry.accelerations || 0) + (entry.decelerations || 0);
    existing.totals.decelerations = (existing.totals.decelerations || 0) + (entry.decelerations || 0);
    existing.totals.playerLoad = (existing.totals.playerLoad || 0) + (entry.player_load || 0);
    existing.playerCount = playersByDate.get(date)!.size;

    dataByDate.set(date, existing);
  });

  // Average values by number of unique players per date
  return Array.from(dataByDate.values()).map(({ totals, playerCount }) => {
    const n = Math.max(playerCount, 1);
    return {
      date: totals.date,
      rpe: Math.round((totals.rpe / n) * 100) / 100,
      duration: Math.round((totals.duration / n) * 100) / 100,
      sRPE: Math.round((totals.sRPE / n) * 100) / 100,
      totalDistance: totals.totalDistance ? Math.round((totals.totalDistance / n) * 100) / 100 : undefined,
      hsr: totals.hsr ? Math.round((totals.hsr / n) * 100) / 100 : undefined,
      sprintCount: totals.sprintCount ? Math.round((totals.sprintCount / n) * 100) / 100 : undefined,
      maxSpeed: totals.maxSpeed,
      accelerations: totals.accelerations ? Math.round((totals.accelerations / n) * 100) / 100 : undefined,
      decelerations: totals.decelerations ? Math.round((totals.decelerations / n) * 100) / 100 : undefined,
      playerLoad: totals.playerLoad ? Math.round((totals.playerLoad / n) * 100) / 100 : undefined,
      relativeDistance: totals.totalDistance && totals.duration 
        ? Math.round((totals.totalDistance / n) / (totals.duration / n) * 100) / 100
        : undefined,
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Default thresholds for alerts
 */
export const DEFAULT_THRESHOLDS = {
  ratioOptimalMin: 0.85,
  ratioOptimalMax: 1.3,
  ratioWarningMin: 0.8,
  ratioWarningMax: 1.5,
  weeklyChangeThreshold: 15, // % change triggering alert
};

/**
 * Generate load recommendation based on current status
 */
export function generateLoadRecommendation(summary: LoadSummary): {
  recommendation: string;
  action: string;
  intensity: "reduce" | "maintain" | "increase";
} {
  const { ewmaRatio, trend, riskLevel } = summary;

  if (riskLevel === "danger") {
    if (ewmaRatio > 1.5) {
      return {
        recommendation: "Surcharge détectée - Risque de blessure élevé",
        action: "Réduire significativement la charge (séances légères, récupération active)",
        intensity: "reduce",
      };
    } else {
      return {
        recommendation: "Sous-charge détectée - Risque de désentraînement",
        action: "Augmenter progressivement la charge d'entraînement",
        intensity: "increase",
      };
    }
  }

  if (riskLevel === "warning") {
    if (ewmaRatio > 1.3) {
      return {
        recommendation: "Charge élevée - Vigilance requise",
        action: "Modérer l'intensité et surveiller les signes de fatigue",
        intensity: "reduce",
      };
    } else {
      return {
        recommendation: "Charge faible - Attention au désentraînement",
        action: "Légère augmentation de la charge recommandée",
        intensity: "increase",
      };
    }
  }

  return {
    recommendation: "Charge optimale",
    action: trend === "increasing" 
      ? "Maintenir le rythme actuel" 
      : "Progression possible si récupération OK",
    intensity: "maintain",
  };
}
