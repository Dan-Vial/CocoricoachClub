// Sport types configuration
export type SportType = 
  | "XV" 
  | "7" 
  | "academie" 
  | "national_team" 
  | "football" 
  | "handball" 
  | "judo" 
  | "volleyball";

export interface SportTypeOption {
  value: SportType;
  label: string;
  category: "rugby" | "other";
}

export const SPORT_TYPES: SportTypeOption[] = [
  // Rugby types
  { value: "XV", label: "Rugby à XV", category: "rugby" },
  { value: "7", label: "Rugby à 7", category: "rugby" },
  { value: "academie", label: "Académie / Pôle Espoir", category: "rugby" },
  { value: "national_team", label: "Équipe Nationale", category: "rugby" },
  // Other sports
  { value: "football", label: "Football", category: "other" },
  { value: "handball", label: "Handball", category: "other" },
  { value: "judo", label: "Judo", category: "other" },
  { value: "volleyball", label: "Volleyball", category: "other" },
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

export const getRugbyTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "rugby");
};

export const getOtherSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "other");
};
