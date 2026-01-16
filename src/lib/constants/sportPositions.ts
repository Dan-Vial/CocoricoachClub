// Sport-specific positions and field configurations

export interface Position {
  id: string;
  name: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
}

// Rugby XV positions
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

// Rugby 7s positions
export const RUGBY_7S_POSITIONS: Position[] = [
  { id: "1", name: "Pilier gauche", x: 25, y: 80 },
  { id: "2", name: "Talonneur", x: 50, y: 80 },
  { id: "3", name: "Pilier droit", x: 75, y: 80 },
  { id: "4", name: "Demi de mêlée", x: 50, y: 55 },
  { id: "5", name: "Centre gauche", x: 25, y: 40 },
  { id: "6", name: "Centre droit", x: 75, y: 40 },
  { id: "7", name: "Arrière", x: 50, y: 20 },
];

// Football (soccer) positions - 4-3-3 formation
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

// Handball positions
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

// Judo - no field positions, just weight categories
export const JUDO_POSITIONS: Position[] = [];

export type SportType = "XV" | "7" | "football" | "handball" | "volleyball" | "Judo" | "academie" | "national_team";

export function getPositionsForSport(sportType: SportType | string): Position[] {
  switch (sportType) {
    case "XV":
    case "academie":
    case "national_team":
      return RUGBY_XV_POSITIONS;
    case "7":
      return RUGBY_7S_POSITIONS;
    case "football":
      return FOOTBALL_POSITIONS;
    case "handball":
      return HANDBALL_POSITIONS;
    case "volleyball":
      return VOLLEYBALL_POSITIONS;
    case "Judo":
      return JUDO_POSITIONS;
    default:
      return RUGBY_XV_POSITIONS;
  }
}

export function getSportFieldConfig(sportType: SportType | string) {
  switch (sportType) {
    case "XV":
    case "7":
    case "academie":
    case "national_team":
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: sportType === "7" ? "Rugby 7s" : "Rugby XV",
      };
    case "football":
      return {
        type: "football",
        bgColor: "from-green-500 to-green-600",
        aspectRatio: "3/4",
        label: "Football",
      };
    case "handball":
      return {
        type: "handball",
        bgColor: "from-amber-600 to-amber-700",
        aspectRatio: "2/3",
        label: "Handball",
      };
    case "volleyball":
      return {
        type: "volleyball",
        bgColor: "from-orange-500 to-orange-600",
        aspectRatio: "1/1",
        label: "Volleyball",
      };
    case "Judo":
      return {
        type: "judo",
        bgColor: "from-red-600 to-red-700",
        aspectRatio: "1/1",
        label: "Judo",
        noField: true,
      };
    default:
      return {
        type: "rugby",
        bgColor: "from-green-600 to-green-700",
        aspectRatio: "2/3",
        label: "Rugby",
      };
  }
}
