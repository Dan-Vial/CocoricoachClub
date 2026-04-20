/**
 * Maps club-level sport/discipline to the specific competition disciplines available.
 */

export interface CompetitionDiscipline {
  value: string;
  label: string;
}

// All disciplines grouped by club sport
const SNOWBOARD_FREESTYLE_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "slopestyle", label: "Slopestyle" },
  { value: "big_air", label: "Big Air" },
  { value: "halfpipe", label: "Halfpipe" },
  { value: "rail_event", label: "Rail Event" },
];

const SNOWBOARD_ALPIN_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "parallel_gs", label: "Slalom Géant Parallèle" },
  { value: "parallel_slalom", label: "Slalom Parallèle" },
  { value: "snowboardcross", label: "Snowboardcross" },
];

const SKI_ALPIN_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "descente", label: "Descente" },
  { value: "slalom", label: "Slalom" },
  { value: "geant", label: "Géant" },
  { value: "super_g", label: "Super-G" },
  { value: "combine_alpin", label: "Combiné Alpin" },
];

const SKI_FOND_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "sprint_classique", label: "Sprint Classique" },
  { value: "sprint_libre", label: "Sprint Libre" },
  { value: "distance_classique", label: "Distance Classique" },
  { value: "distance_libre", label: "Distance Libre" },
  { value: "skiathlon", label: "Skiathlon" },
  { value: "relais", label: "Relais" },
];

const SKI_BIATHLON_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "sprint_biathlon", label: "Sprint" },
  { value: "poursuite", label: "Poursuite" },
  { value: "individuel", label: "Individuel" },
  { value: "mass_start", label: "Mass Start" },
  { value: "relais_biathlon", label: "Relais" },
  { value: "relais_mixte", label: "Relais Mixte" },
];

const SKI_FREESTYLE_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "bosses", label: "Bosses" },
  { value: "bosses_paralleles", label: "Bosses Parallèles" },
  { value: "saut_acrobatique", label: "Saut Acrobatique" },
  { value: "skicross", label: "Skicross" },
  { value: "slopestyle_ski", label: "Slopestyle" },
  { value: "halfpipe_ski", label: "Halfpipe" },
  { value: "big_air_ski", label: "Big Air" },
];

const SKI_SAUT_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "saut_normal", label: "Tremplin Normal" },
  { value: "saut_grand", label: "Grand Tremplin" },
  { value: "saut_vol", label: "Vol à Ski" },
  { value: "saut_equipe", label: "Par Équipe" },
];

const SKI_COMBINE_NORDIQUE_DISCIPLINES: CompetitionDiscipline[] = [
  { value: "cn_individuel", label: "Individuel" },
  { value: "cn_sprint", label: "Sprint" },
  { value: "cn_equipe", label: "Par Équipe" },
  { value: "cn_mass_start", label: "Mass Start" },
];

// Fallback: all disciplines combined
const ALL_DISCIPLINES: CompetitionDiscipline[] = [
  ...SNOWBOARD_FREESTYLE_DISCIPLINES,
  ...SNOWBOARD_ALPIN_DISCIPLINES,
  ...SKI_ALPIN_DISCIPLINES,
  ...SKI_FREESTYLE_DISCIPLINES,
  { value: "other", label: "Autre" },
];

const DISCIPLINE_MAP: Record<string, CompetitionDiscipline[]> = {
  snowboard_freestyle: SNOWBOARD_FREESTYLE_DISCIPLINES,
  snowboard_alpin: SNOWBOARD_ALPIN_DISCIPLINES,
  ski_alpin: SKI_ALPIN_DISCIPLINES,
  ski_fond: SKI_FOND_DISCIPLINES,
  ski_biathlon: SKI_BIATHLON_DISCIPLINES,
  ski_freestyle: SKI_FREESTYLE_DISCIPLINES,
  ski_saut: SKI_SAUT_DISCIPLINES,
  ski_combine_nordique: SKI_COMBINE_NORDIQUE_DISCIPLINES,
};

/**
 * Get the competition disciplines available for a given club sport value.
 * Falls back to all disciplines if sport is generic "ski" or unknown.
 */
export function getDisciplinesForClubSport(clubSport?: string): CompetitionDiscipline[] {
  if (!clubSport) return ALL_DISCIPLINES;
  
  const mapped = DISCIPLINE_MAP[clubSport];
  if (mapped) return mapped;
  
  // If it's a ski_club / ski_academie / ski_national, show all
  if (clubSport.startsWith("ski") || clubSport.startsWith("snow")) {
    return ALL_DISCIPLINES;
  }
  
  return ALL_DISCIPLINES;
}

/**
 * Get a label for any discipline value
 */
export function getDisciplineLabel(value: string): string {
  for (const discs of Object.values(DISCIPLINE_MAP)) {
    const found = discs.find(d => d.value === value);
    if (found) return found.label;
  }
  return value;
}
