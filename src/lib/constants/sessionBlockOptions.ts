/**
 * Options for session block enrichment fields
 */

export const SESSION_TYPES = [
  { value: "technique", label: "Technique" },
  { value: "physique", label: "Physique" },
  { value: "mixte", label: "Mixte" },
  { value: "vitesse", label: "Vitesse" },
  { value: "contact", label: "Contact" },
  { value: "jeu_reduit", label: "Jeu réduit" },
  { value: "simulation_match", label: "Simulation match" },
] as const;

export const SESSION_OBJECTIVES = [
  { value: "aerobie", label: "Aérobie" },
  { value: "anaerobie", label: "Anaérobie" },
  { value: "vitesse_explosivite", label: "Vitesse / Explosivité" },
  { value: "force_contact", label: "Force / Contact" },
  { value: "force_max", label: "Force maximale" },
  { value: "hypertrophie", label: "Hypertrophie" },
  { value: "puissance", label: "Puissance" },
  { value: "endurance_musculaire", label: "Endurance musculaire" },
  { value: "endurance_force", label: "Endurance de force" },
  { value: "mobilite", label: "Mobilité / Souplesse" },
  { value: "proprioception", label: "Proprioception / Équilibre" },
  { value: "prevention_blessures", label: "Prévention blessures" },
  { value: "recuperation", label: "Récupération" },
  { value: "coordination", label: "Coordination / Agilité" },
  { value: "tactique", label: "Tactique" },
  { value: "technique", label: "Technique" },
  { value: "mental", label: "Préparation mentale" },
] as const;

export const TARGET_INTENSITIES = [
  { value: "faible", label: "Faible", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", numericValue: 1 },
  { value: "moderee", label: "Modérée", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", numericValue: 2 },
  { value: "elevee", label: "Élevée", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", numericValue: 3 },
  { value: "tres_elevee", label: "Très élevée", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", numericValue: 4 },
] as const;

export const VOLUME_OPTIONS = [
  { value: "court", label: "Court", numericValue: 1 },
  { value: "moyen", label: "Moyen", numericValue: 2 },
  { value: "long", label: "Long", numericValue: 3 },
] as const;

export const CONTACT_CHARGE_OPTIONS = [
  { value: "aucun", label: "Aucun", numericValue: 0 },
  { value: "faible", label: "Faible", numericValue: 1 },
  { value: "modere", label: "Modéré", numericValue: 2 },
  { value: "eleve", label: "Élevé", numericValue: 3 },
] as const;

export function getSessionTypeLabel(value: string): string {
  const found = SESSION_TYPES.find(t => t.value === value);
  if (found) return found.label;
  // Clean up: replace underscores, capitalize first letter only, keep rest lowercase
  const cleaned = value.replace(/_/g, " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function getObjectiveLabel(value: string): string {
  return SESSION_OBJECTIVES.find(o => o.value === value)?.label || value;
}

export function getIntensityLabel(value: string): string {
  return TARGET_INTENSITIES.find(i => i.value === value)?.label || value;
}

export function getVolumeLabel(value: string): string {
  return VOLUME_OPTIONS.find(v => v.value === value)?.label || value;
}

export function getContactChargeLabel(value: string): string {
  return CONTACT_CHARGE_OPTIONS.find(c => c.value === value)?.label || value;
}

export function getIntensityNumeric(value: string): number {
  return TARGET_INTENSITIES.find(i => i.value === value)?.numericValue || 0;
}

export function getVolumeNumeric(value: string): number {
  return VOLUME_OPTIONS.find(v => v.value === value)?.numericValue || 0;
}

export function getContactChargeNumeric(value: string): number {
  return CONTACT_CHARGE_OPTIONS.find(c => c.value === value)?.numericValue || 0;
}

/**
 * Calculate session summary from blocks
 */
export interface SessionBlockSummary {
  avgIntensity: string | null;
  avgVolume: string | null;
  avgContactCharge: string | null;
  dominantObjectives: string[];
  mainSessionType: string | null;
  secondarySessionTypes: string[];
  avgRpeIntensity: number | null;
}

export function calculateBlocksSummary(blocks: Array<{
  training_type?: string;
  session_type?: string | null;
  objective?: string | null;
  target_intensity?: string | null;
  volume?: string | null;
  contact_charge?: string | null;
  intensity?: number | null;
}>): SessionBlockSummary {
  const filledBlocks = blocks.filter(b => b.training_type || b.objective || b.target_intensity);
  if (filledBlocks.length === 0) {
    return {
      avgIntensity: null,
      avgVolume: null,
      avgContactCharge: null,
      dominantObjectives: [],
      mainSessionType: null,
      secondarySessionTypes: [],
      avgRpeIntensity: null,
    };
  }

  // Average intensity
  const intensities = filledBlocks.filter(b => b.target_intensity).map(b => getIntensityNumeric(b.target_intensity!));
  const avgIntNum = intensities.length > 0 ? Math.round(intensities.reduce((a, b) => a + b, 0) / intensities.length) : null;
  const avgIntensity = avgIntNum !== null ? TARGET_INTENSITIES.find(i => i.numericValue === avgIntNum)?.value || null : null;

  // Average volume
  const volumes = filledBlocks.filter(b => b.volume).map(b => getVolumeNumeric(b.volume!));
  const avgVolNum = volumes.length > 0 ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length) : null;
  const avgVolume = avgVolNum !== null ? VOLUME_OPTIONS.find(v => v.numericValue === avgVolNum)?.value || null : null;

  // Average contact charge
  const contacts = filledBlocks.filter(b => b.contact_charge).map(b => getContactChargeNumeric(b.contact_charge!));
  const avgContNum = contacts.length > 0 ? Math.round(contacts.reduce((a, b) => a + b, 0) / contacts.length) : null;
  const avgContactCharge = avgContNum !== null ? CONTACT_CHARGE_OPTIONS.find(c => c.numericValue === avgContNum)?.value || null : null;

  // Dominant objectives (count occurrences)
  const objectiveCounts = new Map<string, number>();
  filledBlocks.forEach(b => {
    if (b.objective) {
      objectiveCounts.set(b.objective, (objectiveCounts.get(b.objective) || 0) + 1);
    }
  });
  const dominantObjectives = Array.from(objectiveCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([obj]) => obj);

  // Session types - based on training_type (thématique)
  const typeCounts = new Map<string, number>();
  filledBlocks.forEach(b => {
    if (b.training_type) {
      typeCounts.set(b.training_type, (typeCounts.get(b.training_type) || 0) + 1);
    }
  });
  const sortedTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const uniqueTypes = sortedTypes.map(([t]) => t);
  
  let mainSessionType: string | null = null;
  let secondarySessionTypes: string[] = [];
  
  if (uniqueTypes.length === 1) {
    mainSessionType = uniqueTypes[0];
  } else if (uniqueTypes.length > 1) {
    mainSessionType = "Mixte";
    secondarySessionTypes = uniqueTypes;
  }

  // Average RPE intensity
  const rpeValues = blocks.filter(b => b.intensity != null).map(b => b.intensity!);
  const avgRpeIntensity = rpeValues.length > 0 ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10 : null;

  return {
    avgIntensity,
    avgVolume,
    avgContactCharge,
    dominantObjectives,
    mainSessionType,
    secondarySessionTypes,
    avgRpeIntensity,
  };
}
