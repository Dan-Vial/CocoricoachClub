export type RugbyPrecisionExerciseMode = "kicking" | "zone_kicks" | "lineout";

export interface RugbyPrecisionExerciseOption {
  value: string;
  label: string;
  mode: RugbyPrecisionExerciseMode;
  /** Category grouping */
  category: "buteur" | "zone_kicks" | "lineout";
  /** Symbol/color for visual distinction */
  color: string;
  /** Shape for map marker */
  shape: "circle" | "square" | "diamond";
}

/** Buteur exercises - individual click tracking like match stats */
export const BUTEUR_EXERCISES: RugbyPrecisionExerciseOption[] = [
  { value: "penalty", label: "Pénalité", mode: "kicking", category: "buteur", color: "#f97316", shape: "square" },
  { value: "conversion", label: "Transformation", mode: "kicking", category: "buteur", color: "#3b82f6", shape: "circle" },
  { value: "drop", label: "Drop", mode: "kicking", category: "buteur", color: "#8b5cf6", shape: "diamond" },
];

/** Zone kick exercises - click on target zone, enter attempts/successes */
export const ZONE_KICK_EXERCISES: RugbyPrecisionExerciseOption[] = [
  { value: "kickoff", label: "Coup d'envoi", mode: "zone_kicks", category: "zone_kicks", color: "#10b981", shape: "circle" },
  { value: "goal_line_restart", label: "Renvoi en-but", mode: "zone_kicks", category: "zone_kicks", color: "#06b6d4", shape: "square" },
  { value: "22m_restart", label: "Renvoi 22m", mode: "zone_kicks", category: "zone_kicks", color: "#6366f1", shape: "diamond" },
  { value: "tactical_kick", label: "Coup de pied de zone", mode: "zone_kicks", category: "zone_kicks", color: "#ec4899", shape: "circle" },
];

/** Lineout exercises */
export const LINEOUT_EXERCISES: RugbyPrecisionExerciseOption[] = [
  { value: "lineout", label: "Touche (lanceurs)", mode: "lineout", category: "lineout", color: "#f59e0b", shape: "circle" },
];

/** All exercises combined */
export const RUGBY_PRECISION_EXERCISES: RugbyPrecisionExerciseOption[] = [
  ...BUTEUR_EXERCISES,
  ...ZONE_KICK_EXERCISES,
  ...LINEOUT_EXERCISES,
];

export const EXERCISE_CATEGORIES = [
  { key: "buteur", label: "🎯 Buteur", exercises: BUTEUR_EXERCISES },
  { key: "zone_kicks", label: "🦶 Coups de pied de zone", exercises: ZONE_KICK_EXERCISES },
  { key: "lineout", label: "📏 Touche", exercises: LINEOUT_EXERCISES },
] as const;
