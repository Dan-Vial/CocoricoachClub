export type RugbyPrecisionExerciseMode = "field" | "zone" | "lineout";

export interface RugbyPrecisionExerciseOption {
  value: string;
  label: string;
  mode: RugbyPrecisionExerciseMode;
}

export const RUGBY_PRECISION_EXERCISES: RugbyPrecisionExerciseOption[] = [
  { value: "Coup de pied", label: "Coup de pied", mode: "field" },
  { value: "Pénalités", label: "Pénalités", mode: "field" },
  { value: "Passe au pied", label: "Passe au pied", mode: "field" },
  { value: "Chandelle", label: "Chandelle", mode: "field" },
  { value: "Jeu au pied rasant", label: "Jeu au pied rasant", mode: "field" },
  { value: "Drop", label: "Drop", mode: "field" },
  { value: "Jeu de zone", label: "Jeu de zone", mode: "zone" },
  { value: "Touche", label: "Touche (lanceurs)", mode: "lineout" },
];