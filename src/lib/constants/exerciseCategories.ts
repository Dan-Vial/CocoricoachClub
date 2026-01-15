// Main categories for exercise library and session management
export const EXERCISE_CATEGORIES = [
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
  
  // Terrain
  { value: "cardio", label: "Cardio", group: "terrain" },
  { value: "terrain", label: "Terrain (courses, sprints...)", group: "terrain" },
  { value: "speed", label: "Vitesse", group: "terrain" },
  { value: "agility", label: "Agilité / COD", group: "terrain" },
  { value: "endurance", label: "Endurance", group: "terrain" },
  { value: "interval", label: "Interval Training", group: "terrain" },
  
  // Stretching & Mobilité
  { value: "warmup", label: "Échauffement", group: "stretching_mobility" },
  { value: "mobility", label: "Mobilité", group: "stretching_mobility" },
  { value: "stretching", label: "Stretching statique", group: "stretching_mobility" },
  { value: "dynamic_stretching", label: "Stretching dynamique", group: "stretching_mobility" },
  { value: "foam_rolling", label: "Foam rolling / Auto-massage", group: "stretching_mobility" },
  { value: "recovery", label: "Récupération", group: "stretching_mobility" },
  { value: "breathing", label: "Respiration", group: "stretching_mobility" },
  
  { value: "other", label: "Autre", group: null },
] as const;

// Groupes de catégories pour filtrage rapide
export const CATEGORY_GROUPS = [
  { value: "all", label: "Tous" },
  { value: "musculation", label: "Musculation" },
  { value: "reathletisation", label: "Réathlétisation" },
  { value: "terrain", label: "Terrain" },
  { value: "stretching_mobility", label: "Stretching / Mobilité" },
] as const;

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
