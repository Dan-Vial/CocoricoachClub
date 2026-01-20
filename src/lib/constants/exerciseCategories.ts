// Main categories for exercise library and session management
export interface ExerciseCategory {
  value: string;
  label: string;
  group: string | null;
  sport?: string; // Optional sport filter for terrain exercises
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  // Musculation - Haut du corps
  { value: "upper_push", label: "Haut - Poussée", group: "musculation" },
  { value: "upper_pull", label: "Haut - Tirage", group: "musculation" },
  { value: "shoulders", label: "Épaules", group: "musculation" },
  { value: "arms", label: "Bras (biceps/triceps)", group: "musculation" },
  
  // Musculation - Bas du corps
  { value: "lower_push", label: "Bas - Poussée (quad dominant)", group: "musculation" },
  { value: "lower_pull", label: "Bas - Tirage (hip dominant)", group: "musculation" },
  { value: "glutes", label: "Fessiers", group: "musculation" },
  { value: "hamstrings", label: "Ischio-jambiers", group: "musculation" },
  { value: "calves", label: "Mollets", group: "musculation" },
  
  // Musculation - Core & Général
  { value: "core", label: "Core / Gainage", group: "musculation" },
  { value: "anti_rotation", label: "Anti-rotation", group: "musculation" },
  { value: "musculation", label: "Musculation (général)", group: "musculation" },
  
  // Musculation - Méthodes spécifiques
  { value: "halterophilie", label: "Haltérophilie", group: "musculation" },
  { value: "plyometrics", label: "Pliométrie", group: "musculation" },
  { value: "isometrics", label: "Isométrie", group: "musculation" },
  { value: "explosive", label: "Explosivité", group: "musculation" },
  
  // Réathlétisation
  { value: "reathletisation_lower", label: "Réathé - Membres inférieurs", group: "reathletisation" },
  { value: "reathletisation_upper", label: "Réathé - Membres supérieurs", group: "reathletisation" },
  { value: "reathletisation_trunk", label: "Réathé - Tronc / Rachis", group: "reathletisation" },
  { value: "proprioception", label: "Proprioception", group: "reathletisation" },
  { value: "neuromuscular", label: "Activation neuromusculaire", group: "reathletisation" },
  { value: "shoulder_stability", label: "Stabilité épaule", group: "reathletisation" },
  { value: "knee_stability", label: "Stabilité genou", group: "reathletisation" },
  { value: "ankle_stability", label: "Stabilité cheville", group: "reathletisation" },
  { value: "hip_stability", label: "Stabilité hanche", group: "reathletisation" },
  { value: "prophylaxis", label: "Prophylaxie / Prévention", group: "reathletisation" },
  { value: "eccentric", label: "Travail excentrique", group: "reathletisation" },
  
  // Ergomètres / Machines Cardio
  { value: "ergometre", label: "Ergomètre / Machine Cardio", group: "cardio_machines" },
  { value: "skierg", label: "SkiErg", group: "cardio_machines" },
  { value: "rowerg", label: "RowErg (Rameur)", group: "cardio_machines" },
  { value: "assault_bike", label: "Assault Bike", group: "cardio_machines" },
  { value: "echo_bike", label: "Echo Bike", group: "cardio_machines" },
  { value: "bikeerg", label: "BikeErg", group: "cardio_machines" },
  
  // Terrain - Général
  { value: "cardio", label: "Cardio", group: "terrain" },
  { value: "terrain", label: "Terrain (courses, sprints...)", group: "terrain" },
  { value: "speed", label: "Vitesse", group: "terrain" },
  { value: "agility", label: "Agilité / COD", group: "terrain" },
  { value: "endurance", label: "Endurance", group: "terrain" },
  { value: "interval", label: "Interval Training", group: "terrain" },
  
  // Terrain - Football
  { value: "football_technique", label: "Football - Technique", group: "terrain", sport: "football" },
  { value: "football_tactical", label: "Football - Tactique", group: "terrain", sport: "football" },
  { value: "football_finishing", label: "Football - Finition", group: "terrain", sport: "football" },
  { value: "football_possession", label: "Football - Possession", group: "terrain", sport: "football" },
  
  // Terrain - Handball
  { value: "handball_shooting", label: "Handball - Tirs", group: "terrain", sport: "handball" },
  { value: "handball_defense", label: "Handball - Défense", group: "terrain", sport: "handball" },
  { value: "handball_fast_break", label: "Handball - Contre-attaque", group: "terrain", sport: "handball" },
  
  // Terrain - Basketball
  { value: "basketball_shooting", label: "Basketball - Tirs", group: "terrain", sport: "basketball" },
  { value: "basketball_dribbling", label: "Basketball - Dribble", group: "terrain", sport: "basketball" },
  { value: "basketball_defense", label: "Basketball - Défense", group: "terrain", sport: "basketball" },
  { value: "basketball_transition", label: "Basketball - Transition", group: "terrain", sport: "basketball" },
  
  // Terrain - Volleyball
  { value: "volleyball_service", label: "Volleyball - Service", group: "terrain", sport: "volleyball" },
  { value: "volleyball_attack", label: "Volleyball - Attaque", group: "terrain", sport: "volleyball" },
  { value: "volleyball_block", label: "Volleyball - Bloc", group: "terrain", sport: "volleyball" },
  { value: "volleyball_reception", label: "Volleyball - Réception", group: "terrain", sport: "volleyball" },
  
  // Terrain - Rugby
  { value: "rugby_scrummage", label: "Rugby - Mêlée", group: "terrain", sport: "rugby" },
  { value: "rugby_lineout", label: "Rugby - Touche", group: "terrain", sport: "rugby" },
  { value: "rugby_tackle", label: "Rugby - Plaquage", group: "terrain", sport: "rugby" },
  { value: "rugby_ruck", label: "Rugby - Ruck/Maul", group: "terrain", sport: "rugby" },
  { value: "rugby_passing", label: "Rugby - Passes", group: "terrain", sport: "rugby" },
  { value: "rugby_kicking", label: "Rugby - Jeu au pied", group: "terrain", sport: "rugby" },
  
  // Terrain - Judo
  { value: "judo_randori", label: "Judo - Randori", group: "terrain", sport: "judo" },
  { value: "judo_uchikomi", label: "Judo - Uchi-komi", group: "terrain", sport: "judo" },
  { value: "judo_nagekomi", label: "Judo - Nage-komi", group: "terrain", sport: "judo" },
  { value: "judo_newaza", label: "Judo - Ne-waza", group: "terrain", sport: "judo" },
  { value: "judo_kata", label: "Judo - Kata", group: "terrain", sport: "judo" },
  
  // Terrain - Aviron
  { value: "aviron_technique", label: "Aviron - Technique", group: "terrain", sport: "aviron" },
  { value: "aviron_ergo", label: "Aviron - Ergomètre", group: "terrain", sport: "aviron" },
  { value: "aviron_endurance", label: "Aviron - Endurance", group: "terrain", sport: "aviron" },
  
  // Terrain - Bowling
  { value: "bowling_technique", label: "Bowling - Technique", group: "terrain", sport: "bowling" },
  { value: "bowling_spare", label: "Bowling - Spares", group: "terrain", sport: "bowling" },
  { value: "bowling_strike", label: "Bowling - Strikes", group: "terrain", sport: "bowling" },
  
  // Stretching & Mobilité
  { value: "warmup", label: "Échauffement", group: "stretching_mobility" },
  { value: "mobility", label: "Mobilité", group: "stretching_mobility" },
  { value: "stretching", label: "Stretching statique", group: "stretching_mobility" },
  { value: "dynamic_stretching", label: "Stretching dynamique", group: "stretching_mobility" },
  { value: "foam_rolling", label: "Foam rolling / Auto-massage", group: "stretching_mobility" },
  { value: "recovery", label: "Récupération", group: "stretching_mobility" },
  { value: "breathing", label: "Respiration", group: "stretching_mobility" },
  
  { value: "other", label: "Autre", group: null },
];

// Liste des sports disponibles pour les exercices terrain
export const SPORT_OPTIONS = [
  { value: "all", label: "Tous les sports" },
  { value: "rugby", label: "Rugby" },
  { value: "football", label: "Football" },
  { value: "handball", label: "Handball" },
  { value: "basketball", label: "Basketball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "judo", label: "Judo" },
  { value: "aviron", label: "Aviron" },
  { value: "bowling", label: "Bowling" },
];

// Normalize sport type to base sport
export function normalizeToBaseSport(sportType?: string): string | null {
  if (!sportType || sportType === "all") return null;
  
  const normalizedSport = sportType.toLowerCase();
  if (normalizedSport.startsWith('rugby')) return 'rugby';
  if (normalizedSport.startsWith('football')) return 'football';
  if (normalizedSport.startsWith('handball')) return 'handball';
  if (normalizedSport.startsWith('volleyball')) return 'volleyball';
  if (normalizedSport.startsWith('basketball')) return 'basketball';
  if (normalizedSport.startsWith('judo')) return 'judo';
  if (normalizedSport.startsWith('aviron')) return 'aviron';
  if (normalizedSport.startsWith('bowling')) return 'bowling';
  
  return normalizedSport;
}

// Get terrain categories for a specific sport
export function getTerrainCategoriesForSport(sportType?: string): ExerciseCategory[] {
  const terrainCategories = EXERCISE_CATEGORIES.filter(c => c.group === "terrain");
  
  const baseSport = normalizeToBaseSport(sportType);
  if (!baseSport) return terrainCategories;
  
  // Return general terrain categories plus sport-specific ones
  return terrainCategories.filter(c => !c.sport || c.sport === baseSport);
}

// Get all categories filtered for a specific sport (terrain filtered, others kept)
export function getCategoriesForSport(sportType?: string): ExerciseCategory[] {
  const baseSport = normalizeToBaseSport(sportType);
  
  if (!baseSport) return EXERCISE_CATEGORIES;
  
  return EXERCISE_CATEGORIES.filter(c => {
    // Keep non-terrain categories
    if (c.group !== "terrain") return true;
    // For terrain, keep general ones (no sport) and sport-specific ones
    return !c.sport || c.sport === baseSport;
  });
}

// Check if an exercise category belongs to a sport
export function isCategoryForSport(categoryValue: string, sportType?: string): boolean {
  const baseSport = normalizeToBaseSport(sportType);
  if (!baseSport) return true;
  
  const category = EXERCISE_CATEGORIES.find(c => c.value === categoryValue);
  if (!category) return true;
  
  // Non-terrain categories are always valid
  if (category.group !== "terrain") return true;
  
  // For terrain, check if it's general or matches the sport
  return !category.sport || category.sport === baseSport;
}

// Groupes de catégories pour filtrage rapide
export const CATEGORY_GROUPS = [
  { value: "all", label: "Tous" },
  { value: "musculation", label: "Musculation" },
  { value: "cardio_machines", label: "Ergomètres" },
  { value: "reathletisation", label: "Réathlétisation" },
  { value: "terrain", label: "Terrain" },
  { value: "stretching_mobility", label: "Stretching / Mobilité" },
] as const;

// Liste des catégories d'ergomètres (machines cardio avec métriques spécifiques)
export const ERG_CATEGORIES = [
  "ergometre", "skierg", "rowerg", "assault_bike", "echo_bike", "bikeerg"
];

// Check if an exercise category is an ergometer
export function isErgCategory(category: string): boolean {
  return ERG_CATEGORIES.includes(category);
}

export const EXERCISE_SUBCATEGORIES = [
  // Musculation
  { value: "renforcement", label: "Renforcement", parentCategory: "musculation" },
  { value: "conditioning", label: "Conditioning", parentCategory: "musculation" },
  { value: "halterophilie", label: "Haltérophilie", parentCategory: "musculation" },
  { value: "gymnastique", label: "Gymnastique", parentCategory: "musculation" },
  { value: "plyometrie", label: "Pliométrie", parentCategory: "musculation" },
  { value: "hypertrophie", label: "Hypertrophie", parentCategory: "musculation" },
  { value: "force_max", label: "Force maximale", parentCategory: "musculation" },
  { value: "endurance_force", label: "Endurance de force", parentCategory: "musculation" },
  
  // Réathlétisation
  { value: "phase1_protection", label: "Phase 1 - Protection", parentCategory: "reathletisation" },
  { value: "phase2_controlled", label: "Phase 2 - Contrôlé", parentCategory: "reathletisation" },
  { value: "phase3_progressive", label: "Phase 3 - Progressif", parentCategory: "reathletisation" },
  { value: "phase4_return", label: "Phase 4 - Retour terrain", parentCategory: "reathletisation" },
  { value: "prevention", label: "Prévention", parentCategory: "reathletisation" },
  
  // Stretching & Mobilité
  { value: "prophylaxie", label: "Prophylaxie", parentCategory: "stretching_mobility" },
  { value: "mobilite", label: "Mobilité", parentCategory: "stretching_mobility" },
  { value: "echauffement", label: "Échauffement", parentCategory: "stretching_mobility" },
  { value: "retour_calme", label: "Retour au calme", parentCategory: "stretching_mobility" },
  
  // Terrain
  { value: "vitesse_lineaire", label: "Vitesse linéaire", parentCategory: "terrain" },
  { value: "vitesse_changement", label: "Changements de direction", parentCategory: "terrain" },
  { value: "capacite_aerobie", label: "Capacité aérobie", parentCategory: "terrain" },
  { value: "puissance_aerobie", label: "Puissance aérobie", parentCategory: "terrain" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
] as const;

export function getSubcategoriesForCategory(category: string) {
  // Get subcategories based on the group of the category
  const categoryInfo = EXERCISE_CATEGORIES.find(c => c.value === category);
  const group = categoryInfo?.group || category;
  return EXERCISE_SUBCATEGORIES.filter(sub => sub.parentCategory === group);
}

export function getSubcategoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  const subcategory = EXERCISE_SUBCATEGORIES.find(s => s.value === value);
  return subcategory?.label || value;
}

export function getCategoryLabel(value: string): string {
  const category = EXERCISE_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
}

export function getCategoriesByGroup(group: string) {
  if (group === "all") return EXERCISE_CATEGORIES;
  return EXERCISE_CATEGORIES.filter(c => c.group === group);
}

export function getCategoryGroup(categoryValue: string): string | null {
  const category = EXERCISE_CATEGORIES.find(c => c.value === categoryValue);
  return category?.group || null;
}
