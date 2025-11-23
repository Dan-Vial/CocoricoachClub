export const INJURY_STATUS = {
  ACTIVE: 'active' as const,
  REHABILITATION: 'recovering' as const,
  HEALED: 'healed' as const,
};

export const INJURY_STATUS_LABELS = {
  [INJURY_STATUS.ACTIVE]: 'Active',
  [INJURY_STATUS.REHABILITATION]: 'En Réathlétisation',
  [INJURY_STATUS.HEALED]: 'Guérie',
};

export const INJURY_SEVERITY = {
  MINOR: 'légère' as const,
  MODERATE: 'modérée' as const,
  SEVERE: 'grave' as const,
};

export const INJURY_SEVERITY_LABELS = {
  [INJURY_SEVERITY.MINOR]: 'Légère',
  [INJURY_SEVERITY.MODERATE]: 'Modérée',
  [INJURY_SEVERITY.SEVERE]: 'Grave',
};

export type InjuryStatus = typeof INJURY_STATUS[keyof typeof INJURY_STATUS];
export type InjurySeverity = typeof INJURY_SEVERITY[keyof typeof INJURY_SEVERITY];
