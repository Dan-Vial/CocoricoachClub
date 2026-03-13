import { 
  Dumbbell, 
  Footprints, 
  Bike, 
  TrendingUp, 
  Heart, 
  Target, 
  StretchHorizontal, 
  Activity, 
  Flame, 
  PersonStanding,
  Medal,
  type LucideIcon 
} from "lucide-react";

// Main categories for exercise library and session management
export interface ExerciseCategory {
  value: string;
  label: string;
  group: string | null;
  sport?: string; // Optional sport filter for terrain exercises
}

// Configuration des couleurs et icônes par groupe
export interface CategoryGroupConfig {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

export const CATEGORY_GROUP_CONFIGS: Record<string, CategoryGroupConfig> = {
  halterophilie: {
    value: "halterophilie",
    label: "Haltérophilie",
    color: "text-yellow-600",
    bgColor: "bg-yellow-600/10",
    borderColor: "border-yellow-600/30",
    icon: Medal,
  },
  musculation: {
    value: "musculation",
    label: "Musculation",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    icon: Dumbbell,
  },
  course: {
    value: "course",
    label: "Course",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: Footprints,
  },
  ergo: {
    value: "ergo",
    label: "Ergo / Cardio",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    icon: Bike,
  },
  sled: {
    value: "sled",
    label: "Traîneau",
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    borderColor: "border-amber-600/30",
    icon: TrendingUp,
  },
  crossfit_hyrox: {
    value: "crossfit_hyrox",
    label: "CrossFit / Hyrox",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: Flame,
  },
  bodyweight: {
    value: "bodyweight",
    label: "Poids de corps",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    icon: PersonStanding,
  },
  pilates: {
    value: "pilates",
    label: "Pilates / Yoga",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    icon: Activity,
  },
  reathletisation: {
    value: "reathletisation",
    label: "Rehab / Réathlé",
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
    borderColor: "border-emerald-600/30",
    icon: Heart,
  },
  terrain: {
    value: "terrain",
    label: "Terrain",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    icon: Target,
  },
  stretching_mobility: {
    value: "stretching_mobility",
    label: "Échauffement / Mobilité",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    icon: StretchHorizontal,
  },
};

// Helper pour obtenir la config d'un groupe
export function getCategoryGroupConfig(group: string | null): CategoryGroupConfig | null {
  if (!group) return null;
  return CATEGORY_GROUP_CONFIGS[group] || null;
}

// Helper pour obtenir la couleur d'une catégorie
export function getCategoryColor(categoryValue: string): { color: string; bgColor: string; borderColor: string } {
  const category = EXERCISE_CATEGORIES.find(c => c.value === categoryValue);
  const group = category?.group;
  const config = group ? CATEGORY_GROUP_CONFIGS[group] : null;
  
  return {
    color: config?.color || "text-muted-foreground",
    bgColor: config?.bgColor || "bg-muted",
    borderColor: config?.borderColor || "border-muted",
  };
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  // Haltérophilie - Mouvements complets
  { value: "halterophilie_snatch", label: "Arraché (Snatch)", group: "halterophilie" },
  { value: "halterophilie_clean", label: "Épaulé (Clean)", group: "halterophilie" },
  { value: "halterophilie_jerk", label: "Jeté (Jerk)", group: "halterophilie" },
  { value: "halterophilie_clean_jerk", label: "Épaulé-Jeté", group: "halterophilie" },
  
  // Haltérophilie - Semi-technique & Éducatifs
  { value: "halterophilie_pulls", label: "Tirages (Pulls)", group: "halterophilie" },
  { value: "halterophilie_positions", label: "Travail de positions", group: "halterophilie" },
  { value: "halterophilie_hang", label: "Suspendus (Hang)", group: "halterophilie" },
  { value: "halterophilie_blocks", label: "Blocs", group: "halterophilie" },
  { value: "halterophilie_complexes", label: "Complexes", group: "halterophilie" },
  
  // Haltérophilie - Accessoires & Renforcement
  { value: "halterophilie_squats", label: "Squats Haltéro", group: "halterophilie" },
  { value: "halterophilie_presses", label: "Développés Haltéro", group: "halterophilie" },
  { value: "halterophilie_pulls_strength", label: "Tirages Force", group: "halterophilie" },
  
  // Musculation - Haut du corps
  { value: "upper_push", label: "Haut - Poussée", group: "musculation" },
  { value: "upper_pull", label: "Haut - Tirage", group: "musculation" },
  { value: "shoulders", label: "Épaules", group: "musculation" },
  { value: "arms", label: "Bras (biceps/triceps)", group: "musculation" },
  
  // Musculation - Bas du corps
  { value: "lower_push", label: "Bas - Poussée (quad dominant)", group: "musculation" },
  { value: "lower_pull", label: "Bas - Tirage (hip dominant)", group: "musculation" },
  { value: "glutes", label: "Fessiers", group: "musculation" },
  { value: "hamstrings", label: "Ischio-jambiers", group: "musculation" },
  { value: "calves", label: "Mollets", group: "musculation" },
  
  // Musculation - Core & Général
  { value: "core", label: "Core / Gainage", group: "musculation" },
  { value: "anti_rotation", label: "Anti-rotation", group: "musculation" },
  { value: "musculation", label: "Musculation (général)", group: "musculation" },
  
  // Musculation - Méthodes spécifiques
  { value: "plyometrics", label: "Pliométrie", group: "musculation" },
  { value: "isometrics", label: "Isométrie", group: "musculation" },
  { value: "explosive", label: "Explosivité", group: "musculation" },
  
  // Poids de corps (avec option poids additionnel)
  { value: "bodyweight_upper", label: "Poids de corps - Haut", group: "bodyweight" },
  { value: "bodyweight_lower", label: "Poids de corps - Bas", group: "bodyweight" },
  { value: "bodyweight_core", label: "Poids de corps - Core", group: "bodyweight" },
  { value: "bodyweight_full", label: "Poids de corps - Full body", group: "bodyweight" },
  { value: "calisthenics", label: "Calisthenics", group: "bodyweight" },
  { value: "gymnastics", label: "Gymnastique", group: "bodyweight" },
  { value: "weighted_calisthenics", label: "Calisthenics lesté", group: "bodyweight" },
  
  // CrossFit / Hyrox
  { value: "crossfit_wod", label: "WOD", group: "crossfit_hyrox" },
  { value: "crossfit_amrap", label: "AMRAP", group: "crossfit_hyrox" },
  { value: "crossfit_emom", label: "EMOM", group: "crossfit_hyrox" },
  { value: "crossfit_fortime", label: "For Time", group: "crossfit_hyrox" },
  { value: "crossfit_chipper", label: "Chipper", group: "crossfit_hyrox" },
  { value: "hyrox_simulation", label: "Hyrox Simulation", group: "crossfit_hyrox" },
  { value: "hyrox_running", label: "Hyrox - Course", group: "crossfit_hyrox" },
  { value: "hyrox_stations", label: "Hyrox - Stations", group: "crossfit_hyrox" },
  { value: "functional_fitness", label: "Functional Fitness", group: "crossfit_hyrox" },
  
  // Pilates / Yoga
  { value: "pilates_mat", label: "Pilates Mat", group: "pilates" },
  { value: "pilates_reformer", label: "Pilates Reformer", group: "pilates" },
  { value: "yoga_flow", label: "Yoga Flow", group: "pilates" },
  { value: "yoga_power", label: "Power Yoga", group: "pilates" },
  { value: "yoga_stretch", label: "Yoga Étirement", group: "pilates" },
  { value: "pilates_core", label: "Pilates Core", group: "pilates" },
  
  // Rehab / Réathlétisation - Catégories par zone
  { value: "reathletisation_lower", label: "Rehab - Membres inférieurs", group: "reathletisation" },
  { value: "reathletisation_upper", label: "Rehab - Membres supérieurs", group: "reathletisation" },
  { value: "reathletisation_trunk", label: "Rehab - Tronc / Rachis", group: "reathletisation" },
  
  // Rehab - Stabilité articulaire
  { value: "shoulder_stability", label: "Rehab - Stabilité épaule", group: "reathletisation" },
  { value: "knee_stability", label: "Rehab - Stabilité genou", group: "reathletisation" },
  { value: "ankle_stability", label: "Rehab - Stabilité cheville", group: "reathletisation" },
  { value: "hip_stability", label: "Rehab - Stabilité hanche", group: "reathletisation" },
  { value: "wrist_hand_rehab", label: "Rehab - Poignet / Main", group: "reathletisation" },
  { value: "elbow_rehab", label: "Rehab - Coude", group: "reathletisation" },
  
  // Rehab - Proprioception & Neuromusculaire
  { value: "proprioception", label: "Proprioception", group: "reathletisation" },
  { value: "neuromuscular", label: "Activation neuromusculaire", group: "reathletisation" },
  { value: "balance_training", label: "Équilibre / Balance", group: "reathletisation" },
  
  // Rehab - Travail musculaire spécifique
  { value: "eccentric", label: "Travail excentrique", group: "reathletisation" },
  { value: "isometric_rehab", label: "Isométrique (rehab)", group: "reathletisation" },
  { value: "concentric_rehab", label: "Concentrique progressif", group: "reathletisation" },
  
  // Rehab - Mobilité & Amplitude
  { value: "rom_restoration", label: "Récupération amplitude (ROM)", group: "reathletisation" },
  { value: "joint_mobilization", label: "Mobilisation articulaire", group: "reathletisation" },
  { value: "scar_tissue_work", label: "Travail cicatriciel / Adhérences", group: "reathletisation" },
  
  // Rehab - Contrôle moteur & Fonctionnel
  { value: "motor_control", label: "Contrôle moteur", group: "reathletisation" },
  { value: "functional_rehab", label: "Fonctionnel / Gestes sportifs adaptés", group: "reathletisation" },
  { value: "gait_retraining", label: "Rééducation à la marche", group: "reathletisation" },
  { value: "running_rehab", label: "Reprise course progressive", group: "reathletisation" },
  
  // Rehab - Renforcement spécifique kiné
  { value: "rotator_cuff", label: "Coiffe des rotateurs", group: "reathletisation" },
  { value: "scapular_control", label: "Contrôle scapulaire", group: "reathletisation" },
  { value: "hamstring_rehab", label: "Ischio-jambiers (rehab)", group: "reathletisation" },
  { value: "quadriceps_rehab", label: "Quadriceps (rehab)", group: "reathletisation" },
  { value: "calf_rehab", label: "Mollet / Tendon d'Achille", group: "reathletisation" },
  { value: "adductor_rehab", label: "Adducteurs (rehab)", group: "reathletisation" },
  { value: "hip_flexor_rehab", label: "Fléchisseurs de hanche", group: "reathletisation" },
  { value: "spinal_stabilization", label: "Stabilisation rachidienne", group: "reathletisation" },
  { value: "cervical_rehab", label: "Cervicales (rehab)", group: "reathletisation" },
  
  // Rehab - Protocoles & Prévention
  { value: "prophylaxis", label: "Prophylaxie / Prévention", group: "reathletisation" },
  { value: "nordic_hamstring", label: "Nordic Hamstring", group: "reathletisation" },
  { value: "copenhagen_adductor", label: "Copenhagen Adducteurs", group: "reathletisation" },
  { value: "theraband_exercises", label: "Exercices élastiques / Theraband", group: "reathletisation" },
  { value: "aquatic_rehab", label: "Rééducation aquatique / Balnéo", group: "reathletisation" },
  { value: "electrostimulation", label: "Électrostimulation (EMS)", group: "reathletisation" },
  { value: "cryotherapy_protocol", label: "Cryothérapie / Protocole froid", group: "reathletisation" },
  { value: "plyometric_rehab", label: "Pliométrie progressive (rehab)", group: "reathletisation" },
  { value: "agility_rehab", label: "Agilité progressive (rehab)", group: "reathletisation" },
  { value: "sport_specific_rehab", label: "Retour sport spécifique", group: "reathletisation" },
  
  // Ergo (Ergomètres) / Cardio machines
  { value: "ergo_rowerg", label: "RowErg (Rameur)", group: "ergo" },
  { value: "ergo_skierg", label: "SkiErg", group: "ergo" },
  { value: "ergo_bikeerg", label: "BikeErg", group: "ergo" },
  { value: "ergo_assault", label: "Assault Bike / Echo Bike", group: "ergo" },
  { value: "ergo_treadmill", label: "Tapis de course", group: "ergo" },
  { value: "ergo_elliptical", label: "Elliptique", group: "ergo" },
  { value: "ergo_stairmaster", label: "Stairmaster", group: "ergo" },
  { value: "ergo_versaclimber", label: "VersaClimber", group: "ergo" },
  
  // Sled / Traîneau
  { value: "sled_push", label: "Sled Push", group: "sled" },
  { value: "sled_pull", label: "Sled Pull", group: "sled" },
  { value: "sled_drag", label: "Sled Drag", group: "sled" },
  { value: "prowler", label: "Prowler", group: "sled" },
  
  // Course à pied
  { value: "running_ef", label: "Endurance Fondamentale (EF)", group: "course" },
  { value: "running_seuil", label: "Seuil", group: "course" },
  { value: "running_vma", label: "VMA", group: "course" },
  { value: "running_fractionne", label: "Fractionné", group: "course" },
  { value: "running_sprint", label: "Sprint", group: "course" },
  { value: "running_cote", label: "Course en côte", group: "course" },
  { value: "running_fartlek", label: "Fartlek", group: "course" },
  { value: "running_tempo", label: "Tempo Run", group: "course" },
  { value: "running_recup", label: "Récupération active", group: "course" },
  { value: "running_ppg", label: "PPG / Éducatifs", group: "course" },
  { value: "running_trail", label: "Trail", group: "course" },
  
  // Terrain - Général
  { value: "cardio", label: "Cardio", group: "terrain" },
  { value: "terrain", label: "Terrain (courses, sprints...)", group: "terrain" },
  { value: "speed", label: "Vitesse", group: "terrain" },
  { value: "agility", label: "Agilité / COD", group: "terrain" },
  { value: "endurance", label: "Endurance", group: "terrain" },
  { value: "interval", label: "Interval Training", group: "terrain" },
  
  // Terrain - Football
  { value: "football_technique", label: "Football - Technique", group: "terrain", sport: "football" },
  { value: "football_tactical", label: "Football - Tactique", group: "terrain", sport: "football" },
  { value: "football_finishing", label: "Football - Finition", group: "terrain", sport: "football" },
  { value: "football_possession", label: "Football - Possession", group: "terrain", sport: "football" },
  
  // Terrain - Handball
  { value: "handball_shooting", label: "Handball - Tirs", group: "terrain", sport: "handball" },
  { value: "handball_defense", label: "Handball - Défense", group: "terrain", sport: "handball" },
  { value: "handball_fast_break", label: "Handball - Contre-attaque", group: "terrain", sport: "handball" },
  
  // Terrain - Basketball
  { value: "basketball_shooting", label: "Basketball - Tirs", group: "terrain", sport: "basketball" },
  { value: "basketball_dribbling", label: "Basketball - Dribble", group: "terrain", sport: "basketball" },
  { value: "basketball_defense", label: "Basketball - Défense", group: "terrain", sport: "basketball" },
  { value: "basketball_transition", label: "Basketball - Transition", group: "terrain", sport: "basketball" },
  
  // Terrain - Volleyball
  { value: "volleyball_service", label: "Volleyball - Service", group: "terrain", sport: "volleyball" },
  { value: "volleyball_attack", label: "Volleyball - Attaque", group: "terrain", sport: "volleyball" },
  { value: "volleyball_block", label: "Volleyball - Bloc", group: "terrain", sport: "volleyball" },
  { value: "volleyball_reception", label: "Volleyball - Réception", group: "terrain", sport: "volleyball" },
  
  // Terrain - Rugby
  { value: "rugby_scrummage", label: "Rugby - Mêlée", group: "terrain", sport: "rugby" },
  { value: "rugby_lineout", label: "Rugby - Touche", group: "terrain", sport: "rugby" },
  { value: "rugby_tackle", label: "Rugby - Plaquage", group: "terrain", sport: "rugby" },
  { value: "rugby_ruck", label: "Rugby - Ruck/Maul", group: "terrain", sport: "rugby" },
  { value: "rugby_passing", label: "Rugby - Passes", group: "terrain", sport: "rugby" },
  { value: "rugby_kicking", label: "Rugby - Jeu au pied", group: "terrain", sport: "rugby" },
  
  // Terrain - Judo
  { value: "judo_randori", label: "Judo - Randori", group: "terrain", sport: "judo" },
  { value: "judo_uchikomi", label: "Judo - Uchi-komi", group: "terrain", sport: "judo" },
  { value: "judo_nagekomi", label: "Judo - Nage-komi", group: "terrain", sport: "judo" },
  { value: "judo_newaza", label: "Judo - Ne-waza", group: "terrain", sport: "judo" },
  { value: "judo_kata", label: "Judo - Kata", group: "terrain", sport: "judo" },
  
  // Terrain - Aviron
  { value: "aviron_technique", label: "Aviron - Technique", group: "terrain", sport: "aviron" },
  { value: "aviron_ergo", label: "Aviron - Ergomètre", group: "terrain", sport: "aviron" },
  { value: "aviron_endurance", label: "Aviron - Endurance", group: "terrain", sport: "aviron" },
  
  // Terrain - Bowling
  { value: "bowling_technique", label: "Bowling - Technique", group: "terrain", sport: "bowling" },
  { value: "bowling_spare", label: "Bowling - Spares", group: "terrain", sport: "bowling" },
  { value: "bowling_strike", label: "Bowling - Strikes", group: "terrain", sport: "bowling" },
  
  // Terrain - Athlétisme - Sprints
  { value: "athletisme_starting_blocks", label: "Athlétisme - Travail départs", group: "terrain", sport: "athletisme" },
  { value: "athletisme_acceleration", label: "Athlétisme - Accélération", group: "terrain", sport: "athletisme" },
  { value: "athletisme_max_velocity", label: "Athlétisme - Vitesse max", group: "terrain", sport: "athletisme" },
  { value: "athletisme_sprint_endurance", label: "Athlétisme - Endurance vitesse", group: "terrain", sport: "athletisme" },
  
  // Terrain - Athlétisme - Haies
  { value: "athletisme_hurdle_drills", label: "Athlétisme - Éducatifs haies", group: "terrain", sport: "athletisme" },
  { value: "athletisme_hurdle_rhythm", label: "Athlétisme - Rythme inter-haies", group: "terrain", sport: "athletisme" },
  
  // Terrain - Athlétisme - Demi-fond/Fond
  { value: "athletisme_intervals", label: "Athlétisme - Fractionné", group: "terrain", sport: "athletisme" },
  { value: "athletisme_tempo_runs", label: "Athlétisme - Allure seuil", group: "terrain", sport: "athletisme" },
  { value: "athletisme_long_run", label: "Athlétisme - Sortie longue", group: "terrain", sport: "athletisme" },
  { value: "athletisme_fartlek", label: "Athlétisme - Fartlek", group: "terrain", sport: "athletisme" },
  
  // Terrain - Athlétisme - Sauts
  { value: "athletisme_approach_work", label: "Athlétisme - Travail course d'élan", group: "terrain", sport: "athletisme" },
  { value: "athletisme_takeoff_drills", label: "Athlétisme - Éducatifs impulsion", group: "terrain", sport: "athletisme" },
  { value: "athletisme_flight_drills", label: "Athlétisme - Travail suspension", group: "terrain", sport: "athletisme" },
  { value: "athletisme_landing", label: "Athlétisme - Réception", group: "terrain", sport: "athletisme" },
  { value: "athletisme_pole_vault_tech", label: "Athlétisme - Technique perche", group: "terrain", sport: "athletisme" },
  
  // Terrain - Athlétisme - Lancers
  { value: "athletisme_throwing_drills", label: "Athlétisme - Éducatifs lancers", group: "terrain", sport: "athletisme" },
  { value: "athletisme_rotation_work", label: "Athlétisme - Travail rotation", group: "terrain", sport: "athletisme" },
  { value: "athletisme_release_drills", label: "Athlétisme - Travail lâcher", group: "terrain", sport: "athletisme" },
  { value: "athletisme_implement_work", label: "Athlétisme - Travail avec engin", group: "terrain", sport: "athletisme" },
  
  // Stretching & Mobilité / Échauffement
  { value: "warmup", label: "Échauffement général", group: "stretching_mobility" },
  { value: "warmup_dynamic", label: "Échauffement dynamique", group: "stretching_mobility" },
  { value: "warmup_specific", label: "Échauffement spécifique", group: "stretching_mobility" },
  { value: "activation", label: "Activation musculaire", group: "stretching_mobility" },
  { value: "mobility", label: "Mobilité", group: "stretching_mobility" },
  { value: "stretching", label: "Stretching statique", group: "stretching_mobility" },
  { value: "dynamic_stretching", label: "Stretching dynamique", group: "stretching_mobility" },
  { value: "foam_rolling", label: "Foam rolling / Auto-massage", group: "stretching_mobility" },
  { value: "recovery", label: "Récupération", group: "stretching_mobility" },
  { value: "breathing", label: "Respiration", group: "stretching_mobility" },
  { value: "cooldown", label: "Retour au calme", group: "stretching_mobility" },
  
  { value: "other", label: "Autre", group: null },
];

// Groupes de catégories pour filtrage rapide
export const CATEGORY_GROUPS = [
  { value: "all", label: "Tous" },
  { value: "halterophilie", label: "Haltérophilie" },
  { value: "musculation", label: "Musculation" },
  { value: "bodyweight", label: "Poids de corps" },
  { value: "crossfit_hyrox", label: "CrossFit / Hyrox" },
  { value: "course", label: "Course" },
  { value: "ergo", label: "Ergo / Cardio" },
  { value: "sled", label: "Traîneau" },
  { value: "pilates", label: "Pilates / Yoga" },
  { value: "reathletisation", label: "Rehab / Réathlé" },
  { value: "terrain", label: "Terrain" },
  { value: "stretching_mobility", label: "Échauffement / Mobilité" },
] as const;

// Liste des catégories d'haltérophilie
export const HALTEROPHILIE_CATEGORIES = [
  "halterophilie_snatch", "halterophilie_clean", "halterophilie_jerk", 
  "halterophilie_clean_jerk", "halterophilie_pulls", "halterophilie_positions",
  "halterophilie_hang", "halterophilie_blocks", "halterophilie_complexes",
  "halterophilie_squats", "halterophilie_presses", "halterophilie_pulls_strength"
];

// Liste des catégories de course à pied (métriques spécialisées)
export const RUNNING_CATEGORIES = [
  "running_ef", "running_seuil", "running_vma", "running_fractionne", 
  "running_sprint", "running_cote", "running_fartlek", "running_tempo", 
  "running_recup", "running_ppg", "running_trail"
];

// Liste des catégories d'ergomètres (avec métriques: distance, temps, watts, calories, RPM)
export const ERGO_CATEGORIES = [
  "ergo_rowerg", "ergo_skierg", "ergo_bikeerg", "ergo_assault",
  "ergo_treadmill", "ergo_elliptical", "ergo_stairmaster", "ergo_versaclimber"
];

// Liste des catégories de sled (distance-based)
export const SLED_CATEGORIES = [
  "sled_push", "sled_pull", "sled_drag", "prowler"
];

// Liste des catégories poids de corps (possibilité de poids additionnel)
export const BODYWEIGHT_CATEGORIES = [
  "bodyweight_upper", "bodyweight_lower", "bodyweight_core", "bodyweight_full",
  "calisthenics", "gymnastics", "weighted_calisthenics"
];

// Check if an exercise category is an ergometer
export function isErgoCategory(category: string): boolean {
  return ERGO_CATEGORIES.includes(category);
}

// Alias pour compatibilité
export const isErgCategory = isErgoCategory;

// Check if an exercise category is a sled exercise (distance-based)
export function isSledCategory(category: string): boolean {
  return SLED_CATEGORIES.includes(category);
}

// Check if an exercise category is a running exercise
export function isRunningCategory(category: string): boolean {
  return RUNNING_CATEGORIES.includes(category);
}

// Check if an exercise category is a bodyweight exercise
export function isBodyweightCategory(category: string): boolean {
  return BODYWEIGHT_CATEGORIES.includes(category);
}

// Check if an exercise has special metrics (not standard sets/reps)
export function hasSpecialMetrics(category: string): boolean {
  return isErgCategory(category) || isSledCategory(category) || isRunningCategory(category) || isBodyweightCategory(category);
}

export const EXERCISE_SUBCATEGORIES = [
  // Musculation
  { value: "renforcement", label: "Renforcement", parentCategory: "musculation" },
  { value: "conditioning", label: "Conditioning", parentCategory: "musculation" },
  { value: "halterophilie", label: "Haltérophilie", parentCategory: "musculation" },
  { value: "gymnastique", label: "Gymnastique", parentCategory: "musculation" },
  { value: "plyometrie", label: "Pliométrie", parentCategory: "musculation" },
  { value: "hypertrophie", label: "Hypertrophie", parentCategory: "musculation" },
  { value: "force_max", label: "Force maximale", parentCategory: "musculation" },
  { value: "endurance_force", label: "Endurance de force", parentCategory: "musculation" },
  
  // Rehab / Réathlé
  { value: "phase1_protection", label: "Phase 1 - Réhabilitation", parentCategory: "reathletisation" },
  { value: "phase2_controlled", label: "Phase 2 - Renforcement", parentCategory: "reathletisation" },
  { value: "phase3_progressive", label: "Phase 3 - Retour terrain", parentCategory: "reathletisation" },
  { value: "phase4_return", label: "Phase 4 - Retour compétition", parentCategory: "reathletisation" },
  { value: "prevention", label: "Prévention", parentCategory: "reathletisation" },
  
  // Stretching & Mobilité
  { value: "prophylaxie", label: "Prophylaxie", parentCategory: "stretching_mobility" },
  { value: "mobilite", label: "Mobilité", parentCategory: "stretching_mobility" },
  { value: "echauffement", label: "Échauffement", parentCategory: "stretching_mobility" },
  { value: "retour_calme", label: "Retour au calme", parentCategory: "stretching_mobility" },
  
  // Terrain
  { value: "vitesse_lineaire", label: "Vitesse linéaire", parentCategory: "terrain" },
  { value: "vitesse_changement", label: "Changements de direction", parentCategory: "terrain" },
  { value: "capacite_aerobie", label: "Capacité aérobie", parentCategory: "terrain" },
  { value: "puissance_aerobie", label: "Puissance aérobie", parentCategory: "terrain" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
] as const;

export function getSubcategoriesForCategory(category: string) {
  // Get subcategories based on the group of the category
  const categoryInfo = EXERCISE_CATEGORIES.find(c => c.value === category);
  const group = categoryInfo?.group || category;
  return EXERCISE_SUBCATEGORIES.filter(sub => sub.parentCategory === group);
}

export function getSubcategoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  const subcategory = EXERCISE_SUBCATEGORIES.find(s => s.value === value);
  return subcategory?.label || value;
}

export function getCategoryLabel(value: string): string {
  const category = EXERCISE_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
}

export function getCategoriesByGroup(group: string) {
  if (group === "all") return EXERCISE_CATEGORIES;
  return EXERCISE_CATEGORIES.filter(c => c.group === group);
}

export function getCategoryGroup(categoryValue: string): string | null {
  const category = EXERCISE_CATEGORIES.find(c => c.value === categoryValue);
  return category?.group || null;
}

// Liste des sports disponibles pour les exercices terrain
export const SPORT_OPTIONS = [
  { value: "all", label: "Tous les sports" },
  { value: "rugby", label: "Rugby" },
  { value: "football", label: "Football" },
  { value: "handball", label: "Handball" },
  { value: "basketball", label: "Basketball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "padel", label: "Padel" },
  { value: "natation", label: "Natation" },
  { value: "ski", label: "Sports de Glisse" },
  { value: "triathlon", label: "Triathlon" },
  { value: "judo", label: "Judo" },
  { value: "aviron", label: "Aviron" },
  { value: "bowling", label: "Bowling" },
  { value: "athletisme", label: "Athlétisme" },
];

// Normalize sport type to base sport
export function normalizeToBaseSport(sportType?: string): string | null {
  if (!sportType || sportType === "all") return null;
  
  const normalizedSport = sportType.toLowerCase();
  if (normalizedSport.startsWith('rugby') || ['xv', '7', 'xiii', 'academie', 'national_team'].includes(normalizedSport)) return 'rugby';
  if (normalizedSport.startsWith('football')) return 'football';
  if (normalizedSport.startsWith('handball')) return 'handball';
  if (normalizedSport.startsWith('volleyball')) return 'volleyball';
  if (normalizedSport.startsWith('basketball')) return 'basketball';
  if (normalizedSport.startsWith('judo')) return 'judo';
  if (normalizedSport.startsWith('aviron')) return 'aviron';
  if (normalizedSport.startsWith('bowling')) return 'bowling';
  if (normalizedSport.startsWith('athletisme')) return 'athletisme';
  if (normalizedSport.startsWith('padel')) return 'padel';
  if (normalizedSport.startsWith('natation')) return 'natation';
  if (normalizedSport.startsWith('ski') || normalizedSport.startsWith('snow')) return 'ski';
  if (normalizedSport.startsWith('triathlon')) return 'triathlon';
  
  return normalizedSport;
}

// Get terrain categories for a specific sport
export function getTerrainCategoriesForSport(sportType?: string): ExerciseCategory[] {
  const terrainCategories = EXERCISE_CATEGORIES.filter(c => c.group === "terrain");
  
  const baseSport = normalizeToBaseSport(sportType);
  if (!baseSport) return terrainCategories;
  
  // Return general terrain categories plus sport-specific ones
  return terrainCategories.filter(c => !c.sport || c.sport === baseSport);
}

// Get all categories filtered for a specific sport (terrain filtered, others kept)
export function getCategoriesForSport(sportType?: string): ExerciseCategory[] {
  const baseSport = normalizeToBaseSport(sportType);
  
  if (!baseSport) return EXERCISE_CATEGORIES;
  
  return EXERCISE_CATEGORIES.filter(c => {
    // Keep non-terrain categories
    if (c.group !== "terrain") return true;
    // For terrain, keep general ones (no sport) and sport-specific ones
    return !c.sport || c.sport === baseSport;
  });
}

// Check if an exercise category belongs to a sport
export function isCategoryForSport(categoryValue: string, sportType?: string): boolean {
  const baseSport = normalizeToBaseSport(sportType);
  if (!baseSport) return true;
  
  const category = EXERCISE_CATEGORIES.find(c => c.value === categoryValue);
  if (!category) return true;
  
  // Non-terrain categories are always valid
  if (category.group !== "terrain") return true;
  
  // For terrain, check if it's general or matches the sport
  return !category.sport || category.sport === baseSport;
}
