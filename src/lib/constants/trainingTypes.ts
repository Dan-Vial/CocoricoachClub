// Training types configuration per sport type
import { isIndividualSport } from "./sportTypes";

export interface TrainingTypeOption {
  value: string;
  label: string;
  hasExercises: boolean;
  forTeamSports?: boolean;
  forIndividualSports?: boolean;
  forSports?: string[]; // If specified, only show for these sports
}

// Helper to extract base sport
function getBaseSport(sportType: string): string {
  const normalizedSport = sportType.toLowerCase();
  if (normalizedSport.startsWith('rugby')) return 'rugby';
  if (normalizedSport.startsWith('football')) return 'football';
  if (normalizedSport.startsWith('handball')) return 'handball';
  if (normalizedSport.startsWith('volleyball')) return 'volleyball';
  if (normalizedSport.startsWith('basketball')) return 'basketball';
  if (normalizedSport.startsWith('judo')) return 'judo';
  if (normalizedSport.startsWith('bowling')) return 'bowling';
  if (normalizedSport.startsWith('aviron')) return 'aviron';
  return normalizedSport;
}

// All available training types
export const ALL_TRAINING_TYPES: TrainingTypeOption[] = [
  // Team sports specific
  { value: "collectif", label: "Collectif", hasExercises: false, forTeamSports: true, forIndividualSports: false },
  
  // Individual sports specific (common)
  { value: "individuel", label: "Entraînement Individuel", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  { value: "competition_training", label: "Simulation Compétition", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  
  // Aviron specific
  { value: "aviron_ergo", label: "Ergomètre (Indoor)", hasExercises: false, forSports: ["aviron"] },
  { value: "aviron_eau", label: "Sur l'eau (Outdoor)", hasExercises: false, forSports: ["aviron"] },
  { value: "aviron_technique", label: "Technique Bateau", hasExercises: false, forSports: ["aviron"] },
  { value: "aviron_sortie_longue", label: "Sortie Longue", hasExercises: false, forSports: ["aviron"] },
  { value: "aviron_fractionne", label: "Fractionné", hasExercises: false, forSports: ["aviron"] },
  
  // Judo specific
  { value: "judo_randori", label: "Randori", hasExercises: false, forSports: ["judo"] },
  { value: "judo_uchikomi", label: "Uchi-komi", hasExercises: false, forSports: ["judo"] },
  { value: "judo_nagekomi", label: "Nage-komi", hasExercises: false, forSports: ["judo"] },
  { value: "judo_newaza", label: "Ne-waza (Sol)", hasExercises: false, forSports: ["judo"] },
  { value: "judo_kata", label: "Kata", hasExercises: false, forSports: ["judo"] },
  
  // Bowling specific
  { value: "bowling_practice", label: "Pratique Libre", hasExercises: false, forSports: ["bowling"] },
  { value: "bowling_technique", label: "Travail Technique", hasExercises: false, forSports: ["bowling"] },
  { value: "bowling_spare", label: "Entraînement Spares", hasExercises: false, forSports: ["bowling"] },
  { value: "bowling_game", label: "Parties d'Entraînement", hasExercises: false, forSports: ["bowling"] },
  
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
    return ALL_TRAINING_TYPES.filter(t => t.forTeamSports !== false && !t.forSports);
  }
  
  const baseSport = getBaseSport(sportType);
  const isIndividual = isIndividualSport(sportType);
  
  return ALL_TRAINING_TYPES.filter(t => {
    // If this type is for specific sports only
    if (t.forSports && t.forSports.length > 0) {
      return t.forSports.includes(baseSport);
    }
    
    // Otherwise filter by team/individual
    if (isIndividual) {
      return t.forIndividualSports !== false;
    }
    
    return t.forTeamSports !== false;
  });
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
  individuel: "bg-training-collectif",
  competition_training: "bg-rose-400",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  match: "bg-rose-500",
  // Aviron specific
  aviron_ergo: "bg-blue-400",
  aviron_eau: "bg-cyan-500",
  aviron_technique: "bg-teal-400",
  aviron_sortie_longue: "bg-blue-600",
  aviron_fractionne: "bg-indigo-500",
  // Judo specific
  judo_randori: "bg-red-500",
  judo_uchikomi: "bg-orange-500",
  judo_nagekomi: "bg-yellow-500",
  judo_newaza: "bg-purple-500",
  judo_kata: "bg-pink-500",
  // Bowling specific
  bowling_practice: "bg-emerald-500",
  bowling_technique: "bg-teal-500",
  bowling_spare: "bg-lime-500",
  bowling_game: "bg-green-600",
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
  // Aviron specific
  aviron_ergo: "Ergomètre (Indoor)",
  aviron_eau: "Sur l'eau (Outdoor)",
  aviron_technique: "Technique Bateau",
  aviron_sortie_longue: "Sortie Longue",
  aviron_fractionne: "Fractionné",
  // Judo specific
  judo_randori: "Randori",
  judo_uchikomi: "Uchi-komi",
  judo_nagekomi: "Nage-komi",
  judo_newaza: "Ne-waza (Sol)",
  judo_kata: "Kata",
  // Bowling specific
  bowling_practice: "Pratique Libre",
  bowling_technique: "Travail Technique",
  bowling_spare: "Entraînement Spares",
  bowling_game: "Parties d'Entraînement",
};
