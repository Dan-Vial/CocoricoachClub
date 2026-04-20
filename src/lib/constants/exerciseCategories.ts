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
  Zap,
  Brain,
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
  plyometrie: {
    value: "plyometrie",
    label: "Pliométrie",
    color: "text-lime-600",
    bgColor: "bg-lime-600/10",
    borderColor: "border-lime-600/30",
    icon: Zap,
  },
  neuro: {
    value: "neuro",
    label: "Neuro / Cognitif",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    icon: Brain,
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
  // ═══════════════════════════════════════════
  // HALTÉROPHILIE
  // ═══════════════════════════════════════════
  // Mouvements complets
  { value: "halterophilie_snatch", label: "Arraché (Snatch)", group: "halterophilie" },
  { value: "halterophilie_clean", label: "Épaulé (Clean)", group: "halterophilie" },
  { value: "halterophilie_jerk", label: "Jeté (Jerk)", group: "halterophilie" },
  { value: "halterophilie_clean_jerk", label: "Épaulé-Jeté", group: "halterophilie" },
  // Semi-technique & Éducatifs
  { value: "halterophilie_pulls", label: "Tirages (Pulls)", group: "halterophilie" },
  { value: "halterophilie_positions", label: "Travail de positions", group: "halterophilie" },
  { value: "halterophilie_hang", label: "Suspendus (Hang)", group: "halterophilie" },
  { value: "halterophilie_blocks", label: "Blocs", group: "halterophilie" },
  { value: "halterophilie_complexes", label: "Complexes", group: "halterophilie" },
  // Accessoires & Renforcement
  { value: "halterophilie_squats", label: "Squats Haltéro", group: "halterophilie" },
  { value: "halterophilie_presses", label: "Développés Haltéro", group: "halterophilie" },
  { value: "halterophilie_pulls_strength", label: "Tirages Force", group: "halterophilie" },
  
  // ═══════════════════════════════════════════
  // MUSCULATION
  // ═══════════════════════════════════════════
  // Haut du corps
  { value: "upper_push", label: "Haut - Poussée", group: "musculation" },
  { value: "upper_pull", label: "Haut - Tirage", group: "musculation" },
  { value: "shoulders", label: "Épaules", group: "musculation" },
  { value: "arms", label: "Bras (biceps/triceps)", group: "musculation" },
  // Bas du corps
  { value: "lower_push", label: "Bas - Poussée (quad dominant)", group: "musculation" },
  { value: "lower_pull", label: "Bas - Tirage (hip dominant)", group: "musculation" },
  { value: "glutes", label: "Fessiers", group: "musculation" },
  { value: "hamstrings", label: "Ischio-jambiers", group: "musculation" },
  { value: "calves", label: "Mollets", group: "musculation" },
  // Core & Général
  { value: "core", label: "Core / Gainage", group: "musculation" },
  { value: "anti_rotation", label: "Anti-rotation", group: "musculation" },
  { value: "musculation", label: "Musculation (général)", group: "musculation" },
  // Méthodes spécifiques
  { value: "isometrics", label: "Isométrie", group: "musculation" },
  // Qualités physiques spécifiques
  { value: "explosive", label: "Explosivité", group: "musculation" },
  { value: "force_max", label: "Force maximale", group: "musculation" },
  { value: "force_vitesse", label: "Force-Vitesse", group: "musculation" },
  { value: "vitesse_force", label: "Vitesse-Force", group: "musculation" },
  { value: "puissance", label: "Puissance", group: "musculation" },
  { value: "hypertrophie", label: "Hypertrophie", group: "musculation" },
  { value: "endurance_force", label: "Endurance de force", group: "musculation" },
  { value: "excentrique", label: "Travail excentrique", group: "musculation" },
  { value: "tempo_training", label: "Tempo Training", group: "musculation" },
  { value: "cluster_sets", label: "Cluster Sets", group: "musculation" },
  { value: "contrast_training", label: "Contraste (lourd/léger)", group: "musculation" },
  
  // ═══════════════════════════════════════════
  // PLIOMÉTRIE
  // ═══════════════════════════════════════════
  { value: "plyometrics", label: "Pliométrie (général)", group: "plyometrie" },
  { value: "plyo_lower_bilateral", label: "Plio - Bas bilatéral", group: "plyometrie" },
  { value: "plyo_lower_unilateral", label: "Plio - Bas unilatéral", group: "plyometrie" },
  { value: "plyo_upper", label: "Plio - Haut du corps", group: "plyometrie" },
  { value: "plyo_depth_jumps", label: "Plio - Drop / Depth Jumps", group: "plyometrie" },
  { value: "plyo_box_jumps", label: "Plio - Box Jumps", group: "plyometrie" },
  { value: "plyo_bounds", label: "Plio - Bondissements", group: "plyometrie" },
  { value: "plyo_reactive", label: "Plio - Réactivité (contacts courts)", group: "plyometrie" },
  { value: "plyo_horizontal", label: "Plio - Sauts horizontaux", group: "plyometrie" },
  { value: "plyo_lateral", label: "Plio - Sauts latéraux", group: "plyometrie" },
  { value: "plyo_medball", label: "Plio - Lancers médecine ball", group: "plyometrie" },
  
  // ═══════════════════════════════════════════
  // NEURO / COGNITIF
  // ═══════════════════════════════════════════
  { value: "neuro_reaction", label: "Neuro - Temps de réaction", group: "neuro" },
  { value: "neuro_coordination", label: "Neuro - Coordination", group: "neuro" },
  { value: "neuro_dual_task", label: "Neuro - Double tâche", group: "neuro" },
  { value: "neuro_decision_making", label: "Neuro - Prise de décision", group: "neuro" },
  { value: "neuro_visual_tracking", label: "Neuro - Tracking visuel", group: "neuro" },
  { value: "neuro_peripheral_vision", label: "Neuro - Vision périphérique", group: "neuro" },
  { value: "neuro_hand_eye", label: "Neuro - Coordination œil-main", group: "neuro" },
  { value: "neuro_foot_eye", label: "Neuro - Coordination œil-pied", group: "neuro" },
  { value: "neuro_cognitive_load", label: "Neuro - Charge cognitive", group: "neuro" },
  { value: "neuro_inhibition", label: "Neuro - Inhibition / Go-NoGo", group: "neuro" },
  { value: "neuro_spatial_awareness", label: "Neuro - Conscience spatiale", group: "neuro" },
  { value: "neuro_rhythm", label: "Neuro - Rythme / Timing", group: "neuro" },
  { value: "neuro_laterality", label: "Neuro - Latéralité", group: "neuro" },
  { value: "neuro_priming", label: "Neuro - Amorçage neural (PAP)", group: "neuro" },
  
  // ═══════════════════════════════════════════
  // POIDS DE CORPS
  // ═══════════════════════════════════════════
  { value: "bodyweight_upper", label: "Poids de corps - Haut", group: "bodyweight" },
  { value: "bodyweight_lower", label: "Poids de corps - Bas", group: "bodyweight" },
  { value: "bodyweight_core", label: "Poids de corps - Core", group: "bodyweight" },
  { value: "bodyweight_full", label: "Poids de corps - Full body", group: "bodyweight" },
  { value: "calisthenics", label: "Calisthenics", group: "bodyweight" },
  { value: "gymnastics", label: "Gymnastique", group: "bodyweight" },
  { value: "weighted_calisthenics", label: "Calisthenics lesté", group: "bodyweight" },
  
  // ═══════════════════════════════════════════
  // CROSSFIT / HYROX
  // ═══════════════════════════════════════════
  { value: "crossfit_wod", label: "WOD", group: "crossfit_hyrox" },
  { value: "crossfit_amrap", label: "AMRAP", group: "crossfit_hyrox" },
  { value: "crossfit_emom", label: "EMOM", group: "crossfit_hyrox" },
  { value: "crossfit_fortime", label: "For Time", group: "crossfit_hyrox" },
  { value: "crossfit_chipper", label: "Chipper", group: "crossfit_hyrox" },
  { value: "hyrox_simulation", label: "Hyrox Simulation", group: "crossfit_hyrox" },
  { value: "hyrox_running", label: "Hyrox - Course", group: "crossfit_hyrox" },
  { value: "hyrox_stations", label: "Hyrox - Stations", group: "crossfit_hyrox" },
  { value: "functional_fitness", label: "Functional Fitness", group: "crossfit_hyrox" },
  
  // ═══════════════════════════════════════════
  // PILATES / YOGA
  // ═══════════════════════════════════════════
  { value: "pilates_mat", label: "Pilates Mat", group: "pilates" },
  { value: "pilates_reformer", label: "Pilates Reformer", group: "pilates" },
  { value: "yoga_flow", label: "Yoga Flow", group: "pilates" },
  { value: "yoga_power", label: "Power Yoga", group: "pilates" },
  { value: "yoga_stretch", label: "Yoga Étirement", group: "pilates" },
  { value: "pilates_core", label: "Pilates Core", group: "pilates" },
  
  // ═══════════════════════════════════════════
  // REHAB / RÉATHLÉTISATION
  // ═══════════════════════════════════════════
  { value: "reathletisation_lower", label: "Rehab - Membres inférieurs", group: "reathletisation" },
  { value: "reathletisation_upper", label: "Rehab - Membres supérieurs", group: "reathletisation" },
  { value: "reathletisation_trunk", label: "Rehab - Tronc / Rachis", group: "reathletisation" },
  { value: "shoulder_stability", label: "Rehab - Stabilité épaule", group: "reathletisation" },
  { value: "knee_stability", label: "Rehab - Stabilité genou", group: "reathletisation" },
  { value: "ankle_stability", label: "Rehab - Stabilité cheville", group: "reathletisation" },
  { value: "hip_stability", label: "Rehab - Stabilité hanche", group: "reathletisation" },
  { value: "wrist_hand_rehab", label: "Rehab - Poignet / Main", group: "reathletisation" },
  { value: "elbow_rehab", label: "Rehab - Coude", group: "reathletisation" },
  { value: "proprioception", label: "Proprioception", group: "reathletisation" },
  { value: "neuromuscular", label: "Activation neuromusculaire", group: "reathletisation" },
  { value: "balance_training", label: "Équilibre / Balance", group: "reathletisation" },
  { value: "eccentric", label: "Travail excentrique", group: "reathletisation" },
  { value: "isometric_rehab", label: "Isométrique (rehab)", group: "reathletisation" },
  { value: "concentric_rehab", label: "Concentrique progressif", group: "reathletisation" },
  { value: "rom_restoration", label: "Récupération amplitude (ROM)", group: "reathletisation" },
  { value: "joint_mobilization", label: "Mobilisation articulaire", group: "reathletisation" },
  { value: "scar_tissue_work", label: "Travail cicatriciel / Adhérences", group: "reathletisation" },
  { value: "motor_control", label: "Contrôle moteur", group: "reathletisation" },
  { value: "functional_rehab", label: "Fonctionnel / Gestes sportifs adaptés", group: "reathletisation" },
  { value: "gait_retraining", label: "Rééducation à la marche", group: "reathletisation" },
  { value: "running_rehab", label: "Reprise course progressive", group: "reathletisation" },
  { value: "rotator_cuff", label: "Coiffe des rotateurs", group: "reathletisation" },
  { value: "scapular_control", label: "Contrôle scapulaire", group: "reathletisation" },
  { value: "hamstring_rehab", label: "Ischio-jambiers (rehab)", group: "reathletisation" },
  { value: "quadriceps_rehab", label: "Quadriceps (rehab)", group: "reathletisation" },
  { value: "calf_rehab", label: "Mollet / Tendon d'Achille", group: "reathletisation" },
  { value: "adductor_rehab", label: "Adducteurs (rehab)", group: "reathletisation" },
  { value: "hip_flexor_rehab", label: "Fléchisseurs de hanche", group: "reathletisation" },
  { value: "spinal_stabilization", label: "Stabilisation rachidienne", group: "reathletisation" },
  { value: "cervical_rehab", label: "Cervicales (rehab)", group: "reathletisation" },
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
  
  // ═══════════════════════════════════════════
  // ERGO / CARDIO
  // ═══════════════════════════════════════════
  { value: "ergo_rowerg", label: "RowErg (Rameur)", group: "ergo" },
  { value: "ergo_skierg", label: "SkiErg", group: "ergo" },
  { value: "ergo_bikeerg", label: "BikeErg", group: "ergo" },
  { value: "ergo_assault", label: "Assault Bike / Echo Bike", group: "ergo" },
  { value: "ergo_treadmill", label: "Tapis de course", group: "ergo" },
  { value: "ergo_elliptical", label: "Elliptique", group: "ergo" },
  { value: "ergo_stairmaster", label: "Stairmaster", group: "ergo" },
  { value: "ergo_versaclimber", label: "VersaClimber", group: "ergo" },
  
  // ═══════════════════════════════════════════
  // SLED / TRAÎNEAU
  // ═══════════════════════════════════════════
  { value: "sled_push", label: "Sled Push", group: "sled" },
  { value: "sled_pull", label: "Sled Pull", group: "sled" },
  { value: "sled_drag", label: "Sled Drag", group: "sled" },
  { value: "prowler", label: "Prowler", group: "sled" },
  
  // ═══════════════════════════════════════════
  // COURSE À PIED
  // ═══════════════════════════════════════════
  // Types de séances
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
  // Drills d'échauffement / Gammes athlétiques
  { value: "running_drills_warmup", label: "Drills - Échauffement", group: "course" },
  { value: "running_drills_abc", label: "Drills - Gammes ABC", group: "course" },
  { value: "running_drills_montees_genoux", label: "Drills - Montées de genoux", group: "course" },
  { value: "running_drills_talons_fesses", label: "Drills - Talons-fesses", group: "course" },
  { value: "running_drills_skipping", label: "Drills - Skipping (A/B)", group: "course" },
  { value: "running_drills_griffes", label: "Drills - Griffés", group: "course" },
  { value: "running_drills_carioca", label: "Drills - Carioca / Pas croisés", group: "course" },
  { value: "running_drills_lateral", label: "Drills - Déplacements latéraux", group: "course" },
  { value: "running_drills_jambes_tendues", label: "Drills - Jambes tendues", group: "course" },
  { value: "running_drills_foulees_bondissantes", label: "Drills - Foulées bondissantes", group: "course" },
  { value: "running_drills_coordination", label: "Drills - Coordination (échelle)", group: "course" },
  { value: "running_drills_pose_pied", label: "Drills - Travail de pose de pied", group: "course" },
  { value: "running_drills_frequence", label: "Drills - Fréquence / Cadence", group: "course" },
  { value: "running_drills_amplitude", label: "Drills - Amplitude de foulée", group: "course" },
  { value: "running_drills_departs", label: "Drills - Départs (debout/assis/couché)", group: "course" },
  // Spécifique sprint
  { value: "running_acceleration_work", label: "Sprint - Travail d'accélération", group: "course" },
  { value: "running_max_velocity", label: "Sprint - Vitesse maximale", group: "course" },
  { value: "running_deceleration", label: "Sprint - Décélération", group: "course" },
  { value: "running_sprint_resiste", label: "Sprint - Résisté (élastique/luge)", group: "course" },
  { value: "running_sprint_assiste", label: "Sprint - Assisté (descente/élastique)", group: "course" },
  { value: "running_relays", label: "Sprint - Relais / Passages", group: "course" },
  // Spécifique haies
  { value: "running_hurdle_mobility", label: "Haies - Mobilité", group: "course" },
  { value: "running_hurdle_drills", label: "Haies - Éducatifs", group: "course" },
  { value: "running_hurdle_rhythm", label: "Haies - Rythme inter-haies", group: "course" },
  
  // ═══════════════════════════════════════════
  // TERRAIN
  // ═══════════════════════════════════════════
  // Général
  { value: "cardio", label: "Cardio", group: "terrain" },
  { value: "terrain", label: "Terrain (courses, sprints...)", group: "terrain" },
  { value: "speed", label: "Vitesse", group: "terrain" },
  { value: "agility", label: "Agilité / COD", group: "terrain" },
  { value: "endurance", label: "Endurance", group: "terrain" },
  { value: "interval", label: "Interval Training", group: "terrain" },
  
  // Football
  { value: "football_technique", label: "Football - Technique", group: "terrain", sport: "football" },
  { value: "football_tactical", label: "Football - Tactique", group: "terrain", sport: "football" },
  { value: "football_finishing", label: "Football - Finition", group: "terrain", sport: "football" },
  { value: "football_possession", label: "Football - Possession", group: "terrain", sport: "football" },
  { value: "football_set_pieces", label: "Football - Coups de pied arrêtés", group: "terrain", sport: "football" },
  { value: "football_goalkeeper", label: "Football - Gardien de but", group: "terrain", sport: "football" },
  
  // Handball
  { value: "handball_shooting", label: "Handball - Tirs", group: "terrain", sport: "handball" },
  { value: "handball_defense", label: "Handball - Défense", group: "terrain", sport: "handball" },
  { value: "handball_fast_break", label: "Handball - Contre-attaque", group: "terrain", sport: "handball" },
  { value: "handball_passing", label: "Handball - Passes", group: "terrain", sport: "handball" },
  { value: "handball_pivot", label: "Handball - Pivot", group: "terrain", sport: "handball" },
  { value: "handball_goalkeeper", label: "Handball - Gardien", group: "terrain", sport: "handball" },
  
  // Basketball
  { value: "basketball_shooting", label: "Basketball - Tirs", group: "terrain", sport: "basketball" },
  { value: "basketball_dribbling", label: "Basketball - Dribble", group: "terrain", sport: "basketball" },
  { value: "basketball_defense", label: "Basketball - Défense", group: "terrain", sport: "basketball" },
  { value: "basketball_transition", label: "Basketball - Transition", group: "terrain", sport: "basketball" },
  { value: "basketball_post_play", label: "Basketball - Jeu intérieur", group: "terrain", sport: "basketball" },
  { value: "basketball_pick_and_roll", label: "Basketball - Pick & Roll", group: "terrain", sport: "basketball" },
  
  // Volleyball
  { value: "volleyball_service", label: "Volleyball - Service", group: "terrain", sport: "volleyball" },
  { value: "volleyball_attack", label: "Volleyball - Attaque", group: "terrain", sport: "volleyball" },
  { value: "volleyball_block", label: "Volleyball - Bloc", group: "terrain", sport: "volleyball" },
  { value: "volleyball_reception", label: "Volleyball - Réception", group: "terrain", sport: "volleyball" },
  { value: "volleyball_setting", label: "Volleyball - Passe / Set", group: "terrain", sport: "volleyball" },
  
  // Rugby
  { value: "rugby_scrummage", label: "Rugby - Mêlée", group: "terrain", sport: "rugby" },
  { value: "rugby_lineout", label: "Rugby - Touche", group: "terrain", sport: "rugby" },
  { value: "rugby_tackle", label: "Rugby - Plaquage", group: "terrain", sport: "rugby" },
  { value: "rugby_ruck", label: "Rugby - Ruck/Maul", group: "terrain", sport: "rugby" },
  { value: "rugby_passing", label: "Rugby - Passes", group: "terrain", sport: "rugby" },
  { value: "rugby_kicking", label: "Rugby - Jeu au pied", group: "terrain", sport: "rugby" },
  { value: "rugby_defense_system", label: "Rugby - Système défensif", group: "terrain", sport: "rugby" },
  { value: "rugby_attack_moves", label: "Rugby - Combinaisons offensives", group: "terrain", sport: "rugby" },
  
  // Judo
  { value: "judo_randori", label: "Judo - Randori", group: "terrain", sport: "judo" },
  { value: "judo_uchikomi", label: "Judo - Uchi-komi", group: "terrain", sport: "judo" },
  { value: "judo_nagekomi", label: "Judo - Nage-komi", group: "terrain", sport: "judo" },
  { value: "judo_newaza", label: "Judo - Ne-waza", group: "terrain", sport: "judo" },
  { value: "judo_kata", label: "Judo - Kata", group: "terrain", sport: "judo" },
  { value: "judo_tokui_waza", label: "Judo - Tokui-waza", group: "terrain", sport: "judo" },
  { value: "judo_grip_fighting", label: "Judo - Kumi-kata (prises)", group: "terrain", sport: "judo" },
  
  // Aviron
  { value: "aviron_technique", label: "Aviron - Technique", group: "terrain", sport: "aviron" },
  { value: "aviron_ergo", label: "Aviron - Ergomètre", group: "terrain", sport: "aviron" },
  { value: "aviron_endurance", label: "Aviron - Endurance", group: "terrain", sport: "aviron" },
  { value: "aviron_starts", label: "Aviron - Départs", group: "terrain", sport: "aviron" },
  { value: "aviron_sprint_finish", label: "Aviron - Sprint / Finish", group: "terrain", sport: "aviron" },
  
  // Bowling
  { value: "bowling_technique", label: "Bowling - Technique", group: "terrain", sport: "bowling" },
  { value: "bowling_spare", label: "Bowling - Spares", group: "terrain", sport: "bowling" },
  { value: "bowling_strike", label: "Bowling - Strikes", group: "terrain", sport: "bowling" },
  { value: "bowling_approach", label: "Bowling - Approche / Élan", group: "terrain", sport: "bowling" },
  { value: "bowling_mental", label: "Bowling - Mental / Routine", group: "terrain", sport: "bowling" },
  
  // Athlétisme - Sprints
  { value: "athletisme_starting_blocks", label: "Athlétisme - Travail départs", group: "terrain", sport: "athletisme" },
  { value: "athletisme_acceleration", label: "Athlétisme - Accélération", group: "terrain", sport: "athletisme" },
  { value: "athletisme_max_velocity", label: "Athlétisme - Vitesse max", group: "terrain", sport: "athletisme" },
  { value: "athletisme_sprint_endurance", label: "Athlétisme - Endurance vitesse", group: "terrain", sport: "athletisme" },
  { value: "athletisme_relay_technique", label: "Athlétisme - Technique relais", group: "terrain", sport: "athletisme" },
  // Athlétisme - Haies
  { value: "athletisme_hurdle_drills", label: "Athlétisme - Éducatifs haies", group: "terrain", sport: "athletisme" },
  { value: "athletisme_hurdle_rhythm", label: "Athlétisme - Rythme inter-haies", group: "terrain", sport: "athletisme" },
  { value: "athletisme_hurdle_technique", label: "Athlétisme - Technique haie", group: "terrain", sport: "athletisme" },
  // Athlétisme - Demi-fond/Fond
  { value: "athletisme_intervals", label: "Athlétisme - Fractionné", group: "terrain", sport: "athletisme" },
  { value: "athletisme_tempo_runs", label: "Athlétisme - Allure seuil", group: "terrain", sport: "athletisme" },
  { value: "athletisme_long_run", label: "Athlétisme - Sortie longue", group: "terrain", sport: "athletisme" },
  { value: "athletisme_fartlek", label: "Athlétisme - Fartlek", group: "terrain", sport: "athletisme" },
  // Athlétisme - Sauts
  { value: "athletisme_approach_work", label: "Athlétisme - Travail course d'élan", group: "terrain", sport: "athletisme" },
  { value: "athletisme_takeoff_drills", label: "Athlétisme - Éducatifs impulsion", group: "terrain", sport: "athletisme" },
  { value: "athletisme_flight_drills", label: "Athlétisme - Travail suspension", group: "terrain", sport: "athletisme" },
  { value: "athletisme_landing", label: "Athlétisme - Réception", group: "terrain", sport: "athletisme" },
  { value: "athletisme_pole_vault_tech", label: "Athlétisme - Technique perche", group: "terrain", sport: "athletisme" },
  // Athlétisme - Lancers
  { value: "athletisme_throwing_drills", label: "Athlétisme - Éducatifs lancers", group: "terrain", sport: "athletisme" },
  { value: "athletisme_rotation_work", label: "Athlétisme - Travail rotation", group: "terrain", sport: "athletisme" },
  { value: "athletisme_release_drills", label: "Athlétisme - Travail lâcher", group: "terrain", sport: "athletisme" },
  { value: "athletisme_implement_work", label: "Athlétisme - Travail avec engin", group: "terrain", sport: "athletisme" },
  { value: "athletisme_shot_put", label: "Athlétisme - Poids", group: "terrain", sport: "athletisme" },
  { value: "athletisme_discus", label: "Athlétisme - Disque", group: "terrain", sport: "athletisme" },
  { value: "athletisme_javelin", label: "Athlétisme - Javelot", group: "terrain", sport: "athletisme" },
  { value: "athletisme_hammer", label: "Athlétisme - Marteau", group: "terrain", sport: "athletisme" },
  // Athlétisme - Épreuves combinées
  { value: "athletisme_combined_events", label: "Athlétisme - Épreuves combinées", group: "terrain", sport: "athletisme" },
  { value: "athletisme_drills_warmup", label: "Athlétisme - Gammes d'échauffement", group: "terrain", sport: "athletisme" },
  
  // Padel
  { value: "padel_technique", label: "Padel - Technique", group: "terrain", sport: "padel" },
  { value: "padel_volley", label: "Padel - Volley", group: "terrain", sport: "padel" },
  { value: "padel_smash", label: "Padel - Smash / Bandeja", group: "terrain", sport: "padel" },
  { value: "padel_defense", label: "Padel - Défense / Lob", group: "terrain", sport: "padel" },
  { value: "padel_tactical", label: "Padel - Tactique / Placement", group: "terrain", sport: "padel" },
  { value: "padel_serve_return", label: "Padel - Service / Retour", group: "terrain", sport: "padel" },
  
  // Natation
  { value: "natation_crawl", label: "Natation - Crawl", group: "terrain", sport: "natation" },
  { value: "natation_dos", label: "Natation - Dos", group: "terrain", sport: "natation" },
  { value: "natation_brasse", label: "Natation - Brasse", group: "terrain", sport: "natation" },
  { value: "natation_papillon", label: "Natation - Papillon", group: "terrain", sport: "natation" },
  { value: "natation_drills", label: "Natation - Éducatifs", group: "terrain", sport: "natation" },
  { value: "natation_starts_turns", label: "Natation - Départs / Virages", group: "terrain", sport: "natation" },
  { value: "natation_endurance", label: "Natation - Endurance", group: "terrain", sport: "natation" },
  { value: "natation_sprint", label: "Natation - Sprint", group: "terrain", sport: "natation" },
  { value: "natation_pullbuoy_paddles", label: "Natation - Pull-buoy / Plaquettes", group: "terrain", sport: "natation" },
  { value: "natation_kick", label: "Natation - Travail de jambes", group: "terrain", sport: "natation" },
  
  // Sports de glisse / Ski / Surf
  { value: "ski_technique", label: "Ski - Technique", group: "terrain", sport: "ski" },
  { value: "ski_slalom_drills", label: "Ski - Éducatifs slalom", group: "terrain", sport: "ski" },
  { value: "ski_geant_drills", label: "Ski - Éducatifs géant", group: "terrain", sport: "ski" },
  { value: "ski_descente", label: "Ski - Descente / Super-G", group: "terrain", sport: "ski" },
  { value: "ski_fond_technique", label: "Ski de fond - Technique", group: "terrain", sport: "ski" },
  { value: "ski_fond_endurance", label: "Ski de fond - Endurance", group: "terrain", sport: "ski" },
  { value: "ski_biathlon_tir", label: "Biathlon - Tir", group: "terrain", sport: "ski" },
  { value: "ski_freestyle", label: "Freestyle / Snowboard", group: "terrain", sport: "ski" },
  { value: "ski_dry_land", label: "Ski - Dry Land Training", group: "terrain", sport: "ski" },
  // Surf (standalone sport)
  { value: "surf_session_libre", label: "Surf - Session libre", group: "terrain", sport: "surf" },
  { value: "surf_technique_manoeuvres", label: "Surf - Travail de manœuvres", group: "terrain", sport: "surf" },
  { value: "surf_tube_riding", label: "Surf - Tube riding", group: "terrain", sport: "surf" },
  { value: "surf_aerials", label: "Surf - Aériens", group: "terrain", sport: "surf" },
  { value: "surf_paddle_endurance", label: "Surf - Endurance rame", group: "terrain", sport: "surf" },
  { value: "surf_pop_up_drills", label: "Surf - Pop-up / take-off drills", group: "terrain", sport: "surf" },
  { value: "surf_video_analysis", label: "Surf - Analyse vidéo", group: "terrain", sport: "surf" },
  { value: "surf_apnea", label: "Surf - Apnée / Hold-down", group: "terrain", sport: "surf" },
  { value: "surf_balance_board", label: "Surf - Balance board / Indo board", group: "terrain", sport: "surf" },
  { value: "surf_skateboard", label: "Surf - Surf skate / Carver", group: "terrain", sport: "surf" },
  
  // Triathlon
  { value: "triathlon_swim", label: "Triathlon - Natation", group: "terrain", sport: "triathlon" },
  { value: "triathlon_bike", label: "Triathlon - Vélo", group: "terrain", sport: "triathlon" },
  { value: "triathlon_run", label: "Triathlon - Course", group: "terrain", sport: "triathlon" },
  { value: "triathlon_transitions", label: "Triathlon - Transitions (T1/T2)", group: "terrain", sport: "triathlon" },
  { value: "triathlon_brick", label: "Triathlon - Brick (enchaînement)", group: "terrain", sport: "triathlon" },
  { value: "triathlon_open_water", label: "Triathlon - Eau libre", group: "terrain", sport: "triathlon" },
  
  // ═══════════════════════════════════════════
  // ÉCHAUFFEMENT / MOBILITÉ
  // ═══════════════════════════════════════════
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
  { value: "plyometrie", label: "Pliométrie" },
  { value: "neuro", label: "Neuro / Cognitif" },
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
  "running_recup", "running_ppg", "running_trail",
  "running_drills_warmup", "running_drills_abc", "running_drills_montees_genoux",
  "running_drills_talons_fesses", "running_drills_skipping", "running_drills_griffes",
  "running_drills_carioca", "running_drills_lateral", "running_drills_jambes_tendues",
  "running_drills_foulees_bondissantes", "running_drills_coordination",
  "running_drills_pose_pied", "running_drills_frequence", "running_drills_amplitude",
  "running_drills_departs", "running_acceleration_work", "running_max_velocity",
  "running_deceleration", "running_sprint_resiste", "running_sprint_assiste",
  "running_relays", "running_hurdle_mobility", "running_hurdle_drills",
  "running_hurdle_rhythm"
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

// Liste des catégories pliométrie
export const PLYOMETRIE_CATEGORIES = [
  "plyometrics", "plyo_lower_bilateral", "plyo_lower_unilateral", "plyo_upper",
  "plyo_depth_jumps", "plyo_box_jumps", "plyo_bounds", "plyo_reactive",
  "plyo_horizontal", "plyo_lateral", "plyo_medball"
];

// Liste des catégories neuro
export const NEURO_CATEGORIES = [
  "neuro_reaction", "neuro_coordination", "neuro_dual_task", "neuro_decision_making",
  "neuro_visual_tracking", "neuro_peripheral_vision", "neuro_hand_eye", "neuro_foot_eye",
  "neuro_cognitive_load", "neuro_inhibition", "neuro_spatial_awareness", "neuro_rhythm",
  "neuro_laterality", "neuro_priming"
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
  // ═══ Haltérophilie ═══
  { value: "halterophilie_mouvements_complets", label: "Mouvements complets", parentCategory: "halterophilie" },
  { value: "halterophilie_educatifs", label: "Éducatifs / Semi-technique", parentCategory: "halterophilie" },
  { value: "halterophilie_accessoires", label: "Accessoires / Renforcement", parentCategory: "halterophilie" },
  
  // ═══ Musculation ═══
  { value: "force_max", label: "Force maximale", parentCategory: "musculation" },
  { value: "hypertrophie", label: "Hypertrophie", parentCategory: "musculation" },
  { value: "puissance", label: "Puissance / Explosivité", parentCategory: "musculation" },
  { value: "endurance_force", label: "Endurance de force", parentCategory: "musculation" },
  { value: "force_vitesse", label: "Force-Vitesse / VBT", parentCategory: "musculation" },
  { value: "methode_specifique", label: "Méthode spécifique (tempo, cluster, contraste)", parentCategory: "musculation" },
  { value: "renforcement_general", label: "Renforcement général", parentCategory: "musculation" },
  { value: "isometrie", label: "Isométrie", parentCategory: "musculation" },
  
  // ═══ Pliométrie ═══
  { value: "plyo_low_intensity", label: "Basse intensité", parentCategory: "plyometrie" },
  { value: "plyo_medium_intensity", label: "Moyenne intensité", parentCategory: "plyometrie" },
  { value: "plyo_high_intensity", label: "Haute intensité", parentCategory: "plyometrie" },
  { value: "plyo_shock_method", label: "Méthode Shock", parentCategory: "plyometrie" },
  { value: "plyo_medball_throws", label: "Lancers médecine ball", parentCategory: "plyometrie" },
  
  // ═══ Neuro / Cognitif ═══
  { value: "neuro_visual", label: "Visuel / Tracking", parentCategory: "neuro" },
  { value: "neuro_motor", label: "Moteur / Coordination", parentCategory: "neuro" },
  { value: "neuro_cognitive", label: "Cognitif / Décisionnel", parentCategory: "neuro" },
  { value: "neuro_reactive", label: "Réactif / Go-NoGo", parentCategory: "neuro" },
  
  // ═══ Poids de corps ═══
  { value: "bodyweight_basics", label: "Fondamentaux", parentCategory: "bodyweight" },
  { value: "bodyweight_advanced", label: "Avancé / Skills", parentCategory: "bodyweight" },
  { value: "bodyweight_weighted", label: "Lesté", parentCategory: "bodyweight" },
  
  // ═══ CrossFit / Hyrox ═══
  { value: "crossfit_metcon", label: "MetCon (WOD, AMRAP, EMOM...)", parentCategory: "crossfit_hyrox" },
  { value: "crossfit_strength", label: "Strength", parentCategory: "crossfit_hyrox" },
  { value: "crossfit_skill", label: "Skill / Gymnastic", parentCategory: "crossfit_hyrox" },
  { value: "hyrox_specific", label: "Hyrox spécifique", parentCategory: "crossfit_hyrox" },
  
  // ═══ Ergo / Cardio ═══
  { value: "ergo_endurance", label: "Endurance", parentCategory: "ergo" },
  { value: "ergo_interval", label: "Interval / HIIT", parentCategory: "ergo" },
  { value: "ergo_test", label: "Test / Benchmark", parentCategory: "ergo" },
  { value: "ergo_recovery", label: "Récupération active", parentCategory: "ergo" },
  
  // ═══ Traîneau ═══
  { value: "sled_strength", label: "Force / Charge lourde", parentCategory: "sled" },
  { value: "sled_conditioning", label: "Conditioning / Répétitions", parentCategory: "sled" },
  { value: "sled_sprint", label: "Sprint / Vitesse", parentCategory: "sled" },
  
  // ═══ Pilates / Yoga ═══
  { value: "pilates_stability", label: "Stabilité / Core", parentCategory: "pilates" },
  { value: "pilates_flexibility", label: "Souplesse / Flow", parentCategory: "pilates" },
  { value: "pilates_strength", label: "Renforcement", parentCategory: "pilates" },
  
  // ═══ Rehab / Réathlétisation ═══
  { value: "phase1_protection", label: "Phase 1 - Réhabilitation", parentCategory: "reathletisation" },
  { value: "phase2_controlled", label: "Phase 2 - Renforcement", parentCategory: "reathletisation" },
  { value: "phase3_progressive", label: "Phase 3 - Retour terrain", parentCategory: "reathletisation" },
  { value: "phase4_return", label: "Phase 4 - Retour compétition", parentCategory: "reathletisation" },
  { value: "prevention", label: "Prévention / Prophylaxie", parentCategory: "reathletisation" },
  
  // ═══ Échauffement / Mobilité ═══
  { value: "echauffement_general", label: "Échauffement général", parentCategory: "stretching_mobility" },
  { value: "mobilite_articulaire", label: "Mobilité articulaire", parentCategory: "stretching_mobility" },
  { value: "etirements_dynamiques", label: "Étirements dynamiques", parentCategory: "stretching_mobility" },
  { value: "etirements_statiques", label: "Étirements statiques", parentCategory: "stretching_mobility" },
  { value: "automassage", label: "Auto-massage / Foam rolling", parentCategory: "stretching_mobility" },
  { value: "retour_calme", label: "Retour au calme / Récupération", parentCategory: "stretching_mobility" },
  
  // ═══ Terrain ═══
  { value: "vitesse_lineaire", label: "Vitesse linéaire", parentCategory: "terrain" },
  { value: "vitesse_changement", label: "Changements de direction", parentCategory: "terrain" },
  { value: "capacite_aerobie", label: "Capacité aérobie", parentCategory: "terrain" },
  { value: "puissance_aerobie", label: "Puissance aérobie", parentCategory: "terrain" },
  { value: "technique_sport", label: "Technique spécifique", parentCategory: "terrain" },
  { value: "tactique_sport", label: "Tactique / Jeu", parentCategory: "terrain" },
  
  // ═══ Course ═══
  { value: "drills_echauffement", label: "Drills d'échauffement", parentCategory: "course" },
  { value: "sprint_specifique", label: "Sprint spécifique", parentCategory: "course" },
  { value: "haies_specifique", label: "Haies spécifique", parentCategory: "course" },
  { value: "endurance_course", label: "Endurance / EF", parentCategory: "course" },
  { value: "intensite_course", label: "Intensité (VMA, seuil, fractionné)", parentCategory: "course" },
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
