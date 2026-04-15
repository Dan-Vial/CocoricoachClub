// Official bowling oil patterns with verified data
// Only patterns with 100% verified official data are included for auto-fill

export interface OilPatternPreset {
  name: string;
  // Only include fields where we have official data
  length_feet?: number;
  buff_distance_feet?: number;
  width_boards?: number;
  total_volume_ml?: number;
  oil_ratio?: string;
  profile_type?: "flat" | "crown" | "reverse_block";
  forward_oil?: boolean;
  reverse_oil?: boolean;
  outside_friction?: "low" | "medium" | "high";
}

// Official PBA/WTBA patterns with verified specifications
export const OFFICIAL_OIL_PATTERNS: OilPatternPreset[] = [
  // PBA Animal Patterns - Official specifications
  {
    name: "PBA Cheetah",
    length_feet: 35,
    total_volume_ml: 21.5,
    oil_ratio: "3:1",
    profile_type: "crown",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Viper",
    length_feet: 37,
    total_volume_ml: 26.0,
    oil_ratio: "4:1",
    profile_type: "crown",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Chameleon",
    length_feet: 39,
    total_volume_ml: 24.0,
    oil_ratio: "2.5:1",
    profile_type: "flat",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Scorpion",
    length_feet: 41,
    total_volume_ml: 27.0,
    oil_ratio: "2:1",
    profile_type: "flat",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Shark",
    length_feet: 44,
    total_volume_ml: 28.0,
    oil_ratio: "5:1",
    profile_type: "crown",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Bear",
    length_feet: 52,
    total_volume_ml: 30.0,
    oil_ratio: "6:1",
    profile_type: "crown",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Dragon",
    length_feet: 45,
    profile_type: "reverse_block",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Wolf",
    length_feet: 32,
    profile_type: "flat",
    forward_oil: true,
    reverse_oil: true,
  },
  {
    name: "PBA Badger",
    length_feet: 52,
    profile_type: "flat",
    forward_oil: true,
    reverse_oil: true,
  },
];

// Common house/league patterns (partial data - no auto-fill)
export const COMMON_PATTERNS: string[] = [
  "Kegel Easy Street",
  "Kegel Beaten Path",
  "Kegel Broadway",
  "Kegel Middle Road",
  "Kegel Stone Street",
  "Kegel Winding Road",
  "House Shot (Standard)",
  "House Shot (Sport)",
  "USBC Red",
  "USBC White", 
  "USBC Blue",
  "EBT Amsterdam",
  "EBT Barcelona",
  "EBT London",
  "EBT Paris",
  "WTBA Mexico City",
  "WTBA Tokyo",
  "WTBA Vegas",
  "Pattern personnel",
];

// All pattern names for dropdown
export const ALL_PATTERN_NAMES = [
  ...OFFICIAL_OIL_PATTERNS.map(p => p.name),
  ...COMMON_PATTERNS,
];

// Get preset data for a pattern name (returns undefined if no official data)
export function getPatternPreset(name: string): OilPatternPreset | undefined {
  return OFFICIAL_OIL_PATTERNS.find(p => p.name === name);
}

// Profile type options for dropdown
export const PROFILE_TYPES = [
  { value: "flat", label: "Flat Pattern" },
  { value: "crown", label: "Crown / Christmas Tree" },
  { value: "reverse_block", label: "Reverse Block" },
] as const;

// Outside friction options
export const FRICTION_LEVELS = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
] as const;

// Oil ratio presets
export const OIL_RATIOS = [
  "1:1", "1.5:1", "2:1", "2.5:1", "3:1", "3.5:1", "4:1", "4.5:1", "5:1", "6:1", "7:1", "8:1", "10:1"
];

// Parse oil ratio string "X:1" to numeric value
export function parseOilRatio(ratio: string | null | undefined): number | null {
  if (!ratio) return null;
  const match = ratio.match(/^(\d+(?:\.\d+)?)\s*:\s*1$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

// Oil pattern category based on lateral ratio
export type OilCategoryType = "sport" | "challenge" | "recreation";

export interface OilCategoryInfo {
  type: OilCategoryType;
  label: string;
  color: string; // tailwind classes
  description: string;
  detail: string;
}

export function getOilCategory(ratio: string | null | undefined): OilCategoryInfo | null {
  const value = parseOilRatio(ratio);
  if (value === null) return null;

  if (value < 1) return null;

  if (value < 3) {
    return {
      type: "sport",
      label: "Sportif",
      color: "bg-red-500/15 text-red-600 border-red-500 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500",
      description: "Conditions très compétitives",
      detail: value < 1.5
        ? "Conditions très difficiles (huilage à plat)"
        : value < 2.5
        ? "Conditions très compétitives dites « Sportives »"
        : "Conditions plus compétitives",
    };
  }

  if (value <= 5) {
    return {
      type: "challenge",
      label: "Challenge",
      color: "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400",
      description: "Conditions compétitives intermédiaires",
      detail: value <= 3.5
        ? "Conditions compétitives (ratio 2.5 à 3.5:1)"
        : "Scorabilité très importante (ratio 3.5 à 5:1)",
    };
  }

  return {
    type: "recreation",
    label: "Récréation",
    color: "bg-green-100 text-green-800 border-green-400 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400",
    description: "Conditions « maison »",
    detail: "Ratio > 5:1 — Conditions récréatives, la boule est orientée vers la poche",
  };
}
