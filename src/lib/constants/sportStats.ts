// Sport-specific statistics configurations

export interface StatField {
  key: string;
  label: string;
  shortLabel: string;
  category: "scoring" | "attack" | "defense" | "general" | "individual";
  type: "number" | "time" | "percentage";
  min?: number;
  max?: number;
  isMatchLevel?: boolean;
  // For auto-computed percentage stats: defines source keys
  // successKey = numerator, totalKey = denominator (if explicit), failureKey = if set, total = successKey + failureKey
  computedFrom?: { successKey: string; totalKey?: string; failureKey?: string };
}

// Rugby stats (XV, 7s, XIII) - Enriched
export const RUGBY_STATS: StatField[] = [
  // Individual Stats - Scoring
  { key: "tries", label: "Essais", shortLabel: "Essais", category: "scoring", type: "number" },
  { key: "tryAssists", label: "Passes décisives (essai)", shortLabel: "Assists", category: "scoring", type: "number" },
  { key: "conversions", label: "Transformations", shortLabel: "Transfo.", category: "scoring", type: "number" },
  { key: "conversionAttempts", label: "Tentatives transfo.", shortLabel: "Tent. tr.", category: "scoring", type: "number" },
  { key: "penaltiesScored", label: "Pénalités marquées", shortLabel: "Pénalités", category: "scoring", type: "number" },
  { key: "penaltyAttempts", label: "Tentatives pénalités", shortLabel: "Tent. pén.", category: "scoring", type: "number" },
  { key: "dropGoals", label: "Drop goals", shortLabel: "Drops", category: "scoring", type: "number" },
  { key: "dropAttempts", label: "Tentatives drops", shortLabel: "Tent. drop", category: "scoring", type: "number" },
  { key: "points", label: "Points marqués", shortLabel: "Points", category: "scoring", type: "number" },
  // Individual Stats - Attack
  { key: "carries", label: "Ballons portés", shortLabel: "Portés", category: "attack", type: "number" },
  { key: "metersGained", label: "Mètres gagnés", shortLabel: "Mètres", category: "attack", type: "number" },
  { key: "postContactMeters", label: "Mètres après contact", shortLabel: "Post-contact", category: "attack", type: "number" },
  { key: "offloads", label: "Offloads", shortLabel: "Offloads", category: "attack", type: "number" },
  { key: "breakthroughs", label: "Franchissements", shortLabel: "Franch.", category: "attack", type: "number" },
  { key: "defendersBeaten", label: "Défenseurs battus", shortLabel: "Déf. battus", category: "attack", type: "number" },
  { key: "turnoversWon", label: "Turnovers gagnés", shortLabel: "Turnovers", category: "attack", type: "number" },
  { key: "totalContacts", label: "Contacts totaux", shortLabel: "Contacts", category: "attack", type: "number" },
  { key: "passes", label: "Passes", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "kicksFromHand", label: "Jeux au pied", shortLabel: "Coups pied", category: "attack", type: "number" },
  { key: "kickMeters", label: "Mètres au pied", shortLabel: "M. pied", category: "attack", type: "number" },
  { key: "lineBreaks", label: "Lignes cassées", shortLabel: "L. cassées", category: "attack", type: "number" },
  { key: "cleanBreaks", label: "Percées nettes", shortLabel: "Percées", category: "attack", type: "number" },
  // Individual Stats - Defense
  { key: "tackles", label: "Plaquages réalisés", shortLabel: "Plaquages", category: "defense", type: "number" },
  { key: "tacklesMissed", label: "Plaquages ratés", shortLabel: "Ratés", category: "defense", type: "number" },
  { key: "tackleSuccess", label: "% plaquages réussis", shortLabel: "% Plaq.", category: "defense", type: "percentage", max: 100, computedFrom: { successKey: "tackles", failureKey: "tacklesMissed" } },
  { key: "dominantTackles", label: "Plaquages dominants", shortLabel: "Plaq. dom.", category: "defense", type: "number" },
  { key: "defensiveRecoveries", label: "Ballons récupérés", shortLabel: "Récup.", category: "defense", type: "number" },
  { key: "turnoversLost", label: "Ballons perdus", shortLabel: "Pertes", category: "defense", type: "number" },
  { key: "penaltiesConceded", label: "Pénalités concédées", shortLabel: "Pén. conc.", category: "defense", type: "number" },
  { key: "jackalWins", label: "Grattages réussis", shortLabel: "Grattages", category: "defense", type: "number" },
  { key: "defenseCollisions", label: "Nombre de collisions", shortLabel: "Collisions", category: "defense", type: "number" },
  { key: "defenseCollisionsOver5m", label: "Collision +5m", shortLabel: "Coll. +5m", category: "defense", type: "number" },
  { key: "defenseCollisionsUnder5m", label: "Collision -5m", shortLabel: "Coll. -5m", category: "defense", type: "number" },
  // Scrum & Lineout - Our scrums/lineouts (Général)
  { key: "scrumTotal", label: "Mêlées introduites", shortLabel: "Mêl. intro.", category: "general", type: "number" },
  { key: "scrumWon", label: "Mêlées conservées", shortLabel: "Mêl. cons.", category: "general", type: "number" },
  { key: "scrumSuccessRate", label: "% Mêlées conservées", shortLabel: "% Mêl.", category: "general", type: "percentage", max: 100, computedFrom: { successKey: "scrumWon", totalKey: "scrumTotal" } },
  { key: "scrumPenaltiesWon", label: "Pén. mêlées gagnées", shortLabel: "Pén. mêl.", category: "general", type: "number" },
  { key: "lineoutTotal", label: "Touches introduites", shortLabel: "T. intro.", category: "general", type: "number" },
  { key: "lineoutWon", label: "Touches conservées", shortLabel: "T. cons.", category: "general", type: "number" },
  { key: "lineoutSuccessRate", label: "% Touches conservées", shortLabel: "% Touch.", category: "general", type: "percentage", max: 100, computedFrom: { successKey: "lineoutWon", totalKey: "lineoutTotal" } },
  // Scrum & Lineout - Opponent scrums/lineouts (Général)
  { key: "scrumDefenseTotal", label: "Mêlées adverses", shortLabel: "Mêl. adv.", category: "general", type: "number" },
  { key: "scrumDefenseWon", label: "Mêlées adverses gagnées", shortLabel: "Mêl. adv. G.", category: "general", type: "number" },
  { key: "scrumDefenseRate", label: "% Mêlées adverses gagnées", shortLabel: "% Mêl. D.", category: "general", type: "percentage", max: 100, computedFrom: { successKey: "scrumDefenseWon", totalKey: "scrumDefenseTotal" } },
  { key: "lineoutDefenseTotal", label: "Touches adverses", shortLabel: "T. adv.", category: "general", type: "number" },
  { key: "lineoutSteals", label: "Touches adverses volées", shortLabel: "T. volées", category: "general", type: "number" },
  { key: "lineoutDefenseRate", label: "% Touches adverses volées", shortLabel: "% T. vol.", category: "general", type: "percentage", max: 100, computedFrom: { successKey: "lineoutSteals", totalKey: "lineoutDefenseTotal" } },
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "totalCollisions", label: "Collisions totales", shortLabel: "Collisions", category: "general", type: "number" },
  { key: "collisionsOver5m", label: "Collision +5m (élan ≥5m)", shortLabel: "Coll. +5m", category: "general", type: "number" },
  { key: "collisionsUnder5m", label: "Collision -5m (quasi statique)", shortLabel: "Coll. -5m", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
  { key: "fouls", label: "Fautes", shortLabel: "Fautes", category: "general", type: "number" },
];

// Football stats - Enriched
export const FOOTBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "totalDistance", label: "Distance totale (m)", shortLabel: "Distance", category: "general", type: "number" },
  { key: "sprintCount", label: "Nombre de sprints", shortLabel: "Sprints", category: "general", type: "number" },
  { key: "sprintDistance", label: "Distance sprints (m)", shortLabel: "Dist. sprint", category: "general", type: "number" },
  { key: "topSpeed", label: "Vitesse max (km/h)", shortLabel: "V. max", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
  { key: "fouls", label: "Fautes", shortLabel: "Fautes", category: "general", type: "number" },
  // Individual Stats - Scoring
  { key: "goals", label: "Buts", shortLabel: "Buts", category: "scoring", type: "number" },
  { key: "penaltyGoals", label: "Buts sur penalty", shortLabel: "Pén. marqués", category: "scoring", type: "number" },
  { key: "headedGoals", label: "Buts de la tête", shortLabel: "Têtes", category: "scoring", type: "number" },
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "scoring", type: "number" },
  { key: "shotsOnTarget", label: "Tirs cadrés", shortLabel: "Tirs cadrés", category: "scoring", type: "number" },
  { key: "shotsOffTarget", label: "Tirs non cadrés", shortLabel: "Tirs NC", category: "scoring", type: "number" },
  { key: "shotsBlocked", label: "Tirs contrés", shortLabel: "Contrés", category: "scoring", type: "number" },
  { key: "bigChances", label: "Grosses occasions", shortLabel: "Grosses occ.", category: "scoring", type: "number" },
  { key: "bigChancesMissed", label: "Grosses occ. ratées", shortLabel: "Occ. ratées", category: "scoring", type: "number" },
  { key: "xG", label: "Expected Goals (xG)", shortLabel: "xG", category: "scoring", type: "number" },
  // Individual Stats - Attack
  { key: "passes", label: "Passes réussies", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "passesAttempted", label: "Passes tentées", shortLabel: "P. tent.", category: "attack", type: "number" },
  { key: "passAccuracy", label: "% Passes réussies", shortLabel: "% Passes", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "passes", totalKey: "passesAttempted" } },
  { key: "longBalls", label: "Longs ballons réussis", shortLabel: "Longs B.", category: "attack", type: "number" },
  { key: "throughBalls", label: "Passes en profondeur", shortLabel: "Profondeur", category: "attack", type: "number" },
  { key: "duelsWon", label: "Duels gagnés", shortLabel: "Duels", category: "attack", type: "number" },
  { key: "aerialDuelsWon", label: "Duels aériens gagnés", shortLabel: "D. aériens", category: "attack", type: "number" },
  { key: "dribbles", label: "Dribbles réussis", shortLabel: "Dribbles", category: "attack", type: "number" },
  { key: "dribblesAttempted", label: "Dribbles tentés", shortLabel: "Drib. tent.", category: "attack", type: "number" },
  { key: "crosses", label: "Centres", shortLabel: "Centres", category: "attack", type: "number" },
  { key: "crossesAccurate", label: "Centres réussis", shortLabel: "C. réussis", category: "attack", type: "number" },
  { key: "keyPasses", label: "Passes clés", shortLabel: "P. clés", category: "attack", type: "number" },
  { key: "touches", label: "Touches de balle", shortLabel: "Touches", category: "attack", type: "number" },
  { key: "possessionWon", label: "Ballons récupérés", shortLabel: "Récup.", category: "attack", type: "number" },
  { key: "possessionLost", label: "Ballons perdus", shortLabel: "Pertes", category: "attack", type: "number" },
  // Individual Stats - Defense
  { key: "tackles", label: "Tacles", shortLabel: "Tacles", category: "defense", type: "number" },
  { key: "tacklesWon", label: "Tacles réussis", shortLabel: "T. réussis", category: "defense", type: "number" },
  { key: "interceptions", label: "Interceptions", shortLabel: "Interc.", category: "defense", type: "number" },
  { key: "clearances", label: "Dégagements", shortLabel: "Dégag.", category: "defense", type: "number" },
  { key: "blockedShots", label: "Tirs bloqués", shortLabel: "Bloqués", category: "defense", type: "number" },
  { key: "foulsCommitted", label: "Fautes commises", shortLabel: "Fautes", category: "defense", type: "number" },
  { key: "foulsWon", label: "Fautes subies", shortLabel: "F. subies", category: "defense", type: "number" },
  { key: "offsidesCaught", label: "Hors-jeux provoqués", shortLabel: "HJ prov.", category: "defense", type: "number" },
  { key: "errorsLeadingToGoal", label: "Erreurs menant au but", shortLabel: "Err. but", category: "defense", type: "number" },
  { key: "ownGoals", label: "Buts contre son camp", shortLabel: "CSC", category: "defense", type: "number" },
];

// Football goalkeeper stats
export const FOOTBALL_GOALKEEPER_STATS: StatField[] = [
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "saves", label: "Arrêts", shortLabel: "Arrêts", category: "scoring", type: "number" },
  { key: "savePercentage", label: "% Arrêts", shortLabel: "% Arrêts", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "saves", failureKey: "goalsAgainst" } },
  { key: "goalsAgainst", label: "Buts encaissés", shortLabel: "Buts enc.", category: "scoring", type: "number" },
  { key: "cleanSheets", label: "Clean sheets", shortLabel: "CS", category: "scoring", type: "number" },
  { key: "penaltiesSaved", label: "Pénaltys arrêtés", shortLabel: "Pén. arrêtés", category: "defense", type: "number" },
  { key: "highClaims", label: "Sorties aériennes", shortLabel: "Sorties aér.", category: "defense", type: "number" },
  { key: "punches", label: "Dégagements poings", shortLabel: "Poings", category: "defense", type: "number" },
  { key: "throwouts", label: "Relances à la main", shortLabel: "Rel. main", category: "attack", type: "number" },
  { key: "goalKicks", label: "Relances au pied", shortLabel: "Rel. pied", category: "attack", type: "number" },
  { key: "passAccuracy", label: "% Passes réussies", shortLabel: "% Passes", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "passes", totalKey: "passesAttempted" } },
];

// Handball stats - Enriched
export const HANDBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "playingTime", label: "Temps de jeu (min)", shortLabel: "Temps jeu", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "twoMinutes", label: "Exclusions 2 min", shortLabel: "2 min", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
  { key: "fouls", label: "Fautes", shortLabel: "Fautes", category: "general", type: "number" },
  // Individual Stats - Scoring
  { key: "goals", label: "Buts", shortLabel: "Buts", category: "scoring", type: "number" },
  { key: "shots", label: "Tirs", shortLabel: "Tirs", category: "scoring", type: "number" },
  { key: "shootingPercentage", label: "% Réussite tirs", shortLabel: "% Tir", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "goals", totalKey: "shots" } },
  { key: "goalsFromWing", label: "Buts ailier", shortLabel: "B. ailier", category: "scoring", type: "number" },
  { key: "goalsFromPivot", label: "Buts pivot", shortLabel: "B. pivot", category: "scoring", type: "number" },
  { key: "goalsFromBackcourt", label: "Buts arrière", shortLabel: "B. arrière", category: "scoring", type: "number" },
  { key: "goalsFromFastBreak", label: "Buts contre-attaque", shortLabel: "B. CA", category: "scoring", type: "number" },
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "scoring", type: "number" },
  { key: "sevenMeters", label: "7 mètres marqués", shortLabel: "7m", category: "scoring", type: "number" },
  { key: "sevenMetersAttempted", label: "7 mètres tentés", shortLabel: "7m tent.", category: "scoring", type: "number" },
  // Individual Stats - Attack
  { key: "passes", label: "Passes", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "technicalFaults", label: "Fautes techniques", shortLabel: "F. tech.", category: "attack", type: "number" },
  { key: "turnoversLost", label: "Pertes de balle", shortLabel: "Pertes", category: "attack", type: "number" },
  { key: "foulsCommitted", label: "Fautes commises", shortLabel: "Fautes", category: "attack", type: "number" },
  { key: "foulsWon", label: "Fautes subies", shortLabel: "F. subies", category: "attack", type: "number" },
  { key: "sevenMetersWon", label: "7m obtenus", shortLabel: "7m obt.", category: "attack", type: "number" },
  // Individual Stats - Defense
  { key: "steals", label: "Interceptions", shortLabel: "Interc.", category: "defense", type: "number" },
  { key: "blocks", label: "Contres", shortLabel: "Contres", category: "defense", type: "number" },
  { key: "blockedShots", label: "Tirs bloqués", shortLabel: "T. bloqués", category: "defense", type: "number" },
  { key: "forcedTurnovers", label: "Pertes provoquées", shortLabel: "Pertes prov.", category: "defense", type: "number" },
];

// Handball goalkeeper stats
export const HANDBALL_GOALKEEPER_STATS: StatField[] = [
  { key: "playingTime", label: "Temps de jeu (min)", shortLabel: "Temps jeu", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "twoMinutes", label: "Exclusions 2 min", shortLabel: "2 min", category: "general", type: "number" },
  { key: "saves", label: "Arrêts", shortLabel: "Arrêts", category: "scoring", type: "number" },
  { key: "savePercentage", label: "% Arrêts", shortLabel: "% Arrêts", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "saves", failureKey: "goalsAgainst" } },
  { key: "goalsAgainst", label: "Buts encaissés", shortLabel: "Buts enc.", category: "scoring", type: "number" },
  { key: "sevenMetersSaved", label: "7m arrêtés", shortLabel: "7m arr.", category: "defense", type: "number" },
  { key: "fastBreakSaves", label: "Arrêts contre-attaque", shortLabel: "Arr. CA", category: "defense", type: "number" },
  { key: "goals", label: "Buts marqués", shortLabel: "Buts", category: "attack", type: "number" },
  { key: "assists", label: "Passes décisives", shortLabel: "Assists", category: "attack", type: "number" },
];

// Volleyball stats - Enriched
export const VOLLEYBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "setsPlayed", label: "Sets joués", shortLabel: "Sets", category: "general", type: "number" },
  { key: "playingTime", label: "Temps de jeu (min)", shortLabel: "Temps jeu", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "jumpCount", label: "Nombre de sauts", shortLabel: "Sauts", category: "general", type: "number" },
  { key: "attackJumps", label: "Sauts d'attaque", shortLabel: "S. attaque", category: "general", type: "number" },
  { key: "blockJumps", label: "Sauts de contre", shortLabel: "S. contre", category: "general", type: "number" },
  { key: "manOfMatch", label: "Joueur du match", shortLabel: "JDM", category: "general", type: "number", max: 1 },
  { key: "fouls", label: "Fautes", shortLabel: "Fautes", category: "general", type: "number" },
  // Individual Stats - Scoring
  { key: "points", label: "Points marqués", shortLabel: "Points", category: "scoring", type: "number" },
  { key: "kills", label: "Points marqués (kill)", shortLabel: "Kills", category: "scoring", type: "number" },
  { key: "aces", label: "Aces", shortLabel: "Aces", category: "scoring", type: "number" },
  { key: "acePercentage", label: "% Aces", shortLabel: "% Aces", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "aces", totalKey: "serviceAttempts" } },
  { key: "attackErrors", label: "Erreurs d'attaque", shortLabel: "Err. att.", category: "scoring", type: "number" },
  { key: "attackAttempts", label: "Tentatives d'attaque", shortLabel: "Tent. att.", category: "scoring", type: "number" },
  { key: "attackPercentage", label: "% Attaque", shortLabel: "% Att.", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "kills", totalKey: "attackAttempts" } },
  { key: "killPercentage", label: "% Kill", shortLabel: "% Kill", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "kills", totalKey: "attackAttempts" } },
  // Individual Stats - Attack
  { key: "sets", label: "Passes (sets)", shortLabel: "Sets", category: "attack", type: "number" },
  { key: "setAssists", label: "Passes décisives", shortLabel: "Assists", category: "attack", type: "number" },
  { key: "setErrors", label: "Erreurs de passe", shortLabel: "Err. passe", category: "attack", type: "number" },
  { key: "serviceErrors", label: "Erreurs au service", shortLabel: "Err. serv.", category: "attack", type: "number" },
  { key: "serviceAttempts", label: "Services tentés", shortLabel: "Serv. tent.", category: "attack", type: "number" },
  { key: "serviceAcePercentage", label: "% Ace service", shortLabel: "% Ace", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "aces", totalKey: "serviceAttempts" } },
  // Individual Stats - Defense
  { key: "blocks", label: "Contres", shortLabel: "Contres", category: "defense", type: "number" },
  { key: "blockSolos", label: "Contres solo", shortLabel: "C. solo", category: "defense", type: "number" },
  { key: "blockAssists", label: "Contres assistés", shortLabel: "C. assist.", category: "defense", type: "number" },
  { key: "blockErrors", label: "Erreurs de contre", shortLabel: "Err. contre", category: "defense", type: "number" },
  { key: "digs", label: "Réceptions défensives", shortLabel: "Digs", category: "defense", type: "number" },
  { key: "digErrors", label: "Erreurs de réception déf.", shortLabel: "Err. dig", category: "defense", type: "number" },
  { key: "receptionErrors", label: "Erreurs de réception", shortLabel: "Err. réc.", category: "defense", type: "number" },
  { key: "receptionAttempts", label: "Réceptions tentées", shortLabel: "Réc. tent.", category: "defense", type: "number" },
  { key: "receptionPercentage", label: "% Réception", shortLabel: "% Réc.", category: "defense", type: "percentage", max: 100, computedFrom: { successKey: "digs", totalKey: "receptionAttempts" } },
  { key: "perfectReceptions", label: "Réceptions parfaites", shortLabel: "Réc. parf.", category: "defense", type: "number" },
];

// Basketball stats - Enriched
export const BASKETBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "effectivePlayingTime", label: "Temps de jeu effectif (min)", shortLabel: "TJE", category: "general", type: "number" },
  { key: "longestSequence", label: "Séquence la plus longue (min)", shortLabel: "Séq. max", category: "general", type: "number" },
  { key: "averageSequence", label: "Séquence moyenne (min)", shortLabel: "Séq. moy.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "personalFouls", label: "Fautes personnelles", shortLabel: "Fautes", category: "general", type: "number" },
  { key: "technicalFouls", label: "Fautes techniques", shortLabel: "F. tech.", category: "general", type: "number" },
  { key: "plusMinus", label: "+/-", shortLabel: "+/-", category: "general", type: "number" },
  { key: "efficiency", label: "Efficacité (EFF)", shortLabel: "EFF", category: "general", type: "number" },
  { key: "manOfMatch", label: "MVP", shortLabel: "MVP", category: "general", type: "number", max: 1 },
  // Individual Stats - Scoring
  { key: "points", label: "Points", shortLabel: "Points", category: "scoring", type: "number" },
  { key: "fieldGoalsMade", label: "Paniers réussis", shortLabel: "FG", category: "scoring", type: "number" },
  { key: "fieldGoalsAttempted", label: "Paniers tentés", shortLabel: "FGA", category: "scoring", type: "number" },
  { key: "fieldGoalPercentage", label: "% Paniers", shortLabel: "FG%", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "fieldGoalsMade", totalKey: "fieldGoalsAttempted" } },
  { key: "threePointersMade", label: "3 points réussis", shortLabel: "3P", category: "scoring", type: "number" },
  { key: "threePointersAttempted", label: "3 points tentés", shortLabel: "3PA", category: "scoring", type: "number" },
  { key: "threePointPercentage", label: "% 3 points", shortLabel: "3P%", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "threePointersMade", totalKey: "threePointersAttempted" } },
  { key: "twoPointersMade", label: "2 points réussis", shortLabel: "2P", category: "scoring", type: "number" },
  { key: "twoPointersAttempted", label: "2 points tentés", shortLabel: "2PA", category: "scoring", type: "number" },
  { key: "freeThrowsMade", label: "Lancers francs réussis", shortLabel: "FT", category: "scoring", type: "number" },
  { key: "freeThrowsAttempted", label: "Lancers francs tentés", shortLabel: "FTA", category: "scoring", type: "number" },
  { key: "freeThrowPercentage", label: "% Lancers francs", shortLabel: "FT%", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "freeThrowsMade", totalKey: "freeThrowsAttempted" } },
  { key: "pointsInPaint", label: "Points dans la raquette", shortLabel: "Raquette", category: "scoring", type: "number" },
  { key: "fastBreakPoints", label: "Points contre-attaque", shortLabel: "CA", category: "scoring", type: "number" },
  { key: "secondChancePoints", label: "2nde chance", shortLabel: "2nde ch.", category: "scoring", type: "number" },
  // Individual Stats - Attack
  { key: "assists", label: "Passes décisives", shortLabel: "Passes", category: "attack", type: "number" },
  { key: "offensiveRebounds", label: "Rebonds offensifs", shortLabel: "RO", category: "attack", type: "number" },
  { key: "turnovers", label: "Ballons perdus", shortLabel: "Pertes", category: "attack", type: "number" },
  { key: "assistTurnoverRatio", label: "Ratio Pass/Pertes", shortLabel: "A/TO", category: "attack", type: "number" },
  { key: "screenAssists", label: "Assists sur écran", shortLabel: "Écrans", category: "attack", type: "number" },
  // Individual Stats - Defense
  { key: "defensiveRebounds", label: "Rebonds défensifs", shortLabel: "RD", category: "defense", type: "number" },
  { key: "totalRebounds", label: "Rebonds totaux", shortLabel: "Reb.", category: "defense", type: "number" },
  { key: "steals", label: "Interceptions", shortLabel: "Steals", category: "defense", type: "number" },
  { key: "blocks", label: "Contres", shortLabel: "Blocks", category: "defense", type: "number" },
  { key: "blocksAgainst", label: "Tirs contrés subis", shortLabel: "Contrés", category: "defense", type: "number" },
  { key: "deflections", label: "Déviations", shortLabel: "Dév.", category: "defense", type: "number" },
  { key: "chargesTaken", label: "Fautes offensives provoquées", shortLabel: "Charges", category: "defense", type: "number" },
];

// Judo stats - Per combat/round statistics
// Organized by subcategories as requested:
// - Résultat & score
// - Attaque
// - Défense
// - Pénalités
// - Ne-waza
// - Physique & rythme
export const JUDO_STATS: StatField[] = [
  // === RÉSULTAT & SCORE ===
  { key: "combatResult", label: "Victoire (1) / Défaite (0)", shortLabel: "Résultat", category: "scoring", type: "number", max: 1 },
  { key: "victoryModeIppon", label: "Mode victoire: Ippon", shortLabel: "Ippon", category: "scoring", type: "number", max: 1 },
  { key: "victoryModeWazaari", label: "Mode victoire: Waza-ari", shortLabel: "Waza-ari", category: "scoring", type: "number", max: 1 },
  { key: "victoryModeDecision", label: "Mode victoire: Décision", shortLabel: "Décision", category: "scoring", type: "number", max: 1 },
  { key: "victoryModeHansoku", label: "Mode victoire: Hansoku-make", shortLabel: "Hansoku", category: "scoring", type: "number", max: 1 },
  { key: "victoryModeYuko", label: "Mode victoire: Yuko", shortLabel: "Yuko", category: "scoring", type: "number", max: 1 },
  { key: "finalScore", label: "Score final", shortLabel: "Score", category: "scoring", type: "number" },
  { key: "combatDuration", label: "Temps du combat (sec)", shortLabel: "Durée", category: "scoring", type: "number" },
  
  // === ATTAQUE ===
  { key: "attackAttempts", label: "Attaques tentées", shortLabel: "Att. tentées", category: "attack", type: "number" },
  { key: "attackEffective", label: "Attaques efficaces", shortLabel: "Att. eff.", category: "attack", type: "number" },
  { key: "attackEffectivePercent", label: "% attaques efficaces", shortLabel: "% Eff.", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "attackEffective", totalKey: "attackAttempts" } },
  { key: "techniqueNageWaza", label: "Nage-waza (debout)", shortLabel: "Nage-waza", category: "attack", type: "number" },
  { key: "techniqueNeWaza", label: "Ne-waza (sol)", shortLabel: "Ne-waza", category: "attack", type: "number" },
  { key: "dominantSideRight", label: "Côté dominant: Droite", shortLabel: "Droite", category: "attack", type: "number", max: 1 },
  { key: "dominantSideLeft", label: "Côté dominant: Gauche", shortLabel: "Gauche", category: "attack", type: "number", max: 1 },
  { key: "entryTypeDirect", label: "Entrée directe", shortLabel: "Direct", category: "attack", type: "number" },
  { key: "entryTypeCombo", label: "Combinaison", shortLabel: "Combo", category: "attack", type: "number" },
  { key: "entryTypeCounter", label: "Contre-attaque", shortLabel: "Contre", category: "attack", type: "number" },
  
  // === DÉFENSE ===
  { key: "attacksReceived", label: "Attaques subies", shortLabel: "Att. subies", category: "defense", type: "number" },
  { key: "scoresConceded", label: "Scores concédés", shortLabel: "Sc. concédés", category: "defense", type: "number" },
  { key: "attacksNeutralized", label: "Attaques neutralisées", shortLabel: "Neutralisées", category: "defense", type: "number" },
  { key: "defensiveQuality", label: "% qualité défensive", shortLabel: "% Déf.", category: "defense", type: "percentage", max: 100, computedFrom: { successKey: "attacksNeutralized", totalKey: "attacksReceived" } },
  
  // === PÉNALITÉS ===
  { key: "shidoReceived", label: "Shido reçus", shortLabel: "Shido reçus", category: "general", type: "number", max: 3 },
  { key: "shidoProvoked", label: "Shido provoqués (adversaire)", shortLabel: "Shido provoqués", category: "general", type: "number", max: 3 },
  { key: "hansokuMake", label: "Hansoku-make (oui=1/non=0)", shortLabel: "Hansoku", category: "general", type: "number", max: 1 },
  
  // === NE-WAZA (SOL) ===
  { key: "groundTimeSeconds", label: "Temps au sol (sec)", shortLabel: "Temps sol", category: "attack", type: "number" },
  { key: "immobilizationAttempts", label: "Tentatives immobilisation", shortLabel: "Tent. immo.", category: "attack", type: "number" },
  { key: "armLockAttempts", label: "Tentatives clé de bras", shortLabel: "Tent. clé", category: "attack", type: "number" },
  { key: "chokeAttempts", label: "Tentatives étranglement", shortLabel: "Tent. étrang.", category: "attack", type: "number" },
  { key: "neWazaSuccess", label: "Réussites ne-waza", shortLabel: "Réussites sol", category: "attack", type: "number" },
  { key: "neWazaEfficiency", label: "% efficacité ne-waza", shortLabel: "% Ne-waza", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "neWazaSuccess", totalKey: "immobilizationAttempts" } },
  
  // === PHYSIQUE & RYTHME ===
  { key: "effectiveEngagementTime", label: "Temps engagement effectif (sec)", shortLabel: "Eng. eff.", category: "general", type: "number" },
  { key: "passivityPhases", label: "Phases de passivité", shortLabel: "Passivité", category: "general", type: "number" },
  { key: "goldenScore", label: "Golden Score (oui=1/non=0)", shortLabel: "G. Score", category: "general", type: "number", max: 1 },
  { key: "goldenScoreDuration", label: "Durée Golden Score (sec)", shortLabel: "Durée GS", category: "general", type: "number" },
];

// Judo aggregated stats (for competition summary after finalization)
// Categories:
// - Résultats de la compétition
// - Scoring
// - Attaque & style
// - Discipline
// - Physique & endurance
// - Tendances adversaires
export const JUDO_AGGREGATED_STATS: StatField[] = [
  // === RÉSULTATS DE LA COMPÉTITION ===
  { key: "totalCombats", label: "Nombre de combats", shortLabel: "Combats", category: "general", type: "number" },
  { key: "winPercentage", label: "% de victoires", shortLabel: "% Victoires", category: "general", type: "number" },
  { key: "finalRanking", label: "Classement final", shortLabel: "Classement", category: "general", type: "number" },
  { key: "medalOrRound", label: "Médaille / Tour atteint", shortLabel: "Médaille", category: "general", type: "number" },
  
  // === SCORING ===
  { key: "ipponPerCombat", label: "Ippon / combat", shortLabel: "Ippon/c", category: "scoring", type: "number" },
  { key: "wazaariPerCombat", label: "Waza-ari / combat", shortLabel: "Waza/c", category: "scoring", type: "number" },
  { key: "winsBeforeLimit", label: "% victoires avant limite", shortLabel: "% Avant limite", category: "scoring", type: "number" },
  
  // === ATTAQUE & STYLE ===
  { key: "mostUsedTechnique", label: "Techniques les plus utilisées", shortLabel: "Tech. utilisées", category: "attack", type: "number" },
  { key: "mostEffectiveTechnique", label: "Techniques les plus efficaces", shortLabel: "Tech. eff.", category: "attack", type: "number" },
  { key: "nageWazaPercent", label: "% nage-waza", shortLabel: "% Nage", category: "attack", type: "number" },
  { key: "neWazaPercent", label: "% ne-waza", shortLabel: "% Ne-waza", category: "attack", type: "number" },
  { key: "dominantSide", label: "Côté dominant majoritaire", shortLabel: "Côté dom.", category: "attack", type: "number" },
  
  // === DISCIPLINE ===
  { key: "avgShidoPerCombat", label: "Moyenne shido / combat", shortLabel: "Shido moy.", category: "defense", type: "number" },
  { key: "lostByPenaltyPercent", label: "% combats perdus par pénalités", shortLabel: "% Pén.", category: "defense", type: "number" },
  
  // === PHYSIQUE & ENDURANCE ===
  { key: "avgCombatDuration", label: "Temps moyen combats (sec)", shortLabel: "Durée moy.", category: "general", type: "number" },
  { key: "goldenScorePercent", label: "% combats en Golden Score", shortLabel: "% GS", category: "general", type: "number" },
  { key: "goldenScoreWins", label: "Victoires en Golden Score", shortLabel: "Vic. GS", category: "general", type: "number" },
  { key: "goldenScoreLosses", label: "Défaites en Golden Score", shortLabel: "Déf. GS", category: "general", type: "number" },
  
  // === TENDANCES ADVERSAIRES ===
  { key: "scoresConcededStart", label: "Scores concédés début", shortLabel: "Conc. début", category: "defense", type: "number" },
  { key: "scoresConcededEnd", label: "Scores concédés fin", shortLabel: "Conc. fin", category: "defense", type: "number" },
  { key: "mostSufferedTechniques", label: "Techniques adverses subies", shortLabel: "Tech. subies", category: "defense", type: "number" },
];

// Bowling stats - Per game statistics
// RÈGLES SPÉCIFIQUES:
// - % Spares = spares (hors split non-converti) / opportunités de spare. Si split converti → compte comme spare
// - Splits comptabilisés: Ne pas compter les splits sur le 11e ou 12e lancer (dernière frame après 2 strikes)
export const BOWLING_STATS: StatField[] = [
  // General / Competition
  { key: "gamesPlayed", label: "Parties jouées", shortLabel: "Parties", category: "general", type: "number" },
  { key: "placement", label: "Classement", shortLabel: "Place", category: "general", type: "number" },
  
  // Score statistics (per game)
  { key: "gameScore", label: "Score de la partie", shortLabel: "Score", category: "scoring", type: "number", max: 300 },
  { key: "strikes", label: "Nombre de strikes", shortLabel: "Strikes", category: "scoring", type: "number", max: 12 },
  { key: "spares", label: "Nombre de spares (hors splits)", shortLabel: "Spares", category: "scoring", type: "number", max: 10 },
  { key: "openFrames", label: "Open frames", shortLabel: "Opens", category: "scoring", type: "number", max: 10 },
  
  // Split statistics (avec règles spécifiques)
  { key: "splitCount", label: "Splits (hors 11e/12e lancer)", shortLabel: "Splits", category: "scoring", type: "number" },
  { key: "splitConverted", label: "Splits convertis", shortLabel: "Splits Conv.", category: "scoring", type: "number" },
  { key: "splitOnLastThrow", label: "Splits sur 11e/12e lancer (non comptés)", shortLabel: "Splits excl.", category: "scoring", type: "number" },
  
  // Precision statistics (calculés automatiquement)
  { key: "strikePercentage", label: "% de strikes", shortLabel: "% Strikes", category: "attack", type: "percentage", max: 100 },
  { key: "sparePercentage", label: "% de spares (hors splits)", shortLabel: "% Spares", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "spares", totalKey: "spareOpportunities" } },
  { key: "splitConversionRate", label: "% conversion splits", shortLabel: "% Split Conv.", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "splitConverted", totalKey: "splitCount" } },
  { key: "spareOpportunities", label: "Opportunités de spare", shortLabel: "Opp. Spare", category: "attack", type: "number" },
  { key: "pinsPerFrame", label: "Pins par frame", shortLabel: "Pins/Frame", category: "attack", type: "number" },
  { key: "targetHitRate", label: "Taux de touche de la cible", shortLabel: "% Cible", category: "attack", type: "number", max: 100 },
];

// Bowling aggregated stats (for competition summary)
export const BOWLING_AGGREGATED_STATS: StatField[] = [
  { key: "totalGames", label: "Parties jouées", shortLabel: "Parties", category: "general", type: "number" },
  { key: "highGame", label: "Meilleur score partie", shortLabel: "High Game", category: "scoring", type: "number", max: 300 },
  { key: "avgScoreScratch", label: "Score moyen (scratch)", shortLabel: "Moy. Scratch", category: "scoring", type: "number", max: 300 },
  { key: "seriesScore", label: "Score série (3 parties)", shortLabel: "Série", category: "scoring", type: "number" },
  { key: "totalPins", label: "Total pins", shortLabel: "Total Pins", category: "scoring", type: "number" },
  { key: "totalStrikes", label: "Total strikes", shortLabel: "Strikes", category: "attack", type: "number" },
  { key: "totalSpares", label: "Total spares", shortLabel: "Spares", category: "attack", type: "number" },
];

// Aviron (Rowing) stats
export const AVIRON_STATS: StatField[] = [
  // General
  { key: "raceDistance", label: "Distance course (m)", shortLabel: "Distance", category: "general", type: "number" },
  { key: "boatType", label: "Type de bateau (1=1x, 2=2x, 4=4x, 8=8+)", shortLabel: "Bateau", category: "general", type: "number" },
  { key: "perceivedEffort", label: "Effort perçu (RPE 1-10)", shortLabel: "RPE", category: "general", type: "number", max: 10 },
  { key: "weatherConditions", label: "Conditions (1=calme, 2=vent léger, 3=vent fort)", shortLabel: "Conditions", category: "general", type: "number" },
  
  // Performance / Results
  { key: "placement", label: "Classement final", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "raceTime", label: "Temps final (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "splitTime500m", label: "Split 500m (sec)", shortLabel: "Split 500m", category: "scoring", type: "number" },
  { key: "splitTime1000m", label: "Split 1000m (sec)", shortLabel: "Split 1000m", category: "scoring", type: "number" },
  { key: "avgSpeed", label: "Vitesse moyenne (m/s)", shortLabel: "Vit. moy.", category: "scoring", type: "number" },
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
];

// Athlétisme (Athletics) stats - discipline-specific
// Sprint stats
export const ATHLETISME_SPRINT_STATS: StatField[] = [
  { key: "time", label: "Temps (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "windSpeed", label: "Vent (m/s)", shortLabel: "Vent", category: "general", type: "number" },
  { key: "lane", label: "Couloir", shortLabel: "Couloir", category: "general", type: "number", min: 1, max: 9 },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Middle/Long distance stats
export const ATHLETISME_ENDURANCE_STATS: StatField[] = [
  { key: "time", label: "Temps (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "split400m", label: "Split 400m (sec)", shortLabel: "400m", category: "attack", type: "number" },
  { key: "split800m", label: "Split 800m (sec)", shortLabel: "800m", category: "attack", type: "number" },
  { key: "splitLast400m", label: "Dernier 400m (sec)", shortLabel: "Last 400m", category: "attack", type: "number" },
  { key: "avgPace", label: "Allure moyenne (sec/km)", shortLabel: "Allure", category: "attack", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Trail / Ultra-Trail stats
export const ATHLETISME_TRAIL_STATS: StatField[] = [
  // Performance
  { key: "trailTime", label: "Temps total (min)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "trailDistance", label: "Distance (km)", shortLabel: "Distance", category: "scoring", type: "number" },
  { key: "trailElevationGain", label: "Dénivelé positif (m)", shortLabel: "D+", category: "scoring", type: "number" },
  { key: "trailElevationLoss", label: "Dénivelé négatif (m)", shortLabel: "D-", category: "scoring", type: "number" },
  // Classement
  { key: "finalRanking", label: "Classement général", shortLabel: "Place", category: "attack", type: "number" },
  { key: "totalFinishers", label: "Nombre de finishers", shortLabel: "Finishers", category: "attack", type: "number" },
  { key: "categoryRanking", label: "Classement catégorie (H/F, Master…)", shortLabel: "Place cat.", category: "attack", type: "number" },
  { key: "categoryTotalFinishers", label: "Finishers catégorie", shortLabel: "Fin. cat.", category: "attack", type: "number" },
  // Détails
  { key: "avgPace", label: "Allure moyenne (min/km)", shortLabel: "Allure", category: "defense", type: "number" },
  { key: "avgHeartRate", label: "FC moyenne (bpm)", shortLabel: "FC moy", category: "defense", type: "number" },
  { key: "maxHeartRate", label: "FC max (bpm)", shortLabel: "FC max", category: "defense", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Hurdles stats
export const ATHLETISME_HAIES_STATS: StatField[] = [
  { key: "time", label: "Temps (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "windSpeed", label: "Vent (m/s)", shortLabel: "Vent", category: "general", type: "number" },
  { key: "lane", label: "Couloir", shortLabel: "Couloir", category: "general", type: "number", min: 1, max: 9 },
  { key: "hurdlesHit", label: "Haies touchées", shortLabel: "Touchées", category: "defense", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Jumps stats (long, triple, high, pole)
export const ATHLETISME_SAUTS_STATS: StatField[] = [
  { key: "bestMark", label: "Meilleure marque (cm)", shortLabel: "Marque", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "attempt1", label: "Essai 1 (cm)", shortLabel: "E1", category: "attack", type: "number" },
  { key: "attempt2", label: "Essai 2 (cm)", shortLabel: "E2", category: "attack", type: "number" },
  { key: "attempt3", label: "Essai 3 (cm)", shortLabel: "E3", category: "attack", type: "number" },
  { key: "attempt4", label: "Essai 4 (cm)", shortLabel: "E4", category: "attack", type: "number" },
  { key: "attempt5", label: "Essai 5 (cm)", shortLabel: "E5", category: "attack", type: "number" },
  { key: "attempt6", label: "Essai 6 (cm)", shortLabel: "E6", category: "attack", type: "number" },
  { key: "windSpeed", label: "Vent (m/s)", shortLabel: "Vent", category: "general", type: "number" },
  { key: "approachSpeed", label: "Vitesse d'élan (m/s)", shortLabel: "V. Élan", category: "defense", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Pole vault specific stats
export const ATHLETISME_PERCHE_STATS: StatField[] = [
  { key: "bestHeight", label: "Meilleure barre (cm)", shortLabel: "Hauteur", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "height1", label: "Barre 1 (cm)", shortLabel: "B1", category: "attack", type: "number" },
  { key: "attempts1", label: "Essais barre 1", shortLabel: "Ess.1", category: "attack", type: "number" },
  { key: "height2", label: "Barre 2 (cm)", shortLabel: "B2", category: "attack", type: "number" },
  { key: "attempts2", label: "Essais barre 2", shortLabel: "Ess.2", category: "attack", type: "number" },
  { key: "height3", label: "Barre 3 (cm)", shortLabel: "B3", category: "attack", type: "number" },
  { key: "attempts3", label: "Essais barre 3", shortLabel: "Ess.3", category: "attack", type: "number" },
  { key: "poleLength", label: "Longueur perche (cm)", shortLabel: "Perche", category: "general", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Throws stats (shot put, discus, javelin, hammer)
export const ATHLETISME_LANCERS_STATS: StatField[] = [
  { key: "bestMark", label: "Meilleure marque (cm)", shortLabel: "Marque", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "attempt1", label: "Essai 1 (cm)", shortLabel: "E1", category: "attack", type: "number" },
  { key: "attempt2", label: "Essai 2 (cm)", shortLabel: "E2", category: "attack", type: "number" },
  { key: "attempt3", label: "Essai 3 (cm)", shortLabel: "E3", category: "attack", type: "number" },
  { key: "attempt4", label: "Essai 4 (cm)", shortLabel: "E4", category: "attack", type: "number" },
  { key: "attempt5", label: "Essai 5 (cm)", shortLabel: "E5", category: "attack", type: "number" },
  { key: "attempt6", label: "Essai 6 (cm)", shortLabel: "E6", category: "attack", type: "number" },
  { key: "implementWeight", label: "Poids engin (kg)", shortLabel: "Engin", category: "general", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Combined events stats (decathlon, heptathlon)
export const ATHLETISME_COMBINES_STATS: StatField[] = [
  { key: "totalPoints", label: "Points totaux", shortLabel: "Points", category: "scoring", type: "number" },
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "event1Points", label: "Épreuve 1 (pts)", shortLabel: "E1", category: "attack", type: "number" },
  { key: "event2Points", label: "Épreuve 2 (pts)", shortLabel: "E2", category: "attack", type: "number" },
  { key: "event3Points", label: "Épreuve 3 (pts)", shortLabel: "E3", category: "attack", type: "number" },
  { key: "event4Points", label: "Épreuve 4 (pts)", shortLabel: "E4", category: "attack", type: "number" },
  { key: "event5Points", label: "Épreuve 5 (pts)", shortLabel: "E5", category: "attack", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
];

// Default/general athletics stats
export const ATHLETISME_GENERAL_STATS: StatField[] = [
  { key: "finalRanking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "result", label: "Résultat (temps/distance)", shortLabel: "Résultat", category: "scoring", type: "number" },
  { key: "personalBest", label: "Record personnel ?", shortLabel: "RP", category: "general", type: "number", max: 1 },
  { key: "seasonBest", label: "Meilleure perf saison ?", shortLabel: "SB", category: "general", type: "number", max: 1 },
];

// Athletics phases
export const ATHLETISME_PHASES = [
  { value: "series", label: "Séries" },
  { value: "repechages", label: "Repêchages" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demis", label: "Demi-finales" },
  { value: "finale", label: "Finale" },
];

// ==================== PADEL STATS ====================
export const PADEL_STATS: StatField[] = [
  { key: "setsWon", label: "Sets gagnés", shortLabel: "Sets+", category: "scoring", type: "number" },
  { key: "setsLost", label: "Sets perdus", shortLabel: "Sets-", category: "scoring", type: "number" },
  { key: "gamesWon", label: "Jeux gagnés", shortLabel: "Jeux+", category: "scoring", type: "number" },
  { key: "gamesLost", label: "Jeux perdus", shortLabel: "Jeux-", category: "scoring", type: "number" },
  { key: "aces", label: "Aces", shortLabel: "Aces", category: "attack", type: "number" },
  { key: "doubleFaults", label: "Doubles fautes", shortLabel: "DF", category: "attack", type: "number" },
  { key: "winners", label: "Coups gagnants", shortLabel: "Winners", category: "attack", type: "number" },
  { key: "unforcedErrors", label: "Fautes directes", shortLabel: "FD", category: "defense", type: "number" },
  { key: "pointsWon", label: "Points gagnés", shortLabel: "Pts+", category: "scoring", type: "number" },
  { key: "breakPoints", label: "Balles de break converties", shortLabel: "BP", category: "attack", type: "number" },
  { key: "smashes", label: "Smashes", shortLabel: "Smash", category: "attack", type: "number" },
  { key: "bandeja", label: "Bandejas", shortLabel: "Band", category: "attack", type: "number" },
  { key: "vibora", label: "Víboras", shortLabel: "Víb", category: "attack", type: "number" },
  { key: "globos", label: "Globos (Lobs)", shortLabel: "Glob", category: "defense", type: "number" },
  { key: "volleys", label: "Volées gagnantes", shortLabel: "Vol", category: "attack", type: "number" },
  { key: "matchResult", label: "Résultat (1=V, 0=D)", shortLabel: "Rés", category: "scoring", type: "number", max: 1 },
];

// ==================== NATATION STATS ====================
export const NATATION_STATS: StatField[] = [
  { key: "finalTime", label: "Temps final (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "reactionTime", label: "Temps de réaction (ms)", shortLabel: "Réaction", category: "scoring", type: "number" },
  { key: "split50", label: "Split 50m (sec)", shortLabel: "S50", category: "general", type: "number" },
  { key: "split100", label: "Split 100m (sec)", shortLabel: "S100", category: "general", type: "number" },
  { key: "turnTime", label: "Temps virage (sec)", shortLabel: "Virage", category: "general", type: "number" },
  { key: "underwaterDistance", label: "Distance coulée (m)", shortLabel: "Coulée", category: "general", type: "number" },
  { key: "strokeRate", label: "Fréquence de nage (c/min)", shortLabel: "Fréq", category: "attack", type: "number" },
  { key: "strokeCount", label: "Nb coups de bras/longueur", shortLabel: "Coups", category: "attack", type: "number" },
  { key: "swolf", label: "SWOLF", shortLabel: "SWOLF", category: "attack", type: "number" },
  { key: "personalBest", label: "Record personnel (1=oui)", shortLabel: "RP", category: "scoring", type: "number", max: 1 },
];

export const NATATION_EAU_LIBRE_STATS: StatField[] = [
  { key: "finalTime", label: "Temps final (min)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "distance", label: "Distance (m)", shortLabel: "Dist", category: "general", type: "number" },
  { key: "avgPace", label: "Allure moyenne (min/100m)", shortLabel: "Allure", category: "general", type: "number" },
  { key: "waterTemp", label: "Température eau (°C)", shortLabel: "Temp", category: "general", type: "number" },
  { key: "personalBest", label: "Record personnel (1=oui)", shortLabel: "RP", category: "scoring", type: "number", max: 1 },
];

// ==================== SKI / SPORTS DE GLISSE STATS ====================
export const SKI_ALPIN_STATS: StatField[] = [
  { key: "runTime", label: "Temps manche (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "gapToFirst", label: "Écart au 1er (sec)", shortLabel: "Écart", category: "scoring", type: "number" },
  { key: "topSpeed", label: "Vitesse max (km/h)", shortLabel: "V.Max", category: "attack", type: "number" },
  { key: "avgSpeed", label: "Vitesse moyenne (km/h)", shortLabel: "V.Moy", category: "attack", type: "number" },
  { key: "gatesFault", label: "Portes manquées", shortLabel: "Portes", category: "defense", type: "number" },
  { key: "dnf", label: "DNF (1=oui)", shortLabel: "DNF", category: "general", type: "number", max: 1 },
  { key: "dsq", label: "DSQ (1=oui)", shortLabel: "DSQ", category: "general", type: "number", max: 1 },
];

export const SKI_FOND_STATS: StatField[] = [
  { key: "finalTime", label: "Temps final (min)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "gapToFirst", label: "Écart au 1er (sec)", shortLabel: "Écart", category: "scoring", type: "number" },
  { key: "avgHeartRate", label: "FC moyenne (bpm)", shortLabel: "FC Moy", category: "general", type: "number" },
  { key: "maxHeartRate", label: "FC max (bpm)", shortLabel: "FC Max", category: "general", type: "number" },
  { key: "distance", label: "Distance (km)", shortLabel: "Dist", category: "general", type: "number" },
  { key: "elevationGain", label: "Dénivelé positif (m)", shortLabel: "D+", category: "general", type: "number" },
];

export const SKI_BIATHLON_STATS: StatField[] = [
  { key: "finalTime", label: "Temps final (min)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "shootingAccuracy", label: "Précision tir (%)", shortLabel: "Tir%", category: "attack", type: "percentage" },
  { key: "proneHits", label: "Tir couché réussis/5", shortLabel: "Couché", category: "attack", type: "number", max: 5 },
  { key: "standingHits", label: "Tir debout réussis/5", shortLabel: "Debout", category: "attack", type: "number", max: 5 },
  { key: "penaltyLoops", label: "Tours de pénalité", shortLabel: "Pén", category: "defense", type: "number" },
  { key: "skiTime", label: "Temps ski (sec)", shortLabel: "T.Ski", category: "general", type: "number" },
];

export const SKI_FREESTYLE_STATS: StatField[] = [
  { key: "score", label: "Score total", shortLabel: "Score", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "difficultyScore", label: "Score difficulté", shortLabel: "Diff", category: "attack", type: "number" },
  { key: "executionScore", label: "Score exécution", shortLabel: "Exec", category: "attack", type: "number" },
  { key: "bestTrickScore", label: "Meilleur trick", shortLabel: "BestT", category: "attack", type: "number" },
  { key: "falls", label: "Chutes", shortLabel: "Chutes", category: "defense", type: "number" },
];

export const SNOWBOARD_STATS: StatField[] = [
  { key: "score", label: "Score total", shortLabel: "Score", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "bestRun", label: "Meilleure manche", shortLabel: "BestR", category: "scoring", type: "number" },
  { key: "difficultyScore", label: "Score difficulté", shortLabel: "Diff", category: "attack", type: "number" },
  { key: "executionScore", label: "Score exécution", shortLabel: "Exec", category: "attack", type: "number" },
  { key: "falls", label: "Chutes", shortLabel: "Chutes", category: "defense", type: "number" },
];

// ==================== SURF STATS ====================
export const SURF_STATS: StatField[] = [
  // Scoring
  { key: "heatScore", label: "Score du heat", shortLabel: "Score", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "bestWaveScore", label: "Meilleure vague", shortLabel: "Best", category: "scoring", type: "number" },
  { key: "secondBestWaveScore", label: "2e meilleure vague", shortLabel: "2nd", category: "scoring", type: "number" },
  { key: "combinedScore", label: "Score combiné (2 meilleures)", shortLabel: "Combiné", category: "scoring", type: "number" },
  // Manœuvres (attack)
  { key: "wavesRidden", label: "Vagues surfées", shortLabel: "Vagues", category: "attack", type: "number" },
  { key: "wavesCaught", label: "Vagues prises", shortLabel: "Prises", category: "attack", type: "number" },
  { key: "tubeRides", label: "Tubes", shortLabel: "Tubes", category: "attack", type: "number" },
  { key: "aerials", label: "Aériens", shortLabel: "Aériens", category: "attack", type: "number" },
  { key: "cutbacks", label: "Cutbacks", shortLabel: "Cutback", category: "attack", type: "number" },
  { key: "carves", label: "Bottom/Top turns", shortLabel: "Turns", category: "attack", type: "number" },
  { key: "snaps", label: "Snaps", shortLabel: "Snaps", category: "attack", type: "number" },
  { key: "floaters", label: "Floaters", shortLabel: "Float", category: "attack", type: "number" },
  { key: "reentries", label: "Re-entries", shortLabel: "Re-entry", category: "attack", type: "number" },
  { key: "laybacks", label: "Layback turns", shortLabel: "Layback", category: "attack", type: "number" },
  // Tactique & Priorité (defense)
  { key: "interferencesCalled", label: "Interférences reçues", shortLabel: "Interf.", category: "defense", type: "number" },
  { key: "priorityCalls", label: "Priorités obtenues", shortLabel: "Priorité", category: "defense", type: "number" },
  { key: "falls", label: "Chutes", shortLabel: "Chutes", category: "defense", type: "number" },
  { key: "paddleBackOuts", label: "Paddle-outs difficiles", shortLabel: "P.Out", category: "defense", type: "number" },
  { key: "waveSelection", label: "Sélection de vague (1-10)", shortLabel: "Sélection", category: "defense", type: "number", max: 10 },
  { key: "positioning", label: "Positionnement (1-10)", shortLabel: "Position", category: "defense", type: "number", max: 10 },
  // Conditions (general)
  { key: "heatDuration", label: "Durée du heat (min)", shortLabel: "Durée", category: "general", type: "number" },
  { key: "waveHeight", label: "Taille vagues (m)", shortLabel: "Hauteur", category: "general", type: "number" },
  { key: "windCondition", label: "Vent (1=offshore, 2=cross, 3=onshore)", shortLabel: "Vent", category: "general", type: "number" },
  { key: "swellPeriod", label: "Période houle (sec)", shortLabel: "Période", category: "general", type: "number" },
  { key: "waterTemp", label: "Temp. eau (°C)", shortLabel: "T°eau", category: "general", type: "number" },
  { key: "spotName", label: "Spot", shortLabel: "Spot", category: "general", type: "number" },
  { key: "heatResult", label: "Résultat (1=avance, 0=éliminé)", shortLabel: "Résultat", category: "general", type: "number", max: 1 },
];

// ==================== TRIATHLON STATS ====================
export const TRIATHLON_STATS: StatField[] = [
  { key: "totalTime", label: "Temps total (min)", shortLabel: "Total", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "swimTime", label: "Temps natation (min)", shortLabel: "T.Nat", category: "general", type: "number" },
  { key: "swimPace", label: "Allure natation (min/100m)", shortLabel: "P.Nat", category: "general", type: "number" },
  { key: "t1Time", label: "Transition 1 (sec)", shortLabel: "T1", category: "general", type: "number" },
  { key: "bikeTime", label: "Temps vélo (min)", shortLabel: "T.Vélo", category: "general", type: "number" },
  { key: "bikeAvgSpeed", label: "Vitesse moy vélo (km/h)", shortLabel: "V.Vélo", category: "attack", type: "number" },
  { key: "bikePower", label: "Puissance moy vélo (W)", shortLabel: "P.Vélo", category: "attack", type: "number" },
  { key: "t2Time", label: "Transition 2 (sec)", shortLabel: "T2", category: "general", type: "number" },
  { key: "runTime", label: "Temps course (min)", shortLabel: "T.Run", category: "general", type: "number" },
  { key: "runPace", label: "Allure course (min/km)", shortLabel: "P.Run", category: "general", type: "number" },
  { key: "gapToFirst", label: "Écart au 1er (sec)", shortLabel: "Écart", category: "scoring", type: "number" },
  { key: "avgHeartRate", label: "FC moyenne (bpm)", shortLabel: "FC Moy", category: "defense", type: "number" },
  { key: "personalBest", label: "Record personnel (1=oui)", shortLabel: "RP", category: "scoring", type: "number", max: 1 },
];

export const DUATHLON_STATS: StatField[] = [
  { key: "totalTime", label: "Temps total (min)", shortLabel: "Total", category: "scoring", type: "number" },
  { key: "ranking", label: "Classement", shortLabel: "Place", category: "scoring", type: "number" },
  { key: "run1Time", label: "Temps course 1 (min)", shortLabel: "T.Run1", category: "general", type: "number" },
  { key: "bikeTime", label: "Temps vélo (min)", shortLabel: "T.Vélo", category: "general", type: "number" },
  { key: "run2Time", label: "Temps course 2 (min)", shortLabel: "T.Run2", category: "general", type: "number" },
  { key: "gapToFirst", label: "Écart au 1er (sec)", shortLabel: "Écart", category: "scoring", type: "number" },
];

export type SportType = "XV" | "7" | "XIII" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "aviron" | "bowling" | "academie" | "national_team" | "athletisme" | "padel" | "natation" | "ski" | "surf" | "triathlon";
// Tennis stats
export const TENNIS_STATS: StatField[] = [
  // Scoring
  { key: "setsWon", label: "Sets gagnés", shortLabel: "Sets G.", category: "scoring", type: "number" },
  { key: "setsLost", label: "Sets perdus", shortLabel: "Sets P.", category: "scoring", type: "number" },
  { key: "gamesWon", label: "Jeux gagnés", shortLabel: "Jeux G.", category: "scoring", type: "number" },
  { key: "gamesLost", label: "Jeux perdus", shortLabel: "Jeux P.", category: "scoring", type: "number" },
  { key: "tiebreaksWon", label: "Tie-breaks gagnés", shortLabel: "TB G.", category: "scoring", type: "number" },
  { key: "tiebreaksLost", label: "Tie-breaks perdus", shortLabel: "TB P.", category: "scoring", type: "number" },
  { key: "breakPointsWon", label: "Breaks réalisés", shortLabel: "Breaks", category: "scoring", type: "number" },
  { key: "breakPointsOpportunities", label: "Opportunités de break", shortLabel: "Opp. break", category: "scoring", type: "number" },
  { key: "breakPointConversion", label: "% conversion break", shortLabel: "% Break", category: "scoring", type: "percentage", max: 100, computedFrom: { successKey: "breakPointsWon", totalKey: "breakPointsOpportunities" } },
  // Attack / Service
  { key: "aces", label: "Aces", shortLabel: "Aces", category: "attack", type: "number" },
  { key: "doubleFaults", label: "Doubles fautes", shortLabel: "Dbl fautes", category: "attack", type: "number" },
  { key: "firstServeIn", label: "1ères balles in", shortLabel: "1ère in", category: "attack", type: "number" },
  { key: "firstServeTotal", label: "1ères balles totales", shortLabel: "1ère total", category: "attack", type: "number" },
  { key: "firstServePercentage", label: "% 1ère balle", shortLabel: "% 1ère", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "firstServeIn", totalKey: "firstServeTotal" } },
  { key: "firstServePointsWon", label: "Points gagnés sur 1ère", shortLabel: "Pts 1ère", category: "attack", type: "number" },
  { key: "secondServePointsWon", label: "Points gagnés sur 2ème", shortLabel: "Pts 2ème", category: "attack", type: "number" },
  { key: "serviceGamesWon", label: "Jeux de service gagnés", shortLabel: "J. serv. G.", category: "attack", type: "number" },
  { key: "serviceGamesPlayed", label: "Jeux de service joués", shortLabel: "J. serv.", category: "attack", type: "number" },
  { key: "serviceHoldPercentage", label: "% jeux de service tenus", shortLabel: "% Hold", category: "attack", type: "percentage", max: 100, computedFrom: { successKey: "serviceGamesWon", totalKey: "serviceGamesPlayed" } },
  { key: "winners", label: "Coups gagnants", shortLabel: "Winners", category: "attack", type: "number" },
  { key: "forehandWinners", label: "Winners coup droit", shortLabel: "W. CD", category: "attack", type: "number" },
  { key: "backhandWinners", label: "Winners revers", shortLabel: "W. Rev.", category: "attack", type: "number" },
  // Defense / Return
  { key: "unforcedErrors", label: "Fautes directes", shortLabel: "F. directes", category: "defense", type: "number" },
  { key: "forcedErrors", label: "Fautes provoquées", shortLabel: "F. provoquées", category: "defense", type: "number" },
  { key: "returnPointsWon", label: "Points gagnés en retour", shortLabel: "Pts retour", category: "defense", type: "number" },
  { key: "returnPointsPlayed", label: "Points joués en retour", shortLabel: "Pts ret. total", category: "defense", type: "number" },
  { key: "returnPointsPercentage", label: "% points gagnés en retour", shortLabel: "% Retour", category: "defense", type: "percentage", max: 100, computedFrom: { successKey: "returnPointsWon", totalKey: "returnPointsPlayed" } },
  { key: "breakPointsSaved", label: "Balles de break sauvées", shortLabel: "BP sauvées", category: "defense", type: "number" },
  { key: "breakPointsFaced", label: "Balles de break subies", shortLabel: "BP subies", category: "defense", type: "number" },
  { key: "breakPointSavePercentage", label: "% balles de break sauvées", shortLabel: "% BP sauvées", category: "defense", type: "percentage", max: 100, computedFrom: { successKey: "breakPointsSaved", totalKey: "breakPointsFaced" } },
  // General
  { key: "minutesPlayed", label: "Durée du match (min)", shortLabel: "Durée", category: "general", type: "number" },
  { key: "totalPointsWon", label: "Points gagnés", shortLabel: "Pts gagnés", category: "general", type: "number" },
  { key: "totalPointsPlayed", label: "Points joués", shortLabel: "Pts joués", category: "general", type: "number" },
  { key: "netApproaches", label: "Montées au filet", shortLabel: "Montées", category: "general", type: "number" },
  { key: "netPointsWon", label: "Points gagnés au filet", shortLabel: "Pts filet", category: "general", type: "number" },
  { key: "netSuccessPercentage", label: "% réussite au filet", shortLabel: "% Filet", category: "general", type: "percentage", max: 100, computedFrom: { successKey: "netPointsWon", totalKey: "netApproaches" } },
  { key: "rallyLengthAvg", label: "Longueur moy. échange", shortLabel: "L. échange", category: "general", type: "number" },
];

// Helper function to extract base sport from subtypes like "aviron_club", "judo_academie"
export function getBaseSport(sportType: string): string {
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

function getSkiStatsForDiscipline(discipline?: string): StatField[] {
  if (!discipline) return SKI_ALPIN_STATS;
  const d = discipline.toLowerCase();
  if (d.includes("biathlon")) return SKI_BIATHLON_STATS;
  if (d.includes("biathlon")) return SKI_BIATHLON_STATS;
  if (d.includes("fond") || d.includes("skiathlon") || d.includes("relais") || d.includes("sprint") && d.includes("fond")) return SKI_FOND_STATS;
  if (d.includes("freestyle") || d.includes("bosses") || d.includes("slopestyle") || d.includes("halfpipe") || d.includes("half-pipe") || d.includes("skicross")) return SKI_FREESTYLE_STATS;
  if (d.includes("snow") || d.includes("boardercross") || d.includes("big_air")) return SNOWBOARD_STATS;
  if (d.includes("saut") || d.includes("combine_nordique")) return SKI_FOND_STATS;
  return SKI_ALPIN_STATS;
}

function getNatationStatsForDiscipline(discipline?: string): StatField[] {
  if (!discipline) return NATATION_STATS;
  const d = discipline.toLowerCase();
  if (d.includes("eau_libre") || d.includes("eau libre")) return NATATION_EAU_LIBRE_STATS;
  return NATATION_STATS;
}

function getTriathlonStatsForDiscipline(discipline?: string): StatField[] {
  if (!discipline) return TRIATHLON_STATS;
  const d = discipline.toLowerCase();
  if (d.includes("duathlon")) return DUATHLON_STATS;
  if (d.includes("aquathlon")) {
    // Aquathlon = swim + run, no bike
    return TRIATHLON_STATS.filter(s => !s.key.includes("bike") && !s.key.includes("t1") && !s.key.includes("t2") && s.key !== "bikePower");
  }
  return TRIATHLON_STATS;
}

export function getStatsForSport(sportType: SportType | string, isGoalkeeper: boolean = false, discipline?: string): StatField[] {
  const baseSport = getBaseSport(sportType);
  
  switch (baseSport) {
    case "rugby":
    case "xv":
      return RUGBY_STATS;
    case "football":
      return isGoalkeeper ? FOOTBALL_GOALKEEPER_STATS : FOOTBALL_STATS;
    case "handball":
      return isGoalkeeper ? HANDBALL_GOALKEEPER_STATS : HANDBALL_STATS;
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
    case "padel":
      return PADEL_STATS;
    case "natation":
      return getNatationStatsForDiscipline(discipline);
    case "ski":
    case "snow":
      return getSkiStatsForDiscipline(discipline);
    case "surf":
      return SURF_STATS;
    case "triathlon":
      return getTriathlonStatsForDiscipline(discipline);
    case "tennis":
      return TENNIS_STATS;
    case "athletisme":
    case "athlétisme":
      return discipline ? getAthletismeStatsForDiscipline(discipline) : getAllAthletismeStatsTagged();
    default:
      return RUGBY_STATS;
  }
}

// Map of discipline category key -> stat arrays for athletics
const ATHLETISME_DISCIPLINE_MAP: Record<string, StatField[]> = {
  ath_general: ATHLETISME_GENERAL_STATS,
  ath_sprint: ATHLETISME_SPRINT_STATS,
  ath_haies: ATHLETISME_HAIES_STATS,
  ath_endurance: ATHLETISME_ENDURANCE_STATS,
  ath_sauts: ATHLETISME_SAUTS_STATS,
  ath_perche: ATHLETISME_PERCHE_STATS,
  ath_lancers: ATHLETISME_LANCERS_STATS,
  ath_combines: ATHLETISME_COMBINES_STATS,
  ath_trail: ATHLETISME_TRAIL_STATS,
};

// Get athletics stats tagged with their discipline category key
export function getAllAthletismeStatsTagged(): StatField[] {
  const seen = new Set<string>();
  const merged: StatField[] = [];
  for (const [discKey, arr] of Object.entries(ATHLETISME_DISCIPLINE_MAP)) {
    for (const stat of arr) {
      // Use a composite key to allow same stat key in multiple disciplines
      const uniqueKey = `${discKey}:${stat.key}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        // Tag the stat with discipline category for the preferences dialog
        merged.push({ ...stat, category: discKey as any });
      }
    }
  }
  return merged;
}

// Get ALL athletics stats across all disciplines (flat, deduped by key)
export function getAllAthletismeStats(): StatField[] {
  const allArrays = Object.values(ATHLETISME_DISCIPLINE_MAP);
  const seen = new Set<string>();
  const merged: StatField[] = [];
  for (const arr of allArrays) {
    for (const stat of arr) {
      if (!seen.has(stat.key)) {
        seen.add(stat.key);
        merged.push(stat);
      }
    }
  }
  return merged;
}

// Get stats for a specific athletics discipline category key
export function getAthletismeStatsByDisciplineKey(disciplineKey: string): StatField[] {
  return ATHLETISME_DISCIPLINE_MAP[disciplineKey] || ATHLETISME_GENERAL_STATS;
}

// Get athletics stats based on discipline
export function getAthletismeStatsForDiscipline(discipline?: string): StatField[] {
  if (!discipline) return ATHLETISME_GENERAL_STATS;
  
  const disc = discipline.toLowerCase().replace(/_/g, ' ');
  
  // Hurdles - CHECK FIRST before sprint (100mH, 110mH, 400mH contain "100m"/"400m" which would match sprint)
  if (disc.includes('haies') || disc.includes('hurdles') || /\d+mh\b/i.test(disc) || disc === '110m' || disc === '60mh' || disc === '100mh' || disc === '110mh' || disc === '400mh') {
    return ATHLETISME_HAIES_STATS;
  }
  
  // Sprint disciplines (after hurdles check)
  if (disc.includes('sprint') || disc.includes('60m') || disc.includes('100m') || disc.includes('200m') || disc.includes('400m')) {
    return ATHLETISME_SPRINT_STATS;
  }
  
  // Endurance disciplines
  if (disc.includes('800m') || disc.includes('1500m') || disc.includes('3000m') || disc.includes('5000m') || 
      disc.includes('10000m') || disc.includes('marathon') || disc.includes('demi fond') || disc.includes('demi-fond') ||
      disc.includes('fond') || disc.includes('marche') || disc.includes('steeple') || disc.includes('cross') || disc.includes('mile')) {
    return ATHLETISME_ENDURANCE_STATS;
  }
  
  // Pole vault
  if (disc.includes('perche') || disc.includes('pole')) {
    return ATHLETISME_PERCHE_STATS;
  }
  
  // Other jumps
  if (disc.includes('saut') || disc.includes('hauteur') || disc.includes('longueur') || disc.includes('triple')) {
    return ATHLETISME_SAUTS_STATS;
  }
  
  // Throws
  if (disc.includes('lancer') || disc.includes('poids') || disc.includes('disque') || disc.includes('javelot') || 
      disc.includes('marteau') || disc.includes('throw')) {
    return ATHLETISME_LANCERS_STATS;
  }
  
  // Combined events
  if (disc.includes('décathlon') || disc.includes('decathlon') || disc.includes('heptathlon') || disc.includes('combiné') || disc.includes('combine') || disc.includes('pentat')) {
    return ATHLETISME_COMBINES_STATS;
  }
  
  // Trail / Ultra-trail → dedicated trail stats
  if (disc.includes('trail') || disc.includes('ultra')) {
    return ATHLETISME_TRAIL_STATS;
  }
  
  return ATHLETISME_GENERAL_STATS;
}

// Check if sport has goalkeeper-specific stats
export function hasGoalkeeperStats(sportType: SportType | string): boolean {
  const baseSport = getBaseSport(sportType);
  return ["football", "handball"].includes(baseSport);
}

export function getAggregatedStatsForSport(sportType: SportType | string): StatField[] {
  const baseSport = getBaseSport(sportType);
  
  switch (baseSport) {
    case "judo":
      return JUDO_AGGREGATED_STATS;
    case "bowling":
      return BOWLING_AGGREGATED_STATS;
    default:
      return [];
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
  
  // Judo
  if (baseSport === "judo") {
    return [
      { key: "scoring", label: "Résultat & Score" },
      { key: "attack", label: "Attaque & Ne-waza" },
      { key: "defense", label: "Défense" },
      { key: "general", label: "Pénalités & Physique" },
    ];
  }
  
  // Bowling
  if (baseSport === "bowling") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Scores" },
      { key: "attack", label: "Précision" },
    ];
  }
  
  // Aviron
  if (baseSport === "aviron") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Performance" },
      { key: "attack", label: "Technique/Puissance" },
      { key: "defense", label: "Physiologique" },
    ];
  }
  
  // Padel
  if (baseSport === "padel") {
    return [
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
      { key: "general", label: "Général" },
    ];
  }

  // Natation
  if (baseSport === "natation") {
    return [
      { key: "scoring", label: "Performance" },
      { key: "general", label: "Splits & Virages" },
      { key: "attack", label: "Technique de Nage" },
    ];
  }

  // Ski / Sports de Glisse
  if (baseSport === "ski" || baseSport === "snow") {
    return [
      { key: "scoring", label: "Performance" },
      { key: "attack", label: "Vitesse / Technique" },
      { key: "defense", label: "Pénalités" },
      { key: "general", label: "Général" },
    ];
  }

  // Surf
  if (baseSport === "surf") {
    return [
      { key: "scoring", label: "Score & Classement" },
      { key: "attack", label: "Manœuvres" },
      { key: "defense", label: "Tactique & Priorité" },
      { key: "general", label: "Conditions" },
    ];
  }

  // Triathlon
  if (baseSport === "triathlon") {
    return [
      { key: "scoring", label: "Performance" },
      { key: "general", label: "Segments & Transitions" },
      { key: "attack", label: "Puissance / Allure" },
      { key: "defense", label: "Physiologique" },
    ];
  }

  // Tennis
  if (baseSport === "tennis") {
    return [
      { key: "scoring", label: "Score & Breaks" },
      { key: "attack", label: "Service & Coups gagnants" },
      { key: "defense", label: "Retour & Défense" },
      { key: "general", label: "Général" },
    ];
  }

  // Basketball
  if (baseSport === "basketball") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
    ];
  }

  // Volleyball
  if (baseSport === "volleyball") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
    ];
  }

  // Handball
  if (baseSport === "handball") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
    ];
  }

  // Football
  if (baseSport === "football") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Score" },
      { key: "attack", label: "Attaque" },
      { key: "defense", label: "Défense" },
    ];
  }

  // Athlétisme - discipline-based categories
  if (baseSport === "athletisme" || baseSport === "athlétisme") {
    return [
      { key: "ath_general", label: "Général" },
      { key: "ath_sprint", label: "Sprint" },
      { key: "ath_haies", label: "Haies" },
      { key: "ath_endurance", label: "Course (demi-fond / fond)" },
      { key: "ath_sauts", label: "Sauts" },
      { key: "ath_perche", label: "Perche" },
      { key: "ath_lancers", label: "Lancers" },
      { key: "ath_combines", label: "Épreuves combinées" },
      { key: "ath_trail", label: "Trail / Ultra-Trail" },
    ];
  }
  
  return baseCategories;
}

// Check if sport supports multi-round competition (like Judo, Bowling, Athletics)
export function supportsCompetitionRounds(sportType: string): boolean {
  const baseSport = getBaseSport(sportType);
  return ["judo", "bowling", "aviron", "athletisme", "athlétisme", "natation", "ski", "snow", "surf", "triathlon"].includes(baseSport);
}

// Get phase options for a sport
export function getCompetitionPhasesForSport(sportType: string): { value: string; label: string }[] {
  const baseSport = getBaseSport(sportType);
  
  if (baseSport === "athletisme" || baseSport === "athlétisme") {
    return ATHLETISME_PHASES;
  }

  if (baseSport === "natation") {
    return [
      { value: "series", label: "Séries" },
      { value: "demi", label: "Demi-finales" },
      { value: "finale_b", label: "Finale B" },
      { value: "finale", label: "Finale A" },
    ];
  }

  if (baseSport === "ski" || baseSport === "snow") {
    return [
      { value: "qualification", label: "Qualification" },
      { value: "manche_1", label: "Manche 1" },
      { value: "manche_2", label: "Manche 2" },
      { value: "finale", label: "Finale" },
    ];
  }

  if (baseSport === "surf") {
    return [
      { value: "round_1", label: "Round 1" },
      { value: "round_2", label: "Round 2" },
      { value: "round_3", label: "Round 3" },
      { value: "quarts", label: "Quarts de finale" },
      { value: "demies", label: "Demi-finales" },
      { value: "finale", label: "Finale" },
    ];
  }

  if (baseSport === "triathlon") {
    return [
      { value: "course", label: "Course" },
      { value: "finale", label: "Finale" },
    ];
  }
  
  // Default phases for other sports
  return [
    { value: "poules", label: "Phase de poules" },
    { value: "huitiemes", label: "Huitièmes" },
    { value: "quarts", label: "Quarts" },
    { value: "demies", label: "Demi-finales" },
    { value: "finale", label: "Finale" },
  ];
}
