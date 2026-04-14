/**
 * FIS Points Calculation Engine — Snowboard & Freeski Park & Pipe
 * 
 * OFFICIAL FORMULA (2025/2026) — Section 5 of FIS Rules:
 *   P = EF × ((1-d)(e^(-(R-1)/t) - (R-1)×e^(-(N-1)/t)/(N-1)) + d×(1 - (R-1)/(N-0.96)))
 * 
 * Where:
 *   P  = Points awarded (rounded to 1 decimal, min 0.1)
 *   EF = Event Factor (points awarded to 1st place = Scale)
 *   R  = Rank of the competitor (1-based)
 *   N  = Number of competitors ranked
 *   d  = 0.25 (weight of linear component)
 *   t  = 4 (parameter of exponential part)
 *   e  = Euler's number ≈ 2.718281828459
 * 
 * Source: "RULES OF THE FIS POINTS SNOWBOARD FREESTYLE FREESKI SKI CROSS" Edition 2025/2026
 *         Section 5.2 — FIS Snowboard and Freeski Park & Pipe Points
 */

const D = 0.25;  // weight of linear component
const T = 4;     // parameter of exponential part

/**
 * Entry Points → Scale mapping for level 2+ competitions (Park & Pipe).
 * Section 5.2.1 — Scale table for men (using men's entry points).
 */
export const SCALE_ENTRY_POINTS: { entryPoints: number; scale: number }[] = [
  { entryPoints: 741, scale: 1000 },
  { entryPoints: 593, scale: 800 },
  { entryPoints: 444, scale: 600 },
  { entryPoints: 370, scale: 500 },
  { entryPoints: 333, scale: 450 },
  { entryPoints: 296, scale: 400 },
  { entryPoints: 267, scale: 360 },
  { entryPoints: 237, scale: 320 },
  { entryPoints: 215, scale: 290 },
  { entryPoints: 193, scale: 260 },
  { entryPoints: 178, scale: 240 },
  { entryPoints: 163, scale: 220 },
  { entryPoints: 148, scale: 200 },
  { entryPoints: 133, scale: 180 },
  { entryPoints: 119, scale: 160 },
  { entryPoints: 111, scale: 150 },
  { entryPoints: 104, scale: 140 },
  { entryPoints: 96, scale: 130 },
  { entryPoints: 89, scale: 120 },
  { entryPoints: 81, scale: 110 },
  { entryPoints: 74, scale: 100 },
  { entryPoints: 67, scale: 90 },
  { entryPoints: 59, scale: 80 },
  { entryPoints: 52, scale: 70 },
  { entryPoints: 44, scale: 60 },
  { entryPoints: 37, scale: 50 },
  { entryPoints: 30, scale: 40 },
  { entryPoints: 22, scale: 30 },
  { entryPoints: 15, scale: 20 },
  { entryPoints: 0, scale: 10 },
];

/**
 * Max scale by competition level for Park & Pipe
 * Section 5.2.2
 */
export const LEVEL_MAX_SCALES: Record<string, number> = {
  world_cup: 1000,        // Level 1: WC, OWG, Worlds → 1000 to 500
  continental_cup: 360,   // Level 2: Continental Cups → 360 to 120
  premium_cc: 500,        // Premium Continental Cup → 500 to 120
  fis_open: 1000,         // FIS Open → 1000 to 50
  super_continental_cup: 500,
  junior_worlds: 500,     // Junior World Championships → 500 to 240
  yog: 360,               // Youth Olympic Games → 360 to 120
  eyof: 290,              // European Youth Olympic Festival → 290 to 50
  fis: 220,               // FIS International → 220 to 50
  national: 320,          // FIS National Championships → 320 to 50
  national_junior: 220,   // FIS National Junior → 220 to 50
};

/** Legacy exports for backward compat */
export const DEFAULT_FIS_BASE_POINTS: Record<number, number> = {};
export const DISCIPLINE_F_VALUES: Record<string, number> = {
  slopestyle: 500, big_air: 500, halfpipe: 500, rail_event: 500,
  parallel_gs: 400, parallel_slalom: 400, snowboardcross: 400,
  bosses: 400, saut_acrobatique: 400, skicross: 400,
  slopestyle_ski: 500, halfpipe_ski: 500, big_air_ski: 500,
  descente: 330, slalom: 330, geant: 330, super_g: 330, combine_alpin: 330,
};

// Keep the percentage table for non-P&P disciplines (SBX, Alpine, Ski Cross)
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
};

/**
 * Calculate FIS Park & Pipe points using the OFFICIAL exponential+linear formula.
 * 
 * P = EF × ((1-d)(e^(-(R-1)/t) - (R-1)×e^(-(N-1)/t)/(N-1)) + d×(1 - (R-1)/(N-0.96)))
 * 
 * Points are rounded to 1 decimal and minimum 0.1
 */
export function calculateFisPoints(input: {
  ranking: number;
  scale: number;
  totalRiders?: number;
  // Legacy compat
  racePenalty?: number;
  basePointsTable?: Record<number, number>;
}): number {
  const { ranking: R, scale: EF, totalRiders } = input;
  
  // N defaults to ranking if not provided (conservative: assumes rider is last)
  const N = totalRiders && totalRiders > 0 ? totalRiders : Math.max(R, 2);
  
  if (R <= 0 || EF <= 0 || N <= 0) return 0;
  if (R > N) return 0;

  // 1st place always gets EF points
  if (R === 1) return EF;

  // Special case: only 1 rider ranked
  if (N === 1) return EF;

  const expR = Math.exp(-(R - 1) / T);
  const expN = Math.exp(-(N - 1) / T);

  // Exponential component
  const exponentialPart = (1 - D) * (expR - ((R - 1) * expN) / (N - 1));

  // Linear component
  const linearPart = D * (1 - (R - 1) / (N - 0.96));

  const P = EF * (exponentialPart + linearPart);

  // Per FIS rules: rounded to first decimal, minimum 0.1
  const rounded = Math.round(P * 10) / 10;
  return Math.max(0.1, rounded);
}

/**
 * Determine the scale (EF) for a competition based on level and quality of field.
 * 
 * For Level 1 (WC): uses Entry Ranks of top 5 women / 8 men on FIS Points List
 * For Level 2-4: uses average FIS points of top 5 women / 8 men starters
 */
export function determineScale(level: string, avgTop5FisPoints?: number): number {
  // Level 1 WC with entry ranks — simplified: default to max
  if (level === "world_cup") return 1000;

  const maxScale = LEVEL_MAX_SCALES[level] ?? 220;

  if (avgTop5FisPoints == null || avgTop5FisPoints <= 0) return maxScale;

  for (const entry of SCALE_ENTRY_POINTS) {
    if (avgTop5FisPoints >= entry.entryPoints) {
      return Math.min(entry.scale, maxScale);
    }
  }

  return Math.min(10, maxScale);
}

export function getPercentageForPosition(position: number): number {
  if (position <= 0 || position > 50) return 0;
  return FIS_PERCENTAGE_TABLE[position] ?? 0;
}

/**
 * Calculate the average FIS points of top starters (for scale determination).
 * For men: divide by 8. For women: divide by 5.
 */
export function calculateAvgTop5(fisPointsList: number[], gender: 'men' | 'women' = 'men'): number {
  const divisor = gender === 'women' ? 5 : 8;
  const valid = fisPointsList.filter(p => p != null && p > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((s, v) => s + v, 0);
  return Math.ceil(sum / divisor); // FIS rounds up
}

/**
 * Simulate: "If athlete finishes at position X in a competition of level Y with N riders, how many points?"
 */
export function simulatePoints(
  position: number,
  scaleOrEF: number,
  totalRiders?: number,
): number {
  return calculateFisPoints({ ranking: position, scale: scaleOrEF, totalRiders: totalRiders ?? Math.max(position, 30) });
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

export function calculateRacePenalty(input: RacePenaltyInput): number {
  const avg = calculateAvgTop5(input.topRiderPoints);
  return determineScale("continental_cup", avg);
}

export function calculateRacePenaltyLegacy(input: {
  topRiderPoints: number[];
  totalParticipants: number;
  level: string;
}): number {
  return 0;
}

// ─── Results management ───

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
 * Calculate total FIS points (average of best 2 per FIS Freestyle P&P rules)
 */
export function calculateTotalPoints(
  results: { fis_points: number; calculated_points?: number | null; expires_at?: string | null }[],
  topN: number = 2,
): number {
  const best = getBestResults(results, topN);
  if (best.length === 0) return 0;
  const sum = best.reduce((s, r) => s + (r.calculated_points ?? r.fis_points), 0);
  return Math.round((sum / Math.max(best.length, 1)) * 100) / 100;
}
