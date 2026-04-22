import type { StatField } from "@/lib/constants/sportStats";

/**
 * Sub-group definitions for organizing stats inside each category.
 * Keys are matched against `StatField.key` (case-insensitive).
 *
 * Used by:
 * - Stats Équipe (TeamCumulativeStats)
 * - Stats Individuelles (PlayerCumulativeStats)
 * - Tableau détaillé (PlayerCumulativeStats)
 * - Saisie des stats (CompetitionRoundsDialog)
 */
export const STAT_SUB_GROUPS: Record<
  string,
  { key: string; label: string; match: (k: string) => boolean }[]
> = {
  general: [
    { key: "scrums", label: "Mêlées", match: (k) => /^scrum/i.test(k) },
    { key: "lineouts", label: "Touches", match: (k) => /^lineout/i.test(k) },
  ],
  scoring: [
    { key: "tries", label: "Essais", match: (k) => /^tries$|^tryassists$/i.test(k) },
    { key: "conversions", label: "Transformations", match: (k) => /^conversion/i.test(k) },
    {
      key: "penalties",
      label: "Pénalités",
      match: (k) =>
        /^penalt(y|ies)(scored|attempts)?$/i.test(k) ||
        /^penaltyattempts$|^penaltiesscored$/i.test(k),
    },
    { key: "drops", label: "Drops", match: (k) => /^drop/i.test(k) },
  ],
  attack: [
    { key: "carrying", label: "Portage", match: (k) => /^(carries|metersGained|postContactMeters|totalContacts|defendersBeaten)$/i.test(k) },
    { key: "breaks", label: "Franchissements", match: (k) => /^(breakthroughs|lineBreaks|cleanBreaks|offloads)$/i.test(k) },
    { key: "passing", label: "Passes & Pied", match: (k) => /^(passes|passesAttempted|passAccuracy|kicksFromHand|kickMeters|longBalls|throughBalls|keyPasses|crosses|crossesAccurate|throwouts|goalKicks)$/i.test(k) },
    { key: "duels", label: "Duels & Dribbles", match: (k) => /^(duelsWon|aerialDuelsWon|dribbles|dribblesAttempted|touches)$/i.test(k) },
    { key: "ballControl", label: "Possession", match: (k) => /^(possessionWon|possessionLost|turnoversWon)$/i.test(k) },
  ],
  defense: [
    { key: "tackling", label: "Plaquages", match: (k) => /^(tackles|tacklesMissed|tackleSuccess|dominantTackles|tacklesWon)$/i.test(k) },
    { key: "collisions", label: "Collisions", match: (k) => /^defenseCollisions/i.test(k) },
    { key: "recoveries", label: "Récupérations", match: (k) => /^(defensiveRecoveries|jackalWins|turnoversLost|steals|interceptions|forcedTurnovers|offsidesCaught)$/i.test(k) },
    { key: "blocks", label: "Contres & Blocages", match: (k) => /^(blocks|blockedShots|clearances)$/i.test(k) },
    { key: "discipline", label: "Discipline", match: (k) => /^(penaltiesConceded|foulsCommitted|foulsWon|errorsLeadingToGoal|ownGoals)$/i.test(k) },
    { key: "goalkeeping", label: "Gardien", match: (k) => /^(penaltiesSaved|highClaims|punches)$/i.test(k) },
  ],
};

/** Theme color palette — utility classes that handle light/dark mode */
export const STAT_GROUP_PALETTE = [
  {
    head: "bg-sky-100 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-900",
    body: "bg-sky-50/50 dark:bg-sky-950/20",
    ring: "border-sky-300/70 dark:border-sky-800/70",
    soft: "bg-sky-50/60 dark:bg-sky-950/15",
    accent: "text-sky-700 dark:text-sky-300",
  },
  {
    head: "bg-violet-100 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 border-violet-200 dark:border-violet-900",
    body: "bg-violet-50/50 dark:bg-violet-950/20",
    ring: "border-violet-300/70 dark:border-violet-800/70",
    soft: "bg-violet-50/60 dark:bg-violet-950/15",
    accent: "text-violet-700 dark:text-violet-300",
  },
  {
    head: "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900",
    body: "bg-amber-50/50 dark:bg-amber-950/20",
    ring: "border-amber-300/70 dark:border-amber-800/70",
    soft: "bg-amber-50/60 dark:bg-amber-950/15",
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    head: "bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900",
    body: "bg-rose-50/50 dark:bg-rose-950/20",
    ring: "border-rose-300/70 dark:border-rose-800/70",
    soft: "bg-rose-50/60 dark:bg-rose-950/15",
    accent: "text-rose-700 dark:text-rose-300",
  },
  {
    head: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900",
    body: "bg-emerald-50/50 dark:bg-emerald-950/20",
    ring: "border-emerald-300/70 dark:border-emerald-800/70",
    soft: "bg-emerald-50/60 dark:bg-emerald-950/15",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    head: "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-900",
    body: "bg-cyan-50/50 dark:bg-cyan-950/20",
    ring: "border-cyan-300/70 dark:border-cyan-800/70",
    soft: "bg-cyan-50/60 dark:bg-cyan-950/15",
    accent: "text-cyan-700 dark:text-cyan-300",
  },
];

export type StatGroupColor = (typeof STAT_GROUP_PALETTE)[number];

export interface StatGroup {
  key: string;
  label: string | null;
  items: StatField[];
  color: StatGroupColor | null;
}

/** Group a list of stats by sub-theme for the given category. */
export function groupStatsByTheme(
  categoryKey: string,
  statsList: StatField[],
  options?: { fallbackOthersLabel?: string }
): StatGroup[] {
  const defs = STAT_SUB_GROUPS[categoryKey] || [];
  if (defs.length === 0) {
    return [{ key: "_all", label: null, items: statsList, color: null }];
  }
  const buckets: StatGroup[] = defs.map((d, idx) => ({
    key: d.key,
    label: d.label,
    items: [],
    color: STAT_GROUP_PALETTE[idx % STAT_GROUP_PALETTE.length],
  }));
  const others: StatField[] = [];
  statsList.forEach((s) => {
    const def = defs.find((d) => d.match(s.key));
    if (def) {
      buckets.find((b) => b.key === def.key)!.items.push(s);
    } else {
      others.push(s);
    }
  });
  const result = buckets.filter((b) => b.items.length > 0);
  if (others.length > 0) {
    result.push({
      key: "_others",
      label: result.length > 0 ? options?.fallbackOthersLabel ?? "Autres" : null,
      items: others,
      color:
        result.length > 0
          ? STAT_GROUP_PALETTE[result.length % STAT_GROUP_PALETTE.length]
          : null,
    });
  }
  return result;
}
