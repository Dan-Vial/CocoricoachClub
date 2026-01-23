// Field tests configuration per sport

export interface FieldTest {
  value: string;
  label: string;
  description?: string;
  unit: string;
  inputType: "time" | "level" | "distance" | "count" | "speed" | "weight" | "score";
  hasLevel?: boolean; // For Yo-Yo tests with levels
  levels?: string[]; // Available levels for selection
}

export interface SportFieldTests {
  sportType: string;
  sportLabel: string;
  tests: FieldTest[];
}

// Yo-Yo test levels (shared across sports)
export const YO_YO_LEVELS = [
  "5.1", "9.1", "11.1", "12.1", "13.1", "14.1", "15.1", "16.1", 
  "17.1", "18.1", "19.1", "20.1", "21.1", "22.1", "23.1"
];

// Rugby field tests
export const RUGBY_TESTS: FieldTest[] = [
  { 
    value: "yo_yo_ir1", 
    label: "Yo-Yo IR1", 
    description: "Intermittent Recovery Level 1",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "yo_yo_ir2", 
    label: "Yo-Yo IR2", 
    description: "Intermittent Recovery Level 2",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "bronco", 
    label: "Bronco", 
    description: "1200m shuttle run",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "5_10_5", 
    label: "5-10-5 Shuttle", 
    description: "Pro Agility Test",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "t_test", 
    label: "T-Test Agility", 
    description: "Test d'agilité en T",
    unit: "sec", 
    inputType: "time" 
  },
];

// Handball field tests
export const HANDBALL_TESTS: FieldTest[] = [
  { 
    value: "yo_yo_ir1", 
    label: "Yo-Yo IR1", 
    description: "Intermittent Recovery Level 1",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "rsa_6x30m", 
    label: "RSA 6×30m", 
    description: "Repeated Sprint Ability avec COD",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "rsa_8x30m", 
    label: "RSA 8×30m", 
    description: "Repeated Sprint Ability avec COD",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "illinois_agility", 
    label: "Illinois Agility Test", 
    description: "Test d'agilité avec changements de direction",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "ball_throw_speed", 
    label: "Test de lancer", 
    description: "Vitesse de balle (tir)",
    unit: "km/h", 
    inputType: "speed" 
  },
];

// Volleyball field tests  
export const VOLLEYBALL_TESTS: FieldTest[] = [
  { 
    value: "spike_jump", 
    label: "Spike Jump", 
    description: "Détente verticale en attaque",
    unit: "cm", 
    inputType: "distance" 
  },
  { 
    value: "block_jump", 
    label: "Block Jump", 
    description: "Détente verticale au contre",
    unit: "cm", 
    inputType: "distance" 
  },
  { 
    value: "repeated_jump_15", 
    label: "Repeated Jump Test 15s", 
    description: "Test de sauts répétés (15 secondes)",
    unit: "sauts", 
    inputType: "count" 
  },
  { 
    value: "repeated_jump_30", 
    label: "Repeated Jump Test 30s", 
    description: "Test de sauts répétés (30 secondes)",
    unit: "sauts", 
    inputType: "count" 
  },
];

// Football field tests
export const FOOTBALL_TESTS: FieldTest[] = [
  { 
    value: "yo_yo_ir1", 
    label: "Yo-Yo IR1", 
    description: "Intermittent Recovery Level 1",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "yo_yo_ir2", 
    label: "Yo-Yo IR2", 
    description: "Intermittent Recovery Level 2",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "bronco", 
    label: "Bronco Test", 
    description: "1200m shuttle run",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "5_10_5", 
    label: "5-10-5 Shuttle", 
    description: "Pro Agility Test",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "505_cod", 
    label: "505 COD Test", 
    description: "Change of Direction Speed Test",
    unit: "sec", 
    inputType: "time" 
  },
];

// Judo field tests
export const JUDO_TESTS: FieldTest[] = [
  { 
    value: "sjft", 
    label: "Special Judo Fitness Test", 
    description: "SJFT - Test spécifique judo",
    unit: "index", 
    inputType: "score" 
  },
  { 
    value: "uchi_komi_20s", 
    label: "Uchi-komi 20s", 
    description: "Répétitions en 20 secondes",
    unit: "reps", 
    inputType: "count" 
  },
  { 
    value: "uchi_komi_30s", 
    label: "Uchi-komi 30s", 
    description: "Répétitions en 30 secondes",
    unit: "reps", 
    inputType: "count" 
  },
  { 
    value: "uchi_komi_1min", 
    label: "Uchi-komi 1min", 
    description: "Répétitions en 1 minute",
    unit: "reps", 
    inputType: "count" 
  },
  { 
    value: "nage_komi", 
    label: "Nage-komi répétés", 
    description: "Projections répétées chronométrées",
    unit: "reps", 
    inputType: "count" 
  },
  { 
    value: "grip_strength_right", 
    label: "Grip Strength (droite)", 
    description: "Dynamométrie de préhension main droite",
    unit: "kg", 
    inputType: "weight" 
  },
  { 
    value: "grip_strength_left", 
    label: "Grip Strength (gauche)", 
    description: "Dynamométrie de préhension main gauche",
    unit: "kg", 
    inputType: "weight" 
  },
  { 
    value: "plank_ventral", 
    label: "Gainage ventral", 
    description: "Gainage ventral chronométré",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "plank_lateral_right", 
    label: "Gainage latéral (droit)", 
    description: "Gainage latéral droit chronométré",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "plank_lateral_left", 
    label: "Gainage latéral (gauche)", 
    description: "Gainage latéral gauche chronométré",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "y_balance", 
    label: "Y-Balance Test", 
    description: "Test d'équilibre dynamique",
    unit: "cm", 
    inputType: "distance" 
  },
  { 
    value: "single_leg_squat", 
    label: "Single Leg Squat Control", 
    description: "Test de contrôle moteur sur une jambe",
    unit: "score", 
    inputType: "score" 
  },
];

// Basketball field tests
export const BASKETBALL_TESTS: FieldTest[] = [
  { 
    value: "yo_yo_ir1", 
    label: "Yo-Yo IR1", 
    description: "Intermittent Recovery Level 1",
    unit: "m", 
    inputType: "level",
    hasLevel: true,
    levels: YO_YO_LEVELS
  },
  { 
    value: "lane_agility", 
    label: "Lane Agility Test", 
    description: "Test d'agilité dans le couloir NBA",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "3_4_court_sprint", 
    label: "3/4 Court Sprint", 
    description: "Sprint 3/4 de terrain",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "shuttle_run", 
    label: "Shuttle Run", 
    description: "Course navette",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "t_test", 
    label: "T-Test Agility", 
    description: "Test d'agilité en T",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "reactive_agility", 
    label: "Reactive Agility Test", 
    description: "Test d'agilité réactive",
    unit: "sec", 
    inputType: "time" 
  },
];

// Aviron (Rowing) field tests
export const AVIRON_TESTS: FieldTest[] = [
  { 
    value: "2000m_ergo", 
    label: "Test 2000m Ergomètre", 
    description: "Test maximal sur ergomètre",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "6000m_ergo", 
    label: "Test 6000m Ergomètre", 
    description: "Test d'endurance ergomètre",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "500m_ergo", 
    label: "Test 500m Ergomètre", 
    description: "Test puissance courte",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "step_test", 
    label: "Step Test (Lactate)", 
    description: "Test paliers avec lactate",
    unit: "watts", 
    inputType: "score" 
  },
  { 
    value: "max_power_10s", 
    label: "Puissance Max 10s", 
    description: "Test de puissance maximale 10 secondes",
    unit: "watts", 
    inputType: "score" 
  },
  { 
    value: "vo2max_ergo", 
    label: "VO2max Ergomètre", 
    description: "Test VO2max sur ergomètre",
    unit: "ml/kg/min", 
    inputType: "score" 
  },
  { 
    value: "1min_ergo", 
    label: "Test 1 minute", 
    description: "Distance maximale en 1 minute",
    unit: "m", 
    inputType: "distance" 
  },
  { 
    value: "stroke_power", 
    label: "Test puissance coup", 
    description: "Puissance moyenne par coup d'aviron",
    unit: "watts", 
    inputType: "score" 
  },
];

// Bowling field tests
export const BOWLING_TESTS: FieldTest[] = [
  { 
    value: "accuracy_test", 
    label: "Test de précision", 
    description: "Taux de réussite sur cible (10 lancers)",
    unit: "%", 
    inputType: "score" 
  },
  { 
    value: "strike_consistency", 
    label: "Test consistance strikes", 
    description: "Nombre de strikes sur 20 lancers",
    unit: "strikes", 
    inputType: "count" 
  },
  { 
    value: "spare_conversion", 
    label: "Test conversion spares", 
    description: "Taux de conversion des spares",
    unit: "%", 
    inputType: "score" 
  },
  { 
    value: "split_conversion", 
    label: "Test conversion splits", 
    description: "Taux de conversion des splits difficiles",
    unit: "%", 
    inputType: "score" 
  },
  { 
    value: "release_speed", 
    label: "Vitesse de lâcher", 
    description: "Vitesse moyenne de la balle au lâcher",
    unit: "km/h", 
    inputType: "speed" 
  },
  { 
    value: "rev_rate", 
    label: "Rev Rate", 
    description: "Taux de rotation de la balle (RPM)",
    unit: "rpm", 
    inputType: "score" 
  },
  { 
    value: "entry_angle", 
    label: "Angle d'entrée", 
    description: "Angle d'entrée moyen dans les quilles",
    unit: "°", 
    inputType: "score" 
  },
  { 
    value: "board_accuracy", 
    label: "Précision board", 
    description: "Écart moyen par rapport au board ciblé",
    unit: "boards", 
    inputType: "score" 
  },
];

// Athletics field tests
export const ATHLETISME_TESTS: FieldTest[] = [
  { 
    value: "vma_test", 
    label: "Test VMA", 
    description: "Vitesse Maximale Aérobie",
    unit: "km/h", 
    inputType: "speed" 
  },
  { 
    value: "cooper_test", 
    label: "Test de Cooper", 
    description: "Distance parcourue en 12 minutes",
    unit: "m", 
    inputType: "distance" 
  },
  { 
    value: "sprint_30m", 
    label: "Sprint 30m", 
    description: "Sprint linéaire 30 mètres",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "sprint_60m", 
    label: "Sprint 60m", 
    description: "Sprint linéaire 60 mètres",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "sprint_100m", 
    label: "Sprint 100m", 
    description: "Sprint linéaire 100 mètres",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "sprint_200m", 
    label: "Sprint 200m", 
    description: "Sprint 200 mètres",
    unit: "sec", 
    inputType: "time" 
  },
  { 
    value: "reaction_time", 
    label: "Temps de réaction", 
    description: "Temps de réaction au départ",
    unit: "ms", 
    inputType: "score" 
  },
  { 
    value: "block_start", 
    label: "Test starting blocks", 
    description: "Qualité de départ (analyse vidéo)",
    unit: "score", 
    inputType: "score" 
  },
  { 
    value: "hurdle_technique", 
    label: "Technique haies", 
    description: "Évaluation technique passage haies",
    unit: "score", 
    inputType: "score" 
  },
  { 
    value: "long_jump_approach", 
    label: "Approche longueur", 
    description: "Vitesse d'approche saut longueur",
    unit: "m/s", 
    inputType: "speed" 
  },
  { 
    value: "pole_vault_approach", 
    label: "Approche perche", 
    description: "Vitesse d'approche saut à la perche",
    unit: "m/s", 
    inputType: "speed" 
  },
  { 
    value: "shot_put_distance", 
    label: "Lancer poids", 
    description: "Distance lancer du poids",
    unit: "m", 
    inputType: "distance" 
  },
  { 
    value: "discus_distance", 
    label: "Lancer disque", 
    description: "Distance lancer du disque",
    unit: "m", 
    inputType: "distance" 
  },
  { 
    value: "javelin_distance", 
    label: "Lancer javelot", 
    description: "Distance lancer du javelot",
    unit: "m", 
    inputType: "distance" 
  },
  { 
    value: "lactate_threshold", 
    label: "Seuil lactique", 
    description: "Vitesse au seuil lactique",
    unit: "km/h", 
    inputType: "speed" 
  },
  { 
    value: "vo2max", 
    label: "VO2max", 
    description: "Consommation maximale d'oxygène",
    unit: "ml/kg/min", 
    inputType: "score" 
  },
  { 
    value: "walking_technique", 
    label: "Technique marche", 
    description: "Évaluation technique marche athlétique",
    unit: "score", 
    inputType: "score" 
  },
];

// Get tests for a specific sport type
export const getFieldTestsForSport = (sportType: string): SportFieldTests => {
  // Extract base sport from subtypes (e.g., "aviron_club" -> "aviron")
  const baseSport = sportType.includes("_") ? sportType.split("_")[0].toLowerCase() : sportType.toLowerCase();
  
  // Check for athletics categories
  const athleticsCategories = [
    "athletisme", "sprints", "demi_fond", "fond", "haies", 
    "sauts_horizontaux", "sauts_verticaux", "lancers", "combines", "marche"
  ];
  if (athleticsCategories.includes(baseSport)) {
    return { sportType, sportLabel: "Athlétisme", tests: ATHLETISME_TESTS };
  }
  
  switch (baseSport) {
    case "xv":
    case "7":
    case "15":
    case "xiii":
    case "academie":
    case "national_team":
      return { sportType, sportLabel: "Rugby", tests: RUGBY_TESTS };
    case "football":
      return { sportType, sportLabel: "Football", tests: FOOTBALL_TESTS };
    case "handball":
      return { sportType, sportLabel: "Handball", tests: HANDBALL_TESTS };
    case "judo":
      return { sportType, sportLabel: "Judo", tests: JUDO_TESTS };
    case "volleyball":
      return { sportType, sportLabel: "Volleyball", tests: VOLLEYBALL_TESTS };
    case "basketball":
      return { sportType, sportLabel: "Basketball", tests: BASKETBALL_TESTS };
    case "aviron":
      return { sportType, sportLabel: "Aviron", tests: AVIRON_TESTS };
    case "bowling":
      return { sportType, sportLabel: "Bowling", tests: BOWLING_TESTS };
    default:
      return { sportType, sportLabel: "Rugby", tests: RUGBY_TESTS };
  }
};

// Get all field tests across all sports (for generic display)
export const getAllFieldTests = (): FieldTest[] => {
  const allTests: FieldTest[] = [];
  const seenValues = new Set<string>();
  
  [RUGBY_TESTS, FOOTBALL_TESTS, HANDBALL_TESTS, JUDO_TESTS, VOLLEYBALL_TESTS, BASKETBALL_TESTS, AVIRON_TESTS, BOWLING_TESTS, ATHLETISME_TESTS].forEach(tests => {
    tests.forEach(test => {
      if (!seenValues.has(test.value)) {
        seenValues.add(test.value);
        allTests.push(test);
      }
    });
  });
  
  return allTests;
};

// Get test label by value
export const getFieldTestLabel = (testValue: string): string => {
  const allTests = getAllFieldTests();
  const test = allTests.find(t => t.value === testValue);
  return test?.label || testValue;
};

// Get test unit by value
export const getFieldTestUnit = (testValue: string): string => {
  const allTests = getAllFieldTests();
  const test = allTests.find(t => t.value === testValue);
  return test?.unit || "";
};
