// Common rugby injuries with default rehabilitation protocols
export const RUGBY_INJURY_TYPES = [
  // Musculaires
  { 
    name: "Élongation ischio-jambiers", 
    category: "musculaire",
    durationMin: 14, 
    durationMax: 42,
    description: "Lésion des muscles à l'arrière de la cuisse, fréquente lors des sprints"
  },
  { 
    name: "Élongation quadriceps", 
    category: "musculaire",
    durationMin: 14, 
    durationMax: 35,
    description: "Lésion du muscle à l'avant de la cuisse"
  },
  { 
    name: "Déchirure mollet", 
    category: "musculaire",
    durationMin: 21, 
    durationMax: 56,
    description: "Lésion des muscles du mollet (gastrocnémien/soléaire)"
  },
  { 
    name: "Claquage adducteurs", 
    category: "musculaire",
    durationMin: 14, 
    durationMax: 42,
    description: "Lésion des muscles de l'intérieur de la cuisse"
  },
  { 
    name: "Contusion musculaire", 
    category: "musculaire",
    durationMin: 7, 
    durationMax: 21,
    description: "Ecchymose profonde suite à un choc direct"
  },

  // Articulaires
  { 
    name: "Entorse cheville", 
    category: "articulaire",
    durationMin: 7, 
    durationMax: 42,
    description: "Lésion des ligaments de la cheville (latérale externe le plus souvent)"
  },
  { 
    name: "Entorse genou (LLI)", 
    category: "ligamentaire",
    durationMin: 21, 
    durationMax: 56,
    description: "Lésion du ligament latéral interne du genou"
  },
  { 
    name: "Rupture LCA", 
    category: "ligamentaire",
    durationMin: 180, 
    durationMax: 270,
    description: "Rupture du ligament croisé antérieur - nécessite chirurgie"
  },
  { 
    name: "Lésion méniscale", 
    category: "articulaire",
    durationMin: 42, 
    durationMax: 90,
    description: "Lésion du ménisque du genou"
  },

  // Épaule
  { 
    name: "Luxation épaule", 
    category: "articulaire",
    durationMin: 42, 
    durationMax: 84,
    description: "Déboîtement de l'articulation de l'épaule"
  },
  { 
    name: "Lésion coiffe des rotateurs", 
    category: "musculaire",
    durationMin: 28, 
    durationMax: 84,
    description: "Lésion des muscles stabilisateurs de l'épaule"
  },
  { 
    name: "Entorse acromio-claviculaire", 
    category: "ligamentaire",
    durationMin: 14, 
    durationMax: 56,
    description: "Lésion de l'articulation entre clavicule et omoplate"
  },

  // Tête et cou
  { 
    name: "Commotion cérébrale", 
    category: "neurologique",
    durationMin: 14, 
    durationMax: 42,
    description: "Traumatisme crânien - protocole HIA obligatoire"
  },
  { 
    name: "Cervicalgie traumatique", 
    category: "rachidien",
    durationMin: 7, 
    durationMax: 28,
    description: "Douleur cervicale suite à un traumatisme"
  },

  // Osseux
  { 
    name: "Fracture clavicule", 
    category: "osseux",
    durationMin: 42, 
    durationMax: 84,
    description: "Fracture de la clavicule suite à un choc"
  },
  { 
    name: "Fracture côte", 
    category: "osseux",
    durationMin: 28, 
    durationMax: 56,
    description: "Fracture d'une ou plusieurs côtes"
  },
  { 
    name: "Fracture doigt/main", 
    category: "osseux",
    durationMin: 21, 
    durationMax: 42,
    description: "Fracture au niveau de la main ou des doigts"
  },
  { 
    name: "Fracture de fatigue (tibia)", 
    category: "osseux",
    durationMin: 42, 
    durationMax: 84,
    description: "Microfracture due au stress répétitif"
  },

  // Autres
  { 
    name: "Lombalgie", 
    category: "rachidien",
    durationMin: 7, 
    durationMax: 28,
    description: "Douleur lombaire d'origine mécanique"
  },
  { 
    name: "Pubalgie", 
    category: "musculaire",
    durationMin: 42, 
    durationMax: 120,
    description: "Douleur au niveau du pubis et des adducteurs"
  },
] as const;

export const INJURY_CATEGORIES = [
  { value: "musculaire", label: "Musculaire" },
  { value: "articulaire", label: "Articulaire" },
  { value: "ligamentaire", label: "Ligamentaire" },
  { value: "osseux", label: "Osseux" },
  { value: "rachidien", label: "Rachidien" },
  { value: "neurologique", label: "Neurologique" },
] as const;

// Default rehabilitation phases for common injuries
export const DEFAULT_REHAB_PHASES = {
  musculaire: [
    {
      phase_number: 1,
      name: "Phase inflammatoire / Protection",
      description: "Contrôle de l'inflammation et protection de la zone lésée",
      duration_days_min: 3,
      duration_days_max: 7,
      objectives: [
        "Réduire l'inflammation",
        "Contrôler la douleur",
        "Protéger la zone lésée"
      ],
      exit_criteria: [
        "Douleur < 3/10 au repos",
        "Œdème diminué",
        "Mobilité passive indolore"
      ],
      exercises: [
        { name: "Cryothérapie", description: "Application de glace 15-20 min", sets: 1, reps: "4-6x/jour", frequency: "Toutes les 3h" },
        { name: "Compression", description: "Bandage compressif", sets: 1, reps: "Continue", frequency: "Permanent" },
        { name: "Élévation", description: "Surélévation du membre", sets: 1, reps: "30 min", frequency: "3x/jour" },
        { name: "Mobilisation passive douce", description: "Mouvements passifs dans amplitude indolore", sets: 2, reps: "10", frequency: "2x/jour" }
      ]
    },
    {
      phase_number: 2,
      name: "Phase de réparation / Mobilisation",
      description: "Début de la remise en charge progressive",
      duration_days_min: 7,
      duration_days_max: 14,
      objectives: [
        "Restaurer la mobilité",
        "Début du renforcement isométrique",
        "Améliorer la proprioception"
      ],
      exit_criteria: [
        "Amplitude articulaire complète",
        "Contraction isométrique indolore",
        "Marche normale"
      ],
      exercises: [
        { name: "Étirements doux", description: "Étirements passifs progressifs", sets: 3, reps: "30 sec", frequency: "2x/jour" },
        { name: "Renforcement isométrique", description: "Contractions statiques sans mouvement", sets: 3, reps: "10 x 6 sec", frequency: "2x/jour" },
        { name: "Proprioception niveau 1", description: "Équilibre unipodal surface stable", sets: 3, reps: "30 sec", frequency: "1x/jour" },
        { name: "Marche progressive", description: "Marche sur terrain plat", sets: 1, reps: "15-20 min", frequency: "2x/jour" }
      ]
    },
    {
      phase_number: 3,
      name: "Phase de remodelage / Renforcement",
      description: "Renforcement progressif et retour aux activités",
      duration_days_min: 14,
      duration_days_max: 21,
      objectives: [
        "Renforcement concentrique/excentrique",
        "Retour au jogging",
        "Préparation au retour sport"
      ],
      exit_criteria: [
        "Force > 80% côté sain",
        "Jogging 20 min sans douleur",
        "Exercices spécifiques indolores"
      ],
      exercises: [
        { name: "Renforcement concentrique", description: "Exercices dynamiques avec charge légère", sets: 3, reps: "12-15", frequency: "1x/jour" },
        { name: "Renforcement excentrique", description: "Travail en phase descendante", sets: 3, reps: "8-10", frequency: "1x/jour" },
        { name: "Jogging progressif", description: "Course à allure modérée", sets: 1, reps: "15-20 min", frequency: "1x/jour" },
        { name: "Proprioception niveau 2", description: "Équilibre sur surface instable", sets: 3, reps: "45 sec", frequency: "1x/jour" }
      ]
    },
    {
      phase_number: 4,
      name: "Retour à l'entraînement",
      description: "Réintégration progressive aux entraînements collectifs",
      duration_days_min: 7,
      duration_days_max: 14,
      objectives: [
        "Reprise entraînement individuel",
        "Accélérations progressives",
        "Réintégration groupe partielle"
      ],
      exit_criteria: [
        "Sprint 80% indolore",
        "Changements de direction OK",
        "Entraînement sans restriction"
      ],
      exercises: [
        { name: "Sprints progressifs", description: "Accélérations 50% → 70% → 85%", sets: 5, reps: "30m", frequency: "1x/jour" },
        { name: "Changements de direction", description: "Slalom et changements d'appuis", sets: 4, reps: "8", frequency: "1x/jour" },
        { name: "Entraînement adapté", description: "Participation partielle sans contact", sets: 1, reps: "45 min", frequency: "3x/sem" },
        { name: "Travail spécifique poste", description: "Gestes techniques du poste", sets: 3, reps: "10", frequency: "1x/jour" }
      ]
    },
    {
      phase_number: 5,
      name: "Retour à la performance",
      description: "Validation de la reprise compétitive",
      duration_days_min: 7,
      duration_days_max: 14,
      objectives: [
        "Entraînement complet avec contact",
        "Validation physique 100%",
        "Retour compétition"
      ],
      exit_criteria: [
        "Tous tests physiques validés",
        "Entraînement contact complet",
        "Validation staff médical"
      ],
      exercises: [
        { name: "Entraînement complet", description: "Participation totale avec contact", sets: 1, reps: "90 min", frequency: "Selon planning" },
        { name: "Tests physiques", description: "Validation des tests (sprint, CMJ, etc.)", sets: 1, reps: "Batterie complète", frequency: "1x" },
        { name: "Match amical/opposition", description: "Situation de jeu réelle", sets: 1, reps: "30-45 min", frequency: "1x" },
        { name: "Suivi charge", description: "Monitoring AWCR pendant 2 semaines", sets: 1, reps: "Quotidien", frequency: "Continue" }
      ]
    }
  ],
  articulaire: [
    {
      phase_number: 1,
      name: "Phase aiguë / Immobilisation",
      description: "Protection articulaire et réduction de l'inflammation",
      duration_days_min: 5,
      duration_days_max: 10,
      objectives: [
        "Immobilisation si nécessaire",
        "Contrôle douleur et œdème",
        "Maintien trophicité musculaire"
      ],
      exit_criteria: [
        "Douleur < 4/10 au repos",
        "Œdème stabilisé",
        "Début mobilisation passive"
      ],
      exercises: [
        { name: "RICE Protocol", description: "Repos, Ice, Compression, Elevation", sets: 1, reps: "15-20 min", frequency: "6x/jour" },
        { name: "Contractions isométriques", description: "Maintien du tonus musculaire sans mouvement", sets: 3, reps: "10 x 5 sec", frequency: "3x/jour" },
        { name: "Mobilisation articulations adjacentes", description: "Maintien mobilité segments voisins", sets: 2, reps: "10", frequency: "2x/jour" }
      ]
    },
    {
      phase_number: 2,
      name: "Phase de récupération / Mobilisation",
      description: "Récupération progressive des amplitudes articulaires",
      duration_days_min: 10,
      duration_days_max: 21,
      objectives: [
        "Récupération amplitude complète",
        "Renforcement stabilisateurs",
        "Proprioception de base"
      ],
      exit_criteria: [
        "Amplitude > 90% controlatéral",
        "Stabilité articulaire correcte",
        "Appui complet indolore"
      ],
      exercises: [
        { name: "Mobilisations actives-aidées", description: "Mouvements avec assistance", sets: 3, reps: "15", frequency: "3x/jour" },
        { name: "Renforcement en chaîne fermée", description: "Exercices avec pied/main fixé", sets: 3, reps: "12", frequency: "1x/jour" },
        { name: "Proprioception statique", description: "Équilibre sur surface stable", sets: 4, reps: "30 sec", frequency: "2x/jour" },
        { name: "Travail aquatique", description: "Exercices en piscine si disponible", sets: 1, reps: "20 min", frequency: "3x/sem" }
      ]
    },
    {
      phase_number: 3,
      name: "Renforcement fonctionnel",
      description: "Préparation aux contraintes sportives",
      duration_days_min: 14,
      duration_days_max: 28,
      objectives: [
        "Force musculaire optimale",
        "Stabilité dynamique",
        "Préparation aux gestes sportifs"
      ],
      exit_criteria: [
        "Force > 85% controlatéral",
        "Proprioception dynamique OK",
        "Course ligne droite indolore"
      ],
      exercises: [
        { name: "Renforcement analytique", description: "Travail ciblé des muscles stabilisateurs", sets: 4, reps: "10-12", frequency: "1x/jour" },
        { name: "Proprioception dynamique", description: "Équilibre avec perturbations", sets: 4, reps: "45 sec", frequency: "1x/jour" },
        { name: "Course progressif", description: "Jogging puis course", sets: 1, reps: "20-30 min", frequency: "1x/jour" },
        { name: "Pliométrie légère", description: "Sauts et réceptions contrôlés", sets: 3, reps: "8", frequency: "3x/sem" }
      ]
    },
    {
      phase_number: 4,
      name: "Retour terrain",
      description: "Réathlétisation et retour progressif",
      duration_days_min: 7,
      duration_days_max: 14,
      objectives: [
        "Sprints et changements direction",
        "Gestes spécifiques rugby",
        "Entraînement collectif"
      ],
      exit_criteria: [
        "Tous gestes sportifs validés",
        "Pas de douleur ni appréhension",
        "Accord médical"
      ],
      exercises: [
        { name: "Sprints intensité croissante", description: "70% → 85% → 100%", sets: 6, reps: "30m", frequency: "1x/jour" },
        { name: "Changements de direction", description: "Crochet, cadrage-débordement", sets: 4, reps: "10", frequency: "1x/jour" },
        { name: "Travail spécifique", description: "Gestes du poste (plaquage adapté, etc.)", sets: 1, reps: "20 min", frequency: "1x/jour" },
        { name: "Entraînement collectif", description: "Intégration progressive", sets: 1, reps: "Complet", frequency: "Selon planning" }
      ]
    }
  ]
};

export type InjuryCategory = typeof INJURY_CATEGORIES[number]["value"];
