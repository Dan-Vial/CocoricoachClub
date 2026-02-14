// Categories et tests pour les programmes et séances

export interface TestOption {
  value: string;
  label: string;
  unit?: string;
  isTime?: boolean; // Pour les tests chronométrés
}

export interface TestCategory {
  value: string;
  label: string;
  tests: TestOption[];
  group?: string; // Group key for hierarchical display
  groupLabel?: string; // Display label for the group
}

export interface TestGroup {
  key: string;
  label: string;
  categories: TestCategory[];
}

// Get grouped test categories for hierarchical display
// Returns standalone categories + grouped categories
export function getGroupedTestCategories(categories: TestCategory[]): { standalone: TestCategory[]; groups: TestGroup[] } {
  const grouped = new Map<string, TestCategory[]>();
  const standalone: TestCategory[] = [];

  for (const cat of categories) {
    if (cat.group) {
      if (!grouped.has(cat.group)) {
        grouped.set(cat.group, []);
      }
      grouped.get(cat.group)!.push(cat);
    } else {
      standalone.push(cat);
    }
  }

  const groups: TestGroup[] = [];
  for (const [key, cats] of grouped) {
    groups.push({
      key,
      label: cats[0]?.groupLabel || key,
      categories: cats,
    });
  }

  return { standalone, groups };
}

export const TEST_CATEGORIES: TestCategory[] = [
  {
    value: "cardio",
    label: "Cardio / Endurance",
    tests: [
      { value: "cooper", label: "Test de Cooper", unit: "m" },
      { value: "demi_cooper", label: "Demi-Cooper (6 min)", unit: "m" },
      { value: "luc_leger", label: "Luc Léger (Bip Test)", unit: "palier" },
      { value: "vameval", label: "VAMEVAL", unit: "km/h" },
      { value: "test_australien", label: "Test Australien (Yo-Yo)", unit: "palier" },
      { value: "test_laboratoire", label: "Test de laboratoire (VO2max)", unit: "ml/kg/min" },
      { value: "bronco", label: "Bronco", unit: "temps", isTime: true },
    ],
  },
  {
    value: "musculation",
    label: "Musculation",
    tests: [
      // Squat
      { value: "squat_1rm", label: "Squat - 1RM", unit: "kg" },
      { value: "squat_3rm", label: "Squat - 3RM", unit: "kg" },
      { value: "squat_5rm", label: "Squat - 5RM", unit: "kg" },
      // Soulevé de terre
      { value: "deadlift_1rm", label: "Soulevé de terre - 1RM", unit: "kg" },
      { value: "deadlift_3rm", label: "Soulevé de terre - 3RM", unit: "kg" },
      { value: "deadlift_5rm", label: "Soulevé de terre - 5RM", unit: "kg" },
      // Développé couché
      { value: "bench_press_1rm", label: "Développé couché - 1RM", unit: "kg" },
      { value: "bench_press_3rm", label: "Développé couché - 3RM", unit: "kg" },
      { value: "bench_press_5rm", label: "Développé couché - 5RM", unit: "kg" },
      // Développé militaire
      { value: "overhead_press_1rm", label: "Développé militaire - 1RM", unit: "kg" },
      { value: "overhead_press_3rm", label: "Développé militaire - 3RM", unit: "kg" },
      { value: "overhead_press_5rm", label: "Développé militaire - 5RM", unit: "kg" },
    ],
  },
  {
    value: "poids_corps",
    label: "Poids de corps",
    tests: [
      // Tractions
      { value: "max_pullups", label: "Max tractions (PDC)", unit: "reps" },
      { value: "pullups_1rm", label: "Traction lestée - 1RM", unit: "kg" },
      { value: "pullups_3rm", label: "Traction lestée - 3RM", unit: "kg" },
      { value: "pullups_5rm", label: "Traction lestée - 5RM", unit: "kg" },
      // Dips
      { value: "max_dips", label: "Max dips (PDC)", unit: "reps" },
      { value: "dips_1rm", label: "Dips lesté - 1RM", unit: "kg" },
      { value: "dips_3rm", label: "Dips lesté - 3RM", unit: "kg" },
      { value: "dips_5rm", label: "Dips lesté - 5RM", unit: "kg" },
      // Pompes
      { value: "max_pushups", label: "Max pompes", unit: "reps" },
    ],
  },
  {
    value: "crossfit",
    label: "CrossFit / Gymnastique",
    tests: [
      // Pull-ups
      { value: "max_kipping_pullup", label: "Max Kipping Pull-up (unbroken)", unit: "reps" },
      { value: "max_butterfly_pullup", label: "Max Butterfly Pull-up (unbroken)", unit: "reps" },
      { value: "max_kipping_c2b", label: "Max Kipping Chest-to-Bar (unbroken)", unit: "reps" },
      { value: "max_butterfly_c2b", label: "Max Butterfly Chest-to-Bar (unbroken)", unit: "reps" },
      // Muscle-ups
      { value: "max_bar_mu", label: "Max Muscle-up Bar (unbroken)", unit: "reps" },
      { value: "max_ring_mu", label: "Max Muscle-up Ring (unbroken)", unit: "reps" },
      // HSPU
      { value: "max_strict_hspu", label: "Max Strict HSPU (Rx)", unit: "reps" },
      { value: "max_kipping_hspu", label: "Max Kipping HSPU (Rx)", unit: "reps" },
      // Toes to bar
      { value: "max_toes_to_ring", label: "Max Toes to Ring (unbroken)", unit: "reps" },
      { value: "max_kipping_t2b", label: "Max Kipping Toes-to-Bar (unbroken)", unit: "reps" },
      { value: "max_strict_t2b", label: "Max Strict Toes-to-Bar (unbroken)", unit: "reps" },
    ],
  },
  {
    value: "corporel",
    label: "Tests corporels / Anthropométrie",
    tests: [
      { value: "weight", label: "Poids", unit: "kg" },
      { value: "bmi", label: "IMC", unit: "" },
      { value: "arm_circumference", label: "Tour de bras", unit: "cm" },
      { value: "hip_circumference", label: "Tour de hanches", unit: "cm" },
      { value: "thigh_circumference", label: "Tour de cuisses", unit: "cm" },
      { value: "chest_circumference", label: "Tour de poitrine", unit: "cm" },
      { value: "body_fat", label: "Masse grasse", unit: "%" },
      { value: "muscle_mass", label: "Masse musculaire", unit: "kg" },
    ],
  },
  {
    value: "course",
    label: "Course / Sprint",
    tests: [
      { value: "sprint_10m", label: "10m", unit: "s", isTime: true },
      { value: "sprint_20m", label: "20m", unit: "s", isTime: true },
      { value: "sprint_30m", label: "30m", unit: "s", isTime: true },
      { value: "sprint_40m", label: "40m", unit: "s", isTime: true },
      { value: "sprint_50m", label: "50m", unit: "s", isTime: true },
      { value: "sprint_100m", label: "100m", unit: "s", isTime: true },
      { value: "run_1000m", label: "1000m", unit: "min.s", isTime: true },
      { value: "run_1600m", label: "1600m", unit: "min.s", isTime: true },
      { value: "run_10000m", label: "10 000m", unit: "min.s", isTime: true },
      { value: "half_marathon", label: "Semi-marathon", unit: "h.min.s", isTime: true },
      { value: "marathon", label: "Marathon", unit: "h.min.s", isTime: true },
    ],
  },
  {
    value: "pliometrie",
    label: "Pliométrie / Détente",
    tests: [
      { value: "broad_jump", label: "Broad Jump", unit: "cm" },
      { value: "triple_broad_jump", label: "Triple Broad Jump", unit: "cm" },
      { value: "squat_jump", label: "Squat Jump (SJ)", unit: "cm" },
      { value: "cmj", label: "Counter Movement Jump (CMJ)", unit: "cm" },
      { value: "drop_jump_30", label: "Drop Jump 30cm", unit: "cm" },
      { value: "drop_jump_50", label: "Drop Jump 50cm", unit: "cm" },
      { value: "sergent_test", label: "Sergent Test", unit: "cm" },
      { value: "abalakov", label: "Abalakov", unit: "cm" },
      { value: "force_platform_right", label: "Plateforme de force - Pied Droit", unit: "N" },
      { value: "force_platform_left", label: "Plateforme de force - Pied Gauche", unit: "N" },
      { value: "force_platform_both", label: "Plateforme de force - 2 Pieds", unit: "N" },
    ],
  },
  {
    value: "puissance",
    label: "Puissance",
    tests: [
      { value: "power_clean_50", label: "Puissance max Clean 50%RM", unit: "W" },
      { value: "power_power_clean_50", label: "Puissance max Power Clean 50%RM", unit: "W" },
      { value: "power_snatch_50", label: "Puissance max Snatch 50%RM", unit: "W" },
      { value: "power_power_snatch_50", label: "Puissance max Power Snatch 50%RM", unit: "W" },
      { value: "power_deadlift_50", label: "Puissance max Deadlift 50%RM", unit: "W" },
      { value: "power_squat_50", label: "Puissance max Squat 50%RM", unit: "W" },
    ],
  },
  {
    value: "halterophilie",
    label: "Haltérophilie",
    tests: [
      { value: "clean_1rm", label: "Clean - 1RM", unit: "kg" },
      { value: "power_clean_1rm", label: "Power Clean - 1RM", unit: "kg" },
      { value: "snatch_1rm", label: "Snatch - 1RM", unit: "kg" },
      { value: "power_snatch_1rm", label: "Power Snatch - 1RM", unit: "kg" },
      { value: "clean_and_jerk_1rm", label: "Clean & Jerk - 1RM", unit: "kg" },
    ],
  },
  {
    value: "bowling_force",
    label: "Force / Stabilité",
    group: "bowling",
    groupLabel: "Bowling",
    tests: [
      { value: "bowling_grip_strength", label: "Force de préhension (dynamomètre)", unit: "kg" },
      { value: "bowling_wrist_flexors", label: "Force fléchisseurs poignet", unit: "kg" },
      { value: "bowling_wrist_extensors", label: "Force extenseurs poignet", unit: "kg" },
      { value: "bowling_lateral_core", label: "Gainage latéral", unit: "s", isTime: true },
      { value: "bowling_rotational_core", label: "Gainage rotationnel", unit: "s", isTime: true },
      { value: "bowling_slsq_control", label: "Single Leg Squat Control Test", unit: "score" },
    ],
  },
  {
    value: "bowling_balance",
    label: "Équilibre / Coordination",
    group: "bowling",
    groupLabel: "Bowling",
    tests: [
      { value: "bowling_y_balance_ant", label: "Y-Balance Test - Antérieur", unit: "cm" },
      { value: "bowling_y_balance_pm", label: "Y-Balance Test - Postéro-médial", unit: "cm" },
      { value: "bowling_y_balance_pl", label: "Y-Balance Test - Postéro-latéral", unit: "cm" },
      { value: "bowling_sebt", label: "Star Excursion Balance Test", unit: "cm" },
      { value: "bowling_dynamic_balance", label: "Équilibre dynamique unipodal", unit: "s", isTime: true },
    ],
  },
  {
    value: "bowling_endurance",
    label: "Endurance Spécifique",
    group: "bowling",
    groupLabel: "Bowling",
    tests: [
      { value: "bowling_fatigue_test", label: "Test de répétition de lancers (fatigue)", unit: "score" },
      { value: "bowling_speed_maintain", label: "Maintien de la vitesse sur séries longues", unit: "%" },
      { value: "bowling_precision_maintain", label: "Maintien de la précision sur séries longues", unit: "%" },
      { value: "bowling_consistency_6games", label: "Consistance sur 6 parties", unit: "écart-type" },
    ],
  },
  {
    value: "bowling_cognitive",
    label: "Perceptivo-cognitif",
    group: "bowling",
    groupLabel: "Bowling",
    tests: [
      { value: "bowling_visual_reaction", label: "Temps de réaction visuel", unit: "ms", isTime: true },
      { value: "bowling_trajectory_reading", label: "Prise d'information trajectoire", unit: "score" },
      { value: "bowling_oil_pattern_read", label: "Lecture du huilage", unit: "score" },
      { value: "bowling_line_adaptation", label: "Capacité d'adaptation (changement de ligne)", unit: "score" },
    ],
  },
  {
    value: "bowling_mental",
    label: "Mental / Comportemental",
    group: "bowling",
    groupLabel: "Bowling",
    tests: [
      { value: "bowling_pre_shot_routine", label: "Stabilité routine pré-lancer", unit: "%" },
      { value: "bowling_stress_management", label: "Gestion du stress (questionnaire)", unit: "score" },
      { value: "bowling_concentration", label: "Concentration sur séries longues", unit: "score" },
      { value: "bowling_post_failure", label: "Comportement post-échec (frame ouverte)", unit: "score" },
    ],
  },
  // Aviron specific tests
  {
    value: "aviron_ergo",
    label: "Ergomètre",
    group: "aviron",
    groupLabel: "Aviron",
    tests: [
      { value: "aviron_ergo_2000m", label: "2000m Ergomètre", unit: "min.s", isTime: true },
      { value: "aviron_ergo_6000m", label: "6000m Ergomètre", unit: "min.s", isTime: true },
      { value: "aviron_ergo_500m", label: "500m Ergomètre (Sprint)", unit: "s", isTime: true },
      { value: "aviron_ergo_30min", label: "30min Ergomètre (Distance)", unit: "m" },
      { value: "aviron_ergo_60min", label: "60min Ergomètre (Distance)", unit: "m" },
      { value: "aviron_ergo_watts_max", label: "Puissance max Ergomètre", unit: "W" },
      { value: "aviron_ergo_watts_avg", label: "Puissance moyenne 2000m", unit: "W" },
    ],
  },
  {
    value: "aviron_physio",
    label: "Tests Physiologiques",
    group: "aviron",
    groupLabel: "Aviron",
    tests: [
      { value: "aviron_vo2max", label: "VO2max (test labo)", unit: "ml/kg/min" },
      { value: "aviron_lactate_threshold", label: "Seuil Lactique", unit: "mmol/L" },
      { value: "aviron_power_to_weight", label: "Ratio Puissance/Poids", unit: "W/kg" },
      { value: "aviron_anaerobic_threshold", label: "Seuil Anaérobie (Puissance)", unit: "W" },
      { value: "aviron_heart_rate_max", label: "FC Max", unit: "bpm" },
      { value: "aviron_heart_rate_rest", label: "FC Repos", unit: "bpm" },
    ],
  },
  {
    value: "aviron_force",
    label: "Force Spécifique",
    group: "aviron",
    groupLabel: "Aviron",
    tests: [
      { value: "aviron_leg_press_max", label: "Leg Press Max", unit: "kg" },
      { value: "aviron_bench_pull", label: "Bench Pull 1RM", unit: "kg" },
      { value: "aviron_seated_row", label: "Tirage assis 1RM", unit: "kg" },
      { value: "aviron_deadlift_1rm", label: "Soulevé de terre 1RM", unit: "kg" },
      { value: "aviron_clean_1rm", label: "Clean 1RM", unit: "kg" },
      { value: "aviron_squat_1rm", label: "Squat 1RM", unit: "kg" },
    ],
  },
  {
    value: "aviron_technique",
    label: "Technique / Eau",
    group: "aviron",
    groupLabel: "Aviron",
    tests: [
      { value: "aviron_stroke_rate_max", label: "Cadence Max (coups/min)", unit: "c/min" },
      { value: "aviron_stroke_efficiency", label: "Efficacité du coup (m/coup)", unit: "m" },
      { value: "aviron_technique_score", label: "Score technique (évaluation)", unit: "score" },
      { value: "aviron_500m_water", label: "500m sur l'eau", unit: "s", isTime: true },
      { value: "aviron_2000m_water", label: "2000m sur l'eau", unit: "min.s", isTime: true },
    ],
  },
  {
    value: "aviron_flexibility",
    label: "Souplesse / Mobilité",
    group: "aviron",
    groupLabel: "Aviron",
    tests: [
      { value: "aviron_sit_and_reach", label: "Sit and Reach", unit: "cm" },
      { value: "aviron_hip_flexion", label: "Flexion hanche", unit: "°" },
      { value: "aviron_ankle_dorsiflexion", label: "Dorsiflexion cheville", unit: "°" },
      { value: "aviron_shoulder_mobility", label: "Mobilité épaule", unit: "cm" },
      { value: "aviron_thoracic_rotation", label: "Rotation thoracique", unit: "°" },
    ],
  },
  {
    value: "basketball_agility",
    label: "Agilité / Vitesse",
    group: "basketball",
    groupLabel: "Basketball",
    tests: [
      { value: "basketball_lane_agility", label: "Lane Agility Test", unit: "s", isTime: true },
      { value: "basketball_t_test", label: "Agility T-Test", unit: "s", isTime: true },
      { value: "basketball_pro_agility", label: "Pro Agility (5-10-5)", unit: "s", isTime: true },
      { value: "basketball_shuttle_run", label: "Shuttle Run", unit: "s", isTime: true },
      { value: "basketball_defensive_slides", label: "Defensive Slides Test", unit: "s", isTime: true },
      { value: "basketball_sprint_3_4", label: "Sprint 3/4 de terrain", unit: "s", isTime: true },
      { value: "basketball_sprint_full", label: "Sprint terrain complet", unit: "s", isTime: true },
    ],
  },
  {
    value: "basketball_jump",
    label: "Détente verticale",
    group: "basketball",
    groupLabel: "Basketball",
    tests: [
      { value: "basketball_vertical_jump_standing", label: "Vertical Jump (debout)", unit: "cm" },
      { value: "basketball_vertical_jump_max", label: "Vertical Jump (avec élan)", unit: "cm" },
      { value: "basketball_approach_jump", label: "Approach Jump (max reach)", unit: "cm" },
      { value: "basketball_drop_jump", label: "Drop Jump (réactivité)", unit: "cm" },
    ],
  },
  {
    value: "basketball_endurance",
    label: "Endurance",
    group: "basketball",
    groupLabel: "Basketball",
    tests: [
      { value: "basketball_beep_test", label: "Beep Test (Yo-Yo)", unit: "palier" },
      { value: "basketball_suicide_drill", label: "Suicide Drill (ligne à ligne)", unit: "s", isTime: true },
      { value: "basketball_free_throw_fatigue", label: "Free Throw Fatigue Test", unit: "%" },
      { value: "basketball_repeated_sprint", label: "Repeated Sprint Ability", unit: "moyenne s", isTime: true },
    ],
  },
  {
    value: "basketball_skills",
    label: "Compétences spécifiques",
    group: "basketball",
    groupLabel: "Basketball",
    tests: [
      { value: "basketball_ball_handling", label: "Ball Handling Test", unit: "s", isTime: true },
      { value: "basketball_layup_drill", label: "Layup Drill (1 min)", unit: "réussites" },
      { value: "basketball_spot_shooting", label: "Spot Shooting (5 positions)", unit: "/25" },
      { value: "basketball_3pt_percentage", label: "3-Point Shooting %", unit: "%" },
      { value: "basketball_free_throw", label: "Free Throw %", unit: "%" },
    ],
  },
  // Athletics specific tests - Sprints
  {
    value: "athletisme_sprints",
    label: "Sprints",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_60m", label: "60m (Salle)", unit: "s", isTime: true },
      { value: "athle_100m", label: "100m", unit: "s", isTime: true },
      { value: "athle_200m", label: "200m", unit: "s", isTime: true },
      { value: "athle_400m", label: "400m", unit: "s", isTime: true },
      { value: "athle_reaction_time", label: "Temps de réaction (starting blocks)", unit: "ms", isTime: true },
      { value: "athle_max_velocity", label: "Vitesse maximale", unit: "m/s" },
      { value: "athle_split_30m", label: "Split 30m (du 100m)", unit: "s", isTime: true },
      { value: "athle_split_60m", label: "Split 60m (du 100m)", unit: "s", isTime: true },
      { value: "athle_flying_30m", label: "30m lancé", unit: "s", isTime: true },
    ],
  },
  // Athletics - Hurdles
  {
    value: "athletisme_haies",
    label: "Haies",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_60mh", label: "60m Haies (Salle)", unit: "s", isTime: true },
      { value: "athle_100mh", label: "100m Haies (Femmes)", unit: "s", isTime: true },
      { value: "athle_110mh", label: "110m Haies (Hommes)", unit: "s", isTime: true },
      { value: "athle_400mh", label: "400m Haies", unit: "s", isTime: true },
      { value: "athle_hurdle_technique", label: "Score technique haies", unit: "score" },
      { value: "athle_hurdle_cadence", label: "Cadence inter-haies", unit: "foulées" },
    ],
  },
  // Athletics - Middle distance
  {
    value: "athletisme_demi_fond",
    label: "Demi-fond",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_800m", label: "800m", unit: "min.s", isTime: true },
      { value: "athle_1000m", label: "1000m", unit: "min.s", isTime: true },
      { value: "athle_1500m", label: "1500m", unit: "min.s", isTime: true },
      { value: "athle_mile", label: "Mile (1609m)", unit: "min.s", isTime: true },
      { value: "athle_vma_track", label: "VMA (piste)", unit: "km/h" },
      { value: "athle_lactate_400m", label: "Split 400m (du 800m)", unit: "s", isTime: true },
    ],
  },
  // Athletics - Long distance
  {
    value: "athletisme_fond",
    label: "Fond",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_3000m", label: "3000m", unit: "min.s", isTime: true },
      { value: "athle_3000m_steeple", label: "3000m Steeple", unit: "min.s", isTime: true },
      { value: "athle_5000m", label: "5000m", unit: "min.s", isTime: true },
      { value: "athle_10000m", label: "10 000m", unit: "min.s", isTime: true },
      { value: "athle_half_marathon", label: "Semi-marathon", unit: "h.min.s", isTime: true },
      { value: "athle_marathon", label: "Marathon", unit: "h.min.s", isTime: true },
      { value: "athle_cross_country", label: "Cross-country (temps)", unit: "min.s", isTime: true },
    ],
  },
  // Athletics - Jumps
  {
    value: "athletisme_sauts",
    label: "Sauts",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_long_jump", label: "Saut en longueur", unit: "m" },
      { value: "athle_triple_jump", label: "Triple saut", unit: "m" },
      { value: "athle_high_jump", label: "Saut en hauteur", unit: "m" },
      { value: "athle_pole_vault", label: "Saut à la perche", unit: "m" },
      { value: "athle_approach_speed_lj", label: "Vitesse d'approche (longueur)", unit: "m/s" },
      { value: "athle_takeoff_angle", label: "Angle de décollage", unit: "°" },
      { value: "athle_standing_long_jump", label: "Saut en longueur sans élan", unit: "m" },
      { value: "athle_standing_triple_jump", label: "Triple saut sans élan", unit: "m" },
    ],
  },
  // Athletics - Throws
  {
    value: "athletisme_lancers",
    label: "Lancers",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_shot_put", label: "Lancer du poids", unit: "m" },
      { value: "athle_discus", label: "Lancer du disque", unit: "m" },
      { value: "athle_hammer", label: "Lancer du marteau", unit: "m" },
      { value: "athle_javelin", label: "Lancer du javelot", unit: "m" },
      { value: "athle_medicine_ball_throw", label: "Lancer médecine-ball", unit: "m" },
      { value: "athle_backward_throw", label: "Lancer arrière par-dessus", unit: "m" },
      { value: "athle_rotational_velocity", label: "Vitesse de rotation", unit: "rad/s" },
    ],
  },
  // Athletics - Combined events
  {
    value: "athletisme_combines",
    label: "Épreuves combinées",
    group: "athletisme",
    groupLabel: "Athlétisme",
    tests: [
      { value: "athle_decathlon_total", label: "Total Décathlon", unit: "points" },
      { value: "athle_heptathlon_total", label: "Total Heptathlon", unit: "points" },
      { value: "athle_pentathlon_indoor", label: "Total Pentathlon (Salle)", unit: "points" },
      { value: "athle_combined_day1", label: "Total Jour 1", unit: "points" },
      { value: "athle_combined_day2", label: "Total Jour 2", unit: "points" },
    ],
  },
  // Judo specific tests
  {
    value: "judo_physique",
    label: "Tests Physiques",
    group: "judo",
    groupLabel: "Judo",
    tests: [
      { value: "judo_uchi_komi_30s", label: "Uchi-komi 30 sec", unit: "reps" },
      { value: "judo_uchi_komi_1min", label: "Uchi-komi 1 min", unit: "reps" },
      { value: "judo_grip_strength", label: "Force de préhension (kumi-kata)", unit: "kg" },
      { value: "judo_pull_ups_judogi", label: "Tractions judogi", unit: "reps" },
      { value: "judo_rope_climb", label: "Grimper corde (sans jambes)", unit: "s", isTime: true },
      { value: "judo_flexibility_split", label: "Écart latéral", unit: "cm" },
      { value: "judo_rotational_power", label: "Puissance rotationnelle", unit: "W" },
    ],
  },
  {
    value: "judo_combat",
    label: "Tests de Combat",
    group: "judo",
    groupLabel: "Judo",
    tests: [
      { value: "judo_randori_intensity", label: "Intensité randori (GPS)", unit: "m/min" },
      { value: "judo_tokui_waza_success", label: "% réussite tokui-waza", unit: "%" },
      { value: "judo_kumikata_time", label: "Temps prise de kumi-kata", unit: "s", isTime: true },
      { value: "judo_throwing_frequency", label: "Fréquence de projection", unit: "proj/min" },
      { value: "judo_golden_score_endurance", label: "Endurance golden score", unit: "score" },
    ],
  },
  // Réathlétisation / Kiné - Force musculaire bilatérale
  {
    value: "rehab_ischio_quadri",
    label: "Ischio-jambiers / Quadriceps",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      // Ischio-jambiers
      { value: "rehab_ischio_conc_d", label: "Ischio concentrique - Droit", unit: "N" },
      { value: "rehab_ischio_conc_g", label: "Ischio concentrique - Gauche", unit: "N" },
      { value: "rehab_ischio_exc_d", label: "Ischio excentrique - Droit", unit: "N" },
      { value: "rehab_ischio_exc_g", label: "Ischio excentrique - Gauche", unit: "N" },
      { value: "rehab_ischio_iso_d", label: "Ischio isométrique - Droit", unit: "N" },
      { value: "rehab_ischio_iso_g", label: "Ischio isométrique - Gauche", unit: "N" },
      { value: "rehab_ischio_nordbord_d", label: "NordBord - Droit", unit: "N" },
      { value: "rehab_ischio_nordbord_g", label: "NordBord - Gauche", unit: "N" },
      // Quadriceps
      { value: "rehab_quadri_conc_d", label: "Quadriceps concentrique - Droit", unit: "N" },
      { value: "rehab_quadri_conc_g", label: "Quadriceps concentrique - Gauche", unit: "N" },
      { value: "rehab_quadri_exc_d", label: "Quadriceps excentrique - Droit", unit: "N" },
      { value: "rehab_quadri_exc_g", label: "Quadriceps excentrique - Gauche", unit: "N" },
      { value: "rehab_quadri_iso_d", label: "Quadriceps isométrique - Droit", unit: "N" },
      { value: "rehab_quadri_iso_g", label: "Quadriceps isométrique - Gauche", unit: "N" },
      // Ratio I/Q
      { value: "rehab_ratio_iq_d", label: "Ratio I/Q concentrique - Droit", unit: "%" },
      { value: "rehab_ratio_iq_g", label: "Ratio I/Q concentrique - Gauche", unit: "%" },
      { value: "rehab_ratio_iq_fonc_d", label: "Ratio I/Q fonctionnel - Droit", unit: "%" },
      { value: "rehab_ratio_iq_fonc_g", label: "Ratio I/Q fonctionnel - Gauche", unit: "%" },
    ],
  },
  {
    value: "rehab_adducteurs_abducteurs",
    label: "Adducteurs / Abducteurs",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_add_d", label: "Adducteurs - Droit", unit: "N" },
      { value: "rehab_add_g", label: "Adducteurs - Gauche", unit: "N" },
      { value: "rehab_abd_d", label: "Abducteurs - Droit", unit: "N" },
      { value: "rehab_abd_g", label: "Abducteurs - Gauche", unit: "N" },
      { value: "rehab_add_squeeze", label: "Adducteur Squeeze Test (bilatéral)", unit: "N" },
      { value: "rehab_add_iso_long_d", label: "Adducteur long isométrique - Droit", unit: "N" },
      { value: "rehab_add_iso_long_g", label: "Adducteur long isométrique - Gauche", unit: "N" },
      { value: "rehab_copenhagen_d", label: "Copenhagen Adduction - Droit", unit: "s", isTime: true },
      { value: "rehab_copenhagen_g", label: "Copenhagen Adduction - Gauche", unit: "s", isTime: true },
    ],
  },
  {
    value: "rehab_epaule",
    label: "Épaule",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      // Rotateurs
      { value: "rehab_re_conc_d", label: "Rotation externe concentrique - Droit", unit: "N" },
      { value: "rehab_re_conc_g", label: "Rotation externe concentrique - Gauche", unit: "N" },
      { value: "rehab_ri_conc_d", label: "Rotation interne concentrique - Droit", unit: "N" },
      { value: "rehab_ri_conc_g", label: "Rotation interne concentrique - Gauche", unit: "N" },
      { value: "rehab_re_iso_d", label: "Rotation externe isométrique - Droit", unit: "N" },
      { value: "rehab_re_iso_g", label: "Rotation externe isométrique - Gauche", unit: "N" },
      { value: "rehab_ri_iso_d", label: "Rotation interne isométrique - Droit", unit: "N" },
      { value: "rehab_ri_iso_g", label: "Rotation interne isométrique - Gauche", unit: "N" },
      // Ratio RE/RI
      { value: "rehab_ratio_re_ri_d", label: "Ratio RE/RI - Droit", unit: "%" },
      { value: "rehab_ratio_re_ri_g", label: "Ratio RE/RI - Gauche", unit: "%" },
      // Autres épaule
      { value: "rehab_abd_epaule_d", label: "Abduction épaule - Droit", unit: "N" },
      { value: "rehab_abd_epaule_g", label: "Abduction épaule - Gauche", unit: "N" },
      { value: "rehab_flex_epaule_d", label: "Flexion épaule - Droit", unit: "N" },
      { value: "rehab_flex_epaule_g", label: "Flexion épaule - Gauche", unit: "N" },
    ],
  },
  {
    value: "rehab_cheville_pied",
    label: "Cheville / Pied",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_dorsiflexion_d", label: "Dorsiflexion - Droit", unit: "°" },
      { value: "rehab_dorsiflexion_g", label: "Dorsiflexion - Gauche", unit: "°" },
      { value: "rehab_eversion_d", label: "Éversion isométrique - Droit", unit: "N" },
      { value: "rehab_eversion_g", label: "Éversion isométrique - Gauche", unit: "N" },
      { value: "rehab_inversion_d", label: "Inversion isométrique - Droit", unit: "N" },
      { value: "rehab_inversion_g", label: "Inversion isométrique - Gauche", unit: "N" },
      { value: "rehab_flex_plantaire_d", label: "Flexion plantaire - Droit", unit: "N" },
      { value: "rehab_flex_plantaire_g", label: "Flexion plantaire - Gauche", unit: "N" },
      { value: "rehab_calf_raise_d", label: "Calf Raise endurance - Droit", unit: "reps" },
      { value: "rehab_calf_raise_g", label: "Calf Raise endurance - Gauche", unit: "reps" },
    ],
  },
  {
    value: "rehab_hanche",
    label: "Hanche / Fessiers",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_ext_hanche_d", label: "Extension hanche - Droit", unit: "N" },
      { value: "rehab_ext_hanche_g", label: "Extension hanche - Gauche", unit: "N" },
      { value: "rehab_flex_hanche_d", label: "Flexion hanche - Droit", unit: "N" },
      { value: "rehab_flex_hanche_g", label: "Flexion hanche - Gauche", unit: "N" },
      { value: "rehab_abd_hanche_d", label: "Abduction hanche - Droit", unit: "N" },
      { value: "rehab_abd_hanche_g", label: "Abduction hanche - Gauche", unit: "N" },
      { value: "rehab_add_hanche_d", label: "Adduction hanche - Droit", unit: "N" },
      { value: "rehab_add_hanche_g", label: "Adduction hanche - Gauche", unit: "N" },
      { value: "rehab_re_hanche_d", label: "Rotation externe hanche - Droit", unit: "°" },
      { value: "rehab_re_hanche_g", label: "Rotation externe hanche - Gauche", unit: "°" },
      { value: "rehab_ri_hanche_d", label: "Rotation interne hanche - Droit", unit: "°" },
      { value: "rehab_ri_hanche_g", label: "Rotation interne hanche - Gauche", unit: "°" },
    ],
  },
  {
    value: "rehab_genou",
    label: "Genou",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_ext_genou_d", label: "Extension genou isométrique - Droit", unit: "N" },
      { value: "rehab_ext_genou_g", label: "Extension genou isométrique - Gauche", unit: "N" },
      { value: "rehab_flex_genou_d", label: "Flexion genou isométrique - Droit", unit: "N" },
      { value: "rehab_flex_genou_g", label: "Flexion genou isométrique - Gauche", unit: "N" },
      { value: "rehab_lachman", label: "Lachman (laxité antérieure)", unit: "mm" },
      { value: "rehab_pivot_shift", label: "Pivot Shift", unit: "score" },
      { value: "rehab_rom_flexion_d", label: "ROM Flexion - Droit", unit: "°" },
      { value: "rehab_rom_flexion_g", label: "ROM Flexion - Gauche", unit: "°" },
      { value: "rehab_rom_extension_d", label: "ROM Extension - Droit", unit: "°" },
      { value: "rehab_rom_extension_g", label: "ROM Extension - Gauche", unit: "°" },
    ],
  },
  {
    value: "rehab_tronc",
    label: "Tronc / Rachis",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_gainage_ventral", label: "Gainage ventral (planche)", unit: "s", isTime: true },
      { value: "rehab_gainage_lateral_d", label: "Gainage latéral - Droit", unit: "s", isTime: true },
      { value: "rehab_gainage_lateral_g", label: "Gainage latéral - Gauche", unit: "s", isTime: true },
      { value: "rehab_gainage_dorsal", label: "Gainage dorsal (Sorensen)", unit: "s", isTime: true },
      { value: "rehab_flexion_tronc", label: "Force flexion tronc", unit: "N" },
      { value: "rehab_extension_tronc", label: "Force extension tronc", unit: "N" },
      { value: "rehab_rotation_tronc_d", label: "Force rotation tronc - Droit", unit: "N" },
      { value: "rehab_rotation_tronc_g", label: "Force rotation tronc - Gauche", unit: "N" },
    ],
  },
  {
    value: "rehab_fonctionnel",
    label: "Tests Fonctionnels",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      { value: "rehab_single_leg_squat_d", label: "Single Leg Squat - Droit", unit: "score" },
      { value: "rehab_single_leg_squat_g", label: "Single Leg Squat - Gauche", unit: "score" },
      { value: "rehab_hop_test_d", label: "Single Hop Test - Droit", unit: "cm" },
      { value: "rehab_hop_test_g", label: "Single Hop Test - Gauche", unit: "cm" },
      { value: "rehab_triple_hop_d", label: "Triple Hop Test - Droit", unit: "cm" },
      { value: "rehab_triple_hop_g", label: "Triple Hop Test - Gauche", unit: "cm" },
      { value: "rehab_crossover_hop_d", label: "Crossover Hop Test - Droit", unit: "cm" },
      { value: "rehab_crossover_hop_g", label: "Crossover Hop Test - Gauche", unit: "cm" },
      { value: "rehab_6m_timed_hop_d", label: "6m Timed Hop - Droit", unit: "s", isTime: true },
      { value: "rehab_6m_timed_hop_g", label: "6m Timed Hop - Gauche", unit: "s", isTime: true },
      { value: "rehab_y_balance_ant_d", label: "Y-Balance Antérieur - Droit", unit: "cm" },
      { value: "rehab_y_balance_ant_g", label: "Y-Balance Antérieur - Gauche", unit: "cm" },
      { value: "rehab_y_balance_pm_d", label: "Y-Balance Postéro-médial - Droit", unit: "cm" },
      { value: "rehab_y_balance_pm_g", label: "Y-Balance Postéro-médial - Gauche", unit: "cm" },
      { value: "rehab_y_balance_pl_d", label: "Y-Balance Postéro-latéral - Droit", unit: "cm" },
      { value: "rehab_y_balance_pl_g", label: "Y-Balance Postéro-latéral - Gauche", unit: "cm" },
      { value: "rehab_star_excursion_d", label: "Star Excursion Balance - Droit", unit: "cm" },
      { value: "rehab_star_excursion_g", label: "Star Excursion Balance - Gauche", unit: "cm" },
      { value: "rehab_fms_score", label: "FMS Total Score", unit: "score" },
    ],
  },
  {
    value: "rehab_isocinetique",
    label: "Isocinétique",
    group: "reathletisation",
    groupLabel: "Réathlétisation",
    tests: [
      // Genou 60°/s
      { value: "rehab_isocin_quad_60_d", label: "Quadriceps 60°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_quad_60_g", label: "Quadriceps 60°/s - Gauche", unit: "Nm" },
      { value: "rehab_isocin_ischio_60_d", label: "Ischio 60°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_ischio_60_g", label: "Ischio 60°/s - Gauche", unit: "Nm" },
      // Genou 180°/s
      { value: "rehab_isocin_quad_180_d", label: "Quadriceps 180°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_quad_180_g", label: "Quadriceps 180°/s - Gauche", unit: "Nm" },
      { value: "rehab_isocin_ischio_180_d", label: "Ischio 180°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_ischio_180_g", label: "Ischio 180°/s - Gauche", unit: "Nm" },
      // Genou 300°/s
      { value: "rehab_isocin_quad_300_d", label: "Quadriceps 300°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_quad_300_g", label: "Quadriceps 300°/s - Gauche", unit: "Nm" },
      { value: "rehab_isocin_ischio_300_d", label: "Ischio 300°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_ischio_300_g", label: "Ischio 300°/s - Gauche", unit: "Nm" },
      // Épaule
      { value: "rehab_isocin_re_epaule_d", label: "RE Épaule 60°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_re_epaule_g", label: "RE Épaule 60°/s - Gauche", unit: "Nm" },
      { value: "rehab_isocin_ri_epaule_d", label: "RI Épaule 60°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_ri_epaule_g", label: "RI Épaule 60°/s - Gauche", unit: "Nm" },
      // Cheville
      { value: "rehab_isocin_dorsiflex_d", label: "Dorsiflexion 30°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_dorsiflex_g", label: "Dorsiflexion 30°/s - Gauche", unit: "Nm" },
      { value: "rehab_isocin_plantarflex_d", label: "Flexion plantaire 30°/s - Droit", unit: "Nm" },
      { value: "rehab_isocin_plantarflex_g", label: "Flexion plantaire 30°/s - Gauche", unit: "Nm" },
    ],
  },
];

// Fonction utilitaire pour obtenir le label complet d'un test
export function getTestLabel(testValue: string): string {
  for (const category of TEST_CATEGORIES) {
    const test = category.tests.find((t) => t.value === testValue);
    if (test) {
      const prefix = category.group ? `${category.groupLabel} > ${category.label}` : category.label;
      return `${prefix} - ${test.label}`;
    }
  }
  return testValue;
}

// Fonction utilitaire pour obtenir l'unité d'un test
export function getTestUnit(testValue: string): string {
  for (const category of TEST_CATEGORIES) {
    const test = category.tests.find((t) => t.value === testValue);
    if (test) {
      return test.unit || "";
    }
  }
  return "";
}

// Fonction pour obtenir tous les tests à plat
export function getAllTests(): TestOption[] {
  return TEST_CATEGORIES.flatMap((cat) => 
    cat.tests.map((test) => ({
      ...test,
      label: `${cat.label} - ${test.label}`,
    }))
  );
}

// Fonction pour obtenir les catégories de tests par sport
export function getTestCategoriesForSport(sportType: string): TestCategory[] {
  const baseSport = sportType?.split('_')[0]?.toLowerCase() || sportType?.toLowerCase();
  
  const baseCategories = TEST_CATEGORIES.filter(cat => 
    !cat.value.startsWith("bowling_") && 
    !cat.value.startsWith("basketball_") && 
    !cat.value.startsWith("aviron_") &&
    !cat.value.startsWith("athletisme_") &&
    !cat.value.startsWith("judo_") &&
    !cat.value.startsWith("rehab_")
  );

  // Rehab categories are always included
  const rehabCategories = TEST_CATEGORIES.filter(cat => cat.value.startsWith("rehab_"));
  
  if (baseSport === "bowling") {
    const bowlingCategories = TEST_CATEGORIES.filter(cat => 
      cat.value.startsWith("bowling_")
    );
    return [...baseCategories, ...rehabCategories, ...bowlingCategories];
  }
  
  if (baseSport === "basketball") {
    const basketballCategories = TEST_CATEGORIES.filter(cat => 
      cat.value.startsWith("basketball_")
    );
    return [...baseCategories, ...rehabCategories, ...basketballCategories];
  }
  
  if (baseSport === "aviron") {
    const avironCategories = TEST_CATEGORIES.filter(cat => 
      cat.value.startsWith("aviron_")
    );
    return [...baseCategories, ...rehabCategories, ...avironCategories];
  }
  
  if (baseSport === "athletisme") {
    const athletismeCategories = TEST_CATEGORIES.filter(cat => 
      cat.value.startsWith("athletisme_")
    );
    return [...baseCategories, ...rehabCategories, ...athletismeCategories];
  }
  
  if (baseSport === "judo") {
    const judoCategories = TEST_CATEGORIES.filter(cat => 
      cat.value.startsWith("judo_")
    );
    return [...baseCategories, ...rehabCategories, ...judoCategories];
  }
  
  return [...baseCategories, ...rehabCategories];
}
