export const BOWLING_BALL_BRANDS = [
  "Storm",
  "Roto Grip",
  "900 Global",
  "Hammer",
  "Brunswick",
  "Ebonite",
  "Motiv",
] as const;

export const COVER_TYPES = [
  { value: "reactive", label: "Reactive" },
  { value: "urethane", label: "Uréthane" },
  { value: "hybrid", label: "Hybrid" },
  { value: "pearl", label: "Pearl" },
  { value: "solid", label: "Solid" },
] as const;

export const CORE_TYPES = [
  { value: "symmetric", label: "Symétrique" },
  { value: "asymmetric", label: "Asymétrique" },
] as const;

export const BALL_WEIGHTS = [12, 13, 14, 15, 16] as const;

export const SPARE_EXERCISE_TYPES = [
  { value: "spare_pin_5", label: "Quille 5" },
  { value: "spare_pin_7", label: "Quille 7" },
  { value: "spare_pin_10", label: "Quille 10" },
] as const;

export function getCoverTypeLabel(value: string): string {
  return COVER_TYPES.find(c => c.value === value)?.label || value;
}

export function getCoreTypeLabel(value: string): string {
  return CORE_TYPES.find(c => c.value === value)?.label || value;
}
