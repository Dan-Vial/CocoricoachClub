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

// Rugby stats (XV, 7s, XIII)
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

// Basketball stats
export const BASKETBALL_STATS: StatField[] = [
  // Scoring
  { key: "points", label: "Points", shortLabel: "Points", category: "scoring", type: "number" },
  { key: "fieldGoalsMade", label: "Paniers réussis", shortLabel: "FG", category: "scoring", type: "number" },
  { key: "fieldGoalsAttempted", label: "Paniers tentés", shortLabel: "FGA", category: "scoring", type: "number" },
  { key: "threePointersMade", label: "3 points réussis", shortLabel: "3P", category: "scoring", type: "number" },
  { key: "threePointersAttempted", label: "3 points tentés", shortLabel: "3PA", category: "scoring", type: "number" },
  { key: "freeThrowsMade", label: "Lancers francs réussis", shortLabel: "FT", category: "scoring", type: "number" },
  { key: "freeThrowsAttempted", label: "Lancers francs tentés", shortLabel: "FTA", category: "scoring", type: "number" },
  // Attack
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "attack", type: "number" },
  { key: "offensiveRebounds", label: "Rebonds offensifs", shortLabel: "RO", category: "attack", type: "number" },
  { key: "turnovers", label: "Pertes de balle", shortLabel: "Pertes", category: "attack", type: "number" },
  // Defense
  { key: "defensiveRebounds", label: "Rebonds défensifs", shortLabel: "RD", category: "defense", type: "number" },
  { key: "totalRebounds", label: "Rebonds totaux", shortLabel: "Reb.", category: "defense", type: "number" },
  { key: "steals", label: "Interceptions", shortLabel: "Steals", category: "defense", type: "number" },
  { key: "blocks", label: "Contres", shortLabel: "Blocks", category: "defense", type: "number" },
  // General
  { key: "personalFouls", label: "Fautes personnelles", shortLabel: "Fautes", category: "general", type: "number" },
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "plusMinus", label: "+/-", shortLabel: "+/-", category: "general", type: "number" },
];

// Judo stats - Focus on coach and physical trainer needs
export const JUDO_STATS: StatField[] = [
  // Scoring / Results
  { key: "combatResult", label: "Résultat (1=Victoire, 0=Défaite)", shortLabel: "Résultat", category: "scoring", type: "number", max: 1 },
  { key: "ippon", label: "Ippon", shortLabel: "Ippon", category: "scoring", type: "number" },
  { key: "wazaAri", label: "Waza-ari", shortLabel: "Waza-ari", category: "scoring", type: "number" },
  { key: "victoryType", label: "Type victoire (1=Ippon, 2=Waza-ari, 3=Décision)", shortLabel: "Type vic.", category: "scoring", type: "number" },
  
  // Attack / Techniques
  { key: "throwAttempts", label: "Tentatives de projection", shortLabel: "Tent. proj.", category: "attack", type: "number" },
  { key: "successfulThrows", label: "Projections réussies", shortLabel: "Proj. réussies", category: "attack", type: "number" },
  { key: "groundworkAttempts", label: "Tentatives au sol", shortLabel: "Tent. sol", category: "attack", type: "number" },
  { key: "groundworkSuccess", label: "Contrôles au sol réussis", shortLabel: "Sol réussi", category: "attack", type: "number" },
  { key: "gripFightingWins", label: "Kumi-kata gagnés", shortLabel: "Kumi-kata", category: "attack", type: "number" },
  { key: "transitionsToGround", label: "Transitions debout-sol", shortLabel: "Transitions", category: "attack", type: "number" },
  
  // Defense
  { key: "throwsDefended", label: "Projections défendues", shortLabel: "Défenses", category: "defense", type: "number" },
  { key: "escapes", label: "Sorties au sol", shortLabel: "Sorties", category: "defense", type: "number" },
  { key: "counterAttacks", label: "Contre-attaques", shortLabel: "Contre-att.", category: "defense", type: "number" },
  { key: "gripBreaks", label: "Cassages de garde", shortLabel: "Cass. garde", category: "defense", type: "number" },
  
  // General / Physical
  { key: "combatDuration", label: "Durée du combat (sec)", shortLabel: "Durée", category: "general", type: "number" },
  { key: "shido", label: "Shido reçus", shortLabel: "Shido", category: "general", type: "number" },
  { key: "competitionWeight", label: "Poids compétition (kg)", shortLabel: "Poids", category: "general", type: "number" },
  { key: "recoveryTime", label: "Temps récupération avant prochain combat (min)", shortLabel: "Récup.", category: "general", type: "number" },
  { key: "perceivedEffort", label: "Effort perçu (RPE 1-10)", shortLabel: "RPE", category: "general", type: "number", max: 10 },
];

// Bowling stats - Score and precision focused
export const BOWLING_STATS: StatField[] = [
  // Score statistics
  { key: "avgScoreScratch", label: "Score moyen (scratch)", shortLabel: "Moy. Scratch", category: "scoring", type: "number", max: 300 },
  { key: "avgScoreHandicap", label: "Score moyen (handicap)", shortLabel: "Moy. Handi.", category: "scoring", type: "number" },
  { key: "strikePercentage", label: "% de strikes", shortLabel: "% Strikes", category: "scoring", type: "number", max: 100 },
  { key: "sparePercentage", label: "% de spares", shortLabel: "% Spares", category: "scoring", type: "number", max: 100 },
  { key: "splitConversionRate", label: "Split conversion rate", shortLabel: "% Split Conv.", category: "scoring", type: "number", max: 100 },
  { key: "splitCount", label: "Nombre de splits", shortLabel: "Splits", category: "scoring", type: "number" },
  { key: "openFrames", label: "Open frames", shortLabel: "Opens", category: "scoring", type: "number" },
  { key: "pinsPerFrame", label: "Pins par frame", shortLabel: "Pins/Frame", category: "scoring", type: "number" },
  { key: "highGame", label: "Meilleur score partie", shortLabel: "High Game", category: "scoring", type: "number", max: 300 },
  { key: "totalPins", label: "Total pins", shortLabel: "Total Pins", category: "scoring", type: "number" },
  
  // Precision statistics
  { key: "targetHitRate", label: "Taux de touche de la cible (board)", shortLabel: "% Cible", category: "attack", type: "number", max: 100 },
  { key: "avgLateralError", label: "Erreur latérale moyenne (boards)", shortLabel: "Err. Latérale", category: "attack", type: "number" },
  { key: "trajectoryVariability", label: "Variabilité de trajectoire", shortLabel: "Var. Traj.", category: "attack", type: "number" },
  { key: "releaseRepeatability", label: "Répétabilité du point de lâcher", shortLabel: "Répét. Lâcher", category: "attack", type: "number", max: 100 },
  
  // General / Competition
  { key: "gamesPlayed", label: "Parties jouées", shortLabel: "Parties", category: "general", type: "number" },
  { key: "seriesScore", label: "Score série (3 parties)", shortLabel: "Série", category: "general", type: "number" },
  { key: "placement", label: "Classement", shortLabel: "Place", category: "general", type: "number" },
];

// Aviron (Rowing) stats - Focus on performance and technique
export const AVIRON_STATS: StatField[] = [
  // Performance / Results
  { key: "placement", label: "Classement final", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "raceTime", label: "Temps de course (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "splitTime500m", label: "Split 500m (sec)", shortLabel: "Split 500m", category: "scoring", type: "number" },
  { key: "splitTime1000m", label: "Split 1000m (sec)", shortLabel: "Split 1000m", category: "scoring", type: "number" },
  { key: "finalSprint", label: "Temps sprint final (sec)", shortLabel: "Sprint", category: "scoring", type: "number" },
  
  // Technique / Power
  { key: "avgStrokeRate", label: "Cadence moyenne (coups/min)", shortLabel: "Cadence", category: "attack", type: "number" },
  { key: "maxStrokeRate", label: "Cadence max (coups/min)", shortLabel: "Cad. max", category: "attack", type: "number" },
  { key: "avgPower", label: "Puissance moyenne (watts)", shortLabel: "Puissance", category: "attack", type: "number" },
  { key: "maxPower", label: "Puissance max (watts)", shortLabel: "Pmax", category: "attack", type: "number" },
  { key: "distancePerStroke", label: "Distance par coup (m)", shortLabel: "Dist/coup", category: "attack", type: "number" },
  { key: "strokeEfficiency", label: "Efficacité du coup (%)", shortLabel: "% Eff.", category: "attack", type: "number", max: 100 },
  
  // Physiological
  { key: "avgHeartRate", label: "FC moyenne (bpm)", shortLabel: "FC moy", category: "defense", type: "number" },
  { key: "maxHeartRate", label: "FC max (bpm)", shortLabel: "FC max", category: "defense", type: "number" },
  { key: "lactatePost", label: "Lactate post-course (mmol/L)", shortLabel: "Lactate", category: "defense", type: "number" },
  
  // General
  { key: "raceDistance", label: "Distance course (m)", shortLabel: "Distance", category: "general", type: "number" },
  { key: "boatType", label: "Type de bateau (1=1x, 2=2x, 4=4x, 8=8+)", shortLabel: "Bateau", category: "general", type: "number" },
  { key: "perceivedEffort", label: "Effort perçu (RPE 1-10)", shortLabel: "RPE", category: "general", type: "number", max: 10 },
  { key: "weatherConditions", label: "Conditions (1=calme, 2=vent léger, 3=vent fort)", shortLabel: "Conditions", category: "general", type: "number" },
];

export type SportType = "XV" | "7" | "XIII" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "aviron" | "bowling" | "academie" | "national_team";

// Helper function to extract base sport from subtypes like "aviron_club", "judo_academie"
function getBaseSport(sportType: string): string {
  // Handle exact rugby types first
  if (["XV", "7", "XIII", "academie", "national_team"].includes(sportType)) {
    return "rugby";
  }
  
  // Extract base sport from subtypes (e.g., "aviron_club" -> "aviron")
  if (sportType.includes("_")) {
    return sportType.split("_")[0].toLowerCase();
  }
  
  return sportType.toLowerCase();
}

export function getStatsForSport(sportType: SportType | string): StatField[] {
  const baseSport = getBaseSport(sportType);
  
  switch (baseSport) {
    case "rugby":
    case "xv":
      return RUGBY_STATS;
    case "football":
      return FOOTBALL_STATS;
    case "handball":
      return HANDBALL_STATS;
    case "volleyball":
      return VOLLEYBALL_STATS;
    case "basketball":
      return BASKETBALL_STATS;
    case "judo":
      return JUDO_STATS;
    case "bowling":
      return BOWLING_STATS;
    case "aviron":
      return AVIRON_STATS;
    default:
      return RUGBY_STATS;
  }
}

export function getStatCategories(sportType: SportType | string): { key: string; label: string }[] {
  const baseSport = getBaseSport(sportType);
  
  const baseCategories = [
    { key: "general", label: "Général" },
    { key: "scoring", label: "Points" },
    { key: "attack", label: "Attaque" },
    { key: "defense", label: "Défense" },
  ];
  
  // Judo uses different terminology
  if (baseSport === "judo") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Résultats" },
      { key: "attack", label: "Techniques" },
      { key: "defense", label: "Défense" },
    ];
  }
  
  // Bowling uses different terminology
  if (baseSport === "bowling") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Scores" },
      { key: "attack", label: "Précision" },
    ];
  }
  
  // Aviron uses different terminology
  if (baseSport === "aviron") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Performance" },
      { key: "attack", label: "Technique/Puissance" },
      { key: "defense", label: "Physiologique" },
    ];
  }
  
  // Basketball uses different terminology
  if (baseSport === "basketball") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
    ];
  }
  
  return baseCategories;
}
