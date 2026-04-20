// Sport-specific positions and field configurations

export interface Position {
  id: string;
  name: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
}

// Rugby position groups
export type RugbyPositionGroup = "avants" | "trois_quarts" | "all";

export interface RugbyPositionInfo {
  id: string;
  name: string;
  group: RugbyPositionGroup;
  number: number;
}

// Rugby XV positions with group classification
export const RUGBY_XV_POSITION_GROUPS: RugbyPositionInfo[] = [
  // Avants (Forwards) - Numbers 1-8
  { id: "1", name: "Pilier gauche", group: "avants", number: 1 },
  { id: "2", name: "Talonneur", group: "avants", number: 2 },
  { id: "3", name: "Pilier droit", group: "avants", number: 3 },
  { id: "4", name: "2ème ligne", group: "avants", number: 4 },
  { id: "5", name: "2ème ligne", group: "avants", number: 5 },
  { id: "6", name: "Flanker", group: "avants", number: 6 },
  { id: "7", name: "Flanker", group: "avants", number: 7 },
  { id: "8", name: "N°8", group: "avants", number: 8 },
  // 3/4 (Backs) - Numbers 9-15
  { id: "9", name: "Demi de mêlée", group: "trois_quarts", number: 9 },
  { id: "10", name: "Demi d'ouverture", group: "trois_quarts", number: 10 },
  { id: "11", name: "Ailier gauche", group: "trois_quarts", number: 11 },
  { id: "12", name: "1er centre", group: "trois_quarts", number: 12 },
  { id: "13", name: "2ème centre", group: "trois_quarts", number: 13 },
  { id: "14", name: "Ailier droit", group: "trois_quarts", number: 14 },
  { id: "15", name: "Arrière", group: "trois_quarts", number: 15 },
];

// Get position group from position name or number
export function getRugbyPositionGroup(position: string | undefined): RugbyPositionGroup | null {
  if (!position) return null;
  
  // Check by exact name match
  const posInfo = RUGBY_XV_POSITION_GROUPS.find(p => 
    p.name.toLowerCase() === position.toLowerCase() ||
    p.id === position ||
    position.includes(p.name)
  );
  
  if (posInfo) return posInfo.group;
  
  // Check by number pattern (e.g., "N°8", "8", "Poste 8")
  const numberMatch = position.match(/\d+/);
  if (numberMatch) {
    const num = parseInt(numberMatch[0]);
    if (num >= 1 && num <= 8) return "avants";
    if (num >= 9 && num <= 15) return "trois_quarts";
  }
  
  // Check by keywords
  const lowerPos = position.toLowerCase();
  const forwardKeywords = ["pilier", "talonneur", "ligne", "flanker", "n°8", "huit", "troisième"];
  const backKeywords = ["demi", "ouverture", "mêlée", "centre", "ailier", "arrière"];
  
  if (forwardKeywords.some(k => lowerPos.includes(k))) return "avants";
  if (backKeywords.some(k => lowerPos.includes(k))) return "trois_quarts";
  
  return null;
}

// Get position group label
export function getPositionGroupLabel(group: RugbyPositionGroup): string {
  switch (group) {
    case "avants": return "Avants";
    case "trois_quarts": return "3/4";
    case "all": return "Tous";
  }
}

// Check if sport is rugby (any variant)
export function isRugbySport(sportType: string | undefined): boolean {
  if (!sportType) return false;
  const baseSport = sportType.toLowerCase();
  return ["xv", "7", "xiii", "touch", "rugby", "academie", "national_team"].includes(baseSport);
}

// Rugby XV positions (15 players)
export const RUGBY_XV_POSITIONS: Position[] = [
  { id: "1", name: "Pilier gauche", x: 20, y: 85 },
  { id: "2", name: "Talonneur", x: 50, y: 85 },
  { id: "3", name: "Pilier droit", x: 80, y: 85 },
  { id: "4", name: "2ème ligne", x: 35, y: 75 },
  { id: "5", name: "2ème ligne", x: 65, y: 75 },
  { id: "6", name: "Flanker", x: 15, y: 65 },
  { id: "7", name: "Flanker", x: 85, y: 65 },
  { id: "8", name: "N°8", x: 50, y: 65 },
  { id: "9", name: "Demi de mêlée", x: 35, y: 50 },
  { id: "10", name: "Demi d'ouverture", x: 50, y: 45 },
  { id: "11", name: "Ailier gauche", x: 5, y: 30 },
  { id: "12", name: "1er centre", x: 35, y: 35 },
  { id: "13", name: "2ème centre", x: 65, y: 35 },
  { id: "14", name: "Ailier droit", x: 95, y: 30 },
  { id: "15", name: "Arrière", x: 50, y: 15 },
];

// Rugby 7s positions (7 players)
export const RUGBY_7S_POSITIONS: Position[] = [
  { id: "1", name: "Pilier gauche", x: 25, y: 80 },
  { id: "2", name: "Talonneur", x: 50, y: 80 },
  { id: "3", name: "Pilier droit", x: 75, y: 80 },
  { id: "4", name: "Demi de mêlée", x: 50, y: 55 },
  { id: "5", name: "Centre gauche", x: 25, y: 40 },
  { id: "6", name: "Centre droit", x: 75, y: 40 },
  { id: "7", name: "Arrière", x: 50, y: 20 },
];

// Rugby XIII positions (13 players) - Rugby League
export const RUGBY_XIII_POSITIONS: Position[] = [
  { id: "1", name: "Arrière", x: 50, y: 15 },
  { id: "2", name: "Ailier droit", x: 90, y: 25 },
  { id: "3", name: "Centre droit", x: 70, y: 35 },
  { id: "4", name: "Centre gauche", x: 30, y: 35 },
  { id: "5", name: "Ailier gauche", x: 10, y: 25 },
  { id: "6", name: "Demi d'ouverture", x: 50, y: 45 },
  { id: "7", name: "Demi de mêlée", x: 35, y: 55 },
  { id: "8", name: "Pilier gauche", x: 25, y: 75 },
  { id: "9", name: "Talonneur", x: 50, y: 75 },
  { id: "10", name: "Pilier droit", x: 75, y: 75 },
  { id: "11", name: "2ème ligne gauche", x: 35, y: 85 },
  { id: "12", name: "2ème ligne droit", x: 65, y: 85 },
  { id: "13", name: "Troisième ligne centre", x: 50, y: 90 },
];

// Touch Rugby positions (6 players)
export const TOUCH_RUGBY_POSITIONS: Position[] = [
  { id: "1", name: "Link gauche", x: 15, y: 55 },
  { id: "2", name: "Milieu gauche", x: 35, y: 70 },
  { id: "3", name: "Milieu droit", x: 65, y: 70 },
  { id: "4", name: "Link droit", x: 85, y: 55 },
  { id: "5", name: "Demi", x: 50, y: 50 },
  { id: "6", name: "Arrière", x: 50, y: 25 },
];

// Football (soccer) positions - 4-3-3 formation (11 players)
export const FOOTBALL_POSITIONS: Position[] = [
  { id: "1", name: "Gardien", x: 50, y: 92 },
  { id: "2", name: "Latéral droit", x: 85, y: 75 },
  { id: "3", name: "Défenseur central", x: 35, y: 78 },
  { id: "4", name: "Défenseur central", x: 65, y: 78 },
  { id: "5", name: "Latéral gauche", x: 15, y: 75 },
  { id: "6", name: "Milieu défensif", x: 50, y: 60 },
  { id: "7", name: "Milieu droit", x: 75, y: 50 },
  { id: "8", name: "Milieu gauche", x: 25, y: 50 },
  { id: "9", name: "Attaquant", x: 50, y: 20 },
  { id: "10", name: "Ailier droit", x: 80, y: 28 },
  { id: "11", name: "Ailier gauche", x: 20, y: 28 },
];

// Handball positions (7 players)
export const HANDBALL_POSITIONS: Position[] = [
  { id: "1", name: "Gardien", x: 50, y: 90 },
  { id: "2", name: "Ailier gauche", x: 10, y: 55 },
  { id: "3", name: "Arrière gauche", x: 25, y: 45 },
  { id: "4", name: "Demi-centre", x: 50, y: 40 },
  { id: "5", name: "Arrière droit", x: 75, y: 45 },
  { id: "6", name: "Ailier droit", x: 90, y: 55 },
  { id: "7", name: "Pivot", x: 50, y: 25 },
];

// Volleyball positions (6 players)
export const VOLLEYBALL_POSITIONS: Position[] = [
  { id: "1", name: "Arrière droit (P1)", x: 80, y: 75 },
  { id: "2", name: "Avant droit (P2)", x: 80, y: 35 },
  { id: "3", name: "Avant centre (P3)", x: 50, y: 35 },
  { id: "4", name: "Avant gauche (P4)", x: 20, y: 35 },
  { id: "5", name: "Arrière gauche (P5)", x: 20, y: 75 },
  { id: "6", name: "Arrière centre (P6)", x: 50, y: 75 },
];

// Basketball positions (5 players)
export const BASKETBALL_POSITIONS: Position[] = [
  { id: "1", name: "Meneur (Point Guard)", x: 50, y: 75 },
  { id: "2", name: "Arrière (Shooting Guard)", x: 20, y: 60 },
  { id: "3", name: "Ailier (Small Forward)", x: 80, y: 60 },
  { id: "4", name: "Ailier fort (Power Forward)", x: 25, y: 40 },
  { id: "5", name: "Pivot (Center)", x: 75, y: 40 },
];

// Individual sports - no field positions
export const JUDO_POSITIONS: Position[] = [];
export const AVIRON_POSITIONS: Position[] = [];
export const BOWLING_POSITIONS: Position[] = [];

export type SportType = "XV" | "7" | "XIII" | "touch" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "aviron" | "bowling" | "academie" | "national_team";

export function getPositionsForSport(sportType: SportType | string): Position[] {
  // Extract base sport from subtypes like "basketball_club", "judo_academie"
  const baseSport = sportType.includes('_') ? sportType.split('_')[0].toLowerCase() : sportType;
  
  switch (baseSport) {
    case "XV":
    case "xv":
    case "academie":
    case "national_team":
      return RUGBY_XV_POSITIONS;
    case "7":
      return RUGBY_7S_POSITIONS;
    case "XIII":
    case "xiii":
      return RUGBY_XIII_POSITIONS;
    case "touch":
      return TOUCH_RUGBY_POSITIONS;
    case "football":
      return FOOTBALL_POSITIONS;
    case "handball":
      return HANDBALL_POSITIONS;
    case "volleyball":
      return VOLLEYBALL_POSITIONS;
    case "basketball":
      return BASKETBALL_POSITIONS;
    case "judo":
      return JUDO_POSITIONS;
    case "aviron":
      return AVIRON_POSITIONS;
    case "bowling":
      return BOWLING_POSITIONS;
    case "ski":
    case "snow":
    case "snowboard":
    case "surf":
    case "natation":
    case "athletisme":
    case "triathlon":
    case "padel":
    case "tennis":
    case "hyrox":
      return [];
    default:
      return RUGBY_XV_POSITIONS;
  }
}

export function getSportFieldConfig(sportType: SportType | string) {
  // Extract base sport from subtypes like "basketball_club", "judo_academie"
  const baseSport = sportType.includes('_') ? sportType.split('_')[0].toLowerCase() : sportType;
  
  switch (baseSport) {
    case "XV":
    case "xv":
    case "academie":
    case "national_team":
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: "Rugby XV",
        starters: 15,
        substitutes: 8,
        totalSquad: 23,
      };
    case "7":
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: "Rugby 7s",
        starters: 7,
        substitutes: 5,
        totalSquad: 12,
      };
    case "XIII":
    case "xiii":
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: "Rugby XIII",
        starters: 13,
        substitutes: 4,
        totalSquad: 17,
      };
    case "touch":
      return {
        type: "rugby",
        bgColor: "from-green-500 to-green-600",
        aspectRatio: "2/3",
        label: "Touch Rugby",
        starters: 6,
        substitutes: 8,
        totalSquad: 14,
      };
    case "football":
      return {
        type: "football",
        bgColor: "from-green-500 to-green-600",
        aspectRatio: "3/4",
        label: "Football",
        starters: 11,
        substitutes: 9,
        totalSquad: 20,
      };
    case "handball":
      return {
        type: "handball",
        bgColor: "from-amber-600 to-amber-700",
        aspectRatio: "2/3",
        label: "Handball",
        starters: 7,
        substitutes: 7,
        totalSquad: 14,
      };
    case "volleyball":
      return {
        type: "volleyball",
        bgColor: "from-orange-500 to-orange-600",
        aspectRatio: "1/1",
        label: "Volleyball",
        starters: 6,
        substitutes: 6,
        totalSquad: 12,
      };
    case "basketball":
      return {
        type: "basketball",
        bgColor: "from-orange-600 to-orange-700",
        aspectRatio: "2/3",
        label: "Basketball",
        starters: 5,
        substitutes: 7,
        totalSquad: 12,
      };
    case "judo":
      return {
        type: "judo",
        bgColor: "from-red-600 to-red-700",
        aspectRatio: "1/1",
        label: "Judo",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "aviron":
      return {
        type: "aviron",
        bgColor: "from-blue-500 to-blue-700",
        aspectRatio: "4/1",
        label: "Aviron",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "bowling":
      return {
        type: "bowling",
        bgColor: "from-amber-500 to-amber-700",
        aspectRatio: "1/1",
        label: "Bowling",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "padel":
      return {
        type: "padel",
        bgColor: "from-blue-500 to-blue-700",
        aspectRatio: "2/3",
        label: "Padel",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "natation":
      return {
        type: "natation",
        bgColor: "from-cyan-500 to-cyan-700",
        aspectRatio: "1/1",
        label: "Natation",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "ski":
    case "snow":
      return {
        type: "ski",
        bgColor: "from-sky-400 to-sky-600",
        aspectRatio: "1/1",
        label: "Sports de Glisse",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "surf":
      return {
        type: "surf",
        bgColor: "from-teal-400 to-teal-600",
        aspectRatio: "1/1",
        label: "Surf",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "athletisme":
      return {
        type: "athletisme",
        bgColor: "from-red-500 to-red-700",
        aspectRatio: "1/1",
        label: "Athlétisme",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "triathlon":
      return {
        type: "triathlon",
        bgColor: "from-emerald-500 to-emerald-700",
        aspectRatio: "1/1",
        label: "Triathlon",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "tennis":
      return {
        type: "tennis",
        bgColor: "from-green-500 to-green-600",
        aspectRatio: "2/3",
        label: "Tennis",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    case "crossfit":
      return {
        type: "crossfit",
        bgColor: "from-gray-600 to-gray-800",
        aspectRatio: "1/1",
        label: "CrossFit",
        noField: true,
        starters: 0,
        substitutes: 0,
        totalSquad: 0,
      };
    default:
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: "Rugby",
        starters: 15,
        substitutes: 8,
        totalSquad: 23,
      };
  }
}
