/**
 * FIS Points Calculation Engine — Snowboard Freestyle / Freeski
 * 
 * OFFICIAL FORMULA (2025/2026):
 *   FIS Points = Percentage(position) × Scale
 * 
 * Scale is determined by:
 *   - Level 1 (WC, OWG, Worlds) → always Scale 1000
 *   - Level 2+ → depends on average FIS points of top 5 starters
 * 
 * Source: FIS Rules "RULES OF THE FIS POINTS SNOWBOARD FREESTYLE FREESKI SKI CROSS"
 */

/**
 * Official FIS percentage table by position.
 * Points = percentage / 100 × scale
 */
export const FIS_PERCENTAGE_TABLE: Record<number, number> = {
  1: 100, 2: 80, 3: 60, 4: 50, 5: 45,
  6: 40, 7: 36, 8: 32, 9: 29, 10: 26,
  11: 24, 12: 22, 13: 20, 14: 18, 15: 16,
  16: 15, 17: 14, 18: 13, 19: 12, 20: 11,
  21: 10, 22: 9.46, 23: 8.94, 24: 8.44, 25: 7.96,
  26: 7.50, 27: 7.06, 28: 6.64, 29: 6.24, 30: 5.86,
  31: 5.50, 32: 5.16, 33: 4.84, 34: 4.54, 35: 4.26,
  36: 4.00, 37: 3.76, 38: 3.54, 39: 3.34, 40: 3.16,
  41: 3.00, 42: 2.80, 43: 2.60, 44: 2.41, 45: 2.23,
  46: 2.06, 47: 1.97, 48: 1.88, 49: 1.79, 50: 1.70,
  51: 1.52, 52: 1.49, 53: 1.46, 54: 1.43, 55: 1.40,
  56: 1.37, 57: 1.34, 58: 1.31, 59: 1.28, 60: 1.25,
  61: 1.22, 62: 1.19, 63: 1.16, 64: 1.13, 65: 1.10,
  66: 1.07, 67: 1.04, 68: 1.01, 69: 0.98, 70: 0.95,
  71: 0.92, 72: 0.89, 73: 0.86, 74: 0.83, 75: 0.80,
  76: 0.77, 77: 0.74, 78: 0.71, 79: 0.68, 80: 0.65,
  81: 0.62, 82: 0.59, 83: 0.56, 84: 0.53, 85: 0.50,
  86: 0.47, 87: 0.44, 88: 0.41, 89: 0.38, 90: 0.35,
  91: 0.32, 92: 0.29, 93: 0.26, 94: 0.23, 95: 0.20,
  96: 0.17, 97: 0.14, 98: 0.11, 99: 0.08, 100: 0.05,
};

/**
 * Entry Points → Scale mapping for level 2+ competitions.
 * Average FIS pts of top 5 starters must be ≥ entry points to use that scale.
 */
export const SCALE_ENTRY_POINTS: { entryPoints: number; scale: number }[] = [
  { entryPoints: 626, scale: 650 },
  { entryPoints: 476, scale: 500 },
  { entryPoints: 426, scale: 450 },
  { entryPoints: 381, scale: 400 },
  { entryPoints: 341, scale: 360 },
  { entryPoints: 306, scale: 320 },
  { entryPoints: 276, scale: 290 },
  { entryPoints: 251, scale: 260 },
  { entryPoints: 231, scale: 240 },
  { entryPoints: 211, scale: 220 },
  { entryPoints: 191, scale: 200 },
  { entryPoints: 171, scale: 180 },
  { entryPoints: 156, scale: 160 },
  { entryPoints: 146, scale: 150 },
  { entryPoints: 136, scale: 140 },
  { entryPoints: 126, scale: 130 },
  { entryPoints: 116, scale: 120 },
  { entryPoints: 106, scale: 110 },
  { entryPoints: 96, scale: 100 },
  { entryPoints: 86, scale: 90 },
  { entryPoints: 66, scale: 70 },
  { entryPoints: 0, scale: 50 },
];

/**
 * Max scale by competition level for Freestyle / Freeski
 */
export const LEVEL_MAX_SCALES: Record<string, number> = {
  world_cup: 1000,
  continental_cup: 500,
  super_continental_cup: 650,
  junior_worlds: 500,
  yog: 260,
  fis: 290,
  national: 290,
  national_junior: 220,
};

/** Legacy exports for backward compat (now unused internally) */
export const DEFAULT_FIS_BASE_POINTS: Record<number, number> = {};
export const DISCIPLINE_F_VALUES: Record<string, number> = {
  slopestyle: 500, big_air: 500, halfpipe: 500, rail_event: 500,
  parallel_gs: 400, parallel_slalom: 400, snowboardcross: 400,
  bosses: 400, saut_acrobatique: 400, skicross: 400,
  slopestyle_ski: 500, halfpipe_ski: 500, big_air_ski: 500,
  descente: 330, slalom: 330, geant: 330, super_g: 330, combine_alpin: 330,
};

/**
 * Get the percentage for a given position.
 * Returns 0 for positions beyond the table.
 */
export function getPercentageForPosition(position: number): number {
  if (position <= 0) return 0;
  if (position > 100) return 0; // No points beyond 100th
  return FIS_PERCENTAGE_TABLE[position] ?? 0;
}

/**
 * Determine the scale for a competition based on level and average FIS points of top 5 starters.
 * 
 * Level 1 (WC, OWG, Worlds) → always Scale 1000
 * Level 2+ → lookup scale from average top 5, capped by level max
 */
export function determineScale(level: string, avgTop5FisPoints?: number): number {
  // Level 1 always gets Scale 1000
  if (level === "world_cup") return 1000;

  const maxScale = LEVEL_MAX_SCALES[level] ?? 290;

  // If no avg provided, use the max allowed for the level
  if (avgTop5FisPoints == null || avgTop5FisPoints <= 0) return maxScale;

  // Find the best matching scale from the entry points table
  for (const entry of SCALE_ENTRY_POINTS) {
    if (avgTop5FisPoints >= entry.entryPoints) {
      return Math.min(entry.scale, maxScale);
    }
  }

  return Math.min(50, maxScale);
}

/**
 * Calculate FIS points for a given position and scale.
 * 
 * FIS Points = percentage(position) / 100 × scale
 */
export function calculateFisPoints(input: {
  ranking: number;
  scale: number;
  // Legacy compat - ignored in new system
  racePenalty?: number;
  basePointsTable?: Record<number, number>;
}): number {
  const { ranking, scale } = input;
  const pct = getPercentageForPosition(ranking);
  if (pct === 0) return 0;
  const points = (pct / 100) * scale;
  return Math.round(points * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate the average FIS points of the top 5 starters (for scale determination).
 * Per FIS rules: if fewer than 5 have FIS points, divide by 5 anyway.
 */
export function calculateAvgTop5(fisPointsList: number[]): number {
  const valid = fisPointsList.filter(p => p != null && p > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((s, v) => s + v, 0);
  return Math.ceil(sum / 5); // FIS rounds up
}

/**
 * Simulate: "If athlete finishes at position X in a competition of level Y, how many points?"
 */
export function simulatePoints(
  position: number,
  scaleOrPenalty: number,
  _basePointsTable?: Record<number, number>,
): number {
  return calculateFisPoints({ ranking: position, scale: scaleOrPenalty });
}

// ─── Legacy compat exports ───

export interface RacePenaltyInput {
  topRiderPoints: number[];
  topClassifiedPoints: number[];
  fValue: number;
}

export interface PointsCalculationInput {
  ranking: number;
  racePenalty: number;
  basePointsTable?: Record<number, number>;
}

/**
 * @deprecated Use determineScale + calculateAvgTop5 instead
 */
export function calculateRacePenalty(input: RacePenaltyInput): number {
  // In the new system, this returns the SCALE (not a penalty)
  // For backward compat in simulation, treat as scale calculation
  const avg = calculateAvgTop5(input.topRiderPoints);
  return determineScale("continental_cup", avg);
}

/**
 * @deprecated Use calculateRacePenalty is no longer used
 */
export function calculateRacePenaltyLegacy(input: {
  topRiderPoints: number[];
  totalParticipants: number;
  level: string;
}): number {
  return 0;
}

// ─── Results management ───

/**
 * Get the best N results from a list (for rolling window / season best)
 */
export function getBestResults(
  results: { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[],
  topN: number = 2,
): typeof results {
  const now = new Date();
  const valid = results.filter((r) => {
    if (!r.expires_at) return true;
    return new Date(r.expires_at) > now;
  });

  return valid
    .sort((a, b) => {
      const aPoints = a.calculated_points ?? a.fis_points;
      const bPoints = b.calculated_points ?? b.fis_points;
      return bPoints - aPoints;
    })
    .slice(0, topN);
}

/**
 * Calculate total FIS points (average of best 2 per FIS Freestyle rules)
 */
export function calculateTotalPoints(
  results: { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[],
  topN: number = 2,
): number {
  const best = getBestResults(results, topN);
  if (best.length === 0) return 0;
  const sum = best.reduce((s, r) => s + (r.calculated_points ?? r.fis_points), 0);
  // FIS Freestyle: average of best 2 results
  return Math.round((sum / Math.max(best.length, 1)) * 100) / 100;
}
