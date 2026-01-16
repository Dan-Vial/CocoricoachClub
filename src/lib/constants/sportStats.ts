// Sport-specific statistics configurations

export interface StatField {
  key: string;
  label: string;
  shortLabel: string;
  category: "scoring" | "attack" | "defense" | "general";
  type: "number" | "time";
  min?: number;
  max?: number;
}

// Rugby stats (XV and 7s)
export const RUGBY_STATS: StatField[] = [
  // Scoring
  { key: "tries", label: "Essais", shortLabel: "Essais", category: "scoring", type: "number" },
  { key: "conversions", label: "Transformations", shortLabel: "Transfo.", category: "scoring", type: "number" },
  { key: "penaltiesScored", label: "Pénalités marquées", shortLabel: "Pénalités", category: "scoring", type: "number" },
  { key: "dropGoals", label: "Drop goals", shortLabel: "Drops", category: "scoring", type: "number" },
  // Attack
  { key: "carries", label: "Ballons portés", shortLabel: "Portés", category: "attack", type: "number" },
  { key: "metersGained", label: "Mètres gagnés", shortLabel: "Mètres", category: "attack", type: "number" },
  { key: "offloads", label: "Offloads", shortLabel: "Offloads", category: "attack", type: "number" },
  { key: "breakthroughs", label: "Franchissements", shortLabel: "Franch.", category: "attack", type: "number" },
  { key: "turnoversWon", label: "Turnovers gagnés", shortLabel: "Turnovers", category: "attack", type: "number" },
  { key: "totalContacts", label: "Contacts totaux", shortLabel: "Contacts", category: "attack", type: "number" },
  // Defense
  { key: "tackles", label: "Plaquages réalisés", shortLabel: "Plaquages", category: "defense", type: "number" },
  { key: "tacklesMissed", label: "Plaquages ratés", shortLabel: "Ratés", category: "defense", type: "number" },
  { key: "defensiveRecoveries", label: "Ballons récupérés", shortLabel: "Récup.", category: "defense", type: "number" },
  // General
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
];

// Football stats
export const FOOTBALL_STATS: StatField[] = [
  // Scoring
  { key: "goals", label: "Buts", shortLabel: "Buts", category: "scoring", type: "number" },
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "scoring", type: "number" },
  { key: "shotsOnTarget", label: "Tirs cadrés", shortLabel: "Tirs cadrés", category: "scoring", type: "number" },
  { key: "shotsOffTarget", label: "Tirs non cadrés", shortLabel: "Tirs NC", category: "scoring", type: "number" },
  // Attack
  { key: "passes", label: "Passes réussies", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "passAccuracy", label: "% Passes réussies", shortLabel: "% Passes", category: "attack", type: "number", max: 100 },
  { key: "dribbles", label: "Dribbles réussis", shortLabel: "Dribbles", category: "attack", type: "number" },
  { key: "crosses", label: "Centres", shortLabel: "Centres", category: "attack", type: "number" },
  { key: "keyPasses", label: "Passes clés", shortLabel: "P. clés", category: "attack", type: "number" },
  // Defense
  { key: "tackles", label: "Tacles", shortLabel: "Tacles", category: "defense", type: "number" },
  { key: "interceptions", label: "Interceptions", shortLabel: "Interc.", category: "defense", type: "number" },
  { key: "clearances", label: "Dégagements", shortLabel: "Dégag.", category: "defense", type: "number" },
  { key: "blockedShots", label: "Tirs bloqués", shortLabel: "Bloqués", category: "defense", type: "number" },
  { key: "foulsCommitted", label: "Fautes commises", shortLabel: "Fautes", category: "defense", type: "number" },
  { key: "foulsWon", label: "Fautes subies", shortLabel: "F. subies", category: "defense", type: "number" },
  // General
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "saves", label: "Arrêts (gardien)", shortLabel: "Arrêts", category: "general", type: "number" },
];

// Handball stats
export const HANDBALL_STATS: StatField[] = [
  // Scoring
  { key: "goals", label: "Buts", shortLabel: "Buts", category: "scoring", type: "number" },
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "scoring", type: "number" },
  { key: "shots", label: "Tirs", shortLabel: "Tirs", category: "scoring", type: "number" },
  { key: "shootingPercentage", label: "% Réussite tir", shortLabel: "% Tir", category: "scoring", type: "number", max: 100 },
  { key: "sevenMeters", label: "7 mètres marqués", shortLabel: "7m", category: "scoring", type: "number" },
  // Attack
  { key: "passes", label: "Passes", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "technicalFaults", label: "Fautes techniques", shortLabel: "F. tech.", category: "attack", type: "number" },
  { key: "turnoversLost", label: "Pertes de balle", shortLabel: "Pertes", category: "attack", type: "number" },
  // Defense
  { key: "steals", label: "Interceptions", shortLabel: "Interc.", category: "defense", type: "number" },
  { key: "blocks", label: "Contres", shortLabel: "Contres", category: "defense", type: "number" },
  { key: "saves", label: "Arrêts (gardien)", shortLabel: "Arrêts", category: "defense", type: "number" },
  { key: "savePercentage", label: "% Arrêts", shortLabel: "% Arrêts", category: "defense", type: "number", max: 100 },
  // General
  { key: "twoMinutes", label: "Exclusions 2 min", shortLabel: "2 min", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
];

// Volleyball stats
export const VOLLEYBALL_STATS: StatField[] = [
  // Scoring
  { key: "kills", label: "Points marqués (kill)", shortLabel: "Kills", category: "scoring", type: "number" },
  { key: "aces", label: "Aces", shortLabel: "Aces", category: "scoring", type: "number" },
  { key: "attackErrors", label: "Erreurs d'attaque", shortLabel: "Err. att.", category: "scoring", type: "number" },
  { key: "attackAttempts", label: "Tentatives d'attaque", shortLabel: "Tent. att.", category: "scoring", type: "number" },
  { key: "attackPercentage", label: "% Attaque", shortLabel: "% Att.", category: "scoring", type: "number", max: 100 },
  // Attack
  { key: "sets", label: "Passes (sets)", shortLabel: "Sets", category: "attack", type: "number" },
  { key: "setAssists", label: "Passes décisives", shortLabel: "Assists", category: "attack", type: "number" },
  { key: "serviceErrors", label: "Erreurs au service", shortLabel: "Err. serv.", category: "attack", type: "number" },
  // Defense
  { key: "blocks", label: "Contres", shortLabel: "Contres", category: "defense", type: "number" },
  { key: "blockSolos", label: "Contres solo", shortLabel: "C. solo", category: "defense", type: "number" },
  { key: "blockAssists", label: "Contres assistés", shortLabel: "C. assist.", category: "defense", type: "number" },
  { key: "digs", label: "Réceptions défensives", shortLabel: "Digs", category: "defense", type: "number" },
  { key: "receptionErrors", label: "Erreurs de réception", shortLabel: "Err. réc.", category: "defense", type: "number" },
  // General
  { key: "points", label: "Points totaux", shortLabel: "Points", category: "general", type: "number" },
];

// Judo stats
export const JUDO_STATS: StatField[] = [
  // Scoring
  { key: "ippon", label: "Ippon", shortLabel: "Ippon", category: "scoring", type: "number" },
  { key: "wazaAri", label: "Waza-ari", shortLabel: "Waza-ari", category: "scoring", type: "number" },
  { key: "yuko", label: "Yuko (ancien)", shortLabel: "Yuko", category: "scoring", type: "number" },
  // Attack
  { key: "successfulTechniques", label: "Techniques réussies", shortLabel: "Tech. réussies", category: "attack", type: "number" },
  { key: "throwAttempts", label: "Tentatives de projection", shortLabel: "Tent. proj.", category: "attack", type: "number" },
  { key: "groundworkSuccess", label: "Travail au sol réussi", shortLabel: "Sol réussi", category: "attack", type: "number" },
  // Defense
  { key: "defensiveActions", label: "Actions défensives", shortLabel: "Défense", category: "defense", type: "number" },
  { key: "counterAttacks", label: "Contre-attaques", shortLabel: "Contre-att.", category: "defense", type: "number" },
  { key: "escapes", label: "Sorties au sol", shortLabel: "Sorties", category: "defense", type: "number" },
  // General
  { key: "shido", label: "Shido", shortLabel: "Shido", category: "general", type: "number" },
  { key: "hansokuMake", label: "Hansoku-make", shortLabel: "H-make", category: "general", type: "number" },
  { key: "combatResult", label: "Résultat (1=V, 0=D)", shortLabel: "Résultat", category: "general", type: "number", max: 1 },
];

export type SportType = "XV" | "7" | "football" | "handball" | "volleyball" | "Judo" | "academie" | "national_team";

export function getStatsForSport(sportType: SportType | string): StatField[] {
  switch (sportType) {
    case "XV":
    case "7":
    case "academie":
    case "national_team":
      return RUGBY_STATS;
    case "football":
      return FOOTBALL_STATS;
    case "handball":
      return HANDBALL_STATS;
    case "volleyball":
      return VOLLEYBALL_STATS;
    case "Judo":
      return JUDO_STATS;
    default:
      return RUGBY_STATS;
  }
}

export function getStatCategories(sportType: SportType | string): { key: string; label: string }[] {
  const baseCategories = [
    { key: "general", label: "Général" },
    { key: "scoring", label: "Points" },
    { key: "attack", label: "Attaque" },
    { key: "defense", label: "Défense" },
  ];
  
  // Judo uses different terminology
  if (sportType === "Judo") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Scores" },
      { key: "attack", label: "Techniques" },
      { key: "defense", label: "Défense" },
    ];
  }
  
  return baseCategories;
}
