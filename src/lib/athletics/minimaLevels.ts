/**
 * Niveaux de minimas en athlétisme.
 * Permet de classer les seuils de qualification par échelon de compétition.
 */

export interface MinimaLevel {
  value: string;
  label: string;
  /** Couleur courte pour les badges (semantic token classes) */
  badgeClass: string;
  /** Ordre logique d'importance */
  rank: number;
}

export const MINIMA_LEVELS: MinimaLevel[] = [
  { value: "club", label: "Club", badgeClass: "bg-muted text-muted-foreground", rank: 1 },
  { value: "departemental", label: "Départemental", badgeClass: "bg-muted text-muted-foreground", rank: 2 },
  { value: "regional", label: "Régional", badgeClass: "bg-secondary text-secondary-foreground", rank: 3 },
  { value: "national", label: "National", badgeClass: "bg-primary/15 text-primary", rank: 4 },
  { value: "elite_nationale", label: "Élite Nationale", badgeClass: "bg-primary/25 text-primary", rank: 5 },
  { value: "international", label: "International", badgeClass: "bg-accent text-accent-foreground", rank: 6 },
  { value: "championnats_europe", label: "Championnats d'Europe", badgeClass: "bg-accent text-accent-foreground", rank: 7 },
  { value: "championnats_monde", label: "Championnats du Monde", badgeClass: "bg-accent text-accent-foreground", rank: 8 },
  { value: "jeux_olympiques", label: "Jeux Olympiques", badgeClass: "bg-primary text-primary-foreground", rank: 9 },
  { value: "meeting", label: "Meeting", badgeClass: "bg-secondary text-secondary-foreground", rank: 10 },
];

export function getMinimaLevel(value?: string | null): MinimaLevel | undefined {
  if (!value) return undefined;
  return MINIMA_LEVELS.find((l) => l.value === value);
}

export function getMinimaLevelLabel(value?: string | null): string {
  return getMinimaLevel(value)?.label || value || "—";
}
