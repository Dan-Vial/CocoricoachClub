// Catalogue des engins de lancer en athlétisme avec poids officiels
// par catégorie d'âge et sexe (source : règlements FFA / World Athletics)

export type ImplementType = "javelot" | "poids" | "disque" | "marteau";

export const IMPLEMENT_LABELS: Record<ImplementType, string> = {
  javelot: "Javelot",
  poids: "Poids",
  disque: "Disque",
  marteau: "Marteau",
};

export type AgeCategory =
  | "minime"
  | "cadet"
  | "junior"
  | "espoir"
  | "senior"
  | "master";

export type Gender = "M" | "F" | "ALL";

export interface ImplementWeight {
  weight_g: number;        // poids en grammes
  age: AgeCategory;
  gender: Gender;          // M / F (ou ALL si mixte)
  label: string;           // libellé affiché (ex: "Cadette (500g)")
}

// ⚠️ Disque : poids en grammes (1000g = 1kg, 1500g = 1.5kg, 1750g = 1.75kg, 2000g = 2kg)
// ⚠️ Marteau : 3000g = 3kg etc.
// ⚠️ Poids (shot put) : 2000g = 2kg etc.

export const IMPLEMENT_WEIGHTS: Record<ImplementType, ImplementWeight[]> = {
  javelot: [
    { weight_g: 400, age: "minime",  gender: "F",   label: "Minime F (400g)" },
    { weight_g: 500, age: "minime",  gender: "M",   label: "Minime M (500g)" },
    { weight_g: 500, age: "cadet",   gender: "F",   label: "Cadette (500g)" },
    { weight_g: 600, age: "cadet",   gender: "M",   label: "Cadet (600g)" },
    { weight_g: 600, age: "junior",  gender: "F",   label: "Junior F (600g)" },
    { weight_g: 700, age: "junior",  gender: "M",   label: "Junior M (700g)" },
    { weight_g: 600, age: "espoir",  gender: "F",   label: "Espoir F (600g)" },
    { weight_g: 800, age: "espoir",  gender: "M",   label: "Espoir M (800g)" },
    { weight_g: 600, age: "senior",  gender: "F",   label: "Senior F (600g)" },
    { weight_g: 800, age: "senior",  gender: "M",   label: "Senior M (800g)" },
  ],
  poids: [
    { weight_g: 2000, age: "minime",  gender: "F",   label: "Minime F (2 kg)" },
    { weight_g: 3000, age: "minime",  gender: "M",   label: "Minime M (3 kg)" },
    { weight_g: 3000, age: "cadet",   gender: "F",   label: "Cadette (3 kg)" },
    { weight_g: 5000, age: "cadet",   gender: "M",   label: "Cadet (5 kg)" },
    { weight_g: 4000, age: "junior",  gender: "F",   label: "Junior F (4 kg)" },
    { weight_g: 6000, age: "junior",  gender: "M",   label: "Junior M (6 kg)" },
    { weight_g: 4000, age: "espoir",  gender: "F",   label: "Espoir F (4 kg)" },
    { weight_g: 7260, age: "espoir",  gender: "M",   label: "Espoir M (7.26 kg)" },
    { weight_g: 4000, age: "senior",  gender: "F",   label: "Senior F (4 kg)" },
    { weight_g: 7260, age: "senior",  gender: "M",   label: "Senior M (7.26 kg)" },
  ],
  disque: [
    { weight_g: 750,  age: "minime",  gender: "F",   label: "Minime F (0.75 kg)" },
    { weight_g: 1000, age: "minime",  gender: "M",   label: "Minime M (1 kg)" },
    { weight_g: 1000, age: "cadet",   gender: "F",   label: "Cadette (1 kg)" },
    { weight_g: 1500, age: "cadet",   gender: "M",   label: "Cadet (1.5 kg)" },
    { weight_g: 1000, age: "junior",  gender: "F",   label: "Junior F (1 kg)" },
    { weight_g: 1750, age: "junior",  gender: "M",   label: "Junior M (1.75 kg)" },
    { weight_g: 1000, age: "espoir",  gender: "F",   label: "Espoir F (1 kg)" },
    { weight_g: 2000, age: "espoir",  gender: "M",   label: "Espoir M (2 kg)" },
    { weight_g: 1000, age: "senior",  gender: "F",   label: "Senior F (1 kg)" },
    { weight_g: 2000, age: "senior",  gender: "M",   label: "Senior M (2 kg)" },
  ],
  marteau: [
    { weight_g: 3000, age: "minime",  gender: "F",   label: "Minime F (3 kg)" },
    { weight_g: 4000, age: "minime",  gender: "M",   label: "Minime M (4 kg)" },
    { weight_g: 3000, age: "cadet",   gender: "F",   label: "Cadette (3 kg)" },
    { weight_g: 5000, age: "cadet",   gender: "M",   label: "Cadet (5 kg)" },
    { weight_g: 4000, age: "junior",  gender: "F",   label: "Junior F (4 kg)" },
    { weight_g: 6000, age: "junior",  gender: "M",   label: "Junior M (6 kg)" },
    { weight_g: 4000, age: "espoir",  gender: "F",   label: "Espoir F (4 kg)" },
    { weight_g: 7260, age: "espoir",  gender: "M",   label: "Espoir M (7.26 kg)" },
    { weight_g: 4000, age: "senior",  gender: "F",   label: "Senior F (4 kg)" },
    { weight_g: 7260, age: "senior",  gender: "M",   label: "Senior M (7.26 kg)" },
  ],
};

/**
 * Détecte la catégorie d'âge à partir du nom de la catégorie.
 */
export function detectAgeCategory(categoryName?: string | null): AgeCategory | null {
  if (!categoryName) return null;
  const n = categoryName.toLowerCase();
  if (n.includes("master") || n.includes("vétéran") || n.includes("veteran")) return "master";
  if (n.includes("minime")) return "minime";
  if (n.includes("cadet")) return "cadet";
  if (n.includes("junior")) return "junior";
  if (n.includes("espoir")) return "espoir";
  if (n.includes("senior") || n.includes("séniore") || n.includes("seniore")) return "senior";
  return null;
}

/**
 * Détecte le sexe à partir du champ gender de la catégorie ('M' / 'F' / 'mixte').
 */
export function detectGender(gender?: string | null): Gender {
  if (!gender) return "ALL";
  const g = gender.toString().toLowerCase();
  if (g.startsWith("f") || g === "feminin" || g === "féminin" || g === "femme") return "F";
  if (g.startsWith("m") || g === "masculin" || g === "homme") return "M";
  return "ALL";
}

/**
 * Renvoie les options de poids filtrées par catégorie d'âge et sexe.
 * Si rien ne correspond, renvoie toutes les options de l'engin.
 */
export function getWeightOptions(
  implement: ImplementType,
  age: AgeCategory | null,
  gender: Gender,
): ImplementWeight[] {
  const all = IMPLEMENT_WEIGHTS[implement] || [];
  if (!age && gender === "ALL") return all;

  const filtered = all.filter((w) => {
    const ageMatch = age ? w.age === age : true;
    const genderMatch = gender === "ALL" ? true : w.gender === gender || w.gender === "ALL";
    return ageMatch && genderMatch;
  });

  return filtered.length > 0 ? filtered : all;
}

/**
 * Détermine si une thématique de bloc correspond à une discipline de lancer.
 */
const THROWING_TRAINING_TYPES = new Set([
  "athle_lancers_technique",
  "athle_rotation",
  "athle_release",
  "athle_force_explosive",
  "athle_glisse",
]);

export function isThrowingBlock(trainingType?: string | null): boolean {
  if (!trainingType) return false;
  return THROWING_TRAINING_TYPES.has(trainingType);
}
