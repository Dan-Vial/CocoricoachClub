// Sport-specific statistics configurations

export interface StatField {
  key: string;
  label: string;
  shortLabel: string;
  category: "scoring" | "attack" | "defense" | "general" | "individual";
  type: "number" | "time";
  min?: number;
  max?: number;
  isMatchLevel?: boolean; // If true, this stat is for the whole match, not per player
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
  { key: "tackleSuccess", label: "% plaquages réussis", shortLabel: "% Plaq.", category: "defense", type: "number", max: 100 },
  { key: "dominantTackles", label: "Plaquages dominants", shortLabel: "Plaq. dom.", category: "defense", type: "number" },
  { key: "defensiveRecoveries", label: "Ballons récupérés", shortLabel: "Récup.", category: "defense", type: "number" },
  { key: "turnoversLost", label: "Ballons perdus", shortLabel: "Pertes", category: "defense", type: "number" },
  { key: "penaltiesConceded", label: "Pénalités concédées", shortLabel: "Pén. conc.", category: "defense", type: "number" },
  { key: "jackalWins", label: "Grattages réussis", shortLabel: "Grattages", category: "defense", type: "number" },
  { key: "defenseCollisions", label: "Nombre de collisions", shortLabel: "Collisions", category: "defense", type: "number" },
  { key: "defenseCollisionsOver5m", label: "Collision +5m", shortLabel: "Coll. +5m", category: "defense", type: "number" },
  { key: "defenseCollisionsUnder5m", label: "Collision -5m", shortLabel: "Coll. -5m", category: "defense", type: "number" },
  // Scrum & Lineout
  { key: "scrumWon", label: "Mêlées gagnées", shortLabel: "Mêlées", category: "attack", type: "number" },
  { key: "scrumPenaltiesWon", label: "Pén. mêlées gagnées", shortLabel: "Pén. mêl.", category: "attack", type: "number" },
  { key: "lineoutWon", label: "Touches gagnées", shortLabel: "Touches", category: "attack", type: "number" },
  { key: "lineoutSteals", label: "Touches volées", shortLabel: "T. volées", category: "defense", type: "number" },
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "totalCollisions", label: "Collisions totales", shortLabel: "Collisions", category: "general", type: "number" },
  { key: "collisionsOver5m", label: "Collision +5m (élan ≥5m)", shortLabel: "Coll. +5m", category: "general", type: "number" },
  { key: "collisionsUnder5m", label: "Collision -5m (quasi statique)", shortLabel: "Coll. -5m", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
];

// Football stats - Enriched
export const FOOTBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "totalDistance", label: "Distance totale (m)", shortLabel: "Distance", category: "general", type: "number" },
  { key: "sprintCount", label: "Nombre de sprints", shortLabel: "Sprints", category: "general", type: "number" },
  { key: "sprintDistance", label: "Distance sprints (m)", shortLabel: "Dist. sprint", category: "general", type: "number" },
  { key: "topSpeed", label: "Vitesse max (km/h)", shortLabel: "V. max", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
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
  { key: "passAccuracy", label: "% Passes réussies", shortLabel: "% Passes", category: "attack", type: "number", max: 100 },
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
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "saves", label: "Arrêts", shortLabel: "Arrêts", category: "scoring", type: "number" },
  { key: "savePercentage", label: "% Arrêts", shortLabel: "% Arrêts", category: "scoring", type: "number", max: 100 },
  { key: "goalsAgainst", label: "Buts encaissés", shortLabel: "Buts enc.", category: "scoring", type: "number" },
  { key: "cleanSheets", label: "Clean sheets", shortLabel: "CS", category: "scoring", type: "number" },
  { key: "penaltiesSaved", label: "Pénaltys arrêtés", shortLabel: "Pén. arrêtés", category: "defense", type: "number" },
  { key: "highClaims", label: "Sorties aériennes", shortLabel: "Sorties aér.", category: "defense", type: "number" },
  { key: "punches", label: "Dégagements poings", shortLabel: "Poings", category: "defense", type: "number" },
  { key: "throwouts", label: "Relances à la main", shortLabel: "Rel. main", category: "attack", type: "number" },
  { key: "goalKicks", label: "Relances au pied", shortLabel: "Rel. pied", category: "attack", type: "number" },
  { key: "passAccuracy", label: "% Passes réussies", shortLabel: "% Passes", category: "attack", type: "number", max: 100 },
];

// Handball stats - Enriched
export const HANDBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "playingTime", label: "Temps de jeu (min)", shortLabel: "Temps jeu", category: "general", type: "number" },
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "twoMinutes", label: "Exclusions 2 min", shortLabel: "2 min", category: "general", type: "number" },
  { key: "manOfMatch", label: "Homme du match", shortLabel: "HDM", category: "general", type: "number", max: 1 },
  // Individual Stats - Scoring
  { key: "goals", label: "Buts", shortLabel: "Buts", category: "scoring", type: "number" },
  { key: "shots", label: "Tirs", shortLabel: "Tirs", category: "scoring", type: "number" },
  { key: "shootingPercentage", label: "% Réussite tirs", shortLabel: "% Tir", category: "scoring", type: "number", max: 100 },
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
  { key: "yellowCards", label: "Cartons jaunes", shortLabel: "Jaunes", category: "general", type: "number" },
  { key: "redCards", label: "Cartons rouges", shortLabel: "Rouges", category: "general", type: "number" },
  { key: "twoMinutes", label: "Exclusions 2 min", shortLabel: "2 min", category: "general", type: "number" },
  { key: "saves", label: "Arrêts", shortLabel: "Arrêts", category: "scoring", type: "number" },
  { key: "savePercentage", label: "% Arrêts", shortLabel: "% Arrêts", category: "scoring", type: "number", max: 100 },
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
  { key: "starts", label: "Titularisations", shortLabel: "Titu.", category: "general", type: "number" },
  { key: "jumpCount", label: "Nombre de sauts", shortLabel: "Sauts", category: "general", type: "number" },
  { key: "attackJumps", label: "Sauts d'attaque", shortLabel: "S. attaque", category: "general", type: "number" },
  { key: "blockJumps", label: "Sauts de contre", shortLabel: "S. contre", category: "general", type: "number" },
  { key: "manOfMatch", label: "Joueur du match", shortLabel: "JDM", category: "general", type: "number", max: 1 },
  // Individual Stats - Scoring
  { key: "points", label: "Points marqués", shortLabel: "Points", category: "scoring", type: "number" },
  { key: "kills", label: "Points marqués (kill)", shortLabel: "Kills", category: "scoring", type: "number" },
  { key: "aces", label: "Aces", shortLabel: "Aces", category: "scoring", type: "number" },
  { key: "acePercentage", label: "% Aces", shortLabel: "% Aces", category: "scoring", type: "number", max: 100 },
  { key: "attackErrors", label: "Erreurs d'attaque", shortLabel: "Err. att.", category: "scoring", type: "number" },
  { key: "attackAttempts", label: "Tentatives d'attaque", shortLabel: "Tent. att.", category: "scoring", type: "number" },
  { key: "attackPercentage", label: "% Attaque", shortLabel: "% Att.", category: "scoring", type: "number", max: 100 },
  { key: "killPercentage", label: "% Kill", shortLabel: "% Kill", category: "scoring", type: "number", max: 100 },
  // Individual Stats - Attack
  { key: "sets", label: "Passes (sets)", shortLabel: "Sets", category: "attack", type: "number" },
  { key: "setAssists", label: "Passes décisives", shortLabel: "Assists", category: "attack", type: "number" },
  { key: "setErrors", label: "Erreurs de passe", shortLabel: "Err. passe", category: "attack", type: "number" },
  { key: "serviceErrors", label: "Erreurs au service", shortLabel: "Err. serv.", category: "attack", type: "number" },
  { key: "serviceAttempts", label: "Services tentés", shortLabel: "Serv. tent.", category: "attack", type: "number" },
  { key: "serviceAcePercentage", label: "% Ace service", shortLabel: "% Ace", category: "attack", type: "number", max: 100 },
  // Individual Stats - Defense
  { key: "blocks", label: "Contres", shortLabel: "Contres", category: "defense", type: "number" },
  { key: "blockSolos", label: "Contres solo", shortLabel: "C. solo", category: "defense", type: "number" },
  { key: "blockAssists", label: "Contres assistés", shortLabel: "C. assist.", category: "defense", type: "number" },
  { key: "blockErrors", label: "Erreurs de contre", shortLabel: "Err. contre", category: "defense", type: "number" },
  { key: "digs", label: "Réceptions défensives", shortLabel: "Digs", category: "defense", type: "number" },
  { key: "digErrors", label: "Erreurs de réception déf.", shortLabel: "Err. dig", category: "defense", type: "number" },
  { key: "receptionErrors", label: "Erreurs de réception", shortLabel: "Err. réc.", category: "defense", type: "number" },
  { key: "receptionAttempts", label: "Réceptions tentées", shortLabel: "Réc. tent.", category: "defense", type: "number" },
  { key: "receptionPercentage", label: "% Réception", shortLabel: "% Réc.", category: "defense", type: "number", max: 100 },
  { key: "perfectReceptions", label: "Réceptions parfaites", shortLabel: "Réc. parf.", category: "defense", type: "number" },
];

// Basketball stats - Enriched
export const BASKETBALL_STATS: StatField[] = [
  // Individual Stats - General
  { key: "minutesPlayed", label: "Minutes jouées", shortLabel: "Min.", category: "general", type: "number" },
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
  { key: "fieldGoalPercentage", label: "% Paniers", shortLabel: "FG%", category: "scoring", type: "number", max: 100 },
  { key: "threePointersMade", label: "3 points réussis", shortLabel: "3P", category: "scoring", type: "number" },
  { key: "threePointersAttempted", label: "3 points tentés", shortLabel: "3PA", category: "scoring", type: "number" },
  { key: "threePointPercentage", label: "% 3 points", shortLabel: "3P%", category: "scoring", type: "number", max: 100 },
  { key: "twoPointersMade", label: "2 points réussis", shortLabel: "2P", category: "scoring", type: "number" },
  { key: "twoPointersAttempted", label: "2 points tentés", shortLabel: "2PA", category: "scoring", type: "number" },
  { key: "freeThrowsMade", label: "Lancers francs réussis", shortLabel: "FT", category: "scoring", type: "number" },
  { key: "freeThrowsAttempted", label: "Lancers francs tentés", shortLabel: "FTA", category: "scoring", type: "number" },
  { key: "freeThrowPercentage", label: "% Lancers francs", shortLabel: "FT%", category: "scoring", type: "number", max: 100 },
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
  { key: "finalScore", label: "Score final", shortLabel: "Score", category: "scoring", type: "number" },
  { key: "combatDuration", label: "Temps du combat (sec)", shortLabel: "Durée", category: "scoring", type: "number" },
  
  // === ATTAQUE ===
  { key: "attackAttempts", label: "Attaques tentées", shortLabel: "Att. tentées", category: "attack", type: "number" },
  { key: "attackEffective", label: "Attaques efficaces", shortLabel: "Att. eff.", category: "attack", type: "number" },
  { key: "attackEffectivePercent", label: "% attaques efficaces", shortLabel: "% Eff.", category: "attack", type: "number", max: 100 },
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
  { key: "defensiveQuality", label: "% qualité défensive", shortLabel: "% Déf.", category: "defense", type: "number", max: 100 },
  
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
  { key: "neWazaEfficiency", label: "% efficacité ne-waza", shortLabel: "% Ne-waza", category: "attack", type: "number", max: 100 },
  
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
  { key: "strikePercentage", label: "% de strikes", shortLabel: "% Strikes", category: "attack", type: "number", max: 100 },
  { key: "sparePercentage", label: "% de spares (hors splits)", shortLabel: "% Spares", category: "attack", type: "number", max: 100 },
  { key: "splitConversionRate", label: "% conversion splits", shortLabel: "% Split Conv.", category: "attack", type: "number", max: 100 },
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
  { key: "reactionTime", label: "Temps de réaction (ms)", shortLabel: "Réaction", category: "scoring", type: "number" },
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

// Hurdles stats
export const ATHLETISME_HAIES_STATS: StatField[] = [
  { key: "time", label: "Temps (sec)", shortLabel: "Temps", category: "scoring", type: "number" },
  { key: "reactionTime", label: "Temps de réaction (ms)", shortLabel: "Réaction", category: "scoring", type: "number" },
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

export type SportType = "XV" | "7" | "XIII" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "aviron" | "bowling" | "academie" | "national_team" | "athletisme";

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
    case "athletisme":
    case "athlétisme":
      return getAthletismeStatsForDiscipline(discipline);
    default:
      return RUGBY_STATS;
  }
}

// Get athletics stats based on discipline
export function getAthletismeStatsForDiscipline(discipline?: string): StatField[] {
  if (!discipline) return ATHLETISME_GENERAL_STATS;
  
  const disc = discipline.toLowerCase();
  
  // Sprint disciplines
  if (disc.includes('100m') || disc.includes('200m') || disc.includes('60m') || disc.includes('sprint')) {
    return ATHLETISME_SPRINT_STATS;
  }
  
  // Hurdles
  if (disc.includes('haies') || disc.includes('110m') || disc.includes('400m haies') || disc.includes('hurdles')) {
    return ATHLETISME_HAIES_STATS;
  }
  
  // Endurance disciplines
  if (disc.includes('800m') || disc.includes('1500m') || disc.includes('3000m') || disc.includes('5000m') || 
      disc.includes('10000m') || disc.includes('marathon') || disc.includes('demi-fond') || disc.includes('fond') ||
      disc.includes('marche') || disc.includes('steeple')) {
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
  if (disc.includes('décathlon') || disc.includes('heptathlon') || disc.includes('combiné') || disc.includes('pentat')) {
    return ATHLETISME_COMBINES_STATS;
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
  
  // Judo uses specific subcategories:
  // - Résultat & score (scoring)
  // - Attaque (attack)
  // - Défense (defense)
  // - Pénalités / Ne-waza / Physique & rythme (general)
  if (baseSport === "judo") {
    return [
      { key: "scoring", label: "Résultat & Score" },
      { key: "attack", label: "Attaque & Ne-waza" },
      { key: "defense", label: "Défense" },
      { key: "general", label: "Pénalités & Physique" },
    ];
  }
  
  // Bowling uses different terminology - no defense category
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

  // Athlétisme
  if (baseSport === "athletisme" || baseSport === "athlétisme") {
    return [
      { key: "general", label: "Général" },
      { key: "scoring", label: "Performance" },
      { key: "attack", label: "Essais / Splits" },
      { key: "defense", label: "Technique" },
    ];
  }
  
  return baseCategories;
}

// Check if sport supports multi-round competition (like Judo, Bowling, Athletics)
export function supportsCompetitionRounds(sportType: string): boolean {
  const baseSport = getBaseSport(sportType);
  return ["judo", "bowling", "aviron", "athletisme", "athlétisme"].includes(baseSport);
}

// Get phase options for a sport
export function getCompetitionPhasesForSport(sportType: string): { value: string; label: string }[] {
  const baseSport = getBaseSport(sportType);
  
  if (baseSport === "athletisme" || baseSport === "athlétisme") {
    return ATHLETISME_PHASES;
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
