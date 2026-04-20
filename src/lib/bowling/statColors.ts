/**
 * Bowling stat color coding based on performance levels.
 * 
 * Levels (from lowest to highest):
 * - Orange: weakest
 * - Verte 1, 2, 3: intermediate green shades
 * - Bleue 1, 2: advanced blue shades
 * - Noire 1: elite
 * - Noire 2: best (red text)
 */

type StatType = "pocket" | "strike" | "spare" | "singlePin" | "firstBallGte8";

interface LevelThreshold {
  max: number; // exclusive upper bound
  bg: string;
  text: string;
  label: string;
}

const LEVELS: Record<StatType, LevelThreshold[]> = {
  pocket: [
    { max: 50, bg: "bg-orange-700", text: "text-orange-600", label: "Orange" },
    { max: 60, bg: "bg-green-700", text: "text-green-600", label: "Verte 1" },
    { max: 65, bg: "bg-green-700", text: "text-green-600", label: "Verte 2" },
    { max: 70, bg: "bg-green-800", text: "text-green-700", label: "Verte 3" },
    { max: 75, bg: "bg-blue-600", text: "text-blue-500", label: "Bleue 1" },
    { max: 80, bg: "bg-blue-900", text: "text-blue-800", label: "Bleue 2" },
    { max: 85, bg: "bg-black", text: "text-white", label: "Noire 1" },
    { max: Infinity, bg: "bg-black", text: "text-red-600", label: "Noire 2" },
  ],
  strike: [
    { max: 20, bg: "bg-orange-700", text: "text-orange-600", label: "Orange" },
    { max: 30, bg: "bg-green-700", text: "text-green-600", label: "Verte 1" },
    { max: 35, bg: "bg-green-700", text: "text-green-600", label: "Verte 2" },
    { max: 40, bg: "bg-green-800", text: "text-green-700", label: "Verte 3" },
    { max: 45, bg: "bg-blue-600", text: "text-blue-500", label: "Bleue 1" },
    { max: 50, bg: "bg-blue-900", text: "text-blue-800", label: "Bleue 2" },
    { max: 55, bg: "bg-black", text: "text-white", label: "Noire 1" },
    { max: Infinity, bg: "bg-black", text: "text-red-600", label: "Noire 2" },
  ],
  spare: [
    { max: 50, bg: "bg-orange-700", text: "text-orange-600", label: "Orange" },
    { max: 60, bg: "bg-green-700", text: "text-green-600", label: "Verte 1" },
    { max: 70, bg: "bg-green-700", text: "text-green-600", label: "Verte 2" },
    { max: 80, bg: "bg-green-800", text: "text-green-700", label: "Verte 3" },
    { max: 85, bg: "bg-blue-600", text: "text-blue-500", label: "Bleue 1" },
    { max: 90, bg: "bg-blue-900", text: "text-blue-800", label: "Bleue 2" },
    { max: 95, bg: "bg-black", text: "text-white", label: "Noire 1" },
    { max: Infinity, bg: "bg-black", text: "text-red-600", label: "Noire 2" },
  ],
  singlePin: [
    { max: 70, bg: "bg-orange-700", text: "text-orange-600", label: "Orange" },
    { max: 75, bg: "bg-green-700", text: "text-green-600", label: "Verte 1" },
    { max: 80, bg: "bg-green-700", text: "text-green-600", label: "Verte 2" },
    { max: 85, bg: "bg-green-800", text: "text-green-700", label: "Verte 3" },
    { max: 90, bg: "bg-blue-600", text: "text-blue-500", label: "Bleue 1" },
    { max: 95, bg: "bg-blue-900", text: "text-blue-800", label: "Bleue 2" },
    { max: 100, bg: "bg-black", text: "text-white", label: "Noire 1" },
    { max: Infinity, bg: "bg-black", text: "text-red-600", label: "Noire 2" },
  ],
  firstBallGte8: [
    { max: 50, bg: "bg-orange-700", text: "text-orange-600", label: "Orange" },
    { max: 65, bg: "bg-green-700", text: "text-green-600", label: "Verte 1" },
    { max: 75, bg: "bg-green-700", text: "text-green-600", label: "Verte 2" },
    { max: 85, bg: "bg-green-800", text: "text-green-700", label: "Verte 3" },
    { max: 88, bg: "bg-blue-600", text: "text-blue-500", label: "Bleue 1" },
    { max: 88, bg: "bg-blue-900", text: "text-blue-800", label: "Bleue 2" },
    { max: 92, bg: "bg-black", text: "text-white", label: "Noire 1" },
    { max: Infinity, bg: "bg-black", text: "text-red-600", label: "Noire 2" },
  ],
};

export function getStatColor(statType: StatType, value: number): { bg: string; text: string; label: string } {
  const thresholds = LEVELS[statType];
  for (const level of thresholds) {
    if (value < level.max) {
      return level;
    }
  }
  return thresholds[thresholds.length - 1];
}

/**
 * Returns the text color class for a stat value.
 */
export function getStatTextColor(statType: StatType, value: number): string {
  return getStatColor(statType, value).text;
}

/**
 * Returns the background color class for a stat value.
 */
export function getStatBgColor(statType: StatType, value: number): string {
  return getStatColor(statType, value).bg;
}
