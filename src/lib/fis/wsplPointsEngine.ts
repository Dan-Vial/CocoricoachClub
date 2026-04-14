/**
 * WSPL (World Snowboard Points List) Calculation Engine
 * 
 * Formula:
 *   P = PL/100 × ( e^(-(R-1)/t) × Pdelta + (101 - (R×100/F - (100/F-1))) × delta 
 *       - (e^(-F/t) × Pdelta) / F × (R-1) )
 * 
 * Where:
 *   P      = Points awarded (rounded to 2 decimals)
 *   PL     = Event point level (e.g. 1000)
 *   R      = Final rank of the rider
 *   F      = Total number of classified riders
 *   delta  = 0.5
 *   t      = 6
 *   e      = Euler's number ≈ 2.718
 *   Pdelta = 100 × (1 - delta) = 50
 */

const DELTA = 0.5;
const T = 6;
const P_DELTA = 100 * (1 - DELTA); // = 50

/**
 * WSPL event categories with min/max point levels
 */
export const WSPL_EVENT_CATEGORIES = [
  { stars: 1, label: "★ Grassroots", minPL: 100, maxPL: 300, examples: "Rookie Events, régionaux" },
  { stars: 2, label: "★★ Amateur", minPL: 100, maxPL: 400, examples: "World Rookie Fest, nationaux" },
  { stars: 3, label: "★★★ Challenger", minPL: 200, maxPL: 600, examples: "World Rookie Finals, Mountain Mash" },
  { stars: 4, label: "★★★★ Pro", minPL: 300, maxPL: 800, examples: "X-Games, Snow League, Spring Battle" },
  { stars: 5, label: "★★★★★ Elite", minPL: 600, maxPL: 1000, examples: "Coupe du Monde FIS, JO, Championnats du Monde" },
];

/**
 * Calculate WSPL points for a given placement.
 */
export function calculateWsplPoints(input: {
  rank: number;       // R - final rank
  totalRiders: number; // F - total classified riders
  pointLevel: number;  // PL - event point level
}): number {
  const { rank: R, totalRiders: F, pointLevel: PL } = input;

  if (R <= 0 || F <= 0 || PL <= 0) return 0;
  if (R > F) return 0;

  // Special case: only 1 rider
  if (F === 1) {
    return Math.round((PL / 100) * P_DELTA * 100) / 100;
  }

  const expR = Math.exp(-(R - 1) / T);
  const expF = Math.exp(-F / T);

  const term1 = expR * P_DELTA;
  const term2 = (101 - (R * 100 / F - (100 / F - 1))) * DELTA;
  const term3 = (expF * P_DELTA) / F * (R - 1);

  const P = (PL / 100) * (term1 + term2 - term3);

  return Math.round(P * 100) / 100;
}

/**
 * Calculate WSPL ranking: average of best 3 results over 52 weeks.
 */
export function calculateWsplRanking(
  results: { wspl_points: number; expires_at?: string | null }[],
): number {
  const now = new Date();
  const valid = results.filter((r) => {
    if (!r.expires_at) return true;
    return new Date(r.expires_at) > now;
  });

  if (valid.length === 0) return 0;

  const sorted = valid
    .map((r) => r.wspl_points)
    .filter((p) => p > 0)
    .sort((a, b) => b - a);

  const top3 = sorted.slice(0, 3);
  if (top3.length === 0) return 0;

  const avg = top3.reduce((s, v) => s + v, 0) / top3.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Calculate R-Value from top athletes' WSPL rankings.
 * Men: average of 8 best, Women: average of 5 best.
 */
export function calculateRValue(
  topRankings: number[],
  gender: "men" | "women" = "men",
): number | null {
  const count = gender === "women" ? 5 : 8;
  const valid = topRankings.filter((r) => r > 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const top = valid.slice(0, count);
  return Math.round((top.reduce((s, v) => s + v, 0) / top.length) * 100) / 100;
}

/**
 * Calculate P-Value from top athletes' WSPL points.
 * Men: average of 8 best, Women: average of 5 best.
 */
export function calculatePValue(
  topPoints: number[],
  gender: "men" | "women" = "men",
): number | null {
  const count = gender === "women" ? 5 : 8;
  const valid = topPoints.filter((p) => p > 0).sort((a, b) => b - a);
  if (valid.length === 0) return null;
  const top = valid.slice(0, count);
  return Math.round((top.reduce((s, v) => s + v, 0) / top.length) * 100) / 100;
}

/**
 * Determine if we should use R-Value or P-Value.
 * If R-Value < 25.01 (men) or < 19.01 (women) → use R-Value.
 * Otherwise → use P-Value.
 */
export function shouldUseRValue(
  rValue: number,
  gender: "men" | "women" = "men",
): boolean {
  const threshold = gender === "women" ? 19.01 : 25.01;
  return rValue < threshold;
}

/**
 * Determine PL from event category stars and R-Value/P-Value.
 * Returns a value between the min and max for that category.
 */
export function determinePL(stars: number, rValueOrPValue?: number): number {
  const cat = WSPL_EVENT_CATEGORIES.find((c) => c.stars === stars);
  if (!cat) return 100;

  if (rValueOrPValue == null) return cat.maxPL;

  // Linear interpolation within category range
  return Math.min(cat.maxPL, Math.max(cat.minPL, Math.round(rValueOrPValue)));
}
