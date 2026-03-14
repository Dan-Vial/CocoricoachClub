// Action types configurés par sport pour l'analyse vidéo

export interface ActionType {
  value: string;
  label: string;
  category: "offensive" | "defensive" | "physical" | "set_piece" | "transition" | "other";
}

// Actions communes à tous les sports
const COMMON_ACTIONS: ActionType[] = [
  { value: "sprint", label: "Sprint", category: "physical" },
  { value: "acceleration", label: "Accélération", category: "physical" },
  { value: "high_intensity_run", label: "Course haute intensité", category: "physical" },
  { value: "duel", label: "Duel", category: "physical" },
  { value: "other", label: "Autre", category: "other" },
];

// Actions spécifiques Rugby - ENRICHIES
const RUGBY_ACTIONS: ActionType[] = [
  // Offensive
  { value: "try", label: "Essai", category: "offensive" },
  { value: "pass", label: "Passe décisive", category: "offensive" },
  { value: "line_break", label: "Franchissement", category: "offensive" },
  { value: "offload", label: "Offload", category: "offensive" },
  { value: "kick_offensive", label: "Jeu au pied offensif", category: "offensive" },
  { value: "grubber", label: "Petit-pont / Grubber", category: "offensive" },
  { value: "chip_kick", label: "Coup de pied par-dessus", category: "offensive" },
  { value: "drop_goal", label: "Drop", category: "offensive" },
  { value: "penalty_kick", label: "Pénalité (tir)", category: "offensive" },
  { value: "conversion", label: "Transformation", category: "offensive" },
  { value: "attack_pattern", label: "Combinaison offensive", category: "offensive" },
  
  // Defensive
  { value: "tackle", label: "Plaquage", category: "defensive" },
  { value: "dominant_tackle", label: "Plaquage dominant", category: "defensive" },
  { value: "tackle_missed", label: "Plaquage manqué", category: "defensive" },
  { value: "turnover", label: "Turnover gagné", category: "defensive" },
  { value: "turnover_lost", label: "Turnover perdu", category: "defensive" },
  { value: "jackal", label: "Grattage", category: "defensive" },
  { value: "defensive_line", label: "Ligne défensive", category: "defensive" },
  { value: "blitz_defense", label: "Défense en blitz", category: "defensive" },
  
  // Set pieces
  { value: "lineout_won", label: "Touche gagnée", category: "set_piece" },
  { value: "lineout_lost", label: "Touche perdue", category: "set_piece" },
  { value: "lineout_steal", label: "Touche volée", category: "set_piece" },
  { value: "lineout_variation", label: "Touche - combinaison", category: "set_piece" },
  { value: "scrum_won", label: "Mêlée gagnée", category: "set_piece" },
  { value: "scrum_lost", label: "Mêlée perdue", category: "set_piece" },
  { value: "scrum_penalty", label: "Mêlée - pénalité", category: "set_piece" },
  { value: "scrum_pushover", label: "Mêlée - essai en poussée", category: "set_piece" },
  { value: "restart_won", label: "Renvoi gagné", category: "set_piece" },
  { value: "restart_lost", label: "Renvoi perdu", category: "set_piece" },
  { value: "maul", label: "Maul", category: "set_piece" },
  { value: "ruck", label: "Ruck", category: "set_piece" },
  
  // Transition
  { value: "counter_attack", label: "Contre-attaque", category: "transition" },
  { value: "kick_chase", label: "Montée sur jeu au pied", category: "transition" },
  { value: "exit_play", label: "Sortie de camp", category: "transition" },
];

// Actions spécifiques Football - ENRICHIES
const FOOTBALL_ACTIONS: ActionType[] = [
  // Offensive
  { value: "goal", label: "But", category: "offensive" },
  { value: "shot_on_target", label: "Tir cadré", category: "offensive" },
  { value: "shot_off_target", label: "Tir non cadré", category: "offensive" },
  { value: "assist", label: "Passe décisive", category: "offensive" },
  { value: "key_pass", label: "Passe clé", category: "offensive" },
  { value: "through_ball", label: "Passe en profondeur", category: "offensive" },
  { value: "dribble_success", label: "Dribble réussi", category: "offensive" },
  { value: "dribble_failed", label: "Dribble raté", category: "offensive" },
  { value: "cross", label: "Centre", category: "offensive" },
  { value: "cross_success", label: "Centre réussi", category: "offensive" },
  { value: "header", label: "Tête", category: "offensive" },
  { value: "one_two", label: "Une-deux", category: "offensive" },
  { value: "combination", label: "Combinaison", category: "offensive" },
  
  // Defensive
  { value: "tackle_football", label: "Tacle", category: "defensive" },
  { value: "tackle_won", label: "Tacle gagné", category: "defensive" },
  { value: "tackle_lost", label: "Tacle perdu", category: "defensive" },
  { value: "interception", label: "Interception", category: "defensive" },
  { value: "clearance", label: "Dégagement", category: "defensive" },
  { value: "block", label: "Contre (tir)", category: "defensive" },
  { value: "save", label: "Arrêt", category: "defensive" },
  { value: "save_spectacular", label: "Arrêt réflexe", category: "defensive" },
  { value: "aerial_duel_won", label: "Duel aérien gagné", category: "defensive" },
  { value: "aerial_duel_lost", label: "Duel aérien perdu", category: "defensive" },
  { value: "pressing", label: "Pressing", category: "defensive" },
  { value: "recovery", label: "Récupération", category: "defensive" },
  
  // Set pieces
  { value: "corner", label: "Corner", category: "set_piece" },
  { value: "corner_goal", label: "But sur corner", category: "set_piece" },
  { value: "free_kick", label: "Coup franc", category: "set_piece" },
  { value: "free_kick_goal", label: "But sur coup franc", category: "set_piece" },
  { value: "penalty", label: "Penalty", category: "set_piece" },
  { value: "penalty_scored", label: "Penalty marqué", category: "set_piece" },
  { value: "penalty_missed", label: "Penalty manqué", category: "set_piece" },
  { value: "penalty_saved", label: "Penalty arrêté", category: "set_piece" },
  { value: "throw_in", label: "Touche", category: "set_piece" },
  { value: "goal_kick", label: "Coup de pied de but", category: "set_piece" },
  
  // Transition
  { value: "counter_attack_football", label: "Contre-attaque", category: "transition" },
  { value: "transition_attack", label: "Transition offensive", category: "transition" },
  { value: "transition_defense", label: "Repli défensif", category: "transition" },
  { value: "offside", label: "Hors-jeu", category: "transition" },
];

// Actions spécifiques Aviron
const AVIRON_ACTIONS: ActionType[] = [
  { value: "start", label: "Départ", category: "offensive" },
  { value: "power_stroke", label: "Coup de rame puissant", category: "physical" },
  { value: "finish", label: "Arrivée", category: "offensive" },
  { value: "technique", label: "Point technique", category: "other" },
  { value: "rhythm_change", label: "Changement de rythme", category: "transition" },
  { value: "overtake", label: "Dépassement", category: "offensive" },
];

// Actions spécifiques Basketball
const BASKETBALL_ACTIONS: ActionType[] = [
  { value: "basket", label: "Panier", category: "offensive" },
  { value: "three_pointer", label: "3 points", category: "offensive" },
  { value: "layup", label: "Layup", category: "offensive" },
  { value: "dunk", label: "Dunk", category: "offensive" },
  { value: "assist_basket", label: "Passe décisive", category: "offensive" },
  { value: "rebound_off", label: "Rebond offensif", category: "offensive" },
  { value: "rebound_def", label: "Rebond défensif", category: "defensive" },
  { value: "block", label: "Contre", category: "defensive" },
  { value: "steal", label: "Interception", category: "defensive" },
  { value: "fast_break", label: "Contre-attaque", category: "transition" },
  { value: "pick_and_roll", label: "Pick & Roll", category: "offensive" },
  { value: "free_throw", label: "Lancer franc", category: "set_piece" },
];

// Actions spécifiques Handball
const HANDBALL_ACTIONS: ActionType[] = [
  { value: "goal_handball", label: "But", category: "offensive" },
  { value: "shot_handball", label: "Tir", category: "offensive" },
  { value: "assist_handball", label: "Passe décisive", category: "offensive" },
  { value: "breakthrough", label: "Percée", category: "offensive" },
  { value: "wing_shot", label: "Tir ailier", category: "offensive" },
  { value: "pivot_action", label: "Action pivot", category: "offensive" },
  { value: "block_handball", label: "Bloc", category: "defensive" },
  { value: "interception_handball", label: "Interception", category: "defensive" },
  { value: "save_handball", label: "Arrêt gardien", category: "defensive" },
  { value: "fast_break_handball", label: "Contre-attaque", category: "transition" },
  { value: "seven_meter", label: "Jet de 7m", category: "set_piece" },
  { value: "free_throw_handball", label: "Coup franc", category: "set_piece" },
];

// Actions spécifiques Volleyball
const VOLLEYBALL_ACTIONS: ActionType[] = [
  { value: "kill", label: "Point gagnant", category: "offensive" },
  { value: "spike", label: "Smash", category: "offensive" },
  { value: "set_volley", label: "Passe", category: "offensive" },
  { value: "ace", label: "Ace (service gagnant)", category: "offensive" },
  { value: "block_volley", label: "Bloc", category: "defensive" },
  { value: "dig", label: "Défense basse", category: "defensive" },
  { value: "receive", label: "Réception", category: "defensive" },
  { value: "serve", label: "Service", category: "set_piece" },
  { value: "quick_attack", label: "Attaque rapide", category: "offensive" },
  { value: "pipe", label: "Pipe (attaque arrière)", category: "offensive" },
];

// Actions spécifiques Athlétisme
const ATHLETISME_ACTIONS: ActionType[] = [
  // Technique
  { value: "start_block", label: "Départ en starting-blocks", category: "offensive" },
  { value: "race_phase", label: "Phase de course", category: "physical" },
  { value: "finish_line", label: "Arrivée", category: "offensive" },
  { value: "hurdle_technique", label: "Passage de haie", category: "offensive" },
  { value: "hurdle_contact", label: "Contact haie", category: "other" },
  { value: "throw_technique", label: "Technique de lancer", category: "offensive" },
  { value: "approach_run", label: "Course d'élan", category: "physical" },
  { value: "takeoff", label: "Impulsion / Envol", category: "offensive" },
  { value: "landing", label: "Réception", category: "offensive" },
  { value: "flight_phase", label: "Phase de vol", category: "offensive" },
  { value: "release", label: "Lâcher / Release", category: "offensive" },
  { value: "rotation", label: "Rotation", category: "physical" },
  // Relay
  { value: "baton_exchange", label: "Passage de relais", category: "transition" },
  { value: "relay_zone", label: "Zone de transmission", category: "transition" },
  // Endurance
  { value: "pacing", label: "Gestion d'allure", category: "physical" },
  { value: "kick_finish", label: "Finish / Kick final", category: "offensive" },
  { value: "split_analysis", label: "Analyse des splits", category: "other" },
  // General
  { value: "warm_up", label: "Échauffement", category: "other" },
  { value: "technical_drill", label: "Éducatif technique", category: "other" },
  { value: "foul", label: "Faux départ / Faute", category: "other" },
];

// Actions spécifiques Judo
const JUDO_ACTIONS: ActionType[] = [
  { value: "ippon", label: "Ippon", category: "offensive" },
  { value: "waza_ari", label: "Waza-ari", category: "offensive" },
  { value: "yuko", label: "Yuko", category: "offensive" },
  { value: "throw_technique", label: "Technique de projection", category: "offensive" },
  { value: "osae_komi", label: "Immobilisation (Osae-komi)", category: "offensive" },
  { value: "shime_waza", label: "Étranglement (Shime-waza)", category: "offensive" },
  { value: "kansetsu_waza", label: "Clé articulaire (Kansetsu-waza)", category: "offensive" },
  { value: "grip_fight", label: "Kumi-kata (prise de garde)", category: "defensive" },
  { value: "counter_throw", label: "Contre-prise", category: "defensive" },
  { value: "escape", label: "Sortie d'immobilisation", category: "defensive" },
  { value: "ne_waza", label: "Travail au sol (Ne-waza)", category: "offensive" },
  { value: "transition_stand_ground", label: "Transition debout/sol", category: "transition" },
  { value: "shido", label: "Shido (pénalité)", category: "other" },
  { value: "golden_score", label: "Golden Score", category: "other" },
  { value: "randori", label: "Randori", category: "other" },
];

// Actions spécifiques Natation
const NATATION_ACTIONS: ActionType[] = [
  { value: "start_dive", label: "Plongeon de départ", category: "offensive" },
  { value: "turn", label: "Virage", category: "offensive" },
  { value: "underwater_phase", label: "Phase sous-marine (coulée)", category: "offensive" },
  { value: "stroke_technique", label: "Technique de nage", category: "physical" },
  { value: "breathing_pattern", label: "Pattern de respiration", category: "physical" },
  { value: "finish_touch", label: "Touche d'arrivée", category: "offensive" },
  { value: "split_analysis", label: "Analyse des passages", category: "other" },
  { value: "relay_exchange", label: "Relais - échange", category: "transition" },
  { value: "pacing_swim", label: "Gestion d'allure", category: "physical" },
  { value: "kick_drill", label: "Travail de battements", category: "other" },
  { value: "pull_drill", label: "Travail de bras", category: "other" },
];

// Actions spécifiques Ski / Sports de Glisse
const SKI_ACTIONS: ActionType[] = [
  { value: "start_ski", label: "Départ", category: "offensive" },
  { value: "gate_passage", label: "Passage de porte", category: "offensive" },
  { value: "turn_technique", label: "Technique de virage", category: "physical" },
  { value: "glide_phase", label: "Phase de glisse", category: "physical" },
  { value: "jump_ski", label: "Saut / Bosse", category: "offensive" },
  { value: "trick", label: "Figure / Trick (Freestyle)", category: "offensive" },
  { value: "landing_ski", label: "Réception", category: "offensive" },
  { value: "shooting_biathlon", label: "Tir (Biathlon)", category: "set_piece" },
  { value: "transition_ski", label: "Transition (changement de section)", category: "transition" },
  { value: "finish_ski", label: "Arrivée", category: "offensive" },
  { value: "fall", label: "Chute", category: "other" },
  { value: "course_analysis", label: "Analyse de tracé", category: "other" },
];

// Actions spécifiques Triathlon
const TRIATHLON_ACTIONS: ActionType[] = [
  { value: "swim_start", label: "Départ natation", category: "offensive" },
  { value: "swim_technique", label: "Technique natation", category: "physical" },
  { value: "t1_transition", label: "Transition T1 (Swim→Bike)", category: "transition" },
  { value: "bike_climb", label: "Montée vélo", category: "physical" },
  { value: "bike_descent", label: "Descente vélo", category: "physical" },
  { value: "bike_draft", label: "Drafting vélo", category: "offensive" },
  { value: "t2_transition", label: "Transition T2 (Bike→Run)", category: "transition" },
  { value: "run_pacing", label: "Gestion d'allure course", category: "physical" },
  { value: "run_finish", label: "Finish course à pied", category: "offensive" },
  { value: "nutrition_point", label: "Ravitaillement", category: "other" },
  { value: "mechanical", label: "Problème mécanique", category: "other" },
];

// Actions spécifiques Bowling
const BOWLING_ACTIONS: ActionType[] = [
  { value: "strike", label: "Strike", category: "offensive" },
  { value: "spare", label: "Spare", category: "offensive" },
  { value: "split_conversion", label: "Conversion de split", category: "offensive" },
  { value: "approach", label: "Approche", category: "physical" },
  { value: "release_bowling", label: "Lâcher de balle", category: "offensive" },
  { value: "ball_motion", label: "Trajectoire de balle", category: "other" },
  { value: "lane_adjustment", label: "Ajustement de ligne", category: "other" },
  { value: "spare_attempt", label: "Tentative de spare", category: "offensive" },
  { value: "gutter", label: "Gouttière", category: "other" },
];

// Actions spécifiques Padel
const PADEL_ACTIONS: ActionType[] = [
  { value: "serve_padel", label: "Service", category: "set_piece" },
  { value: "return_padel", label: "Retour de service", category: "offensive" },
  { value: "bajada", label: "Bajada", category: "offensive" },
  { value: "bandeja", label: "Bandeja", category: "offensive" },
  { value: "vibora", label: "Víbora", category: "offensive" },
  { value: "smash_padel", label: "Smash", category: "offensive" },
  { value: "lob", label: "Lob", category: "offensive" },
  { value: "chiquita", label: "Chiquita", category: "offensive" },
  { value: "volley_padel", label: "Volée", category: "offensive" },
  { value: "wall_shot", label: "Sortie de vitre", category: "defensive" },
  { value: "counter_padel", label: "Contre-attaque", category: "transition" },
  { value: "point_won", label: "Point gagné", category: "offensive" },
  { value: "point_lost", label: "Point perdu", category: "other" },
  { value: "unforced_error", label: "Faute directe", category: "other" },
];

export const ACTION_CATEGORIES = [
  { value: "offensive", label: "Offensive" },
  { value: "defensive", label: "Défensive" },
  { value: "physical", label: "Physique" },
  { value: "set_piece", label: "Phase statique" },
  { value: "transition", label: "Transition" },
  { value: "other", label: "Autre" },
];

export function getActionTypesForSport(sportType?: string): ActionType[] {
  if (!sportType) return COMMON_ACTIONS;
  
  const sport = sportType.toLowerCase();
  
  if (sport.includes("rugby") || sport === "xv" || sport === "7s" || sport === "xiii") {
    return [...COMMON_ACTIONS, ...RUGBY_ACTIONS];
  }
  
  if (sport.includes("football") || sport.includes("soccer")) {
    return [...COMMON_ACTIONS, ...FOOTBALL_ACTIONS];
  }
  
  if (sport.includes("aviron") || sport.includes("rowing")) {
    return [...COMMON_ACTIONS, ...AVIRON_ACTIONS];
  }
  
  if (sport.includes("basketball") || sport.includes("basket")) {
    return [...COMMON_ACTIONS, ...BASKETBALL_ACTIONS];
  }
  
  if (sport.includes("handball") || sport.includes("hand")) {
    return [...COMMON_ACTIONS, ...HANDBALL_ACTIONS];
  }
  
  if (sport.includes("volleyball") || sport.includes("volley")) {
    return [...COMMON_ACTIONS, ...VOLLEYBALL_ACTIONS];
  }

  if (sport.includes("athletisme") || sport.includes("athlétisme")) {
    return [...COMMON_ACTIONS, ...ATHLETISME_ACTIONS];
  }

  if (sport.includes("judo")) {
    return [...COMMON_ACTIONS, ...JUDO_ACTIONS];
  }

  if (sport.includes("natation") || sport.includes("swimming")) {
    return [...COMMON_ACTIONS, ...NATATION_ACTIONS];
  }

  if (sport.includes("ski") || sport.includes("snow") || sport.includes("biathlon")) {
    return [...COMMON_ACTIONS, ...SKI_ACTIONS];
  }

  if (sport.includes("triathlon")) {
    return [...COMMON_ACTIONS, ...TRIATHLON_ACTIONS];
  }

  if (sport.includes("bowling")) {
    return [...COMMON_ACTIONS, ...BOWLING_ACTIONS];
  }

  if (sport.includes("padel")) {
    return [...COMMON_ACTIONS, ...PADEL_ACTIONS];
  }
  
  return COMMON_ACTIONS;
}

export function getActionTypeLabel(actionType: string): string {
  const allActions = [
    ...COMMON_ACTIONS,
    ...RUGBY_ACTIONS,
    ...FOOTBALL_ACTIONS,
    ...AVIRON_ACTIONS,
    ...BASKETBALL_ACTIONS,
    ...HANDBALL_ACTIONS,
    ...VOLLEYBALL_ACTIONS,
    ...ATHLETISME_ACTIONS,
    ...JUDO_ACTIONS,
    ...NATATION_ACTIONS,
    ...SKI_ACTIONS,
    ...TRIATHLON_ACTIONS,
    ...BOWLING_ACTIONS,
    ...PADEL_ACTIONS,
  ];
  
  return allActions.find(a => a.value === actionType)?.label || actionType;
}

export function getActionCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    offensive: "bg-green-500/10 text-green-600",
    defensive: "bg-red-500/10 text-red-600",
    physical: "bg-blue-500/10 text-blue-600",
    set_piece: "bg-purple-500/10 text-purple-600",
    transition: "bg-yellow-500/10 text-yellow-600",
    other: "bg-muted text-muted-foreground",
  };
  return colors[category || "other"] || colors.other;
}

// Stats spécifiques à afficher par sport dans ClipStatsPanel
export function getMatchStatsKeysForSport(sportType?: string): { key: string; label: string }[] {
  if (!sportType) return [];
  
  const sport = sportType.toLowerCase();
  
  if (sport.includes("rugby")) {
    return [
      { key: "tries", label: "Essais" },
      { key: "tackles", label: "Plaquages" },
      { key: "carries", label: "Courses" },
      { key: "passes", label: "Passes" },
    ];
  }
  
  if (sport.includes("football")) {
    return [
      { key: "goals", label: "Buts" },
      { key: "shots", label: "Tirs" },
      { key: "assists", label: "Passes D." },
      { key: "tackles", label: "Tacles" },
    ];
  }
  
  if (sport.includes("basketball")) {
    return [
      { key: "points", label: "Points" },
      { key: "rebounds", label: "Rebonds" },
      { key: "assists", label: "Passes D." },
      { key: "steals", label: "Interc." },
    ];
  }
  
  if (sport.includes("handball")) {
    return [
      { key: "goals", label: "Buts" },
      { key: "shots", label: "Tirs" },
      { key: "assists", label: "Passes D." },
      { key: "saves", label: "Arrêts" },
    ];
  }
  
  if (sport.includes("volleyball") || sport.includes("volley")) {
    return [
      { key: "kills", label: "Attaques" },
      { key: "blocks", label: "Blocs" },
      { key: "aces", label: "Aces" },
      { key: "digs", label: "Défenses" },
    ];
  }
  
  if (sport.includes("aviron")) {
    return [
      { key: "split_time", label: "Split" },
      { key: "stroke_rate", label: "Cadence" },
    ];
  }

  if (sport.includes("athletisme") || sport.includes("athlétisme")) {
    return [
      { key: "time", label: "Temps" },
      { key: "distance", label: "Distance" },
      { key: "attempts", label: "Essais" },
      { key: "personal_best", label: "Record perso" },
    ];
  }

  if (sport.includes("judo")) {
    return [
      { key: "ippons", label: "Ippons" },
      { key: "waza_aris", label: "Waza-ari" },
      { key: "throws", label: "Projections" },
      { key: "shidos", label: "Shidos" },
    ];
  }

  if (sport.includes("natation")) {
    return [
      { key: "time", label: "Temps" },
      { key: "splits", label: "Passages" },
      { key: "stroke_count", label: "Coups" },
      { key: "turns", label: "Virages" },
    ];
  }

  if (sport.includes("ski") || sport.includes("snow")) {
    return [
      { key: "time", label: "Temps" },
      { key: "gates", label: "Portes" },
      { key: "gap", label: "Écart" },
    ];
  }

  if (sport.includes("triathlon")) {
    return [
      { key: "swim_time", label: "Natation" },
      { key: "bike_time", label: "Vélo" },
      { key: "run_time", label: "Course" },
      { key: "transitions", label: "Transitions" },
    ];
  }

  if (sport.includes("bowling")) {
    return [
      { key: "score", label: "Score" },
      { key: "strikes", label: "Strikes" },
      { key: "spares", label: "Spares" },
    ];
  }

  if (sport.includes("padel")) {
    return [
      { key: "points_won", label: "Points gagnés" },
      { key: "smashes", label: "Smashes" },
      { key: "errors", label: "Fautes" },
    ];
  }
  
  return [];
}

// Vérifier si le sport supporte les données GPS
export function sportSupportsGps(sportType?: string): boolean {
  if (!sportType) return false;
  const sport = sportType.toLowerCase();
  return sport.includes("rugby") || 
         sport.includes("football") || 
         sport.includes("aviron");
}

// Terminologie adaptée par sport
export function getVideoTerminology(sportType?: string): {
  match: string;
  matches: string;
  analysisTab: string;
  associatedLabel: string;
  noMatchLabel: string;
  playerLabel: string;
  playersLabel: string;
} {
  if (!sportType) return {
    match: "Match",
    matches: "Matchs",
    analysisTab: "Analyses Matchs",
    associatedLabel: "Match associé (optionnel)",
    noMatchLabel: "Aucun match - Vidéo libre",
    playerLabel: "Joueur",
    playersLabel: "Joueurs",
  };

  const sport = sportType.toLowerCase();
  const isIndividual = sport.includes("athletisme") || sport.includes("judo") || 
    sport.includes("natation") || sport.includes("ski") || sport.includes("snow") ||
    sport.includes("triathlon") || sport.includes("bowling") || sport.includes("aviron");
  const isPadel = sport.includes("padel");

  if (isIndividual) {
    return {
      match: "Compétition",
      matches: "Compétitions",
      analysisTab: "Analyses Compétitions",
      associatedLabel: "Compétition associée (optionnel)",
      noMatchLabel: "Aucune compétition - Vidéo libre",
      playerLabel: "Athlète",
      playersLabel: "Athlètes",
    };
  }

  if (isPadel) {
    return {
      match: "Match",
      matches: "Matchs",
      analysisTab: "Analyses Matchs",
      associatedLabel: "Match associé (optionnel)",
      noMatchLabel: "Aucun match - Vidéo libre",
      playerLabel: "Joueur",
      playersLabel: "Joueurs",
    };
  }

  return {
    match: "Match",
    matches: "Matchs",
    analysisTab: "Analyses Matchs",
    associatedLabel: "Match associé (optionnel)",
    noMatchLabel: "Aucun match - Vidéo libre",
    playerLabel: "Joueur",
    playersLabel: "Joueurs",
  };
}
