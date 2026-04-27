// Training types configuration per sport type
import { isIndividualSport } from "./sportTypes";

export interface TrainingTypeOption {
  value: string;
  label: string;
  hasExercises: boolean;
  forTeamSports?: boolean;
  forIndividualSports?: boolean;
  forSports?: string[]; // If specified, only show for these sports
  category?: string; // Category for grouping (e.g., "athle_sprint", "athle_haies")
}

// Category definitions for grouped display
export interface TrainingTypeCategory {
  key: string;
  label: string;
  forSports?: string[];
}

// All sport training categories for grouped display
export const SPORT_TRAINING_CATEGORIES: TrainingTypeCategory[] = [
  // Rugby
  { key: "rugby", label: "Rugby", forSports: ["rugby"] },
  // Football
  { key: "football", label: "Football", forSports: ["football"] },
  // Handball
  { key: "handball", label: "Handball", forSports: ["handball"] },
  // Volleyball
  { key: "volleyball", label: "Volleyball", forSports: ["volleyball"] },
  // Basketball
  { key: "basketball", label: "Basketball", forSports: ["basketball"] },
  // Tennis
  { key: "tennis", label: "Tennis", forSports: ["tennis"] },
  // Aviron
  { key: "aviron", label: "Aviron", forSports: ["aviron"] },
  // Judo
  { key: "judo", label: "Judo", forSports: ["judo"] },
  // Bowling
  { key: "bowling", label: "Bowling", forSports: ["bowling"] },
  // Padel
  { key: "padel", label: "Padel", forSports: ["padel"] },
  // Natation
  { key: "natation", label: "Natation", forSports: ["natation"] },
  // Ski / Sports de Glisse
  { key: "ski", label: "Sports de Glisse", forSports: ["ski"] },
  // Surf
  { key: "surf", label: "Surf", forSports: ["surf"] },
  // Triathlon
  { key: "triathlon", label: "Triathlon", forSports: ["triathlon"] },
  // CrossFit / Hyrox / Musculation categories
  { key: "crossfit_wod", label: "WOD / CrossFit", forSports: ["crossfit"] },
  { key: "crossfit_hyrox", label: "Hyrox / Fonctionnel", forSports: ["crossfit"] },
  { key: "crossfit_strength", label: "Force / Musculation", forSports: ["crossfit"] },
  { key: "crossfit_cardio", label: "Cardio / Endurance", forSports: ["crossfit"] },
  { key: "crossfit_skills", label: "Compétences / Gymnastique", forSports: ["crossfit"] },
  { key: "crossfit_classes", label: "Cours Spécialisés", forSports: ["crossfit"] },
  // Athletics categories
  { key: "athle_sprint", label: "Sprint / Vitesse", forSports: ["athletisme"] },
  { key: "athle_haies", label: "Haies", forSports: ["athletisme"] },
  { key: "athle_demifond", label: "Demi-fond / Fond", forSports: ["athletisme"] },
  { key: "athle_sauts", label: "Sauts", forSports: ["athletisme"] },
  { key: "athle_lancers", label: "Lancers", forSports: ["athletisme"] },
  { key: "athle_general", label: "Général / Polyvalent", forSports: ["athletisme"] },
  // Common to all sports
  { key: "common", label: "Commun", forSports: [] },
];

// Legacy alias for backwards compatibility
export const ATHLETISME_TRAINING_CATEGORIES = SPORT_TRAINING_CATEGORIES.filter(
  c => c.forSports?.includes("athletisme")
);

// Helper to extract base sport
function getBaseSport(sportType: string): string {
  const normalizedSport = sportType.toLowerCase();
  if (normalizedSport.startsWith('rugby')) return 'rugby';
  if (normalizedSport.startsWith('football')) return 'football';
  if (normalizedSport.startsWith('handball')) return 'handball';
  if (normalizedSport.startsWith('volleyball')) return 'volleyball';
  if (normalizedSport.startsWith('basketball')) return 'basketball';
  if (normalizedSport.startsWith('judo')) return 'judo';
  if (normalizedSport.startsWith('bowling')) return 'bowling';
  if (normalizedSport.startsWith('aviron')) return 'aviron';
  if (normalizedSport.startsWith('athletisme') || normalizedSport.startsWith('athlétisme')) return 'athletisme';
  if (normalizedSport.startsWith('crossfit')) return 'crossfit';
  if (normalizedSport.startsWith('padel')) return 'padel';
  if (normalizedSport.startsWith('natation')) return 'natation';
  if (normalizedSport.startsWith('surf')) return 'surf';
  if (normalizedSport.startsWith('ski') || normalizedSport.startsWith('snow')) return 'ski';
  if (normalizedSport.startsWith('triathlon')) return 'triathlon';
  if (normalizedSport.startsWith('tennis')) return 'tennis';
  return normalizedSport;
}

// All available training types
export const ALL_TRAINING_TYPES: TrainingTypeOption[] = [
  // Rugby specific (with category)
  { value: "collectif", label: "Collectif", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "tactique", label: "Tactique", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "opposition", label: "Opposition", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "touches", label: "Touches", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "melees", label: "Mêlées", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "placages", label: "Placages", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "jeu_au_pied", label: "Jeu au Pied", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "defence_line", label: "Ligne Défensive", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  { value: "attack_patterns", label: "Combinaisons Offensives", hasExercises: false, forSports: ["rugby"], category: "rugby" },
  
  // Football specific (with category)
  { value: "football_collectif", label: "Collectif", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_tactique", label: "Travail Tactique", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_possession", label: "Conservation/Possession", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_finition", label: "Finition", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_gardien", label: "Entraînement Gardiens", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_coup_pied", label: "Coups de pied arrêtés", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_opposition", label: "Opposition", hasExercises: false, forSports: ["football"], category: "football" },
  { value: "football_technique", label: "Technique Individuelle", hasExercises: false, forSports: ["football"], category: "football" },
  
  // Handball specific (with category)
  { value: "handball_collectif", label: "Collectif", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_attaque", label: "Travail Attaque", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_defense", label: "Travail Défense", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_tir", label: "Travail de Tir", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_gardien", label: "Entraînement Gardiens", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_contre_attaque", label: "Contre-attaque", hasExercises: false, forSports: ["handball"], category: "handball" },
  { value: "handball_tactique", label: "Tactique", hasExercises: false, forSports: ["handball"], category: "handball" },
  
  // Volleyball specific (with category)
  { value: "volleyball_collectif", label: "Collectif", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_service", label: "Travail de Service", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_reception", label: "Réception", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_attaque", label: "Attaque/Spike", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_block", label: "Travail au Bloc", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_defense", label: "Défense/Dig", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  { value: "volleyball_tactique", label: "Tactique", hasExercises: false, forSports: ["volleyball"], category: "volleyball" },
  
  // Basketball specific (with category)
  { value: "basketball_collectif", label: "Collectif", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_shoot", label: "Travail de Tir", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_dribble", label: "Dribble/Ballhandling", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_defense", label: "Travail Défensif", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_pick_roll", label: "Pick & Roll", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_transition", label: "Transition", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  { value: "basketball_tactique", label: "Tactique", hasExercises: false, forSports: ["basketball"], category: "basketball" },
  
  // Basketball 3x3 specific (FIBA ruleset - format court 10 min, possession 12s, check-ball)
  { value: "basket3x3_1c1", label: "1c1 / Isolation", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_2c2", label: "2c2 / Pick & Roll court", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_check_ball", label: "Check-ball / Remise en jeu arc", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_ressortie_arc", label: "Ressortie arc + tir", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_tir_apres_check", label: "Tir après check-ball", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_rebond_ressortie", label: "Rebond offensif + ressortie", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_endurance_lactique", label: "Endurance lactique 10 min", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_explosivite", label: "Explosivité / Vmax", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_recup_inter_match", label: "Récup. inter-match (tournoi)", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  { value: "basket3x3_vps_simulation", label: "Simulation match (VPS)", hasExercises: false, forSports: ["basketball_3x3"], category: "basketball" },
  
  // Aviron specific (with category)
  { value: "aviron_ergo", label: "Ergomètre (Indoor)", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  { value: "aviron_eau", label: "Sur l'eau (Outdoor)", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  { value: "aviron_technique", label: "Technique Bateau", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  { value: "aviron_sortie_longue", label: "Sortie Longue", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  { value: "aviron_fractionne", label: "Fractionné", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  { value: "aviron_cadence", label: "Travail Cadence", hasExercises: false, forSports: ["aviron"], category: "aviron" },
  
  // Judo specific (with category)
  { value: "judo_randori", label: "Randori", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_uchikomi", label: "Uchi-komi", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_nagekomi", label: "Nage-komi", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_newaza", label: "Ne-waza (Sol)", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_kata", label: "Kata", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_kumikata", label: "Kumi-kata (Préhension)", hasExercises: false, forSports: ["judo"], category: "judo" },
  { value: "judo_tokui_waza", label: "Tokui-waza (Spéciale)", hasExercises: false, forSports: ["judo"], category: "judo" },
  
  // Bowling specific (with category)
  { value: "bowling_practice", label: "Pratique Libre", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  { value: "bowling_technique", label: "Travail Technique", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  { value: "bowling_spare", label: "Entraînement Précision", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  { value: "bowling_game", label: "Parties d'Entraînement", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  { value: "bowling_approche", label: "Travail d'Approche", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  { value: "bowling_release", label: "Travail de Lâcher", hasExercises: false, forSports: ["bowling"], category: "bowling" },
  
  // CrossFit / Hyrox / Musculation specific - with categories
  // WOD / CrossFit
  { value: "crossfit_wod", label: "WOD (Workout of the Day)", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_amrap", label: "AMRAP", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_emom", label: "EMOM", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_fortime", label: "For Time", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_chipper", label: "Chipper", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_benchmark", label: "Benchmark / Hero WOD", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  { value: "crossfit_team", label: "Team WOD", hasExercises: true, forSports: ["crossfit"], category: "crossfit_wod" },
  
  // Hyrox / Fonctionnel
  { value: "crossfit_hyrox_sim", label: "Simulation Hyrox", hasExercises: true, forSports: ["crossfit"], category: "crossfit_hyrox" },
  { value: "crossfit_hyrox_run", label: "Running / Course", hasExercises: false, forSports: ["crossfit"], category: "crossfit_hyrox" },
  { value: "crossfit_hyrox_stations", label: "Travail Stations", hasExercises: true, forSports: ["crossfit"], category: "crossfit_hyrox" },
  { value: "crossfit_functional", label: "Fitness Fonctionnel", hasExercises: true, forSports: ["crossfit"], category: "crossfit_hyrox" },
  { value: "crossfit_hybride", label: "Entraînement Hybride", hasExercises: true, forSports: ["crossfit"], category: "crossfit_hyrox" },
  
  // Force / Musculation
  { value: "crossfit_strength", label: "Force / Strength", hasExercises: true, forSports: ["crossfit"], category: "crossfit_strength" },
  { value: "crossfit_bodybuilding", label: "Bodybuilding / Hypertrophie", hasExercises: true, forSports: ["crossfit"], category: "crossfit_strength" },
  { value: "crossfit_powerlifting", label: "Powerlifting", hasExercises: true, forSports: ["crossfit"], category: "crossfit_strength" },
  { value: "crossfit_halterophilie", label: "Haltérophilie", hasExercises: true, forSports: ["crossfit"], category: "crossfit_strength" },
  { value: "crossfit_accessoire", label: "Accessoires / Isolation", hasExercises: true, forSports: ["crossfit"], category: "crossfit_strength" },
  
  // Cardio / Endurance
  { value: "crossfit_cardio", label: "Cardio", hasExercises: false, forSports: ["crossfit"], category: "crossfit_cardio" },
  { value: "crossfit_row", label: "Rameur (RowErg)", hasExercises: false, forSports: ["crossfit"], category: "crossfit_cardio" },
  { value: "crossfit_bike", label: "Vélo (BikeErg / Assault)", hasExercises: false, forSports: ["crossfit"], category: "crossfit_cardio" },
  { value: "crossfit_ski", label: "SkiErg", hasExercises: false, forSports: ["crossfit"], category: "crossfit_cardio" },
  { value: "crossfit_run", label: "Course à pied", hasExercises: false, forSports: ["crossfit"], category: "crossfit_cardio" },
  { value: "crossfit_intervals", label: "Intervalles / HIIT", hasExercises: true, forSports: ["crossfit"], category: "crossfit_cardio" },
  
  // Compétences / Gymnastique
  { value: "crossfit_gymnastics", label: "Gymnastique", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_pullups", label: "Tractions / Pull-ups", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_handstand", label: "Handstand / HSPU", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_muscleup", label: "Muscle-ups", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_doubleunders", label: "Double Unders", hasExercises: false, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_skills", label: "Skill Work / Technique", hasExercises: false, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_pilates", label: "Pilates", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  { value: "crossfit_yoga", label: "Yoga / Mobilité", hasExercises: true, forSports: ["crossfit"], category: "crossfit_skills" },
  
  // Cours Spécialisés
  { value: "crossfit_kids", label: "Kids (6-12 ans)", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_teens", label: "Teens (13-17 ans)", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_baby_gym", label: "Baby Gym (3-5 ans)", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_seniors", label: "Seniors / Masters", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_prenatal", label: "Prénatal / Postnatal", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_debutant", label: "Initiation / Débutant", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_competition", label: "Prépa Compétition", hasExercises: true, forSports: ["crossfit"], category: "crossfit_classes" },
  { value: "crossfit_open_gym", label: "Open Gym", hasExercises: false, forSports: ["crossfit"], category: "crossfit_classes" },
  
  // Athlétisme specific - with categories
  // Sprint / Vitesse
  { value: "athle_vitesse", label: "Travail de Vitesse", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_departs", label: "Travail Départs (Blocs)", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_acceleration", label: "Accélération", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_vitesse_max", label: "Vitesse Maximale", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  { value: "athle_endurance_vitesse", label: "Endurance de Vitesse", hasExercises: false, forSports: ["athletisme"], category: "athle_sprint" },
  
  // Haies
  { value: "athle_haies", label: "Travail Haies", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  { value: "athle_rythme_haies", label: "Rythme Inter-haies", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  { value: "athle_haies_technique", label: "Technique de Passage", hasExercises: false, forSports: ["athletisme"], category: "athle_haies" },
  
  // Demi-fond / Fond
  { value: "athle_fartlek", label: "Fartlek", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_tempo_run", label: "Tempo Run", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_sortie_longue", label: "Sortie Longue (Endurance)", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_fractionne", label: "Fractionné / Intervalles", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_seuil", label: "Travail au Seuil", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_vma", label: "VMA / VO2max", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_cotes", label: "Travail en Côtes", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  { value: "athle_marche", label: "Technique Marche", hasExercises: false, forSports: ["athletisme"], category: "athle_demifond" },
  
  // Sauts
  { value: "athle_sauts_technique", label: "Technique de Saut", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_course_elan", label: "Course d'Élan", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_impulsion", label: "Travail d'Impulsion", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_pliometrie", label: "Pliométrie", hasExercises: true, forSports: ["athletisme"], category: "athle_sauts" },
  { value: "athle_perche_technique", label: "Technique Perche", hasExercises: false, forSports: ["athletisme"], category: "athle_sauts" },
  
  // Lancers
  { value: "athle_lancers_technique", label: "Technique de Lancer", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_rotation", label: "Travail de Rotation", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_release", label: "Travail de Lâcher", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_force_explosive", label: "Force Explosive", hasExercises: true, forSports: ["athletisme"], category: "athle_lancers" },
  { value: "athle_glisse", label: "Technique Glissé (Poids)", hasExercises: false, forSports: ["athletisme"], category: "athle_lancers" },
  
  // Tennis specific
  { value: "tennis_service", label: "Travail de Service", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_retour", label: "Travail de Retour", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_fond_court", label: "Fond de Court", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_volley", label: "Travail Volées / Filet", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_coup_droit", label: "Coup droit", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_revers", label: "Revers", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_tactique", label: "Tactique / Schémas de jeu", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_match", label: "Match d'Entraînement", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_physique_court", label: "Physique sur Court", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_jeu_double", label: "Jeu en Double", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_panier", label: "Panier de balles", hasExercises: false, forSports: ["tennis"], category: "tennis" },
  { value: "tennis_mental", label: "Préparation Mentale", hasExercises: false, forSports: ["tennis"], category: "tennis" },

  // Padel specific
  { value: "padel_match", label: "Match d'Entraînement", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_technique", label: "Technique (Bandeja, Víbora...)", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_volley", label: "Travail Volées", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_smash", label: "Travail Smash", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_service", label: "Travail Service", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_tactique", label: "Tactique / Jeu de Position", hasExercises: false, forSports: ["padel"], category: "padel" },
  { value: "padel_defense", label: "Travail Défensif (Lobs, Murs)", hasExercises: false, forSports: ["padel"], category: "padel" },

  // Natation specific
  { value: "natation_technique", label: "Technique de Nage", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_endurance", label: "Endurance / Fond", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_vitesse", label: "Vitesse / Sprint", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_fractionne", label: "Fractionné / Intervalles", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_departs", label: "Travail Départs", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_virages", label: "Travail Virages", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_coulees", label: "Coulées / Ondulations", hasExercises: false, forSports: ["natation"], category: "natation" },
  { value: "natation_eau_libre", label: "Eau Libre (Navigation)", hasExercises: false, forSports: ["natation"], category: "natation" },

  // Ski / Sports de Glisse specific
  { value: "ski_piste", label: "Entraînement sur Piste", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_slalom", label: "Tracé Slalom / Géant", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_vitesse", label: "Travail de Vitesse", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_technique", label: "Technique Ski / Snow", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_freestyle", label: "Freestyle / Park", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_fond_endurance", label: "Endurance (Ski de fond)", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_tir", label: "Tir (Biathlon)", hasExercises: false, forSports: ["ski"], category: "ski" },
  { value: "ski_hors_saison", label: "Hors-saison / Roller-ski", hasExercises: false, forSports: ["ski"], category: "ski" },

  // Surf specific
  { value: "surf_session_libre", label: "Session libre", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_technique", label: "Technique / Manœuvres", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_competition", label: "Heat / Compétition", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_paddle", label: "Rame / Paddling", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_apnea", label: "Apnée / Hold-down", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_video", label: "Analyse Vidéo Surf", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_dry_land", label: "Dry Land / Préparation hors eau", hasExercises: true, forSports: ["surf"], category: "surf" },
  { value: "surf_balance", label: "Équilibre / Balance Board", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_skate", label: "Surf-Skate", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_reading", label: "Lecture de vagues / Océanographie", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_big_wave_training", label: "Entraînement Big Wave", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_tube_riding", label: "Travail de Tube", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_aerial_training", label: "Travail Aérien", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_yoga_stretching", label: "Yoga / Stretching Surf", hasExercises: false, forSports: ["surf"], category: "surf" },
  { value: "surf_mental", label: "Préparation Mentale", hasExercises: false, forSports: ["surf"], category: "surf" },

  // Triathlon specific
  { value: "triathlon_natation", label: "Entraînement Natation", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_velo", label: "Entraînement Vélo", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_course", label: "Entraînement Course", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_enchainement", label: "Enchaînement (Brique)", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_transitions", label: "Travail Transitions", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_sortie_longue", label: "Sortie Longue", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_fractionne", label: "Fractionné / Intervalles", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },
  { value: "triathlon_simulation", label: "Simulation Course", hasExercises: false, forSports: ["triathlon"], category: "triathlon" },

  // Common to all sports (with category)
  { value: "tactique_general", label: "Tactique", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "collectif_general", label: "Collectif", hasExercises: false, forTeamSports: true, forIndividualSports: false, category: "common" },
  { value: "separe", label: "Séparé (par groupes)", hasExercises: false, forTeamSports: true, forIndividualSports: false, category: "common" },
  { value: "video", label: "Analyse Vidéo", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "individuel", label: "Entraînement Individuel", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "competition_training", label: "Simulation Compétition", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "technique_individuelle", label: "Technique Individuelle", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "physique", label: "Physique", hasExercises: true, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "musculation", label: "Musculation", hasExercises: true, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "reathlétisation", label: "Réathlétisation", hasExercises: true, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "vitesse_general", label: "Vitesse / Explosivité", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "endurance_general", label: "Endurance", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "souplesse_mobilite", label: "Souplesse / Mobilité", hasExercises: true, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "fitness_game", label: "Fitness Game", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "repos", label: "Repos", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "precision", label: "Entraînement Précision", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "test", label: "Test", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "echauffement", label: "Échauffement", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "recuperation", label: "Récupération Active", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "medical", label: "RDV Médical", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "video_analyse", label: "Analyse Vidéo", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
  { value: "reunion", label: "Réunion", hasExercises: false, forTeamSports: true, forIndividualSports: true, category: "common" },
];

// Get training types filtered by sport type
export function getTrainingTypesForSport(sportType: string | undefined): TrainingTypeOption[] {
  if (!sportType) {
    // Default to team sports if unknown
    return ALL_TRAINING_TYPES.filter(t => t.forTeamSports !== false && !t.forSports);
  }
  
  const baseSport = getBaseSport(sportType);
  const isIndividual = isIndividualSport(sportType);
  
  return ALL_TRAINING_TYPES.filter(t => {
    // If this type is for specific sports only
    if (t.forSports && t.forSports.length > 0) {
      // Match either the base sport OR the exact subtype (e.g. "basketball_3x3")
      return t.forSports.includes(baseSport) || t.forSports.includes(sportType.toLowerCase());
    }
    
    // Otherwise filter by team/individual
    if (isIndividual) {
      return t.forIndividualSports !== false;
    }
    
    return t.forTeamSports !== false;
  });
}

// Get training types for a sport grouped by category (for all sports)
export interface TrainingTypeGroup {
  category: TrainingTypeCategory;
  types: TrainingTypeOption[];
}

export function getTrainingTypesGrouped(sportType: string | undefined): TrainingTypeGroup[] {
  const types = getTrainingTypesForSport(sportType);
  const baseSport = sportType ? getBaseSport(sportType) : '';
  
  const groups: TrainingTypeGroup[] = [];
  
  // Get relevant categories for this sport
  const sportCategories = SPORT_TRAINING_CATEGORIES.filter(cat => {
    // If forSports is empty array, it's the common category
    if (!cat.forSports || cat.forSports.length === 0) return false;
    return cat.forSports.includes(baseSport);
  });
  
  // Group sport-specific types by category
  sportCategories.forEach(category => {
    const categoryTypes = types.filter(t => t.category === category.key);
    if (categoryTypes.length > 0) {
      groups.push({ category, types: categoryTypes });
    }
  });
  
  // Add common types (category: "common")
  const commonTypes = types.filter(t => t.category === 'common');
  if (commonTypes.length > 0) {
    groups.push({
      category: { key: 'common', label: 'Commun' },
      types: commonTypes
    });
  }
  
  return groups;
}

// Check if sport has grouped training types - now true for all sports
export function hasGroupedTrainingTypes(sportType: string | undefined): boolean {
  if (!sportType) return false;
  return true; // All sports now have grouped training types
}

// Get label for a training type
export function getTrainingTypeLabel(value: string): string {
  // First check exact match in ALL_TRAINING_TYPES
  const type = ALL_TRAINING_TYPES.find(t => t.value === value);
  if (type) return type.label;
  
  // Then check TRAINING_TYPE_LABELS
  if (TRAINING_TYPE_LABELS[value]) return TRAINING_TYPE_LABELS[value];
  
  // Fallback labels for legacy values
  const legacyLabels: Record<string, string> = {
    video: "Analyse Vidéo",
    video_analyse: "Analyse Vidéo",
    collectif_general: "Collectif Général",
    competition_training: "Simulation Compétition",
    technique_individuelle: "Technique Individuelle",
    reunion: "Réunion",
    medical: "Médical",
    individuel: "Individuel",
    autre: "Autre",
  };
  if (legacyLabels[value]) return legacyLabels[value];
  
  // Smart fallback: replace underscores, capitalize each word
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Check if training type has exercises
export function trainingTypeHasExercises(value: string): boolean {
  const type = ALL_TRAINING_TYPES.find(t => t.value === value);
  return type?.hasExercises || false;
}

// Training type colors (for calendars)
export const TRAINING_TYPE_COLORS: Record<string, string> = {
  collectif: "bg-training-collectif",
  tactique: "bg-blue-500",
  opposition: "bg-orange-600",
  video: "bg-purple-500",
  video_analyse: "bg-purple-500",
  individuel: "bg-training-collectif",
  competition_training: "bg-rose-400",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-sky-400",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  echauffement: "bg-yellow-400",
  recuperation: "bg-sky-400",
  reunion: "bg-indigo-500",
  medical: "bg-sky-500",
  match: "bg-rose-500",
  // Rugby specific
  touches: "bg-green-500",
  melees: "bg-purple-600",
  placages: "bg-red-600",
  jeu_au_pied: "bg-yellow-500",
  defence_line: "bg-blue-600",
  attack_patterns: "bg-orange-500",
  // Football specific
  football_collectif: "bg-green-600",
  football_tactique: "bg-blue-500",
  football_possession: "bg-green-500",
  football_finition: "bg-red-500",
  football_gardien: "bg-purple-500",
  football_coup_pied: "bg-orange-500",
  football_opposition: "bg-orange-600",
  football_technique: "bg-teal-500",
  // Handball specific
  handball_collectif: "bg-red-600",
  handball_attaque: "bg-red-500",
  handball_defense: "bg-blue-600",
  handball_tir: "bg-orange-500",
  handball_gardien: "bg-purple-500",
  handball_contre_attaque: "bg-amber-500",
  handball_tactique: "bg-blue-500",
  // Volleyball specific
  volleyball_collectif: "bg-yellow-600",
  volleyball_service: "bg-yellow-500",
  volleyball_reception: "bg-blue-400",
  volleyball_attaque: "bg-red-500",
  volleyball_block: "bg-purple-600",
  volleyball_defense: "bg-green-500",
  volleyball_tactique: "bg-blue-500",
  // Basketball specific
  basketball_collectif: "bg-orange-600",
  basketball_shoot: "bg-orange-500",
  basketball_dribble: "bg-blue-500",
  basketball_defense: "bg-red-600",
  basketball_pick_roll: "bg-purple-500",
  basketball_transition: "bg-amber-500",
  basketball_tactique: "bg-blue-600",
  // Basketball 3x3 specific (FIBA)
  basket3x3_1c1: "bg-orange-700",
  basket3x3_2c2: "bg-orange-600",
  basket3x3_check_ball: "bg-amber-600",
  basket3x3_ressortie_arc: "bg-yellow-600",
  basket3x3_tir_apres_check: "bg-orange-500",
  basket3x3_rebond_ressortie: "bg-amber-700",
  basket3x3_endurance_lactique: "bg-red-700",
  basket3x3_explosivite: "bg-pink-600",
  basket3x3_recup_inter_match: "bg-emerald-600",
  basket3x3_vps_simulation: "bg-purple-600",
  // Aviron specific
  aviron_ergo: "bg-blue-400",
  aviron_eau: "bg-cyan-500",
  aviron_technique: "bg-teal-400",
  aviron_sortie_longue: "bg-blue-600",
  aviron_fractionne: "bg-indigo-500",
  aviron_cadence: "bg-violet-500",
  // Judo specific
  judo_randori: "bg-red-500",
  judo_uchikomi: "bg-orange-500",
  judo_nagekomi: "bg-yellow-500",
  judo_newaza: "bg-purple-500",
  judo_kata: "bg-pink-500",
  judo_kumikata: "bg-teal-500",
  judo_tokui_waza: "bg-rose-500",
  // Bowling specific
  bowling_practice: "bg-emerald-500",
  bowling_technique: "bg-teal-500",
  bowling_spare: "bg-lime-500",
  bowling_game: "bg-green-600",
  bowling_approche: "bg-cyan-500",
  bowling_release: "bg-blue-500",
  // CrossFit / Hyrox / Musculation specific - WOD
  crossfit_wod: "bg-orange-500",
  crossfit_amrap: "bg-orange-600",
  crossfit_emom: "bg-amber-500",
  crossfit_fortime: "bg-red-500",
  crossfit_chipper: "bg-rose-500",
  crossfit_benchmark: "bg-rose-600",
  crossfit_team: "bg-orange-400",
  // CrossFit - Hyrox
  crossfit_hyrox_sim: "bg-purple-600",
  crossfit_hyrox_run: "bg-purple-500",
  crossfit_hyrox_stations: "bg-violet-500",
  crossfit_functional: "bg-indigo-500",
  crossfit_hybride: "bg-fuchsia-500",
  // CrossFit - Strength
  crossfit_strength: "bg-slate-600",
  crossfit_bodybuilding: "bg-slate-500",
  crossfit_powerlifting: "bg-gray-600",
  crossfit_halterophilie: "bg-zinc-600",
  crossfit_accessoire: "bg-stone-500",
  // CrossFit - Cardio
  crossfit_cardio: "bg-sky-500",
  crossfit_row: "bg-sky-600",
  crossfit_bike: "bg-cyan-500",
  crossfit_ski: "bg-teal-500",
  crossfit_run: "bg-emerald-500",
  crossfit_intervals: "bg-lime-500",
  // CrossFit - Skills
  crossfit_gymnastics: "bg-pink-500",
  crossfit_pullups: "bg-pink-600",
  crossfit_handstand: "bg-fuchsia-600",
  crossfit_muscleup: "bg-purple-500",
  crossfit_doubleunders: "bg-violet-600",
  crossfit_skills: "bg-indigo-400",
  crossfit_pilates: "bg-rose-400",
  crossfit_yoga: "bg-green-400",
  // CrossFit - Classes
  crossfit_kids: "bg-yellow-400",
  crossfit_teens: "bg-yellow-500",
  crossfit_baby_gym: "bg-amber-400",
  crossfit_seniors: "bg-blue-400",
  crossfit_prenatal: "bg-pink-400",
  crossfit_debutant: "bg-green-500",
  crossfit_competition: "bg-red-600",
  crossfit_open_gym: "bg-gray-400",
  // Athlétisme specific - Sprint
  athle_vitesse: "bg-red-500",
  athle_departs: "bg-red-600",
  athle_acceleration: "bg-red-400",
  athle_vitesse_max: "bg-red-700",
  athle_endurance_vitesse: "bg-rose-500",
  // Athlétisme - Haies
  athle_haies: "bg-yellow-500",
  athle_rythme_haies: "bg-yellow-600",
  athle_haies_technique: "bg-yellow-400",
  // Athlétisme - Demi-fond/Fond
  athle_fartlek: "bg-green-500",
  athle_tempo_run: "bg-emerald-500",
  athle_sortie_longue: "bg-teal-500",
  athle_fractionne: "bg-cyan-500",
  athle_seuil: "bg-blue-500",
  athle_vma: "bg-indigo-500",
  athle_cotes: "bg-slate-500",
  athle_marche: "bg-green-600",
  // Athlétisme - Sauts
  athle_sauts_technique: "bg-purple-500",
  athle_course_elan: "bg-violet-500",
  athle_impulsion: "bg-fuchsia-500",
  athle_pliometrie: "bg-pink-500",
  athle_perche_technique: "bg-purple-600",
  // Athlétisme - Lancers
  athle_lancers_technique: "bg-orange-500",
  athle_rotation: "bg-orange-600",
  athle_release: "bg-amber-500",
  athle_force_explosive: "bg-rose-600",
  athle_glisse: "bg-orange-400",
  // Athlétisme - Général
  athle_coordination: "bg-sky-500",
  athle_mobilite: "bg-lime-500",
  athle_combines: "bg-gradient-to-r from-purple-500 to-pink-500",
  athle_ppg: "bg-gray-500",
  // Tennis specific
  tennis_service: "bg-green-500",
  tennis_retour: "bg-blue-500",
  tennis_fond_court: "bg-emerald-500",
  tennis_volley: "bg-orange-500",
  tennis_coup_droit: "bg-red-500",
  tennis_revers: "bg-purple-500",
  tennis_tactique: "bg-indigo-500",
  tennis_match: "bg-rose-500",
  tennis_physique_court: "bg-amber-500",
  tennis_jeu_double: "bg-teal-500",
  tennis_panier: "bg-lime-500",
  tennis_mental: "bg-violet-500",
  // Precision (all sports)
  precision: "bg-lime-500",
  // Default for custom types
  _default: "bg-gray-500",
};

// Get color for a training type (with fallback for custom types)
export function getTrainingTypeColor(value: string): string {
  return TRAINING_TYPE_COLORS[value] || TRAINING_TYPE_COLORS._default;
}

// Training type labels mapping (for display)
export const TRAINING_TYPE_LABELS: Record<string, string> = {
  collectif: "Collectif",
  tactique: "Tactique",
  opposition: "Opposition",
  video: "Analyse Vidéo",
  individuel: "Individuel",
  competition_training: "Simulation Compétition",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  collectif_general: "Collectif Général",
  reunion: "Réunion",
  medical: "Médical",
  repos: "Repos",
  precision: "Entraînement Précision",
  test: "Test",
  video_analyse: "Analyse Vidéo",
  // Football specific
  football_tactique: "Travail Tactique",
  football_possession: "Conservation/Possession",
  football_finition: "Finition",
  football_gardien: "Entraînement Gardiens",
  football_coup_pied: "Coups de pied arrêtés",
  // Handball specific
  handball_attaque: "Travail Attaque",
  handball_defense: "Travail Défense",
  handball_tir: "Travail de Tir",
  handball_gardien: "Entraînement Gardiens",
  handball_contre_attaque: "Contre-attaque",
  // Volleyball specific
  volleyball_service: "Travail de Service",
  volleyball_reception: "Réception",
  volleyball_attaque: "Attaque/Spike",
  volleyball_block: "Travail au Bloc",
  volleyball_defense: "Défense/Dig",
  // Basketball specific
  basketball_shoot: "Travail de Tir",
  basketball_dribble: "Dribble/Ballhandling",
  basketball_defense: "Travail Défensif",
  basketball_pick_roll: "Pick & Roll",
  basketball_transition: "Transition",
  // Basketball 3x3 specific (FIBA)
  basket3x3_1c1: "1c1 / Isolation",
  basket3x3_2c2: "2c2 / Pick & Roll court",
  basket3x3_check_ball: "Check-ball / Remise arc",
  basket3x3_ressortie_arc: "Ressortie arc + tir",
  basket3x3_tir_apres_check: "Tir après check-ball",
  basket3x3_rebond_ressortie: "Rebond off. + ressortie",
  basket3x3_endurance_lactique: "Endurance lactique 10 min",
  basket3x3_explosivite: "Explosivité / Vmax",
  basket3x3_recup_inter_match: "Récup. inter-match",
  basket3x3_vps_simulation: "Simulation match (VPS)",
  // Aviron specific
  aviron_ergo: "Ergomètre (Indoor)",
  aviron_eau: "Sur l'eau (Outdoor)",
  aviron_technique: "Technique Bateau",
  aviron_sortie_longue: "Sortie Longue",
  aviron_fractionne: "Fractionné",
  // Judo specific
  judo_randori: "Randori",
  judo_uchikomi: "Uchi-komi",
  judo_nagekomi: "Nage-komi",
  judo_newaza: "Ne-waza (Sol)",
  judo_kata: "Kata",
  // Bowling specific
  bowling_practice: "Pratique Libre",
  bowling_technique: "Travail Technique",
  bowling_spare: "Bowling Spare",
  bowling_game: "Parties d'Entraînement",
  // Athlétisme specific - Sprint
  athle_vitesse: "Travail de Vitesse",
  athle_departs: "Travail Départs (Blocs)",
  athle_acceleration: "Accélération",
  athle_vitesse_max: "Vitesse Maximale",
  athle_endurance_vitesse: "Endurance de Vitesse",
  // Athlétisme - Haies
  athle_haies: "Travail Haies",
  athle_rythme_haies: "Rythme Inter-haies",
  athle_haies_technique: "Technique de Passage",
  // Athlétisme - Demi-fond/Fond
  athle_fartlek: "Fartlek",
  athle_tempo_run: "Tempo Run",
  athle_sortie_longue: "Sortie Longue (Endurance)",
  athle_fractionne: "Fractionné / Intervalles",
  athle_seuil: "Travail au Seuil",
  athle_vma: "VMA / VO2max",
  athle_cotes: "Travail en Côtes",
  athle_marche: "Technique Marche",
  // Athlétisme - Sauts
  athle_sauts_technique: "Technique de Saut",
  athle_course_elan: "Course d'Élan",
  athle_impulsion: "Travail d'Impulsion",
  athle_pliometrie: "Pliométrie",
  athle_perche_technique: "Technique Perche",
  // Athlétisme - Lancers
  athle_lancers_technique: "Technique de Lancer",
  athle_rotation: "Travail de Rotation",
  athle_release: "Travail de Lâcher",
  athle_force_explosive: "Force Explosive",
  athle_glisse: "Technique Glissé (Poids)",
  // Athlétisme - Général
  athle_coordination: "Coordination / Gammes",
  athle_mobilite: "Mobilité Spécifique",
  athle_combines: "Épreuves Combinées",
  athle_ppg: "PPG (Prépa Physique Générale)",
  // Tennis specific
  tennis_service: "Travail de Service",
  tennis_retour: "Travail de Retour",
  tennis_fond_court: "Fond de Court",
  tennis_volley: "Volées / Filet",
  tennis_coup_droit: "Coup droit",
  tennis_revers: "Revers",
  tennis_tactique: "Tactique",
  tennis_match: "Match d'Entraînement",
  tennis_physique_court: "Physique sur Court",
  tennis_jeu_double: "Jeu en Double",
  tennis_panier: "Panier de balles",
  tennis_mental: "Préparation Mentale",
};
