/**
 * Helpers for athletics records & minimas system.
 * Used to compute delta vs personal best and federal minima.
 */

export interface AthleticsRecord {
  id: string;
  player_id: string;
  category_id: string;
  discipline: string;
  specialty: string | null;
  personal_best: number | null;
  personal_best_date: string | null;
  personal_best_location: string | null;
  season_best: number | null;
  season_best_date: string | null;
  season_best_location: string | null;
  season_year: number;
  unit: string;
  lower_is_better: boolean;
  notes: string | null;
}

export interface AthleticsMinima {
  id: string;
  category_id: string;
  discipline: string;
  specialty: string | null;
  label: string;
  target_value: number;
  unit: string;
  lower_is_better: boolean;
  notes: string | null;
}

export interface DeltaResult {
  /** Numeric difference (signed) */
  delta: number;
  /** True if performance is BETTER than the reference */
  isBetter: boolean;
  /** Pre-formatted display value with sign and unit */
  display: string;
}

/**
 * Compute the delta between an actual performance and a reference value.
 * - For "lower is better" (course/temps): performance < reference → better (green, negative delta)
 * - For "higher is better" (lancers/sauts): performance > reference → better (green, positive delta)
 */
export function computeDelta(
  actual: number | null | undefined,
  reference: number | null | undefined,
  lowerIsBetter: boolean,
  unit: string = ""
): DeltaResult | null {
  if (actual == null || reference == null || isNaN(actual) || isNaN(reference)) {
    return null;
  }

  const rawDelta = actual - reference;
  const isBetter = lowerIsBetter ? rawDelta < 0 : rawDelta > 0;

  // Format display: always show sign relative to reference (improvement = negative for time, positive for distance)
  const sign = rawDelta > 0 ? "+" : "";
  const formatted = Math.abs(rawDelta) < 0.01
    ? `±0${unit ? ` ${unit}` : ""}`
    : `${sign}${rawDelta.toFixed(2)}${unit ? ` ${unit}` : ""}`;

  return {
    delta: rawDelta,
    isBetter,
    display: formatted,
  };
}

/**
 * Default unit for an athletics discipline.
 */
export function getDefaultUnitForDiscipline(discipline?: string | null, specialty?: string | null): {
  unit: string;
  lowerIsBetter: boolean;
} {
  const key = (specialty || discipline || "").toLowerCase();

  // Throws → meters, higher is better
  if (key.includes("poids") || key.includes("disque") || key.includes("marteau") || key.includes("javelot") || key.includes("lancer")) {
    return { unit: "m", lowerIsBetter: false };
  }
  // Jumps → meters, higher is better
  if (key.includes("longueur") || key.includes("triple") || key.includes("hauteur") || key.includes("perche") || key.includes("saut")) {
    return { unit: "m", lowerIsBetter: false };
  }
  // Combined events → points, higher is better
  if (key.includes("combine") || key.includes("pentathlon") || key.includes("heptathlon") || key.includes("decathlon")) {
    return { unit: "pts", lowerIsBetter: false };
  }
  // Default: time-based events (sprints, hurdles, mid/long, trail, marche)
  return { unit: "sec", lowerIsBetter: true };
}

/**
 * Find the matching record/minima for a player's discipline & specialty.
 */
export function findMatchingReference<T extends { discipline: string; specialty: string | null }>(
  references: T[],
  discipline?: string | null,
  specialty?: string | null
): T | null {
  if (!references || references.length === 0) return null;

  // 1. Exact match (discipline + specialty)
  if (specialty) {
    const exact = references.find(
      (r) => r.discipline === discipline && r.specialty === specialty
    );
    if (exact) return exact;
  }

  // 2. Match by specialty only
  if (specialty) {
    const bySpecialty = references.find((r) => r.specialty === specialty);
    if (bySpecialty) return bySpecialty;
  }

  // 3. Discipline only (no specialty defined on reference)
  const byDiscipline = references.find(
    (r) => r.discipline === discipline && !r.specialty
  );
  if (byDiscipline) return byDiscipline;

  // 4. Fallback: discipline match (any specialty)
  return references.find((r) => r.discipline === discipline) || null;
}
