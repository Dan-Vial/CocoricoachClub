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
  
  return COMMON_ACTIONS;
}

export function getActionTypeLabel(actionType: string): string {
  // Combine all action types for label lookup
  const allActions = [
    ...COMMON_ACTIONS,
    ...RUGBY_ACTIONS,
    ...FOOTBALL_ACTIONS,
    ...AVIRON_ACTIONS,
    ...BASKETBALL_ACTIONS,
    ...HANDBALL_ACTIONS,
    ...VOLLEYBALL_ACTIONS,
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
