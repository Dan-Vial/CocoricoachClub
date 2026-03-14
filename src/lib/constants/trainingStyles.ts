// Training styles definitions with tooltips for coaches and athletes

export interface TrainingStyleCharacteristics {
  effortPercu: number; // 1-5
  hypertrophie: number; // 1-5
  forcePuissance: number; // 1-5
  enduranceMusculaire: number; // 1-5
  vitesse: number; // 1-5
  stressNerveux: number; // 1-5
  stressMecanique: number; // 1-5
  experienceRequise: number; // 1-5
  methodeAccumulation: boolean;
  methodeIntensification: boolean;
}

export interface TrainingStyleConfig {
  value: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  maxExercises?: number; // For linkable methods
  characteristics?: TrainingStyleCharacteristics;
}

export const TRAINING_STYLES: TrainingStyleConfig[] = [
  { 
    value: "normal", 
    label: "Normal", 
    color: "",
    borderColor: "border-border",
    bgColor: "bg-muted/30",
    description: "Exécution classique : effectuez toutes les séries d'un exercice avant de passer au suivant.",
    characteristics: {
      effortPercu: 2, hypertrophie: 3, forcePuissance: 3, enduranceMusculaire: 2,
      vitesse: 2, stressNerveux: 2, stressMecanique: 2, experienceRequise: 1,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "superset", 
    label: "Superset (agoniste/antagoniste)", 
    color: "bg-blue-500",
    borderColor: "border-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Enchaînez 2 exercices ciblant des muscles opposés sans repos entre eux.",
    maxExercises: 2,
    characteristics: {
      effortPercu: 4, hypertrophie: 4, forcePuissance: 2, enduranceMusculaire: 4,
      vitesse: 2, stressNerveux: 3, stressMecanique: 3, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "biset", 
    label: "Biset (même groupe)", 
    color: "bg-indigo-500",
    borderColor: "border-indigo-500",
    bgColor: "bg-indigo-500/10",
    description: "Enchaînez 2 exercices ciblant le même groupe musculaire sans repos.",
    maxExercises: 2,
    characteristics: {
      effortPercu: 4, hypertrophie: 5, forcePuissance: 2, enduranceMusculaire: 4,
      vitesse: 1, stressNerveux: 3, stressMecanique: 4, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "triset", 
    label: "Triset (3 exercices)", 
    color: "bg-purple-500",
    borderColor: "border-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Enchaînez 3 exercices ciblant le même groupe musculaire sans repos.",
    maxExercises: 3,
    characteristics: {
      effortPercu: 5, hypertrophie: 5, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 1, stressNerveux: 4, stressMecanique: 5, experienceRequise: 3,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "giant_set", 
    label: "Giant Set (4+ exercices)", 
    color: "bg-pink-500",
    borderColor: "border-pink-500",
    bgColor: "bg-pink-500/10",
    description: "Enchaînez 4 exercices ou plus ciblant le même groupe musculaire.",
    maxExercises: 10,
    characteristics: {
      effortPercu: 5, hypertrophie: 5, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 1, stressNerveux: 5, stressMecanique: 5, experienceRequise: 4,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "drop_set", 
    label: "Drop Set", 
    color: "bg-red-500",
    borderColor: "border-red-500",
    bgColor: "bg-red-500/10",
    description: "Série jusqu'à l'échec, puis réduisez le poids (20-25%) et continuez sans repos.",
    characteristics: {
      effortPercu: 5, hypertrophie: 5, forcePuissance: 3, enduranceMusculaire: 4,
      vitesse: 1, stressNerveux: 4, stressMecanique: 5, experienceRequise: 3,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "rest_pause", 
    label: "Rest-Pause", 
    color: "bg-amber-500",
    borderColor: "border-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Série jusqu'à l'échec, reposez 10-15 secondes, puis reprenez.",
    characteristics: {
      effortPercu: 5, hypertrophie: 4, forcePuissance: 4, enduranceMusculaire: 3,
      vitesse: 2, stressNerveux: 5, stressMecanique: 4, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "pyramid_up", 
    label: "Pyramide montante ↑", 
    color: "bg-emerald-500",
    borderColor: "border-emerald-500",
    bgColor: "bg-emerald-500/10",
    description: "Augmentez progressivement le poids en diminuant les reps.",
    characteristics: {
      effortPercu: 4, hypertrophie: 4, forcePuissance: 4, enduranceMusculaire: 3,
      vitesse: 2, stressNerveux: 4, stressMecanique: 4, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: true,
    }
  },
  { 
    value: "pyramid_down", 
    label: "Pyramide descendante ↓", 
    color: "bg-teal-500",
    borderColor: "border-teal-500",
    bgColor: "bg-teal-500/10",
    description: "Commencez lourd avec peu de reps, puis diminuez le poids.",
    characteristics: {
      effortPercu: 4, hypertrophie: 5, forcePuissance: 4, enduranceMusculaire: 4,
      vitesse: 2, stressNerveux: 4, stressMecanique: 4, experienceRequise: 3,
      methodeAccumulation: true, methodeIntensification: true,
    }
  },
  { 
    value: "pyramid_full", 
    label: "Pyramide complète ↑↓", 
    color: "bg-cyan-500",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-500/10",
    description: "Montée puis descente de la charge.",
    characteristics: {
      effortPercu: 5, hypertrophie: 5, forcePuissance: 4, enduranceMusculaire: 4,
      vitesse: 2, stressNerveux: 5, stressMecanique: 5, experienceRequise: 3,
      methodeAccumulation: true, methodeIntensification: true,
    }
  },
  { 
    value: "five_by_five", 
    label: "5x5", 
    color: "bg-sky-500",
    borderColor: "border-sky-500",
    bgColor: "bg-sky-500/10",
    description: "5 séries de 5 répétitions avec charge lourde (80-85% 1RM).",
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 2, stressNerveux: 4, stressMecanique: 4, experienceRequise: 2,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "cluster", 
    label: "Cluster", 
    color: "bg-orange-500",
    borderColor: "border-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Mini-séries avec micro-repos (10-20s) pour maintenir la qualité.",
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 4, stressNerveux: 4, stressMecanique: 4, experienceRequise: 3,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "super_pletnev", 
    label: "Super Pletnev", 
    color: "bg-violet-500",
    borderColor: "border-violet-500",
    bgColor: "bg-violet-500/10",
    description: "Méthode de contraste avancée : excentrique, explosif, isométrie, concentrique.",
    characteristics: {
      effortPercu: 5, hypertrophie: 4, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 5, stressNerveux: 5, stressMecanique: 5, experienceRequise: 5,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "bulgarian", 
    label: "Méthode Bulgare", 
    color: "bg-fuchsia-500",
    borderColor: "border-fuchsia-500",
    bgColor: "bg-fuchsia-500/10",
    description: "Contraste lourd/léger pour potentiation post-activation.",
    maxExercises: 2,
    characteristics: {
      effortPercu: 5, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 5, stressNerveux: 5, stressMecanique: 4, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "isometric_overcoming", 
    label: "Isométrie Overcoming", 
    color: "bg-stone-500",
    borderColor: "border-stone-500",
    bgColor: "bg-stone-500/10",
    description: "Contraction maximale contre résistance fixe immobile.",
    characteristics: {
      effortPercu: 5, hypertrophie: 2, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 2, stressNerveux: 5, stressMecanique: 5, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "isometric_yielding", 
    label: "Isométrie Yielding", 
    color: "bg-slate-500",
    borderColor: "border-slate-500",
    bgColor: "bg-slate-500/10",
    description: "Maintien d'une charge à un angle spécifique.",
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 4, enduranceMusculaire: 4,
      vitesse: 1, stressNerveux: 4, stressMecanique: 4, experienceRequise: 3,
      methodeAccumulation: true, methodeIntensification: true,
    }
  },
  { 
    value: "iso_max", 
    label: "Iso Max", 
    color: "bg-zinc-600",
    borderColor: "border-zinc-600",
    bgColor: "bg-zinc-600/10",
    description: "Contraction isométrique maximale maintenue le plus longtemps possible contre une charge lourde (85-100% 1RM).",
    characteristics: {
      effortPercu: 5, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 3,
      vitesse: 1, stressNerveux: 5, stressMecanique: 5, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  { 
    value: "combine_haltero", 
    label: "Combiné Haltéro", 
    color: "bg-amber-600",
    borderColor: "border-amber-600",
    bgColor: "bg-amber-600/10",
    description: "Enchaînement de mouvements d'haltérophilie (épaulé, arraché, jeté) dans une même série sans reposer la barre.",
    characteristics: {
      effortPercu: 5, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 3,
      vitesse: 5, stressNerveux: 5, stressMecanique: 5, experienceRequise: 5,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  // CrossFit / Cardio methods
  { 
    value: "amrap", 
    label: "AMRAP", 
    color: "bg-rose-500",
    borderColor: "border-rose-500",
    bgColor: "bg-rose-500/10",
    description: "Maximum de répétitions ou tours dans un temps donné.",
    maxExercises: 10,
    characteristics: {
      effortPercu: 5, hypertrophie: 3, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 3, stressNerveux: 4, stressMecanique: 4, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "for_time", 
    label: "For Time", 
    color: "bg-orange-600",
    borderColor: "border-orange-600",
    bgColor: "bg-orange-600/10",
    description: "Complétez un circuit le plus rapidement possible.",
    maxExercises: 10,
    characteristics: {
      effortPercu: 5, hypertrophie: 2, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 4, stressNerveux: 4, stressMecanique: 3, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "death_by", 
    label: "Death By", 
    color: "bg-red-600",
    borderColor: "border-red-600",
    bgColor: "bg-red-600/10",
    description: "+1 rep chaque minute jusqu'à l'échec.",
    characteristics: {
      effortPercu: 5, hypertrophie: 2, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 3, stressNerveux: 5, stressMecanique: 4, experienceRequise: 3,
      methodeAccumulation: true, methodeIntensification: true,
    }
  },
  { 
    value: "circuit", 
    label: "Circuit", 
    color: "bg-lime-500",
    borderColor: "border-lime-500",
    bgColor: "bg-lime-500/10",
    description: "Enchaînement de plusieurs exercices avec peu de repos.",
    maxExercises: 10,
    characteristics: {
      effortPercu: 4, hypertrophie: 2, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 3, stressNerveux: 3, stressMecanique: 3, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "tabata", 
    label: "Tabata", 
    color: "bg-yellow-500",
    borderColor: "border-yellow-500",
    bgColor: "bg-yellow-500/10",
    description: "Intervalles 20s ON / 10s OFF × 8 (paramètres modifiables).",
    characteristics: {
      effortPercu: 5, hypertrophie: 2, forcePuissance: 2, enduranceMusculaire: 5,
      vitesse: 5, stressNerveux: 4, stressMecanique: 3, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "emom", 
    label: "EMOM", 
    color: "bg-indigo-600",
    borderColor: "border-indigo-600",
    bgColor: "bg-indigo-600/10",
    description: "Reps au début de chaque minute, repos le reste.",
    maxExercises: 10,
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 3, enduranceMusculaire: 5,
      vitesse: 3, stressNerveux: 3, stressMecanique: 3, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "vbt", 
    label: "VBT (Velocity Based Training)", 
    color: "bg-emerald-600",
    borderColor: "border-emerald-600",
    bgColor: "bg-emerald-600/10",
    description: "Entraînement basé sur la vitesse d'exécution. Utilisez un encodeur pour adapter la charge en temps réel.",
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 5, stressNerveux: 4, stressMecanique: 4, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
  // Cardio interval methods
  { 
    value: "intermittent_cardio", 
    label: "Intermittent Cardio", 
    color: "bg-sky-600",
    borderColor: "border-sky-600",
    bgColor: "bg-sky-600/10",
    description: "Intervalles effort/récupération avec intensité et durée définies. Supporte course, vélo et natation.",
    characteristics: {
      effortPercu: 4, hypertrophie: 1, forcePuissance: 1, enduranceMusculaire: 5,
      vitesse: 4, stressNerveux: 3, stressMecanique: 2, experienceRequise: 2,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  { 
    value: "fartlek", 
    label: "Fartlek", 
    color: "bg-green-600",
    borderColor: "border-green-600",
    bgColor: "bg-green-600/10",
    description: "Alternance libre ou structurée d'efforts variables et de récupérations actives.",
    characteristics: {
      effortPercu: 4, hypertrophie: 1, forcePuissance: 1, enduranceMusculaire: 5,
      vitesse: 3, stressNerveux: 2, stressMecanique: 2, experienceRequise: 1,
      methodeAccumulation: true, methodeIntensification: false,
    }
  },
  // Isometric/dynamic combination
  { 
    value: "stato_dynamique", 
    label: "Stato-dynamique", 
    color: "bg-amber-600",
    borderColor: "border-amber-600",
    bgColor: "bg-amber-600/10",
    description: "Maintien isométrique (3-5s) suivi d'une phase concentrique explosive. Développe la force et la puissance.",
    characteristics: {
      effortPercu: 4, hypertrophie: 3, forcePuissance: 5, enduranceMusculaire: 2,
      vitesse: 4, stressNerveux: 5, stressMecanique: 4, experienceRequise: 4,
      methodeAccumulation: false, methodeIntensification: true,
    }
  },
];

// Helper functions
export const getTrainingStyleConfig = (style: string): TrainingStyleConfig => {
  return TRAINING_STYLES.find(s => s.value === style) || TRAINING_STYLES[0];
};

// Methods that require linking multiple exercises (creates a block)
export const LINKABLE_METHODS = ["superset", "biset", "triset", "giant_set", "bulgarian"];

// Cardio/CrossFit methods that create blocks with exercises inside
export const CARDIO_BLOCK_METHODS = ["amrap", "for_time", "circuit", "emom", "tabata", "death_by", "intermittent_cardio", "fartlek"];

// Methods that use drop sets configuration (progressive load changes)
export const DROP_METHODS = ["drop_set", "pyramid_up", "pyramid_down", "pyramid_full"];

// Methods that use cluster sets configuration
export const CLUSTER_METHODS = ["cluster", "rest_pause"];

// Special methods with specific UI (e.g., 5x5, VBT)
export const SPECIAL_METHODS = ["five_by_five", "super_pletnev", "isometric_overcoming", "isometric_yielding", "vbt", "stato_dynamique", "iso_max"];

// VBT method requires velocity input
export const VBT_METHODS = ["vbt"];

// All block methods that need the new block UI
export const ALL_BLOCK_METHODS = [
  ...LINKABLE_METHODS, 
  ...CARDIO_BLOCK_METHODS, 
  ...DROP_METHODS, 
  "five_by_five"
];

// Get method by value
export const isLinkableMethod = (method: string): boolean => LINKABLE_METHODS.includes(method);
export const isCardioBlockMethod = (method: string): boolean => CARDIO_BLOCK_METHODS.includes(method);
export const isDropMethod = (method: string): boolean => DROP_METHODS.includes(method);
export const isClusterMethod = (method: string): boolean => CLUSTER_METHODS.includes(method);
export const isBlockMethod = (method: string): boolean => ALL_BLOCK_METHODS.includes(method);
export const isVbtMethod = (method: string): boolean => VBT_METHODS.includes(method);

// Get min exercises required for a linkable method
export const getMinExercisesForMethod = (method: string): number => {
  if (method === "superset" || method === "biset" || method === "bulgarian") return 2;
  if (method === "triset") return 3;
  if (method === "giant_set") return 4;
  if (CARDIO_BLOCK_METHODS.includes(method)) return 1;
  return 1;
};

// Get max exercises for a linkable method
export const getMaxExercisesForMethod = (method: string): number => {
  const style = getTrainingStyleConfig(method);
  return style.maxExercises || 2;
};

// Get field configuration for cardio block methods
export interface CardioBlockConfig {
  showDuration: boolean;
  showRounds: boolean;
  showReps: boolean;
  showSets: boolean;
  showWorkRest: boolean;
  showRestBetweenRounds: boolean;
  durationLabel: string;
  roundsLabel: string;
}

export const getCardioBlockConfig = (method: string): CardioBlockConfig => {
  switch (method) {
    case "amrap":
      return {
        showDuration: true,
        showRounds: false,
        showReps: true,
        showSets: false,
        showWorkRest: false,
        showRestBetweenRounds: false,
        durationLabel: "Durée AMRAP (min)",
        roundsLabel: "",
      };
    case "for_time":
      return {
        showDuration: false,
        showRounds: true,
        showReps: true,
        showSets: false,
        showWorkRest: false,
        showRestBetweenRounds: false,
        durationLabel: "",
        roundsLabel: "Tours à compléter",
      };
    case "circuit":
      return {
        showDuration: false,
        showRounds: true,
        showReps: true,
        showSets: false,
        showWorkRest: false,
        showRestBetweenRounds: true,
        durationLabel: "",
        roundsLabel: "Nombre de tours",
      };
    case "emom":
      return {
        showDuration: true,
        showRounds: false,
        showReps: true,
        showSets: false,
        showWorkRest: false,
        showRestBetweenRounds: false,
        durationLabel: "Durée EMOM (min)",
        roundsLabel: "",
      };
    case "tabata":
      return {
        showDuration: false,
        showRounds: true,
        showReps: false,
        showSets: false,
        showWorkRest: true,
        showRestBetweenRounds: false,
        durationLabel: "",
        roundsLabel: "Nombre de cycles",
      };
    case "death_by":
      return {
        showDuration: false,
        showRounds: false,
        showReps: true,
        showSets: false,
        showWorkRest: false,
        showRestBetweenRounds: false,
        durationLabel: "",
        roundsLabel: "",
      };
    default:
      return {
        showDuration: false,
        showRounds: false,
        showReps: true,
        showSets: true,
        showWorkRest: false,
        showRestBetweenRounds: false,
        durationLabel: "",
        roundsLabel: "",
      };
  }
};

// Styles for workout builder (subset for standard gym sessions)
export const WORKOUT_BUILDER_STYLES = TRAINING_STYLES.filter(s => 
  ["normal", "superset", "biset", "triset", "giant_set", "drop_set", "rest_pause", "pyramid_up", "pyramid_down", "five_by_five", "cluster", "bulgarian", "isometric_overcoming", "isometric_yielding", "super_pletnev", "amrap", "for_time", "circuit", "emom", "tabata", "death_by", "vbt", "intermittent_cardio", "fartlek", "stato_dynamique", "iso_max", "combine_haltero"].includes(s.value)
);

// All styles for program builder
export const PROGRAM_BUILDER_STYLES = TRAINING_STYLES;
