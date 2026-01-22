// Training types configuration per sport type
import { isIndividualSport } from "./sportTypes";

export interface TrainingTypeOption {
  value: string;
  label: string;
  hasExercises: boolean;
  forTeamSports?: boolean;
  forIndividualSports?: boolean;
  forSports?: string[]; // If specified, only show for these sports
  category?: string; // Category for grouping (e.g., "athle_sprint", "athle_haies")
}

// Category definitions for grouped display
export interface TrainingTypeCategory {
  key: string;
  label: string;
  forSports?: string[];
}

// Athletics training type categories
export const ATHLETISME_TRAINING_CATEGORIES: TrainingTypeCategory[] = [
  { key: "athle_sprint", label: "Sprint / Vitesse", forSports: ["athletisme"] },
  { key: "athle_haies", label: "Haies", forSports: ["athletisme"] },
  { key: "athle_demifond", label: "Demi-fond / Fond", forSports: ["athletisme"] },
  { key: "athle_sauts", label: "Sauts", forSports: ["athletisme"] },
  { key: "athle_lancers", label: "Lancers", forSports: ["athletisme"] },
  { key: "athle_general", label: "Général / Polyvalent", forSports: ["athletisme"] },
];

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
  if (normalizedSport.startsWith('athletisme') || normalizedSport.startsWith('athlétisme')) return 'athletisme';
  return normalizedSport;
}

// All available training types
export const ALL_TRAINING_TYPES: TrainingTypeOption[] = [
  // Team sports specific
  { value: "collectif", label: "Collectif", hasExercises: false, forTeamSports: true, forIndividualSports: false },
  { value: "tactique", label: "Tactique", hasExercises: false, forTeamSports: true, forIndividualSports: false },
  { value: "opposition", label: "Opposition", hasExercises: false, forTeamSports: true, forIndividualSports: false },
  { value: "video", label: "Analyse Vidéo", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  
  // Individual sports specific (common)
  { value: "individuel", label: "Entraînement Individuel", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  { value: "competition_training", label: "Simulation Compétition", hasExercises: false, forTeamSports: false, forIndividualSports: true },
  
  // Football specific
  { value: "football_tactique", label: "Travail Tactique", hasExercises: false, forSports: ["football"] },
  { value: "football_possession", label: "Conservation/Possession", hasExercises: false, forSports: ["football"] },
  { value: "football_finition", label: "Finition", hasExercises: false, forSports: ["football"] },
  { value: "football_gardien", label: "Entraînement Gardiens", hasExercises: false, forSports: ["football"] },
  { value: "football_coup_pied", label: "Coups de pied arrêtés", hasExercises: false, forSports: ["football"] },
  
  // Handball specific
  { value: "handball_attaque", label: "Travail Attaque", hasExercises: false, forSports: ["handball"] },
  { value: "handball_defense", label: "Travail Défense", hasExercises: false, forSports: ["handball"] },
  { value: "handball_tir", label: "Travail de Tir", hasExercises: false, forSports: ["handball"] },
  { value: "handball_gardien", label: "Entraînement Gardiens", hasExercises: false, forSports: ["handball"] },
  { value: "handball_contre_attaque", label: "Contre-attaque", hasExercises: false, forSports: ["handball"] },
  
  // Volleyball specific
  { value: "volleyball_service", label: "Travail de Service", hasExercises: false, forSports: ["volleyball"] },
  { value: "volleyball_reception", label: "Réception", hasExercises: false, forSports: ["volleyball"] },
  { value: "volleyball_attaque", label: "Attaque/Spike", hasExercises: false, forSports: ["volleyball"] },
  { value: "volleyball_block", label: "Travail au Bloc", hasExercises: false, forSports: ["volleyball"] },
  { value: "volleyball_defense", label: "Défense/Dig", hasExercises: false, forSports: ["volleyball"] },
  
  // Basketball specific
  { value: "basketball_shoot", label: "Travail de Tir", hasExercises: false, forSports: ["basketball"] },
  { value: "basketball_dribble", label: "Dribble/Ballhandling", hasExercises: false, forSports: ["basketball"] },
  { value: "basketball_defense", label: "Travail Défensif", hasExercises: false, forSports: ["basketball"] },
  { value: "basketball_pick_roll", label: "Pick & Roll", hasExercises: false, forSports: ["basketball"] },
  { value: "basketball_transition", label: "Transition", hasExercises: false, forSports: ["basketball"] },
  
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
  
  // Athlétisme specific - with categories
  // Sprint / Vitesse
  { value: "athle_vitesse", label: "Travail de Vitesse", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_departs", label: "Travail Départs (Blocs)", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_acceleration", label: "Accélération", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_vitesse_max", label: "Vitesse Maximale", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_endurance_vitesse", label: "Endurance de Vitesse", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  
  // Haies
  { value: "athle_haies", label: "Travail Haies", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  { value: "athle_rythme_haies", label: "Rythme Inter-haies", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  { value: "athle_haies_technique", label: "Technique de Passage", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  
  // Demi-fond / Fond
  { value: "athle_fartlek", label: "Fartlek", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_tempo_run", label: "Tempo Run", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_sortie_longue", label: "Sortie Longue (Endurance)", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_fractionne", label: "Fractionné / Intervalles", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_seuil", label: "Travail au Seuil", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_vma", label: "VMA / VO2max", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_cotes", label: "Travail en Côtes", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_marche", label: "Technique Marche", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  
  // Sauts
  { value: "athle_sauts_technique", label: "Technique de Saut", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_course_elan", label: "Course d'Élan", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_impulsion", label: "Travail d'Impulsion", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_pliometrie", label: "Pliométrie", hasExercises: true, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_perche_technique", label: "Technique Perche", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  
  // Lancers
  { value: "athle_lancers_technique", label: "Technique de Lancer", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_rotation", label: "Travail de Rotation", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_release", label: "Travail de Lâcher", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_force_explosive", label: "Force Explosive", hasExercises: true, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_glisse", label: "Technique Glissé (Poids)", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  
  // Général / Polyvalent
  { value: "athle_coordination", label: "Coordination / Gammes", hasExercises: false, forSports: ["athletisme"], category: "athle_general" },
  { value: "athle_mobilite", label: "Mobilité Spécifique", hasExercises: true, forSports: ["athletisme"], category: "athle_general" },
  { value: "athle_combines", label: "Épreuves Combinées", hasExercises: false, forSports: ["athletisme"], category: "athle_general" },
  { value: "athle_ppg", label: "PPG (Prépa Physique Générale)", hasExercises: true, forSports: ["athletisme"], category: "athle_general" },
  
  // Common to all sports
  { value: "technique_individuelle", label: "Technique Individuelle", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "physique", label: "Physique", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "musculation", label: "Musculation", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "reathlétisation", label: "Réathlétisation", hasExercises: true, forTeamSports: true, forIndividualSports: true },
  { value: "repos", label: "Repos", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "test", label: "Test", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "echauffement", label: "Échauffement", hasExercises: false, forTeamSports: true, forIndividualSports: true },
  { value: "recuperation", label: "Récupération Active", hasExercises: false, forTeamSports: true, forIndividualSports: true },
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

// Get training types for a sport grouped by category (for athletics)
export interface TrainingTypeGroup {
  category: TrainingTypeCategory;
  types: TrainingTypeOption[];
}

export function getTrainingTypesGrouped(sportType: string | undefined): TrainingTypeGroup[] {
  const types = getTrainingTypesForSport(sportType);
  const baseSport = sportType ? getBaseSport(sportType) : '';
  
  // Only group for athletics
  if (baseSport !== 'athletisme') {
    return [];
  }
  
  const groups: TrainingTypeGroup[] = [];
  
  // Group athletics types by category
  ATHLETISME_TRAINING_CATEGORIES.forEach(category => {
    const categoryTypes = types.filter(t => t.category === category.key);
    if (categoryTypes.length > 0) {
      groups.push({ category, types: categoryTypes });
    }
  });
  
  // Add common types without category
  const commonTypes = types.filter(t => !t.category);
  if (commonTypes.length > 0) {
    groups.push({
      category: { key: 'common', label: 'Commun' },
      types: commonTypes
    });
  }
  
  return groups;
}

// Check if sport has grouped training types
export function hasGroupedTrainingTypes(sportType: string | undefined): boolean {
  if (!sportType) return false;
  const baseSport = getBaseSport(sportType);
  return baseSport === 'athletisme';
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
  tactique: "bg-blue-500",
  opposition: "bg-orange-600",
  video: "bg-slate-500",
  individuel: "bg-training-collectif",
  competition_training: "bg-rose-400",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  echauffement: "bg-yellow-400",
  recuperation: "bg-sky-400",
  match: "bg-rose-500",
  // Football specific
  football_tactique: "bg-blue-500",
  football_possession: "bg-green-500",
  football_finition: "bg-red-500",
  football_gardien: "bg-purple-500",
  football_coup_pied: "bg-orange-500",
  // Handball specific
  handball_attaque: "bg-red-500",
  handball_defense: "bg-blue-600",
  handball_tir: "bg-orange-500",
  handball_gardien: "bg-purple-500",
  handball_contre_attaque: "bg-amber-500",
  // Volleyball specific
  volleyball_service: "bg-yellow-500",
  volleyball_reception: "bg-blue-400",
  volleyball_attaque: "bg-red-500",
  volleyball_block: "bg-purple-600",
  volleyball_defense: "bg-green-500",
  // Basketball specific
  basketball_shoot: "bg-orange-500",
  basketball_dribble: "bg-blue-500",
  basketball_defense: "bg-red-600",
  basketball_pick_roll: "bg-purple-500",
  basketball_transition: "bg-amber-500",
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
  // Athlétisme specific - Sprint
  athle_vitesse: "bg-red-500",
  athle_departs: "bg-red-600",
  athle_acceleration: "bg-red-400",
  athle_vitesse_max: "bg-red-700",
  athle_endurance_vitesse: "bg-rose-500",
  // Athlétisme - Haies
  athle_haies: "bg-yellow-500",
  athle_rythme_haies: "bg-yellow-600",
  athle_haies_technique: "bg-yellow-400",
  // Athlétisme - Demi-fond/Fond
  athle_fartlek: "bg-green-500",
  athle_tempo_run: "bg-emerald-500",
  athle_sortie_longue: "bg-teal-500",
  athle_fractionne: "bg-cyan-500",
  athle_seuil: "bg-blue-500",
  athle_vma: "bg-indigo-500",
  athle_cotes: "bg-slate-500",
  athle_marche: "bg-green-600",
  // Athlétisme - Sauts
  athle_sauts_technique: "bg-purple-500",
  athle_course_elan: "bg-violet-500",
  athle_impulsion: "bg-fuchsia-500",
  athle_pliometrie: "bg-pink-500",
  athle_perche_technique: "bg-purple-600",
  // Athlétisme - Lancers
  athle_lancers_technique: "bg-orange-500",
  athle_rotation: "bg-orange-600",
  athle_release: "bg-amber-500",
  athle_force_explosive: "bg-rose-600",
  athle_glisse: "bg-orange-400",
  // Athlétisme - Général
  athle_coordination: "bg-sky-500",
  athle_mobilite: "bg-lime-500",
  athle_combines: "bg-gradient-to-r from-purple-500 to-pink-500",
  athle_ppg: "bg-gray-500",
  // Default for custom types
  _default: "bg-gray-500",
};

// Get color for a training type (with fallback for custom types)
export function getTrainingTypeColor(value: string): string {
  return TRAINING_TYPE_COLORS[value] || TRAINING_TYPE_COLORS._default;
}

// Training type labels mapping (for display)
export const TRAINING_TYPE_LABELS: Record<string, string> = {
  collectif: "Collectif",
  tactique: "Tactique",
  opposition: "Opposition",
  video: "Analyse Vidéo",
  individuel: "Individuel",
  competition_training: "Simulation Compétition",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
  reathlétisation: "Réathlétisation",
  echauffement: "Échauffement",
  recuperation: "Récupération Active",
  // Football specific
  football_tactique: "Travail Tactique",
  football_possession: "Conservation/Possession",
  football_finition: "Finition",
  football_gardien: "Entraînement Gardiens",
  football_coup_pied: "Coups de pied arrêtés",
  // Handball specific
  handball_attaque: "Travail Attaque",
  handball_defense: "Travail Défense",
  handball_tir: "Travail de Tir",
  handball_gardien: "Entraînement Gardiens",
  handball_contre_attaque: "Contre-attaque",
  // Volleyball specific
  volleyball_service: "Travail de Service",
  volleyball_reception: "Réception",
  volleyball_attaque: "Attaque/Spike",
  volleyball_block: "Travail au Bloc",
  volleyball_defense: "Défense/Dig",
  // Basketball specific
  basketball_shoot: "Travail de Tir",
  basketball_dribble: "Dribble/Ballhandling",
  basketball_defense: "Travail Défensif",
  basketball_pick_roll: "Pick & Roll",
  basketball_transition: "Transition",
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
  // Athlétisme specific - Sprint
  athle_vitesse: "Travail de Vitesse",
  athle_departs: "Travail Départs (Blocs)",
  athle_acceleration: "Accélération",
  athle_vitesse_max: "Vitesse Maximale",
  athle_endurance_vitesse: "Endurance de Vitesse",
  // Athlétisme - Haies
  athle_haies: "Travail Haies",
  athle_rythme_haies: "Rythme Inter-haies",
  athle_haies_technique: "Technique de Passage",
  // Athlétisme - Demi-fond/Fond
  athle_fartlek: "Fartlek",
  athle_tempo_run: "Tempo Run",
  athle_sortie_longue: "Sortie Longue (Endurance)",
  athle_fractionne: "Fractionné / Intervalles",
  athle_seuil: "Travail au Seuil",
  athle_vma: "VMA / VO2max",
  athle_cotes: "Travail en Côtes",
  athle_marche: "Technique Marche",
  // Athlétisme - Sauts
  athle_sauts_technique: "Technique de Saut",
  athle_course_elan: "Course d'Élan",
  athle_impulsion: "Travail d'Impulsion",
  athle_pliometrie: "Pliométrie",
  athle_perche_technique: "Technique Perche",
  // Athlétisme - Lancers
  athle_lancers_technique: "Technique de Lancer",
  athle_rotation: "Travail de Rotation",
  athle_release: "Travail de Lâcher",
  athle_force_explosive: "Force Explosive",
  athle_glisse: "Technique Glissé (Poids)",
  // Athlétisme - Général
  athle_coordination: "Coordination / Gammes",
  athle_mobilite: "Mobilité Spécifique",
  athle_combines: "Épreuves Combinées",
  athle_ppg: "PPG (Prépa Physique Générale)",
};
