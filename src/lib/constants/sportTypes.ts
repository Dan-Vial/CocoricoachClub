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
  | "aviron_national";

export interface SportTypeOption {
  value: SportType;
  label: string;
  category: "rugby" | "team" | "individual";
}

// Main sport categories for the first dropdown
export type MainSportCategory = "rugby" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "bowling" | "aviron";

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
];

// Sub-types for rugby
export interface SportSubTypeOption {
  value: SportType;
  label: string;
}

export const RUGBY_SUBTYPES: SportSubTypeOption[] = [
  { value: "XV", label: "Rugby à XV" },
  { value: "7", label: "Rugby à 7" },
  { value: "XIII", label: "Rugby à XIII" },
  { value: "academie", label: "Académie / Pôle Espoir" },
  { value: "national_team", label: "Équipe Nationale" },
];

// Sub-types for other sports (Club, Académie, Équipe Nationale)
export const getOtherSportSubtypes = (sport: MainSportCategory): SportSubTypeOption[] => {
  if (sport === "rugby") return RUGBY_SUBTYPES;
  
  const sportLabels: Record<Exclude<MainSportCategory, "rugby">, string> = {
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
  // Legacy types (for backwards compatibility)
  { value: "football", label: "Football", category: "team" },
  { value: "handball", label: "Handball", category: "team" },
  { value: "volleyball", label: "Volleyball", category: "team" },
  { value: "basketball", label: "Basketball", category: "team" },
  { value: "judo", label: "Judo", category: "individual" },
  { value: "bowling", label: "Bowling", category: "individual" },
  { value: "aviron", label: "Aviron", category: "individual" },
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
  return "rugby"; // default
};

export const isIndividualSport = (type: string): boolean => {
  return ["judo", "bowling", "aviron", "judo_club", "judo_academie", "judo_national", "bowling_club", "bowling_academie", "bowling_national", "aviron_club", "aviron_academie", "aviron_national"].includes(type);
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
