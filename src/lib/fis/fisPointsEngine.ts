/**
 * FIS Points Calculation Engine
 * Implements the REAL FIS freestyle/snowboard points system
 * 
 * Formula: Points FIS = Race Points (from table) - Race Penalty (P)
 * 
 * Race Penalty P = (A + B - C) / 10 + F
 *   A = sum of FIS points of top 5 riders present (before race)
 *   B = sum of FIS points of top 5 finishers (by race result)
 *   C = sum of FIS points of riders common between A and B
 *   F = discipline F-value coefficient
 */

/** Default base points table (FIS freestyle) */
export const DEFAULT_FIS_BASE_POINTS: Record<number, number> = {
  1: 1000, 2: 800, 3: 600, 4: 500, 5: 450,
  6: 400, 7: 360, 8: 320, 9: 290, 10: 260,
  11: 240, 12: 220, 13: 200, 14: 180, 15: 160,
  16: 150, 17: 140, 18: 130, 19: 120, 20: 110,
  21: 100, 22: 95, 23: 90, 24: 85, 25: 80,
  26: 75, 27: 70, 28: 65, 29: 60, 30: 55,
};

/** F-value by discipline (FIS freestyle/snowboard coefficients) */
export const DISCIPLINE_F_VALUES: Record<string, number> = {
  slopestyle: 500,
  big_air: 500,
  halfpipe: 500,
  parallel_gs: 400,
  parallel_slalom: 400,
  snowboardcross: 400,
  bosses: 400,
  bosses_paralleles: 400,
  saut_acrobatique: 400,
  skicross: 400,
  slopestyle_ski: 500,
  halfpipe_ski: 500,
  big_air_ski: 500,
  // Ski alpin disciplines (lower F-values)
  descente: 330,
  slalom: 330,
  geant: 330,
  super_g: 330,
  combine_alpin: 330,
};

export interface RacePenaltyInput {
  /** FIS points of top 5 riders present BEFORE the race (A) */
  topRiderPoints: number[];
  /** FIS points of top 5 finishers BY RACE RESULT (B) */
  topClassifiedPoints: number[];
  /** F-value for the discipline */
  fValue: number;
}

export interface PointsCalculationInput {
  ranking: number;
  racePenalty: number;
  basePointsTable?: Record<number, number>;
}

/**
 * Calculate race penalty using real FIS formula:
 * P = (A + B - C) / 10 + F
 * 
 * A = sum of top 5 riders present (best FIS pts before race)
 * B = sum of top 5 classified (best FIS pts of top 5 finishers)
 * C = sum of common riders between A and B
 * F = discipline coefficient
 * 
 * Note: Since we don't track individual rider identity, we approximate C.
 * The user inputs the sums directly. If individual tracking is needed later,
 * we can extend this.
 */
export function calculateRacePenalty(input: RacePenaltyInput): number {
  const { topRiderPoints, topClassifiedPoints, fValue } = input;

  const validA = topRiderPoints.filter((p) => p != null && p > 0);
  const validB = topClassifiedPoints.filter((p) => p != null && p > 0);

  if (validA.length === 0 && validB.length === 0) return fValue;

  const A = validA.reduce((s, v) => s + v, 0);
  const B = validB.reduce((s, v) => s + v, 0);

  // C = sum of common riders. We approximate by finding the overlap:
  // Sort both arrays, match closest values (greedy)
  const C = calculateCommonSum(validA, validB);

  const rawPenalty = (A + B - C) / 10;
  const penalty = Math.max(0, rawPenalty) + fValue;

  return Math.round(penalty * 100) / 100;
}

/**
 * Approximate the sum of common riders between A and B.
 * Since we only have point values (not identities), we match identical or
 * very close values between the two arrays greedily.
 */
function calculateCommonSum(aPoints: number[], bPoints: number[]): number {
  const bUsed = new Array(bPoints.length).fill(false);
  let commonSum = 0;

  for (const aVal of aPoints) {
    // Find exact match first, then closest within 5% tolerance
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let j = 0; j < bPoints.length; j++) {
      if (bUsed[j]) continue;
      const diff = Math.abs(aVal - bPoints[j]);
      // Exact match or within 5% tolerance = same rider
      if (diff < bestDiff && diff <= Math.max(aVal, bPoints[j]) * 0.05) {
        bestDiff = diff;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      // Use the A value for the common sum (rider's points before race)
      commonSum += aPoints[bestIdx] !== undefined ? aVal : 0;
      bUsed[bestIdx] = true;
    }
  }

  return commonSum;
}

/**
 * Calculate FIS points earned by an athlete
 * Points = base_points(position) - race_penalty
 * Minimum = 0
 */
export function calculateFisPoints(input: PointsCalculationInput): number {
  const { ranking, racePenalty, basePointsTable } = input;
  const table = basePointsTable || DEFAULT_FIS_BASE_POINTS;

  const basePoints = table[ranking];
  if (basePoints == null) {
    // Extrapolate for positions beyond the table
    const maxPos = Math.max(...Object.keys(table).map(Number));
    const lastPoints = table[maxPos] || 0;
    const extraPositions = ranking - maxPos;
    const extrapolated = Math.max(0, lastPoints - extraPositions * 5);
    return Math.max(0, Math.round((extrapolated - racePenalty) * 100) / 100);
  }

  return Math.max(0, Math.round((basePoints - racePenalty) * 100) / 100);
}

/**
 * Get the best N results from a list (for rolling window)
 */
export function getBestResults(
  results: { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[],
  topN: number = 5,
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
 * Calculate total FIS points from best results
 */
export function calculateTotalPoints(
  results: { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[],
  topN: number = 5,
): number {
  const best = getBestResults(results, topN);
  return best.reduce((sum, r) => sum + (r.calculated_points ?? r.fis_points), 0);
}

/**
 * Simulate: "If athlete finishes at position X, how many points?"
 */
export function simulatePoints(
  position: number,
  racePenalty: number,
  basePointsTable?: Record<number, number>,
): number {
  return calculateFisPoints({ ranking: position, racePenalty, basePointsTable });
}

/**
 * Legacy adapter: convert old-style inputs to new format
 */
export function calculateRacePenaltyLegacy(input: {
  topRiderPoints: number[];
  totalParticipants: number;
  level: string;
}): number {
  // For backward compat, use old simple formula if no classified data
  return calculateRacePenalty({
    topRiderPoints: input.topRiderPoints,
    topClassifiedPoints: [],
    fValue: 0,
  });
}
