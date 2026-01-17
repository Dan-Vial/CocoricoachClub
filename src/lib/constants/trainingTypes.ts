// Training types configuration per sport type
import { isIndividualSport } from "./sportTypes";

export interface TrainingTypeOption {
  value: string;
  label: string;
  hasExercises: boolean;
  forTeamSports?: boolean;
  forIndividualSports?: boolean;
}

// All available training types
export const ALL_TRAINING_TYPES: TrainingTypeOption[] = [
  // Team sports specific
  { value: "collectif", label: "Collectif", hasExercises: false, forTeamSports: true, forIndividualSports: false },
  
  // Individual sports specific
  { value: "individuel", label: "Entraînement Individuel", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  { value: "competition_training", label: "Simulation Compétition", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  
  // Common to all sports
  { value: "technique_individuelle", label: "Technique Individuelle", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "physique", label: "Physique", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "musculation", label: "Musculation", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "reathlétisation", label: "Réathlétisation", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "repos", label: "Repos", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "test", label: "Test", hasExercises: false, forTeamSports: true, forIndividualSports: true },
];

// Get training types filtered by sport type
export function getTrainingTypesForSport(sportType: string | undefined): TrainingTypeOption[] {
  if (!sportType) {
    // Default to team sports if unknown
    return ALL_TRAINING_TYPES.filter(t => t.forTeamSports !== false);
  }
  
  if (isIndividualSport(sportType)) {
    return ALL_TRAINING_TYPES.filter(t => t.forIndividualSports !== false);
  }
  
  return ALL_TRAINING_TYPES.filter(t => t.forTeamSports !== false);
}

// Get label for a training type
export function getTrainingTypeLabel(value: string): string {
  const type = ALL_TRAINING_TYPES.find(t => t.value === value);
  return type?.label || value;
}

// Check if training type has exercises
export function trainingTypeHasExercises(value: string): boolean {
  const type = ALL_TRAINING_TYPES.find(t => t.value === value);
  return type?.hasExercises || false;
}

// Training type colors (for calendars)
export const TRAINING_TYPE_COLORS: Record<string, string> = {
  collectif: "bg-training-collectif",
  individuel: "bg-training-collectif", // Same color as collectif for individual sports
  competition_training: "bg-rose-400",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  match: "bg-rose-500",
};

// Training type labels mapping (for display)
export const TRAINING_TYPE_LABELS: Record<string, string> = {
  collectif: "Collectif",
  individuel: "Individuel",
  competition_training: "Simulation Compétition",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
  reathlétisation: "Réathlétisation",
};
