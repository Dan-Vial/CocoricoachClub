// Sport types configuration
export type SportType = 
  | "XV" 
  | "7" 
  | "XIII"
  | "academie" 
  | "national_team" 
  | "football" 
  | "handball" 
  | "judo" 
  | "volleyball"
  | "bowling"
  | "basketball"
  | "aviron"
  | "athletisme"
  | "crossfit"
  | "football_club"
  | "football_academie"
  | "football_national"
  | "handball_club"
  | "handball_academie"
  | "handball_national"
  | "volleyball_club"
  | "volleyball_academie"
  | "volleyball_national"
  | "basketball_club"
  | "basketball_academie"
  | "basketball_national"
  | "judo_club"
  | "judo_academie"
  | "judo_national"
  | "bowling_club"
  | "bowling_academie"
  | "bowling_national"
  | "aviron_club"
  | "aviron_academie"
  | "aviron_national"
  | "crossfit_box"
  | "crossfit_hyrox"
  | "crossfit_musculation"
  // Athlétisme disciplines
  | "athletisme_sprints"
  | "athletisme_haies"
  | "athletisme_demi_fond"
  | "athletisme_fond"
  | "athletisme_marche"
  | "athletisme_sauts_longueur"
  | "athletisme_sauts_hauteur"
  | "athletisme_lancers"
  | "athletisme_combines"
  | "athletisme_club"
  | "athletisme_academie"
  | "athletisme_national";

export interface SportTypeOption {
  value: SportType;
  label: string;
  category: "rugby" | "team" | "individual";
}

// Main sport categories for the first dropdown
export type MainSportCategory = "rugby" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "bowling" | "aviron" | "athletisme" | "crossfit";

export interface MainSportOption {
  value: MainSportCategory;
  label: string;
}

export const MAIN_SPORTS: MainSportOption[] = [
  { value: "rugby", label: "Rugby" },
  { value: "football", label: "Football" },
  { value: "handball", label: "Handball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "basketball", label: "Basketball" },
  { value: "judo", label: "Judo" },
  { value: "bowling", label: "Bowling" },
  { value: "aviron", label: "Aviron" },
  { value: "athletisme", label: "Athlétisme" },
  { value: "crossfit", label: "CrossFit / Hyrox / Musculation" },
];

// Sub-types for rugby
export interface SportSubTypeOption {
  value: SportType;
  label: string;
}

// Generic option for player attributes (discipline, weight category)
export interface PlayerAttributeOption {
  value: string;
  label: string;
}

export const RUGBY_SUBTYPES: SportSubTypeOption[] = [
  { value: "XV", label: "Rugby à XV" },
  { value: "7", label: "Rugby à 7" },
  { value: "XIII", label: "Rugby à XIII" },
  { value: "academie", label: "Académie / Pôle Espoir" },
  { value: "national_team", label: "Équipe Nationale" },
];

// Sub-types for athletics CATEGORY creation (Club, Académie, National only)
export const ATHLETISME_CATEGORY_SUBTYPES: SportSubTypeOption[] = [
  { value: "athletisme_club", label: "Athlétisme - Club" },
  { value: "athletisme_academie", label: "Athlétisme - Académie / Pôle Espoir" },
  { value: "athletisme_national", label: "Athlétisme - Équipe Nationale" },
];

// Disciplines for PLAYER creation (used in AddPlayerDialog)
export const ATHLETISME_DISCIPLINES: PlayerAttributeOption[] = [
  { value: "athletisme_sprints", label: "Sprints" },
  { value: "athletisme_haies", label: "Haies" },
  { value: "athletisme_demi_fond", label: "Demi-fond" },
  { value: "athletisme_fond", label: "Fond" },
  { value: "athletisme_marche", label: "Marche athlétique" },
  { value: "athletisme_sauts_longueur", label: "Sauts horizontaux" },
  { value: "athletisme_sauts_hauteur", label: "Sauts verticaux" },
  { value: "athletisme_lancers", label: "Lancers" },
  { value: "athletisme_combines", label: "Épreuves combinées" },
];

// Specialties per discipline for athletics
export interface SpecialtyOption {
  value: string;
  label: string;
}

export const ATHLETISME_SPECIALTIES: Record<string, SpecialtyOption[]> = {
  athletisme_sprints: [
    { value: "60m", label: "60m" },
    { value: "100m", label: "100m" },
    { value: "200m", label: "200m" },
    { value: "400m", label: "400m" },
  ],
  athletisme_haies: [
    { value: "60mH", label: "60m Haies" },
    { value: "100mH", label: "100m Haies" },
    { value: "110mH", label: "110m Haies" },
    { value: "400mH", label: "400m Haies" },
  ],
  athletisme_demi_fond: [
    { value: "800m", label: "800m" },
    { value: "1500m", label: "1500m" },
    { value: "mile", label: "Mile" },
  ],
  athletisme_fond: [
    { value: "3000m", label: "3000m" },
    { value: "5000m", label: "5000m" },
    { value: "10000m", label: "10000m" },
    { value: "cross", label: "Cross-country" },
    { value: "semi_marathon", label: "Semi-marathon" },
    { value: "marathon", label: "Marathon" },
  ],
  athletisme_marche: [
    { value: "10km_marche", label: "10km Marche" },
    { value: "20km_marche", label: "20km Marche" },
    { value: "35km_marche", label: "35km Marche" },
    { value: "50km_marche", label: "50km Marche" },
  ],
  athletisme_sauts_longueur: [
    { value: "longueur", label: "Longueur" },
    { value: "triple_saut", label: "Triple saut" },
  ],
  athletisme_sauts_hauteur: [
    { value: "hauteur", label: "Hauteur" },
    { value: "perche", label: "Perche" },
  ],
  athletisme_lancers: [
    { value: "poids", label: "Poids" },
    { value: "disque", label: "Disque" },
    { value: "marteau", label: "Marteau" },
    { value: "javelot", label: "Javelot" },
  ],
  athletisme_combines: [
    { value: "pentathlon", label: "Pentathlon" },
    { value: "heptathlon", label: "Heptathlon" },
    { value: "decathlon", label: "Décathlon" },
  ],
};

// Weight categories for Judo (used in AddPlayerDialog)
export const JUDO_WEIGHT_CATEGORIES_MEN: PlayerAttributeOption[] = [
  { value: "judo_-60kg", label: "-60 kg" },
  { value: "judo_-66kg", label: "-66 kg" },
  { value: "judo_-73kg", label: "-73 kg" },
  { value: "judo_-81kg", label: "-81 kg" },
  { value: "judo_-90kg", label: "-90 kg" },
  { value: "judo_-100kg", label: "-100 kg" },
  { value: "judo_+100kg", label: "+100 kg" },
];

export const JUDO_WEIGHT_CATEGORIES_WOMEN: PlayerAttributeOption[] = [
  { value: "judo_-48kg", label: "-48 kg" },
  { value: "judo_-52kg", label: "-52 kg" },
  { value: "judo_-57kg", label: "-57 kg" },
  { value: "judo_-63kg", label: "-63 kg" },
  { value: "judo_-70kg", label: "-70 kg" },
  { value: "judo_-78kg", label: "-78 kg" },
  { value: "judo_+78kg", label: "+78 kg" },
];

// Combined weight categories for general selection
export const JUDO_WEIGHT_CATEGORIES: PlayerAttributeOption[] = [
  { value: "judo_-48kg", label: "-48 kg (F)" },
  { value: "judo_-52kg", label: "-52 kg (F)" },
  { value: "judo_-57kg", label: "-57 kg (F)" },
  { value: "judo_-60kg", label: "-60 kg (M)" },
  { value: "judo_-63kg", label: "-63 kg (F)" },
  { value: "judo_-66kg", label: "-66 kg (M)" },
  { value: "judo_-70kg", label: "-70 kg (F)" },
  { value: "judo_-73kg", label: "-73 kg (M)" },
  { value: "judo_-78kg", label: "-78 kg (F)" },
  { value: "judo_-81kg", label: "-81 kg (M)" },
  { value: "judo_+78kg", label: "+78 kg (F)" },
  { value: "judo_-90kg", label: "-90 kg (M)" },
  { value: "judo_-100kg", label: "-100 kg (M)" },
  { value: "judo_+100kg", label: "+100 kg (M)" },
];

// Roles for Aviron (Rowing)
export const AVIRON_ROLES: PlayerAttributeOption[] = [
  { value: "barreur", label: "Barreur" },
  { value: "rameur_pointe", label: "Rameur de pointe" },
  { value: "rameur_couple", label: "Rameur de couple" },
  { value: "chef_nage", label: "Chef de nage" },
  { value: "nage_1", label: "Nage 1 (Bow)" },
  { value: "nage_2", label: "Nage 2" },
  { value: "nage_3", label: "Nage 3" },
  { value: "nage_4", label: "Nage 4" },
  { value: "nage_5", label: "Nage 5" },
  { value: "nage_6", label: "Nage 6" },
  { value: "nage_7", label: "Nage 7" },
  { value: "nage_8", label: "Nage 8 (Stroke)" },
];

// Sub-types for CrossFit/Hyrox/Musculation
export const CROSSFIT_SUBTYPES: SportSubTypeOption[] = [
  { value: "crossfit_box", label: "CrossFit - Box / Salle" },
  { value: "crossfit_hyrox", label: "Hyrox / Fitness Fonctionnel" },
  { value: "crossfit_musculation", label: "Musculation / Bodybuilding" },
];

// Sub-types for other sports (Club, Académie, Équipe Nationale)
export const getOtherSportSubtypes = (sport: MainSportCategory): SportSubTypeOption[] => {
  if (sport === "rugby") return RUGBY_SUBTYPES;
  // For athletics category creation, only show Club/Académie/National
  if (sport === "athletisme") return ATHLETISME_CATEGORY_SUBTYPES;
  // For CrossFit/Hyrox/Musculation
  if (sport === "crossfit") return CROSSFIT_SUBTYPES;
  
  const sportLabels: Record<Exclude<MainSportCategory, "rugby" | "athletisme" | "crossfit">, string> = {
    football: "Football",
    handball: "Handball",
    volleyball: "Volleyball",
    basketball: "Basketball",
    judo: "Judo",
    bowling: "Bowling",
    aviron: "Aviron",
  };

  return [
    { value: `${sport}_club` as SportType, label: `${sportLabels[sport]} - Club` },
    { value: `${sport}_academie` as SportType, label: `${sportLabels[sport]} - Académie / Pôle Espoir` },
    { value: `${sport}_national` as SportType, label: `${sportLabels[sport]} - Équipe Nationale` },
  ];
};

// Helper to check if a category is an athletics category
export const isAthletismeCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("athletisme") || rugbyType === "athletisme";
};

// Helper to check if a category is a judo category
export const isJudoCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("judo") || rugbyType === "judo";
};

export const SPORT_TYPES: SportTypeOption[] = [
  // Rugby types
  { value: "XV", label: "Rugby à XV", category: "rugby" },
  { value: "7", label: "Rugby à 7", category: "rugby" },
  { value: "XIII", label: "Rugby à XIII", category: "rugby" },
  { value: "academie", label: "Académie / Pôle Espoir", category: "rugby" },
  { value: "national_team", label: "Équipe Nationale", category: "rugby" },
  // Team sports - Club
  { value: "football_club", label: "Football - Club", category: "team" },
  { value: "handball_club", label: "Handball - Club", category: "team" },
  { value: "volleyball_club", label: "Volleyball - Club", category: "team" },
  { value: "basketball_club", label: "Basketball - Club", category: "team" },
  // Team sports - Académie
  { value: "football_academie", label: "Football - Académie", category: "team" },
  { value: "handball_academie", label: "Handball - Académie", category: "team" },
  { value: "volleyball_academie", label: "Volleyball - Académie", category: "team" },
  { value: "basketball_academie", label: "Basketball - Académie", category: "team" },
  // Team sports - National
  { value: "football_national", label: "Football - Équipe Nationale", category: "team" },
  { value: "handball_national", label: "Handball - Équipe Nationale", category: "team" },
  { value: "volleyball_national", label: "Volleyball - Équipe Nationale", category: "team" },
  { value: "basketball_national", label: "Basketball - Équipe Nationale", category: "team" },
  // Individual sports - Club
  { value: "judo_club", label: "Judo - Club", category: "individual" },
  { value: "bowling_club", label: "Bowling - Club", category: "individual" },
  { value: "aviron_club", label: "Aviron - Club", category: "individual" },
  // Individual sports - Académie
  { value: "judo_academie", label: "Judo - Académie", category: "individual" },
  { value: "bowling_academie", label: "Bowling - Académie", category: "individual" },
  { value: "aviron_academie", label: "Aviron - Académie", category: "individual" },
  // Individual sports - National
  { value: "judo_national", label: "Judo - Équipe Nationale", category: "individual" },
  { value: "bowling_national", label: "Bowling - Équipe Nationale", category: "individual" },
  { value: "aviron_national", label: "Aviron - Équipe Nationale", category: "individual" },
  // CrossFit / Hyrox / Musculation
  { value: "crossfit_box", label: "CrossFit - Box / Salle", category: "individual" },
  { value: "crossfit_hyrox", label: "Hyrox / Fitness Fonctionnel", category: "individual" },
  { value: "crossfit_musculation", label: "Musculation / Bodybuilding", category: "individual" },
  { value: "crossfit", label: "CrossFit / Hyrox / Musculation", category: "individual" },
  // Athlétisme disciplines
  { value: "athletisme_sprints", label: "Athlétisme - Sprints", category: "individual" },
  { value: "athletisme_haies", label: "Athlétisme - Haies", category: "individual" },
  { value: "athletisme_demi_fond", label: "Athlétisme - Demi-fond", category: "individual" },
  { value: "athletisme_fond", label: "Athlétisme - Fond", category: "individual" },
  { value: "athletisme_marche", label: "Athlétisme - Marche athlétique", category: "individual" },
  { value: "athletisme_sauts_longueur", label: "Athlétisme - Sauts horizontaux", category: "individual" },
  { value: "athletisme_sauts_hauteur", label: "Athlétisme - Sauts verticaux", category: "individual" },
  { value: "athletisme_lancers", label: "Athlétisme - Lancers", category: "individual" },
  { value: "athletisme_combines", label: "Athlétisme - Épreuves combinées", category: "individual" },
  { value: "athletisme_club", label: "Athlétisme - Club", category: "individual" },
  { value: "athletisme_academie", label: "Athlétisme - Académie", category: "individual" },
  { value: "athletisme_national", label: "Athlétisme - Équipe Nationale", category: "individual" },
  // Legacy types (for backwards compatibility)
  { value: "football", label: "Football", category: "team" },
  { value: "handball", label: "Handball", category: "team" },
  { value: "volleyball", label: "Volleyball", category: "team" },
  { value: "basketball", label: "Basketball", category: "team" },
  { value: "judo", label: "Judo", category: "individual" },
  { value: "bowling", label: "Bowling", category: "individual" },
  { value: "aviron", label: "Aviron", category: "individual" },
  { value: "athletisme", label: "Athlétisme", category: "individual" },
];

export const getSportLabel = (type: string): string => {
  const sport = SPORT_TYPES.find(s => s.value === type);
  if (sport) return sport.label;
  
  // Fallback for legacy rugby types
  if (type === "XV" || type === "15") return "Rugby XV";
  if (type === "7") return "Rugby 7";
  if (type === "XIII") return "Rugby XIII";
  if (type === "academie") return "Académie";
  if (type === "national_team") return "Équipe Nationale";
  
  // Handle new sport subtypes
  if (type.includes("_club")) return type.replace("_club", " - Club").replace(/^\w/, c => c.toUpperCase());
  if (type.includes("_academie")) return type.replace("_academie", " - Académie").replace(/^\w/, c => c.toUpperCase());
  if (type.includes("_national")) return type.replace("_national", " - Équipe Nationale").replace(/^\w/, c => c.toUpperCase());
  
  return type;
};

export const isRugbyType = (type: string): boolean => {
  return ["XV", "7", "XIII", "15", "academie", "national_team"].includes(type);
};

export const getMainSportFromType = (type: string): MainSportCategory => {
  if (isRugbyType(type)) return "rugby";
  if (type.startsWith("football")) return "football";
  if (type.startsWith("handball")) return "handball";
  if (type.startsWith("volleyball")) return "volleyball";
  if (type.startsWith("basketball")) return "basketball";
  if (type.startsWith("judo")) return "judo";
  if (type.startsWith("bowling")) return "bowling";
  if (type.startsWith("aviron")) return "aviron";
  if (type.startsWith("athletisme")) return "athletisme";
  if (type.startsWith("crossfit")) return "crossfit";
  return "rugby"; // default
};

export const isIndividualSport = (type: string): boolean => {
  const individualSports = [
    "judo", "bowling", "aviron", "athletisme", "crossfit",
    "judo_club", "judo_academie", "judo_national",
    "bowling_club", "bowling_academie", "bowling_national",
    "aviron_club", "aviron_academie", "aviron_national",
    "crossfit_box", "crossfit_hyrox", "crossfit_musculation",
    "athletisme_sprints", "athletisme_haies", "athletisme_demi_fond",
    "athletisme_fond", "athletisme_marche", "athletisme_sauts_longueur",
    "athletisme_sauts_hauteur", "athletisme_lancers", "athletisme_combines",
    "athletisme_club", "athletisme_academie", "athletisme_national"
  ];
  return individualSports.includes(type);
};

// Helper to check if a category is CrossFit/Hyrox/Musculation
export const isCrossfitCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("crossfit") || rugbyType === "crossfit";
};

export const isTeamSport = (type: string): boolean => {
  return ["XV", "7", "XIII", "15", "academie", "national_team", "football", "handball", "volleyball", "basketball", "football_club", "football_academie", "football_national", "handball_club", "handball_academie", "handball_national", "volleyball_club", "volleyball_academie", "volleyball_national", "basketball_club", "basketball_academie", "basketball_national"].includes(type);
};

export const getRugbyTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "rugby");
};

export const getTeamSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "team");
};

export const getIndividualSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "individual");
};

export const getOtherSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category !== "rugby");
};
