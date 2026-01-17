// Sport types configuration
export type SportType = 
  | "XV" 
  | "7" 
  | "academie" 
  | "national_team" 
  | "football" 
  | "handball" 
  | "judo" 
  | "volleyball"
  | "bowling";

export interface SportTypeOption {
  value: SportType;
  label: string;
  category: "rugby" | "team" | "individual";
}

export const SPORT_TYPES: SportTypeOption[] = [
  // Rugby types
  { value: "XV", label: "Rugby à XV", category: "rugby" },
  { value: "7", label: "Rugby à 7", category: "rugby" },
  { value: "academie", label: "Académie / Pôle Espoir", category: "rugby" },
  { value: "national_team", label: "Équipe Nationale", category: "rugby" },
  // Team sports
  { value: "football", label: "Football", category: "team" },
  { value: "handball", label: "Handball", category: "team" },
  { value: "volleyball", label: "Volleyball", category: "team" },
  // Individual sports
  { value: "judo", label: "Judo", category: "individual" },
  { value: "bowling", label: "Bowling", category: "individual" },
];

export const getSportLabel = (type: string): string => {
  const sport = SPORT_TYPES.find(s => s.value === type);
  if (sport) return sport.label;
  
  // Fallback for legacy rugby types
  if (type === "XV" || type === "15") return "Rugby XV";
  if (type === "7") return "Rugby 7";
  if (type === "academie") return "Académie";
  if (type === "national_team") return "Équipe Nationale";
  
  return type;
};

export const isRugbyType = (type: string): boolean => {
  return ["XV", "7", "15", "academie", "national_team"].includes(type);
};

export const isIndividualSport = (type: string): boolean => {
  return ["judo", "bowling"].includes(type);
};

export const isTeamSport = (type: string): boolean => {
  return ["XV", "7", "15", "academie", "national_team", "football", "handball", "volleyball"].includes(type);
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
