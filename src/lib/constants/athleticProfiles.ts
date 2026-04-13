// Athletic profile configurations per sport
import { getMainSportFromType } from "./sportTypes";

export interface AthleticProfileTest {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  testType: string; // Matches test type in database
  tableSource: "speed_tests" | "jump_tests" | "generic_tests";
  higherIsBetter: boolean;
}

export interface AthleticProfileConfig {
  sport: string;
  label: string;
  tests: [AthleticProfileTest, AthleticProfileTest];
  profileDescription: string;
  profileTypes: {
    primary: {
      label: string;
      description: string;
      recommendations: string[];
    };
    balanced: {
      label: string;
      description: string;
      recommendations: string[];
    };
    secondary: {
      label: string;
      description: string;
      recommendations: string[];
    };
    insufficientData: {
      label: string;
      description: string;
      recommendations: string[];
    };
  };
}

export const ATHLETIC_PROFILES: Record<string, AthleticProfileConfig> = {
  rugby: {
    sport: "rugby",
    label: "Rugby",
    tests: [
      {
        key: "vma",
        label: "VMA (1600m)",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "vmax",
        label: "Sprint 40m",
        shortLabel: "Vmax",
        unit: "km/h",
        testType: "40m_sprint",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Capacité aérobie / Vitesse maximale",
    profileTypes: {
      primary: {
        label: "Profil Endurance",
        description: "Excellente capacité aérobie",
        recommendations: [
          "Développer la vitesse maximale",
          "Travail de puissance et explosivité",
          "Maintenir le niveau d'endurance élevé",
        ],
      },
      balanced: {
        label: "Profil Mixte",
        description: "Équilibre entre vitesse et endurance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de vitesse répétée (RSA)",
          "Continuer le développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Vitesse",
        description: "Explosif et puissant sur courtes distances",
        recommendations: [
          "Travail de vitesse maximale et accélérations",
          "Renforcement musculaire explosif",
          "Améliorer l'endurance pour équilibrer le profil",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et sprint 40m requis",
        recommendations: [
          "Effectuer un test de sprint 40m",
          "Effectuer un test de course 1600m",
        ],
      },
    },
  },
  judo: {
    sport: "judo",
    label: "Judo",
    tests: [
      {
        key: "sjft",
        label: "Special Judo Fitness Test (SJFT)",
        shortLabel: "SJFT",
        unit: "index",
        testType: "sjft",
        tableSource: "generic_tests",
        higherIsBetter: false, // Lower index = better
      },
      {
        key: "pullups",
        label: "Tractions max / Grip isométrique",
        shortLabel: "Tractions",
        unit: "reps",
        testType: "max_pullups",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Endurance combat / Puissance de tirage",
    profileTypes: {
      primary: {
        label: "Profil Endurance Combat",
        description: "Excellente résistance à la fatigue en combat",
        recommendations: [
          "Développer la puissance de grip",
          "Travail de force explosive des bras",
          "Maintenir le haut niveau d'endurance",
        ],
      },
      balanced: {
        label: "Profil Équilibré",
        description: "Bon équilibre endurance/puissance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail en randori longue durée",
          "Continuer le renforcement du grip",
        ],
      },
      secondary: {
        label: "Profil Puissance Tirage",
        description: "Excellente force de préhension et tirage",
        recommendations: [
          "Améliorer l'endurance en combat",
          "Travail de résistance lactique",
          "Randori à haute intensité prolongé",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests SJFT et tractions requis",
        recommendations: [
          "Effectuer le Special Judo Fitness Test",
          "Effectuer un test de tractions max",
        ],
      },
    },
  },
  handball: {
    sport: "handball",
    label: "Handball",
    tests: [
      {
        key: "sprint30",
        label: "Sprint 30m",
        shortLabel: "Sprint 30m",
        unit: "s",
        testType: "sprint_30m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Vitesse linéaire / Puissance verticale",
    profileTypes: {
      primary: {
        label: "Profil Vitesse",
        description: "Excellent sprinter sur courtes distances",
        recommendations: [
          "Développer la puissance verticale",
          "Travail pliométrique",
          "Maintenir la vitesse maximale",
        ],
      },
      balanced: {
        label: "Profil Athlétique Complet",
        description: "Bon équilibre vitesse/détente",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination athlétique",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Explosif Vertical",
        description: "Excellente détente verticale",
        recommendations: [
          "Améliorer la vitesse de démarrage",
          "Travail de sprints répétés",
          "Renforcement des appuis",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests sprint 30m et CMJ requis",
        recommendations: [
          "Effectuer un test de sprint 30m",
          "Effectuer un test de détente verticale (CMJ)",
        ],
      },
    },
  },
  football: {
    sport: "football",
    label: "Football",
    tests: [
      {
        key: "30_15ift",
        label: "30-15 Intermittent Fitness Test",
        shortLabel: "30-15 IFT",
        unit: "km/h",
        testType: "30_15_ift",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
      {
        key: "sprint30",
        label: "Sprint 30m",
        shortLabel: "Sprint 30m",
        unit: "s",
        testType: "sprint_30m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
    ],
    profileDescription: "Capacité haute intensité répétée / Vitesse max",
    profileTypes: {
      primary: {
        label: "Profil Intermittent",
        description: "Excellente capacité à répéter les efforts intenses",
        recommendations: [
          "Développer la vitesse maximale",
          "Travail d'accélération",
          "Maintenir l'endurance haute intensité",
        ],
      },
      balanced: {
        label: "Profil Athlétique Complet",
        description: "Bon équilibre endurance/vitesse",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de vitesse répétée",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Vitesse",
        description: "Excellente vitesse de pointe",
        recommendations: [
          "Améliorer la capacité à répéter",
          "Travail intermittent haute intensité",
          "Développer l'endurance aérobie",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests 30-15 IFT et sprint 30m requis",
        recommendations: [
          "Effectuer le test 30-15 IFT",
          "Effectuer un test de sprint 30m",
        ],
      },
    },
  },
  aviron: {
    sport: "aviron",
    label: "Aviron",
    tests: [
      {
        key: "ergo2000",
        label: "2000m Ergomètre",
        shortLabel: "2000m Ergo",
        unit: "min",
        testType: "2000m_ergo",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "peakpower",
        label: "Peak Power 10s",
        shortLabel: "Peak Power",
        unit: "W",
        testType: "peak_power_10s",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Endurance spécifique / Puissance maximale",
    profileTypes: {
      primary: {
        label: "Profil Endurant",
        description: "Excellente endurance spécifique aviron",
        recommendations: [
          "Développer la puissance de départ",
          "Travail de puissance maximale",
          "Maintenir le niveau d'endurance",
        ],
      },
      balanced: {
        label: "Profil Complet",
        description: "Bon équilibre endurance/puissance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail technique sur l'eau",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Puissant",
        description: "Excellente puissance maximale",
        recommendations: [
          "Améliorer l'endurance spécifique",
          "Travail de seuils lactiques",
          "Sorties longues régulières",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests 2000m ergo et Peak Power requis",
        recommendations: [
          "Effectuer un test 2000m ergomètre",
          "Effectuer un test de puissance 10s",
        ],
      },
    },
  },
  volleyball: {
    sport: "volleyball",
    label: "Volleyball",
    tests: [
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
      {
        key: "dropjump",
        label: "Drop Jump (RSI)",
        shortLabel: "Drop Jump",
        unit: "RSI",
        testType: "drop_jump",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Force explosive / Élasticité",
    profileTypes: {
      primary: {
        label: "Profil Force Explosive",
        description: "Excellente force explosive verticale",
        recommendations: [
          "Développer la réactivité musculaire",
          "Travail pliométrique intensif",
          "Maintenir la puissance maximale",
        ],
      },
      balanced: {
        label: "Profil Athlétique Complet",
        description: "Bon équilibre force/élasticité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination sauts",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Élastique",
        description: "Excellente réactivité et élasticité",
        recommendations: [
          "Développer la force maximale",
          "Travail de renforcement musculaire",
          "Musculation des membres inférieurs",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests CMJ et Drop Jump requis",
        recommendations: [
          "Effectuer un test de CMJ",
          "Effectuer un test de Drop Jump (RSI)",
        ],
      },
    },
  },
  bowling: {
    sport: "bowling",
    label: "Bowling",
    tests: [
      {
        key: "ybalance",
        label: "Y-Balance Test",
        shortLabel: "Y-Balance",
        unit: "cm",
        testType: "y_balance",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
      {
        key: "fatiguePrecision",
        label: "Précision sous fatigue",
        shortLabel: "Précision",
        unit: "%",
        testType: "fatigue_precision",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Stabilité / Résistance fatigue technique",
    profileTypes: {
      primary: {
        label: "Profil Stabilité",
        description: "Excellent équilibre et contrôle postural",
        recommendations: [
          "Améliorer la résistance à la fatigue",
          "Travail de répétition haute intensité",
          "Maintenir la stabilité posturale",
        ],
      },
      balanced: {
        label: "Profil Équilibré",
        description: "Bonne stabilité et résistance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail technique régulier",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Endurant Technique",
        description: "Excellente résistance à la fatigue technique",
        recommendations: [
          "Améliorer l'équilibre statique",
          "Travail proprioceptif",
          "Renforcement du gainage",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests Y-Balance et précision requis",
        recommendations: [
          "Effectuer le Y-Balance Test",
          "Effectuer un test de précision sous fatigue",
        ],
      },
    },
  },
  basketball: {
    sport: "basketball",
    label: "Basketball",
    tests: [
      {
        key: "sprint20",
        label: "Sprint 20m",
        shortLabel: "Sprint 20m",
        unit: "s",
        testType: "sprint_20m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Vitesse / Explosivité verticale",
    profileTypes: {
      primary: {
        label: "Profil Vitesse",
        description: "Excellent sprinter sur courtes distances",
        recommendations: [
          "Développer la détente verticale",
          "Travail pliométrique",
          "Maintenir la vitesse de démarrage",
        ],
      },
      balanced: {
        label: "Profil Athlétique Complet",
        description: "Bon équilibre vitesse/détente",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Explosif Vertical",
        description: "Excellente détente verticale",
        recommendations: [
          "Améliorer la vitesse de course",
          "Travail de sprints courts",
          "Renforcement des appuis latéraux",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests sprint 20m et CMJ requis",
        recommendations: [
          "Effectuer un test de sprint 20m",
          "Effectuer un test de détente (CMJ)",
        ],
      },
    },
  },
  // Athlétisme - Sprints (60m, 100m, 200m, 400m)
  athletisme_sprints: {
    sport: "athletisme_sprints",
    label: "Athlétisme - Sprints",
    tests: [
      {
        key: "sprint30",
        label: "Sprint 30m",
        shortLabel: "30m",
        unit: "s",
        testType: "sprint_30m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Vitesse maximale / Puissance explosive",
    profileTypes: {
      primary: {
        label: "Profil Vitesse Pure",
        description: "Excellente vitesse de pointe et temps de réaction",
        recommendations: [
          "Maintenir le travail de vitesse maximale",
          "Développer la puissance des membres inférieurs",
          "Travail de starts et temps de réaction",
        ],
      },
      balanced: {
        label: "Profil Sprinter Complet",
        description: "Bon équilibre vitesse/puissance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de force explosive",
          "Optimiser la technique de course",
        ],
      },
      secondary: {
        label: "Profil Puissance",
        description: "Excellente puissance explosive",
        recommendations: [
          "Améliorer la fréquence de pas",
          "Travail de vélocité",
          "Renforcement spécifique sprinter",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests sprint 30m et CMJ requis",
        recommendations: [
          "Effectuer un test de sprint 30m",
          "Effectuer un test de détente verticale (CMJ)",
        ],
      },
    },
  },
  // Athlétisme - Haies
  athletisme_haies: {
    sport: "athletisme_haies",
    label: "Athlétisme - Haies",
    tests: [
      {
        key: "sprint30",
        label: "Sprint 30-60m",
        shortLabel: "Sprint",
        unit: "s",
        testType: "sprint_30m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Vitesse + coordination / Mobilité articulaire",
    profileTypes: {
      primary: {
        label: "Profil Vitesse-Coordination",
        description: "Excellente vitesse et fréquence de pas",
        recommendations: [
          "Développer la mobilité hanches/ischios",
          "Travail de coordination intersegmentaire",
          "Maintenir la vitesse de base",
        ],
      },
      balanced: {
        label: "Profil Hurdler Complet",
        description: "Bon équilibre vitesse/coordination/mobilité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de rythme entre haies",
          "Optimiser la technique de franchissement",
        ],
      },
      secondary: {
        label: "Profil Explosif-Souple",
        description: "Excellente détente et mobilité",
        recommendations: [
          "Améliorer la vitesse de course",
          "Travail de fréquence de pas",
          "Renforcement spécifique haies",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests sprint et CMJ requis",
        recommendations: [
          "Effectuer un test de sprint 30-60m",
          "Effectuer un test de détente (CMJ)",
        ],
      },
    },
  },
  // Athlétisme - Demi-fond (800m, 1500m, Mile)
  athletisme_demi_fond: {
    sport: "athletisme_demi_fond",
    label: "Athlétisme - Demi-fond",
    tests: [
      {
        key: "vma",
        label: "VMA / VO₂max",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "sprint300",
        label: "Test 300-600m",
        shortLabel: "Lactate",
        unit: "s",
        testType: "run_300m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
    ],
    profileDescription: "Mix aérobie/anaérobie / Tolérance lactique",
    profileTypes: {
      primary: {
        label: "Profil Aérobie Dominant",
        description: "Excellente capacité aérobie et VO₂max",
        recommendations: [
          "Développer la tolérance lactique",
          "Travail de résistance spécifique",
          "Maintenir le niveau aérobie élevé",
        ],
      },
      balanced: {
        label: "Profil Demi-Fondeur Complet",
        description: "Bon équilibre aérobie/anaérobie",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail d'économie de course",
          "Optimiser le kick final",
        ],
      },
      secondary: {
        label: "Profil Résistance Lactique",
        description: "Excellente tolérance à l'acide lactique",
        recommendations: [
          "Améliorer la capacité aérobie",
          "Travail de seuils",
          "Développer l'endurance de base",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et 300-600m requis",
        recommendations: [
          "Effectuer un test de VMA",
          "Effectuer un test de résistance lactique",
        ],
      },
    },
  },
  // Athlétisme - Fond (3000m, 5000m, 10000m, Cross)
  athletisme_fond: {
    sport: "athletisme_fond",
    label: "Athlétisme - Fond",
    tests: [
      {
        key: "vma",
        label: "VMA / VO₂max",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "seuil",
        label: "Test Seuil (LT2)",
        shortLabel: "Seuil",
        unit: "km/h",
        testType: "seuil_test",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Dominante aérobie / Économie de course",
    profileTypes: {
      primary: {
        label: "Profil VO₂max",
        description: "Excellente capacité aérobie maximale",
        recommendations: [
          "Développer l'économie de course",
          "Travail au seuil",
          "Maintenir le niveau aérobie",
        ],
      },
      balanced: {
        label: "Profil Fondeur Complet",
        description: "Bon équilibre VO₂max/Économie",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de résistance à la fatigue",
          "Optimiser la gestion de course",
        ],
      },
      secondary: {
        label: "Profil Économe",
        description: "Excellente économie de course au seuil",
        recommendations: [
          "Améliorer la VO₂max",
          "Travail de VMA",
          "Fractionné haute intensité",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et seuil requis",
        recommendations: [
          "Effectuer un test de VMA/VO₂max",
          "Effectuer un test de seuil",
        ],
      },
    },
  },
  // Athlétisme - Marche athlétique
  athletisme_marche: {
    sport: "athletisme_marche",
    label: "Athlétisme - Marche athlétique",
    tests: [
      {
        key: "vma_marche",
        label: "VMA Spécifique Marche",
        shortLabel: "VMA Marche",
        unit: "km/h",
        testType: "vma_marche",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
      {
        key: "seuil",
        label: "Seuil Ventilatoire",
        shortLabel: "Seuil",
        unit: "km/h",
        testType: "seuil_test",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Endurance aérobie extrême / Technique prioritaire",
    profileTypes: {
      primary: {
        label: "Profil Endurant Technique",
        description: "Excellente endurance et économie de mouvement",
        recommendations: [
          "Maintenir le niveau technique",
          "Travail de puissance aérobie",
          "Développer la résistance mentale",
        ],
      },
      balanced: {
        label: "Profil Marcheur Complet",
        description: "Bon équilibre endurance/technique/économie",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de vitesse spécifique",
          "Optimiser le coût énergétique",
        ],
      },
      secondary: {
        label: "Profil Puissance Aérobie",
        description: "Excellente capacité cardio-respiratoire",
        recommendations: [
          "Améliorer la technique de marche",
          "Travail d'économie de geste",
          "Analyse biomécanique",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA marche et seuil requis",
        recommendations: [
          "Effectuer un test de VMA spécifique marche",
          "Effectuer un test de seuil ventilatoire",
        ],
      },
    },
  },
  // Athlétisme - Sauts horizontaux (Longueur, Triple)
  athletisme_sauts_longueur: {
    sport: "athletisme_sauts_longueur",
    label: "Athlétisme - Sauts horizontaux",
    tests: [
      {
        key: "sprint30",
        label: "Sprint 30-40m",
        shortLabel: "Sprint",
        unit: "s",
        testType: "sprint_30m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "dropjump",
        label: "Drop Jump (RSI)",
        shortLabel: "RSI",
        unit: "RSI",
        testType: "drop_jump",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Vitesse + explosivité / Élasticité musculaire",
    profileTypes: {
      primary: {
        label: "Profil Vitesse-Course d'élan",
        description: "Excellente vitesse d'approche",
        recommendations: [
          "Développer la raideur musculaire",
          "Travail de pliométrie horizontale",
          "Maintenir la vitesse maximale",
        ],
      },
      balanced: {
        label: "Profil Sauteur Complet",
        description: "Bon équilibre vitesse/élasticité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination intersegmentaire",
          "Optimiser la technique d'impulsion",
        ],
      },
      secondary: {
        label: "Profil Élastique-Réactif",
        description: "Excellente élasticité et réactivité au sol",
        recommendations: [
          "Améliorer la vitesse de course",
          "Travail de sprints",
          "Renforcement spécifique sauteur",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests sprint et Drop Jump requis",
        recommendations: [
          "Effectuer un test de sprint 30-40m",
          "Effectuer un test de Drop Jump (RSI)",
        ],
      },
    },
  },
  // Athlétisme - Sauts verticaux (Hauteur, Perche)
  athletisme_sauts_hauteur: {
    sport: "athletisme_sauts_hauteur",
    label: "Athlétisme - Sauts verticaux",
    tests: [
      {
        key: "cmj_unilateral",
        label: "CMJ Unipodal",
        shortLabel: "CMJ Uni",
        unit: "cm",
        testType: "cmj_unilateral",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
      {
        key: "sprint_approche",
        label: "Vitesse d'Approche",
        shortLabel: "Approche",
        unit: "m/s",
        testType: "sprint_approche",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Explosivité verticale / Coordination technique",
    profileTypes: {
      primary: {
        label: "Profil Explosif Vertical",
        description: "Excellente détente verticale unipodal",
        recommendations: [
          "Améliorer la vitesse d'approche",
          "Travail de coordination course-impulsion",
          "Maintenir la puissance verticale",
        ],
      },
      balanced: {
        label: "Profil Sauteur Vertical Complet",
        description: "Bon équilibre détente/vitesse/coordination",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail technique spécifique",
          "Optimiser le timing d'impulsion",
        ],
      },
      secondary: {
        label: "Profil Dynamique",
        description: "Excellente vitesse d'approche et coordination",
        recommendations: [
          "Développer la force verticale",
          "Travail de musculation spécifique",
          "Pliométrie verticale",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests CMJ unipodal et vitesse d'approche requis",
        recommendations: [
          "Effectuer un test de CMJ unipodal",
          "Mesurer la vitesse d'approche",
        ],
      },
    },
  },
  // Athlétisme - Lancers (Poids, Disque, Marteau, Javelot)
  athletisme_lancers: {
    sport: "athletisme_lancers",
    label: "Athlétisme - Lancers",
    tests: [
      {
        key: "force_max",
        label: "Force Max (Squat/Bench)",
        shortLabel: "Force",
        unit: "kg",
        testType: "squat_1rm",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
      {
        key: "puissance_rotative",
        label: "Puissance Rotative (MB)",
        shortLabel: "Rotation",
        unit: "m",
        testType: "medicine_ball_throw",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Force maximale / Puissance rotative",
    profileTypes: {
      primary: {
        label: "Profil Force Absolue",
        description: "Excellente force maximale",
        recommendations: [
          "Développer la puissance rotative",
          "Travail de vitesse gestuelle",
          "Maintenir la force maximale",
        ],
      },
      balanced: {
        label: "Profil Lanceur Complet",
        description: "Bon équilibre force/puissance/vitesse",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail technique spécifique",
          "Optimiser le transfert de force",
        ],
      },
      secondary: {
        label: "Profil Puissance Rotative",
        description: "Excellente puissance et vitesse de rotation",
        recommendations: [
          "Développer la force maximale",
          "Travail de musculation lourde",
          "Renforcement du tronc",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests force max et lancer MB requis",
        recommendations: [
          "Effectuer un test de force maximale (Squat ou Bench)",
          "Effectuer un test de lancer medicine ball",
        ],
      },
    },
  },
  // Athlétisme - Épreuves combinées (Décathlon, Heptathlon)
  athletisme_combines: {
    sport: "athletisme_combines",
    label: "Athlétisme - Épreuves combinées",
    tests: [
      {
        key: "vma",
        label: "VMA",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Profil polyvalent / Force + Vitesse + Endurance",
    profileTypes: {
      primary: {
        label: "Profil Endurant-Polyvalent",
        description: "Excellente capacité aérobie et récupération",
        recommendations: [
          "Développer la puissance explosive",
          "Travail technique multi-disciplines",
          "Maintenir l'endurance de base",
        ],
      },
      balanced: {
        label: "Profil Décathlonien Complet",
        description: "Excellente adaptabilité et polyvalence",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de toutes les disciplines",
          "Optimiser les points faibles",
        ],
      },
      secondary: {
        label: "Profil Explosif-Polyvalent",
        description: "Excellente force et vitesse",
        recommendations: [
          "Améliorer l'endurance",
          "Travail aérobie régulier",
          "Développer la récupération",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et CMJ requis",
        recommendations: [
          "Effectuer un test de VMA",
          "Effectuer un test de détente verticale (CMJ)",
        ],
      },
    },
  },
  // Generic athletisme profile (for club/academie/national without specific discipline)
  athletisme: {
    sport: "athletisme",
    label: "Athlétisme",
    tests: [
      {
        key: "vma",
        label: "VMA",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Capacité aérobie / Puissance explosive",
    profileTypes: {
      primary: {
        label: "Profil Endurant",
        description: "Excellente capacité aérobie",
        recommendations: [
          "Développer la puissance explosive",
          "Travail de vitesse",
          "Maintenir l'endurance",
        ],
      },
      balanced: {
        label: "Profil Athlète Complet",
        description: "Bon équilibre endurance/explosivité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Développement harmonieux",
          "Identifier la spécialisation",
        ],
      },
      secondary: {
        label: "Profil Explosif",
        description: "Excellente puissance et détente",
        recommendations: [
          "Améliorer l'endurance",
          "Travail aérobie",
          "Développer la capacité de récupération",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et CMJ requis",
        recommendations: [
          "Effectuer un test de VMA",
          "Effectuer un test de détente verticale (CMJ)",
        ],
      },
    },
  },
  tennis: {
    sport: "tennis",
    label: "Tennis",
    tests: [
      {
        key: "sprint5_10",
        label: "Sprint navette 5-10-5m",
        shortLabel: "Navette",
        unit: "s",
        testType: "sprint_5_10_5",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Agilité / changement de direction / Explosivité",
    profileTypes: {
      primary: {
        label: "Profil Agilité",
        description: "Excellent changement de direction et réactivité",
        recommendations: [
          "Développer la puissance des membres inférieurs",
          "Travail pliométrique",
          "Maintenir l'agilité et la vitesse de déplacement",
        ],
      },
      balanced: {
        label: "Profil Athlétique Complet",
        description: "Bon équilibre agilité/explosivité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination",
          "Renforcement spécifique tennis",
        ],
      },
      secondary: {
        label: "Profil Explosif",
        description: "Excellente puissance et détente",
        recommendations: [
          "Améliorer la vitesse latérale",
          "Travail de changements de direction",
          "Exercices spécifiques de déplacement court",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests navette 5-10-5 et CMJ requis",
        recommendations: [
          "Effectuer un test de navette 5-10-5",
          "Effectuer un test de détente verticale (CMJ)",
        ],
      },
    },
  },
  ski: {
    sport: "ski",
    label: "Ski / Snowboard",
    tests: [
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
      {
        key: "isometric_squat",
        label: "Force Isométrique Squat",
        shortLabel: "Iso Squat",
        unit: "N/kg",
        testType: "isometric_squat",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Puissance explosive / Force isométrique",
    profileTypes: {
      primary: {
        label: "Profil Explosif",
        description: "Excellente puissance et détente",
        recommendations: [
          "Développer la force isométrique des membres inférieurs",
          "Travail de gainage et stabilité",
          "Maintenir la puissance explosive",
        ],
      },
      balanced: {
        label: "Profil Skieur Complet",
        description: "Bon équilibre puissance/force/stabilité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail proprioceptif avancé",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Force-Endurance",
        description: "Excellente force isométrique et résistance",
        recommendations: [
          "Développer la puissance explosive",
          "Travail pliométrique",
          "Renforcement de la réactivité musculaire",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests CMJ et force isométrique requis",
        recommendations: [
          "Effectuer un test de CMJ",
          "Effectuer un test de force isométrique squat",
        ],
      },
    },
  },
  surf: {
    sport: "surf",
    label: "Surf",
    tests: [
      {
        key: "paddleTest",
        label: "Test Rame 200m",
        shortLabel: "Rame",
        unit: "s",
        testType: "paddle_200m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "popupSpeed",
        label: "Vitesse Pop-up",
        shortLabel: "Pop-up",
        unit: "s",
        testType: "popup_speed",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
    ],
    profileDescription: "Endurance rame / Explosivité pop-up",
    profileTypes: {
      primary: {
        label: "Profil Endurant Rame",
        description: "Excellente endurance de rame et cardio",
        recommendations: [
          "Développer la vitesse de pop-up",
          "Travail d'explosivité du haut du corps",
          "Maintenir l'endurance de rame",
        ],
      },
      balanced: {
        label: "Profil Surfeur Complet",
        description: "Bon équilibre endurance/explosivité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de mobilité et souplesse",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Explosif",
        description: "Excellent pop-up et réactivité",
        recommendations: [
          "Améliorer l'endurance de rame",
          "Travail cardio spécifique surf",
          "Natation longue distance",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests rame et pop-up requis",
        recommendations: [
          "Effectuer un test de rame 200m",
          "Effectuer un test de vitesse pop-up",
        ],
      },
    },
  },
  padel: {
    sport: "padel",
    label: "Padel",
    tests: [
      {
        key: "navette",
        label: "Test Navette 5-10-5m",
        shortLabel: "Navette",
        unit: "s",
        testType: "sprint_5_10_5",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "cmj",
        label: "Counter Movement Jump",
        shortLabel: "CMJ",
        unit: "cm",
        testType: "cmj",
        tableSource: "jump_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Agilité / Explosivité verticale",
    profileTypes: {
      primary: {
        label: "Profil Agilité",
        description: "Excellent changement de direction",
        recommendations: [
          "Développer la puissance verticale",
          "Travail pliométrique",
          "Maintenir la vitesse latérale",
        ],
      },
      balanced: {
        label: "Profil Padel Complet",
        description: "Bon équilibre agilité/explosivité",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de coordination",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Explosif",
        description: "Excellente détente verticale",
        recommendations: [
          "Améliorer la vitesse latérale",
          "Travail de changements de direction",
          "Exercices de déplacement court",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests navette et CMJ requis",
        recommendations: [
          "Effectuer un test de navette 5-10-5",
          "Effectuer un test de CMJ",
        ],
      },
    },
  },
  natation: {
    sport: "natation",
    label: "Natation",
    tests: [
      {
        key: "css",
        label: "Critical Swim Speed (CSS)",
        shortLabel: "CSS",
        unit: "m/s",
        testType: "css_test",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
      {
        key: "sprint25",
        label: "Sprint 25m",
        shortLabel: "Sprint 25m",
        unit: "s",
        testType: "sprint_25m",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
    ],
    profileDescription: "Endurance spécifique / Vitesse maximale",
    profileTypes: {
      primary: {
        label: "Profil Endurant",
        description: "Excellente vitesse critique de nage",
        recommendations: [
          "Développer la vitesse de sprint",
          "Travail de puissance départ/virage",
          "Maintenir l'endurance aérobie",
        ],
      },
      balanced: {
        label: "Profil Nageur Complet",
        description: "Bon équilibre endurance/vitesse",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail technique spécifique",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Sprinter",
        description: "Excellente vitesse de nage",
        recommendations: [
          "Améliorer l'endurance",
          "Travail aérobie de base",
          "Séries longues régulières",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests CSS et sprint 25m requis",
        recommendations: [
          "Effectuer un test de CSS",
          "Effectuer un test de sprint 25m",
        ],
      },
    },
  },
  triathlon: {
    sport: "triathlon",
    label: "Triathlon",
    tests: [
      {
        key: "vma",
        label: "VMA",
        shortLabel: "VMA",
        unit: "km/h",
        testType: "1600m_run",
        tableSource: "speed_tests",
        higherIsBetter: true,
      },
      {
        key: "ftp",
        label: "FTP Vélo (Functional Threshold Power)",
        shortLabel: "FTP",
        unit: "W/kg",
        testType: "ftp_test",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Capacité aérobie course / Puissance cycliste",
    profileTypes: {
      primary: {
        label: "Profil Coureur",
        description: "Excellente capacité aérobie en course",
        recommendations: [
          "Développer la puissance vélo",
          "Travail spécifique cycliste",
          "Maintenir l'endurance course",
        ],
      },
      balanced: {
        label: "Profil Triathlète Complet",
        description: "Bon équilibre entre les disciplines",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Optimiser les transitions",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Cycliste",
        description: "Excellente puissance au seuil vélo",
        recommendations: [
          "Améliorer la VMA",
          "Travail fractionné course à pied",
          "Développer l'endurance course",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests VMA et FTP requis",
        recommendations: [
          "Effectuer un test de VMA",
          "Effectuer un test FTP vélo",
        ],
      },
    },
  },
  crossfit: {
    sport: "crossfit",
    label: "CrossFit / Hyrox",
    tests: [
      {
        key: "fran",
        label: "Benchmark Fran / Temps référence",
        shortLabel: "Benchmark",
        unit: "s",
        testType: "benchmark_wod",
        tableSource: "generic_tests",
        higherIsBetter: false,
      },
      {
        key: "deadlift1rm",
        label: "Deadlift 1RM",
        shortLabel: "Deadlift",
        unit: "kg",
        testType: "deadlift_1rm",
        tableSource: "generic_tests",
        higherIsBetter: true,
      },
    ],
    profileDescription: "Capacité métabolique / Force maximale",
    profileTypes: {
      primary: {
        label: "Profil Métabolique",
        description: "Excellente endurance et tolérance à l'effort",
        recommendations: [
          "Développer la force maximale",
          "Travail de force lourde",
          "Maintenir la capacité métabolique",
        ],
      },
      balanced: {
        label: "Profil Athlète Complet",
        description: "Bon équilibre force/endurance",
        recommendations: [
          "Maintenir l'équilibre actuel",
          "Travail de skills gymniques",
          "Développement harmonieux",
        ],
      },
      secondary: {
        label: "Profil Force",
        description: "Excellente force maximale",
        recommendations: [
          "Améliorer la capacité métabolique",
          "Travail cardio haute intensité",
          "WODs longs réguliers",
        ],
      },
      insufficientData: {
        label: "Données insuffisantes",
        description: "Tests benchmark et deadlift requis",
        recommendations: [
          "Effectuer un WOD benchmark",
          "Effectuer un test de deadlift 1RM",
        ],
      },
    },
  },
};

export function getAthleticProfileConfig(sportType: string, playerDiscipline?: string | null): AthleticProfileConfig {
  // If player has a specific discipline (for athletics), use that first
  if (playerDiscipline && ATHLETIC_PROFILES[playerDiscipline]) {
    return ATHLETIC_PROFILES[playerDiscipline];
  }
  
  // Check for specific athletisme discipline first
  if (ATHLETIC_PROFILES[sportType]) {
    return ATHLETIC_PROFILES[sportType];
  }
  
  // Check for athletisme subtypes (club, academie, national)
  if (sportType.startsWith("athletisme_")) {
    // For generic athletisme types, use the base athletisme profile
    if (sportType === "athletisme_club" || sportType === "athletisme_academie" || sportType === "athletisme_national") {
      return ATHLETIC_PROFILES.athletisme;
    }
    // Otherwise check if there's a specific discipline profile
    if (ATHLETIC_PROFILES[sportType]) {
      return ATHLETIC_PROFILES[sportType];
    }
  }
  
  const mainSport = getMainSportFromType(sportType);
  return ATHLETIC_PROFILES[mainSport] || ATHLETIC_PROFILES.rugby;
}

// Helper to get discipline/weight category label
export function getDisciplineLabel(disciplineValue: string): string {
  const allOptions = [
    // Athletics disciplines (short labels)
    { value: "athletisme_sprints", label: "Sprints" },
    { value: "athletisme_haies", label: "Haies" },
    { value: "athletisme_demi_fond", label: "Demi-fond" },
    { value: "athletisme_fond", label: "Fond" },
    { value: "athletisme_marche", label: "Marche athlétique" },
    { value: "athletisme_sauts_longueur", label: "Sauts horizontaux" },
    { value: "athletisme_sauts_hauteur", label: "Sauts verticaux" },
    { value: "athletisme_lancers", label: "Lancers" },
    { value: "athletisme_combines", label: "Épreuves combinées" },
    { value: "athletisme_trail", label: "Trail" },
    { value: "athletisme_ultra_trail", label: "Ultra-Trail" },
    // Judo weight categories - Men
    { value: "judo_-60kg", label: "-60 kg" },
    { value: "judo_-66kg", label: "-66 kg" },
    { value: "judo_-73kg", label: "-73 kg" },
    { value: "judo_-81kg", label: "-81 kg" },
    { value: "judo_-90kg", label: "-90 kg" },
    { value: "judo_-100kg", label: "-100 kg" },
    { value: "judo_+100kg", label: "+100 kg" },
    // Judo weight categories - Women
    { value: "judo_-48kg", label: "-48 kg" },
    { value: "judo_-52kg", label: "-52 kg" },
    { value: "judo_-57kg", label: "-57 kg" },
    { value: "judo_-63kg", label: "-63 kg" },
    { value: "judo_-70kg", label: "-70 kg" },
    { value: "judo_-78kg", label: "-78 kg" },
    { value: "judo_+78kg", label: "+78 kg" },
    // Ski / Snowboard disciplines
    { value: "ski_descente", label: "Descente" },
    { value: "ski_slalom", label: "Slalom" },
    { value: "ski_geant", label: "Géant" },
    { value: "ski_super_g", label: "Super-G" },
    { value: "ski_combine", label: "Combiné Alpin" },
    { value: "ski_biathlon", label: "Biathlon" },
    { value: "ski_fond_sprint", label: "Fond - Sprint" },
    { value: "ski_fond_distance", label: "Fond - Distance" },
    { value: "ski_fond_relais", label: "Fond - Relais" },
    { value: "ski_fond_skiathlon", label: "Fond - Skiathlon" },
    { value: "ski_freestyle_bosses", label: "Freestyle - Bosses" },
    { value: "ski_freestyle_slopestyle", label: "Freestyle - Slopestyle" },
    { value: "ski_freestyle_halfpipe", label: "Freestyle - Half-pipe" },
    { value: "ski_freestyle_skicross", label: "Freestyle - Skicross" },
    { value: "snow_slopestyle", label: "Snow - Slopestyle" },
    { value: "snow_halfpipe", label: "Snow - Half-pipe" },
    { value: "snow_boardercross", label: "Snow - Boardercross" },
    { value: "snow_geant_parallele", label: "Snow - Géant parallèle" },
    { value: "snow_big_air", label: "Snow - Big Air" },
    { value: "ski_saut", label: "Saut à ski" },
    { value: "ski_combine_nordique", label: "Combiné nordique" },
    // Surf disciplines
    { value: "surf_shortboard", label: "Shortboard" },
    { value: "surf_longboard", label: "Longboard" },
    { value: "surf_bodyboard", label: "Bodyboard" },
    { value: "surf_big_wave", label: "Big Wave" },
    { value: "surf_sup", label: "SUP" },
    { value: "surf_tow_in", label: "Tow-in" },
    { value: "surf_foil", label: "Surf Foil" },
    // Triathlon disciplines
    { value: "triathlon_sprint", label: "Sprint" },
    { value: "triathlon_olympique", label: "Olympique (M)" },
    { value: "triathlon_half", label: "Half Ironman" },
    { value: "triathlon_ironman", label: "Ironman" },
    { value: "triathlon_duathlon", label: "Duathlon" },
    { value: "triathlon_aquathlon", label: "Aquathlon" },
    // Natation disciplines
    { value: "natation_crawl", label: "Nage Libre" },
    { value: "natation_dos", label: "Dos" },
    { value: "natation_brasse", label: "Brasse" },
    { value: "natation_papillon", label: "Papillon" },
    { value: "natation_4nages", label: "4 Nages" },
    { value: "natation_eau_libre", label: "Eau libre" },
  ];
  const found = allOptions.find(d => d.value === disciplineValue);
  return found?.label || disciplineValue;
}

// Helper to get specialty label
export function getSpecialtyLabel(specialtyValue: string): string {
  const allSpecialties: Record<string, string> = {
    // Sprints
    "60m": "60m",
    "100m": "100m",
    "200m": "200m",
    "400m": "400m",
    // Haies
    "60mH": "60m Haies",
    "100mH": "100m Haies",
    "110mH": "110m Haies",
    "400mH": "400m Haies",
    // Demi-fond
    "800m": "800m",
    "1500m": "1500m",
    "mile": "Mile",
    // Fond
    "3000m": "3000m",
    "5000m": "5000m",
    "10000m": "10000m",
    "cross": "Cross-country",
    "semi_marathon": "Semi-marathon",
    "marathon": "Marathon",
    // Marche
    "10km_marche": "10km Marche",
    "20km_marche": "20km Marche",
    "35km_marche": "35km Marche",
    "50km_marche": "50km Marche",
    // Sauts horizontaux
    "longueur": "Longueur",
    "triple_saut": "Triple saut",
    // Sauts verticaux
    "hauteur": "Hauteur",
    "perche": "Perche",
    // Lancers
    "poids": "Poids",
    "disque": "Disque",
    "marteau": "Marteau",
    "javelot": "Javelot",
    // Combinés
    "pentathlon": "Pentathlon",
    "heptathlon": "Heptathlon",
    "decathlon": "Décathlon",
    // Trail
    "trail_court": "Trail court",
    "trail_long": "Trail long",
    "trail_vertical": "Trail vertical",
    "trail_montagne": "Course de montagne",
    // Ultra-Trail
    "ultra_80_100": "Ultra 80-100 km",
    "ultra_100_plus": "Ultra 100+ km",
    "ultra_24h": "24 heures",
    "ultra_multi_etapes": "Multi-étapes",
    // Natation
    "50m_nl": "50m NL",
    "100m_nl": "100m NL",
    "200m_nl": "200m NL",
    "400m_nl": "400m NL",
    "800m_nl": "800m NL",
    "1500m_nl": "1500m NL",
    "50m_dos": "50m Dos",
    "100m_dos": "100m Dos",
    "200m_dos": "200m Dos",
    "50m_brasse": "50m Brasse",
    "100m_brasse": "100m Brasse",
    "200m_brasse": "200m Brasse",
    "50m_pap": "50m Papillon",
    "100m_pap": "100m Papillon",
    "200m_pap": "200m Papillon",
    "200m_4n": "200m 4 Nages",
    "400m_4n": "400m 4 Nages",
    "5km_el": "5km Eau libre",
    "10km_el": "10km Eau libre",
    "25km_el": "25km Eau libre",
  };
  return allSpecialties[specialtyValue] || specialtyValue;
}
