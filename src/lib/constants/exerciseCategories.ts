// Main categories for exercise library and session management
export const EXERCISE_CATEGORIES = [
  { value: "upper_push", label: "Haut - Poussée", group: "musculation" },
  { value: "upper_pull", label: "Haut - Tirage", group: "musculation" },
  { value: "lower_push", label: "Bas - Poussée", group: "musculation" },
  { value: "lower_pull", label: "Bas - Tirage", group: "musculation" },
  { value: "core", label: "Core / Gainage", group: "musculation" },
  { value: "plyometrics", label: "Pliométrie", group: "musculation" },
  { value: "cardio", label: "Cardio", group: "terrain" },
  { value: "mobility", label: "Mobilité", group: "stretching_mobility" },
  { value: "stretching", label: "Stretching", group: "stretching_mobility" },
  { value: "terrain", label: "Terrain (courses, sprints...)", group: "terrain" },
  { value: "other", label: "Autre", group: null },
] as const;

// Groupes de catégories pour filtrage rapide
export const CATEGORY_GROUPS = [
  { value: "all", label: "Tous" },
  { value: "musculation", label: "Musculation" },
  { value: "stretching_mobility", label: "Stretching / Mobilité" },
  { value: "terrain", label: "Terrain" },
] as const;

export const EXERCISE_SUBCATEGORIES = [
  { value: "renforcement", label: "Renforcement", parentCategory: "musculation" },
  { value: "conditioning", label: "Conditioning", parentCategory: "musculation" },
  { value: "halterophilie", label: "Haltérophilie", parentCategory: "musculation" },
  { value: "gymnastique", label: "Gymnastique", parentCategory: "musculation" },
  { value: "plyometrie", label: "Pliométrie", parentCategory: "musculation" },
  { value: "prophylaxie", label: "Prophylaxie / Réathlétisation", parentCategory: "stretching_mobility" },
  { value: "mobilite", label: "Mobilité", parentCategory: "stretching_mobility" },
  { value: "echauffement", label: "Échauffement", parentCategory: "stretching_mobility" },
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
