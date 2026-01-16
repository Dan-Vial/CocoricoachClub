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

// Get tests for a specific sport type
export const getFieldTestsForSport = (sportType: string): SportFieldTests => {
  switch (sportType) {
    case "XV":
    case "7":
    case "15":
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
    default:
      return { sportType, sportLabel: "Rugby", tests: RUGBY_TESTS };
  }
};

// Get all field tests across all sports (for generic display)
export const getAllFieldTests = (): FieldTest[] => {
  const allTests: FieldTest[] = [];
  const seenValues = new Set<string>();
  
  [RUGBY_TESTS, FOOTBALL_TESTS, HANDBALL_TESTS, JUDO_TESTS, VOLLEYBALL_TESTS].forEach(tests => {
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
