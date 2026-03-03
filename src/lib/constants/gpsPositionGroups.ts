/**
 * GPS Position Groups per sport for objectives.
 * Each sport defines position groups with their associated position names.
 * Supported sports: Rugby XV, Rugby 7, Rugby XIII, Football
 */

export interface GpsPositionGroup {
  id: string;
  label: string;
  positions: string[];
}

export interface GpsObjectiveTargets {
  total_distance_m?: number | null;
  high_speed_distance_m?: number | null;
  sprint_count?: number | null;
  vmax_percentage?: number | null;
}

export interface GpsTemplateGroup {
  position_group: string;
  targets: GpsObjectiveTargets;
  targets_min?: GpsObjectiveTargets;
}

export interface GpsObjectiveTemplate {
  id: string;
  name: string;
  session_type?: string;
  calendar_context?: string;
  groups: GpsTemplateGroup[];
}

// ===================== SESSION TYPES =====================
export const SESSION_TYPES = [
  { value: "vitesse", label: "Vitesse" },
  { value: "jeu_reduit", label: "Jeu réduit" },
  { value: "technique", label: "Technique" },
  { value: "contact", label: "Contact" },
  { value: "match_simulation", label: "Simulation match" },
  { value: "recuperation", label: "Récupération" },
  { value: "activation", label: "Activation" },
] as const;

export const CALENDAR_CONTEXTS = [
  { value: "match_week", label: "Semaine avec match" },
  { value: "no_match", label: "Semaine sans match" },
  { value: "reprise", label: "Reprise" },
  { value: "congestion", label: "Congestion calendaire" },
] as const;

// ===================== RUGBY XV =====================
export const RUGBY_XV_GPS_GROUPS: GpsPositionGroup[] = [
  {
    id: "avants",
    label: "Avants",
    positions: ["Pilier gauche", "Talonneur", "Pilier droit", "2ème ligne", "Flanker", "N°8"],
  },
  {
    id: "trois_quarts",
    label: "3/4",
    positions: ["Demi de mêlée", "Demi d'ouverture", "1er centre", "2ème centre", "Ailier gauche", "Ailier droit", "Arrière"],
  },
];

export const RUGBY_XV_TEMPLATES: GpsObjectiveTemplate[] = [
  {
    id: "vitesse",
    name: "Vitesse",
    session_type: "vitesse",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 3000, high_speed_distance_m: 300, sprint_count: 5, vmax_percentage: 85 },
        targets: { total_distance_m: 4000, high_speed_distance_m: 500, sprint_count: 10, vmax_percentage: 95 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 4000, high_speed_distance_m: 600, sprint_count: 10, vmax_percentage: 90 },
        targets: { total_distance_m: 5500, high_speed_distance_m: 900, sprint_count: 20, vmax_percentage: 100 },
      },
    ],
  },
  {
    id: "jeu_reduit",
    name: "Jeu réduit",
    session_type: "jeu_reduit",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 3500, high_speed_distance_m: 400, sprint_count: 5, vmax_percentage: 80 },
        targets: { total_distance_m: 5000, high_speed_distance_m: 700, sprint_count: 10, vmax_percentage: 90 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 4500, high_speed_distance_m: 700, sprint_count: 8, vmax_percentage: 85 },
        targets: { total_distance_m: 6000, high_speed_distance_m: 1000, sprint_count: 15, vmax_percentage: 95 },
      },
    ],
  },
  {
    id: "contact",
    name: "Contact",
    session_type: "contact",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 2500, high_speed_distance_m: 200, sprint_count: 3, vmax_percentage: 75 },
        targets: { total_distance_m: 4000, high_speed_distance_m: 400, sprint_count: 6, vmax_percentage: 85 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 3000, high_speed_distance_m: 300, sprint_count: 5, vmax_percentage: 80 },
        targets: { total_distance_m: 4500, high_speed_distance_m: 600, sprint_count: 10, vmax_percentage: 90 },
      },
    ],
  },
  {
    id: "match_simulation",
    name: "Match simulation",
    session_type: "match_simulation",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 5000, high_speed_distance_m: 500, sprint_count: 5, vmax_percentage: 85 },
        targets: { total_distance_m: 7000, high_speed_distance_m: 800, sprint_count: 10, vmax_percentage: 95 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 6000, high_speed_distance_m: 800, sprint_count: 15, vmax_percentage: 90 },
        targets: { total_distance_m: 9000, high_speed_distance_m: 1200, sprint_count: 25, vmax_percentage: 100 },
      },
    ],
  },
  {
    id: "recuperation_xv",
    name: "Récupération",
    session_type: "recuperation",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 1500, high_speed_distance_m: 50, sprint_count: 0, vmax_percentage: 50 },
        targets: { total_distance_m: 2500, high_speed_distance_m: 150, sprint_count: 2, vmax_percentage: 70 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 2000, high_speed_distance_m: 100, sprint_count: 0, vmax_percentage: 55 },
        targets: { total_distance_m: 3000, high_speed_distance_m: 200, sprint_count: 3, vmax_percentage: 75 },
      },
    ],
  },
  {
    id: "activation_xv",
    name: "Activation (veille de match)",
    session_type: "activation",
    calendar_context: "match_week",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 1800, high_speed_distance_m: 100, sprint_count: 2, vmax_percentage: 70 },
        targets: { total_distance_m: 2800, high_speed_distance_m: 250, sprint_count: 5, vmax_percentage: 85 },
      },
      {
        position_group: "3/4",
        targets_min: { total_distance_m: 2200, high_speed_distance_m: 150, sprint_count: 3, vmax_percentage: 75 },
        targets: { total_distance_m: 3200, high_speed_distance_m: 350, sprint_count: 8, vmax_percentage: 90 },
      },
    ],
  },
];

// ===================== RUGBY 7 =====================
export const RUGBY_7S_GPS_GROUPS: GpsPositionGroup[] = [
  { id: "avants", label: "Avants", positions: ["Pilier gauche", "Talonneur", "Pilier droit"] },
  { id: "arrieres", label: "Arrières", positions: ["Demi de mêlée", "Centre gauche", "Centre droit", "Arrière"] },
];

export const RUGBY_7S_TEMPLATES: GpsObjectiveTemplate[] = [
  {
    id: "7s_match_simulation",
    name: "Match simulation (7s)",
    session_type: "match_simulation",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 1200, high_speed_distance_m: 200, sprint_count: 5, vmax_percentage: 85 },
        targets: { total_distance_m: 1800, high_speed_distance_m: 350, sprint_count: 10, vmax_percentage: 95 },
      },
      {
        position_group: "Arrières",
        targets_min: { total_distance_m: 1500, high_speed_distance_m: 350, sprint_count: 8, vmax_percentage: 90 },
        targets: { total_distance_m: 2200, high_speed_distance_m: 500, sprint_count: 15, vmax_percentage: 100 },
      },
    ],
  },
  {
    id: "7s_vitesse",
    name: "Vitesse (7s)",
    session_type: "vitesse",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 1000, high_speed_distance_m: 150, sprint_count: 4, vmax_percentage: 85 },
        targets: { total_distance_m: 1500, high_speed_distance_m: 300, sprint_count: 8, vmax_percentage: 95 },
      },
      {
        position_group: "Arrières",
        targets_min: { total_distance_m: 1200, high_speed_distance_m: 250, sprint_count: 6, vmax_percentage: 90 },
        targets: { total_distance_m: 1800, high_speed_distance_m: 450, sprint_count: 12, vmax_percentage: 100 },
      },
    ],
  },
];

// ===================== RUGBY XIII =====================
export const RUGBY_XIII_GPS_GROUPS: GpsPositionGroup[] = [
  {
    id: "avants",
    label: "Avants",
    positions: ["Pilier gauche", "Talonneur", "Pilier droit", "2ème ligne", "Lock"],
  },
  {
    id: "arrieres",
    label: "Arrières",
    positions: ["Demi de mêlée", "Demi d'ouverture", "Centre gauche", "Centre droit", "Ailier gauche", "Ailier droit", "Arrière"],
  },
];

export const RUGBY_XIII_TEMPLATES: GpsObjectiveTemplate[] = [
  {
    id: "xiii_match_simulation",
    name: "Match simulation (XIII)",
    session_type: "match_simulation",
    groups: [
      {
        position_group: "Avants",
        targets_min: { total_distance_m: 5500, high_speed_distance_m: 400, sprint_count: 5, vmax_percentage: 80 },
        targets: { total_distance_m: 7500, high_speed_distance_m: 700, sprint_count: 10, vmax_percentage: 90 },
      },
      {
        position_group: "Arrières",
        targets_min: { total_distance_m: 6500, high_speed_distance_m: 700, sprint_count: 12, vmax_percentage: 85 },
        targets: { total_distance_m: 9500, high_speed_distance_m: 1100, sprint_count: 22, vmax_percentage: 100 },
      },
    ],
  },
];

// ===================== FOOTBALL =====================
export const FOOTBALL_GPS_GROUPS: GpsPositionGroup[] = [
  { id: "gardien", label: "Gardien", positions: ["Gardien"] },
  { id: "defenseurs", label: "Défenseurs", positions: ["Latéral droit", "Défenseur central", "Latéral gauche"] },
  { id: "milieux", label: "Milieux", positions: ["Milieu défensif", "Milieu central", "Milieu offensif", "Milieu droit", "Milieu gauche"] },
  { id: "attaquants", label: "Attaquants", positions: ["Attaquant", "Ailier droit", "Ailier gauche", "Avant-centre"] },
];

export const FOOTBALL_TEMPLATES: GpsObjectiveTemplate[] = [
  {
    id: "foot_match_simulation",
    name: "Match simulation",
    session_type: "match_simulation",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 4500, high_speed_distance_m: 50, sprint_count: 1, vmax_percentage: 60 }, targets: { total_distance_m: 5500, high_speed_distance_m: 100, sprint_count: 2, vmax_percentage: 70 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 8500, high_speed_distance_m: 450, sprint_count: 10, vmax_percentage: 80 }, targets: { total_distance_m: 10500, high_speed_distance_m: 700, sprint_count: 18, vmax_percentage: 90 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 10000, high_speed_distance_m: 700, sprint_count: 15, vmax_percentage: 85 }, targets: { total_distance_m: 12000, high_speed_distance_m: 1100, sprint_count: 25, vmax_percentage: 95 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 9000, high_speed_distance_m: 800, sprint_count: 18, vmax_percentage: 85 }, targets: { total_distance_m: 11000, high_speed_distance_m: 1200, sprint_count: 30, vmax_percentage: 98 } },
    ],
  },
  {
    id: "foot_intensite",
    name: "Haute intensité",
    session_type: "vitesse",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 2000, high_speed_distance_m: 20, sprint_count: 0, vmax_percentage: 50 }, targets: { total_distance_m: 3000, high_speed_distance_m: 50, sprint_count: 1, vmax_percentage: 60 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 4000, high_speed_distance_m: 300, sprint_count: 5, vmax_percentage: 75 }, targets: { total_distance_m: 5500, high_speed_distance_m: 500, sprint_count: 10, vmax_percentage: 85 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 5000, high_speed_distance_m: 400, sprint_count: 8, vmax_percentage: 80 }, targets: { total_distance_m: 6500, high_speed_distance_m: 600, sprint_count: 15, vmax_percentage: 90 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 4500, high_speed_distance_m: 450, sprint_count: 10, vmax_percentage: 80 }, targets: { total_distance_m: 6000, high_speed_distance_m: 700, sprint_count: 18, vmax_percentage: 92 } },
    ],
  },
  {
    id: "foot_jeu_reduit",
    name: "Jeu réduit",
    session_type: "jeu_reduit",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 1500, high_speed_distance_m: 20, sprint_count: 0, vmax_percentage: 45 }, targets: { total_distance_m: 2500, high_speed_distance_m: 50, sprint_count: 1, vmax_percentage: 60 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 3500, high_speed_distance_m: 250, sprint_count: 4, vmax_percentage: 70 }, targets: { total_distance_m: 5000, high_speed_distance_m: 450, sprint_count: 8, vmax_percentage: 82 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 4500, high_speed_distance_m: 350, sprint_count: 6, vmax_percentage: 75 }, targets: { total_distance_m: 6000, high_speed_distance_m: 550, sprint_count: 12, vmax_percentage: 88 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 4000, high_speed_distance_m: 400, sprint_count: 8, vmax_percentage: 78 }, targets: { total_distance_m: 5500, high_speed_distance_m: 650, sprint_count: 14, vmax_percentage: 90 } },
    ],
  },
  {
    id: "foot_technique",
    name: "Technique",
    session_type: "technique",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 1000, high_speed_distance_m: 10, sprint_count: 0, vmax_percentage: 40 }, targets: { total_distance_m: 2000, high_speed_distance_m: 30, sprint_count: 1, vmax_percentage: 55 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 2500, high_speed_distance_m: 100, sprint_count: 2, vmax_percentage: 60 }, targets: { total_distance_m: 4000, high_speed_distance_m: 250, sprint_count: 5, vmax_percentage: 75 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 3000, high_speed_distance_m: 150, sprint_count: 3, vmax_percentage: 65 }, targets: { total_distance_m: 4500, high_speed_distance_m: 300, sprint_count: 7, vmax_percentage: 78 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 2800, high_speed_distance_m: 120, sprint_count: 3, vmax_percentage: 62 }, targets: { total_distance_m: 4200, high_speed_distance_m: 280, sprint_count: 6, vmax_percentage: 77 } },
    ],
  },
  {
    id: "foot_recuperation",
    name: "Récupération",
    session_type: "recuperation",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 800, high_speed_distance_m: 0, sprint_count: 0, vmax_percentage: 30 }, targets: { total_distance_m: 1500, high_speed_distance_m: 10, sprint_count: 0, vmax_percentage: 45 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 1500, high_speed_distance_m: 30, sprint_count: 0, vmax_percentage: 45 }, targets: { total_distance_m: 2500, high_speed_distance_m: 80, sprint_count: 1, vmax_percentage: 60 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 1800, high_speed_distance_m: 40, sprint_count: 0, vmax_percentage: 48 }, targets: { total_distance_m: 3000, high_speed_distance_m: 100, sprint_count: 2, vmax_percentage: 65 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 1600, high_speed_distance_m: 35, sprint_count: 0, vmax_percentage: 46 }, targets: { total_distance_m: 2800, high_speed_distance_m: 90, sprint_count: 1, vmax_percentage: 62 } },
    ],
  },
  {
    id: "foot_activation",
    name: "Activation (veille de match)",
    session_type: "activation",
    calendar_context: "match_week",
    groups: [
      { position_group: "Gardien", targets_min: { total_distance_m: 1000, high_speed_distance_m: 10, sprint_count: 0, vmax_percentage: 40 }, targets: { total_distance_m: 1800, high_speed_distance_m: 30, sprint_count: 1, vmax_percentage: 55 } },
      { position_group: "Défenseurs", targets_min: { total_distance_m: 2000, high_speed_distance_m: 80, sprint_count: 1, vmax_percentage: 55 }, targets: { total_distance_m: 3200, high_speed_distance_m: 180, sprint_count: 4, vmax_percentage: 72 } },
      { position_group: "Milieux", targets_min: { total_distance_m: 2500, high_speed_distance_m: 120, sprint_count: 2, vmax_percentage: 60 }, targets: { total_distance_m: 3800, high_speed_distance_m: 250, sprint_count: 6, vmax_percentage: 78 } },
      { position_group: "Attaquants", targets_min: { total_distance_m: 2200, high_speed_distance_m: 100, sprint_count: 2, vmax_percentage: 58 }, targets: { total_distance_m: 3500, high_speed_distance_m: 220, sprint_count: 5, vmax_percentage: 75 } },
    ],
  },
];

// ===================== HELPER FUNCTIONS =====================

/**
 * Get position groups for a given sport type
 */
export function getGpsPositionGroups(sportType: string): GpsPositionGroup[] {
  const baseSport = sportType.includes('_') ? sportType.split('_')[0].toLowerCase() : sportType.toLowerCase();
  
  switch (baseSport) {
    case "xv":
    case "academie":
    case "national_team":
      return RUGBY_XV_GPS_GROUPS;
    case "7":
      return RUGBY_7S_GPS_GROUPS;
    case "xiii":
    case "13":
      return RUGBY_XIII_GPS_GROUPS;
    case "football":
      return FOOTBALL_GPS_GROUPS;
    default:
      return RUGBY_XV_GPS_GROUPS;
  }
}

/**
 * Get system templates for a given sport type
 */
export function getSystemTemplates(sportType: string): GpsObjectiveTemplate[] {
  const baseSport = sportType.includes('_') ? sportType.split('_')[0].toLowerCase() : sportType.toLowerCase();
  
  switch (baseSport) {
    case "xv":
    case "academie":
    case "national_team":
      return RUGBY_XV_TEMPLATES;
    case "7":
      return RUGBY_7S_TEMPLATES;
    case "xiii":
    case "13":
      return RUGBY_XIII_TEMPLATES;
    case "football":
      return FOOTBALL_TEMPLATES;
    default:
      return RUGBY_XV_TEMPLATES;
  }
}

/**
 * Check if a sport type supports GPS
 */
export function isSportGpsSupported(sportType: string): boolean {
  const baseSport = sportType.includes('_') ? sportType.split('_')[0].toLowerCase() : sportType.toLowerCase();
  return ["xv", "7", "xiii", "13", "football", "academie", "national_team"].includes(baseSport);
}

/**
 * Suggest best template based on training type and calendar context
 */
export function suggestTemplate(
  templates: GpsObjectiveTemplate[],
  trainingType?: string | null,
  calendarContext?: string | null
): GpsObjectiveTemplate | null {
  if (!trainingType) return null;
  
  const tt = trainingType.toLowerCase();
  
  // Map training_type to session_type
  const typeMap: Record<string, string> = {
    "vitesse": "vitesse",
    "sprint": "vitesse",
    "speed": "vitesse",
    "jeu réduit": "jeu_reduit",
    "jeu reduit": "jeu_reduit",
    "small sided": "jeu_reduit",
    "contact": "contact",
    "ruck": "contact",
    "plaquage": "contact",
    "technique": "technique",
    "tactique": "technique",
    "match": "match_simulation",
    "simulation": "match_simulation",
    "opposition": "match_simulation",
    "récupération": "recuperation",
    "recuperation": "recuperation",
    "recovery": "recuperation",
    "activation": "activation",
    "décrassage": "recuperation",
    "decrassage": "recuperation",
  };
  
  let matchedType: string | null = null;
  for (const [key, val] of Object.entries(typeMap)) {
    if (tt.includes(key)) {
      matchedType = val;
      break;
    }
  }
  
  if (!matchedType) return null;
  
  // First try to match both session_type and calendar_context
  if (calendarContext) {
    const exactMatch = templates.find(t => 
      t.session_type === matchedType && t.calendar_context === calendarContext
    );
    if (exactMatch) return exactMatch;
  }
  
  // Then match just session_type
  const typeMatch = templates.find(t => t.session_type === matchedType);
  return typeMatch || null;
}

/**
 * Determine which position group a player belongs to based on their position
 */
export function getPlayerPositionGroup(
  playerPosition: string | null | undefined,
  groups: GpsPositionGroup[]
): GpsPositionGroup | null {
  if (!playerPosition) return null;
  const lowerPos = playerPosition.toLowerCase();
  
  for (const group of groups) {
    if (group.positions.some(p => lowerPos.includes(p.toLowerCase()) || p.toLowerCase().includes(lowerPos))) {
      return group;
    }
  }
  
  // Try by number for rugby
  const numMatch = playerPosition.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0]);
    for (const group of groups) {
      if (group.id === "avants" && num >= 1 && num <= 8) return group;
      if ((group.id === "trois_quarts" || group.id === "arrieres") && num >= 9 && num <= 15) return group;
    }
  }
  
  return null;
}

/**
 * Calculate the status color based on actual vs target with tolerance
 */
export type ObjectiveStatus = "green" | "orange" | "red" | "none";

export function getObjectiveStatus(
  actual: number | null | undefined,
  target: number | null | undefined,
  toleranceGreen: number = 15,
  toleranceOrange: number = 30
): ObjectiveStatus {
  if (actual == null || target == null || target === 0) return "none";
  
  const deviation = Math.abs((actual - target) / target) * 100;
  
  if (deviation <= toleranceGreen) return "green";
  if (deviation <= toleranceOrange) return "orange";
  return "red";
}

export function getDeviationPercent(
  actual: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (actual == null || target == null || target === 0) return null;
  return Math.round(((actual - target) / target) * 100);
}

/**
 * Determine load direction: over, under, or in target
 */
export type LoadDirection = "over" | "under" | "target";

export function getLoadDirection(
  actual: number | null | undefined,
  target: number | null | undefined,
  tolerancePercent: number = 15
): LoadDirection {
  if (actual == null || target == null || target === 0) return "target";
  const deviation = ((actual - target) / target) * 100;
  if (deviation > tolerancePercent) return "over";
  if (deviation < -tolerancePercent) return "under";
  return "target";
}
