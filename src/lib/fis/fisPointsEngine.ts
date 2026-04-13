/**
 * FIS Points Calculation Engine
 * Implements the FIS freestyle/snowboard points system
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

/** Level multiplier for race penalty adjustment */
const LEVEL_FACTOR: Record<string, number> = {
  world_cup: 0,       // No penalty for World Cup
  continental_cup: 0.1,
  fis: 0.2,
  national: 0.3,
};

export interface RacePenaltyInput {
  topRiderPoints: number[]; // FIS points of top 5 riders present
  totalParticipants: number;
  level: string;
}

export interface PointsCalculationInput {
  ranking: number;
  racePenalty: number;
  basePointsTable?: Record<number, number>;
}

/**
 * Calculate race penalty based on field strength
 * Race Penalty = avg(top 5 riders points) * level_factor + participant adjustment
 */
export function calculateRacePenalty(input: RacePenaltyInput): number {
  const { topRiderPoints, totalParticipants, level } = input;
  const validPoints = topRiderPoints.filter((p) => p != null && p > 0);
  
  if (validPoints.length === 0) return 0;

  const avgTopPoints = validPoints.reduce((a, b) => a + b, 0) / validPoints.length;
  const levelFactor = LEVEL_FACTOR[level] ?? 0.2;
  
  // Higher avg = stronger field = lower penalty
  // Penalty decreases as field gets stronger
  const fieldStrengthPenalty = Math.max(0, (1000 - avgTopPoints) * levelFactor);
  
  // Participant adjustment: fewer participants = slightly higher penalty
  const participantAdjust = totalParticipants >= 30 ? 0 : Math.max(0, (30 - totalParticipants) * 2);
  
  return Math.round((fieldStrengthPenalty + participantAdjust) * 100) / 100;
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
