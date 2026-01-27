export type MetricKey =
  | "player_name"
  | "total_distance_m"
  | "high_speed_distance_m"
  | "sprint_distance_m"
  | "max_speed_ms"
  | "player_load"
  | "accelerations"
  | "decelerations"
  | "duration_minutes"
  | "sprint_count";

export const METRIC_LABELS: Record<MetricKey, string> = {
  player_name: "Nom du joueur",
  total_distance_m: "Distance totale (m)",
  high_speed_distance_m: "Distance haute intensité (m)",
  sprint_distance_m: "Distance sprint (m)",
  max_speed_ms: "Vitesse max",
  player_load: "Player Load",
  accelerations: "Accélérations",
  decelerations: "Décélérations",
  duration_minutes: "Durée (min)",
  sprint_count: "Nombre de sprints",
};

export type ColumnGroup =
  | "identite"
  | "distance"
  | "vitesse"
  | "accelerations"
  | "decelerations"
  | "contacts"
  | "autre";

export const COLUMN_GROUP_LABELS: Record<ColumnGroup, string> = {
  identite: "Identité",
  distance: "Distance",
  vitesse: "Vitesse",
  accelerations: "Accélérations",
  decelerations: "Décélérations",
  contacts: "Contacts",
  autre: "Autres",
};

// Normalize for matching (lowercase, remove accents, remove punctuation, normalize spaces)
export function normalizeHeader(header: string): string {
  return (header ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[()\[\]{}:;,_/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNumberLoose(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const s = typeof value === "number" ? String(value) : String(value);
  const cleaned = s
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(",", ".")
    // keep digits, dot, minus
    .replace(/[^0-9.\-]/g, "");

  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Heuristic: if header indicates km/h OR value looks like km/h, convert to m/s
export function toMetersPerSecond(raw: string | number | undefined | null, header: string): number | null {
  const n = parseNumberLoose(raw);
  if (n === null) return null;

  const h = normalizeHeader(header);
  const headerSaysKmh = h.includes("km h") || h.includes("kmh") || h.includes("kph") || h.includes("km/hr");
  const looksLikeKmh = n > 15; // rugby/football vmax in m/s is usually < 12

  if (headerSaysKmh || looksLikeKmh) return n / 3.6;
  return n;
}

export function findMetricMapping(header: string): MetricKey | null {
  const normalized = normalizeHeader(header);

  // Avoid auto-mapping percentage columns (ex: "% Vmax", "%dist > 18 km/h")
  // (They still remain visible and will be categorized via groups.)
  if (normalized.includes("%") || normalized.includes("percent") || normalized.includes("pourcentage")) {
    return null;
  }

  // Player name patterns
  if (
    /^(player|athlete|nom|joueur|name)/.test(normalized) ||
    /player\s*name/.test(normalized) ||
    /athlete\s*name/.test(normalized)
  ) {
    return "player_name";
  }

  // Max speed / Vmax patterns - CHECK FIRST before distance
  if (
    /\bvmax\b/.test(normalized) ||
    /v\s*max/.test(normalized) ||
    /vitesse\s*max/.test(normalized) ||
    /max\s*speed/.test(normalized) ||
    /top\s*speed/.test(normalized) ||
    /peak\s*speed/.test(normalized) ||
    /maximum\s*speed/.test(normalized)
  ) {
    return "max_speed_ms";
  }

  // Sprint distance patterns (>24, >27 km/h)
  if (
    /sprint\s*dist/.test(normalized) ||
    /dist\s*>\s*2[4-7]/.test(normalized) ||
    /distance\s*>\s*2[4-7]/.test(normalized) ||
    /dist.*sprint/.test(normalized) ||
    /sprinting/.test(normalized)
  ) {
    return "sprint_distance_m";
  }

  // High speed distance patterns (>18, >20, >21 km/h, HSR)
  if (
    /\bhsr\b/.test(normalized) ||
    /high\s*speed/.test(normalized) ||
    /haute\s*intensite/.test(normalized) ||
    /dist\s*>\s*1[8-9]/.test(normalized) ||
    /distance\s*>\s*1[8-9]/.test(normalized) ||
    /dist\s*>\s*2[0-1]/.test(normalized) ||
    /distance\s*>\s*2[0-1]/.test(normalized)
  ) {
    return "high_speed_distance_m";
  }

  // Total distance patterns (must not match high speed or sprint)
  if (
    (/distance\s*totale/.test(normalized) ||
      /total\s*distance/.test(normalized) ||
      /dist\s*totale/.test(normalized) ||
      normalized === "distance" ||
      normalized === "distance m" ||
      /^dist\s*m$/.test(normalized)) &&
    !normalized.includes(">") &&
    !normalized.includes("sprint") &&
    !normalized.includes("hsr") &&
    !normalized.includes("high")
  ) {
    return "total_distance_m";
  }

  // Player load patterns
  if (
    /player\s*load/.test(normalized) ||
    /playerload/.test(normalized) ||
    /body\s*load/.test(normalized) ||
    /charge\s*joueur/.test(normalized) ||
    /^tot\s*pl$/.test(normalized) ||
    /^pl$/.test(normalized) ||
    /^load$/.test(normalized)
  ) {
    return "player_load";
  }

  // Accelerations patterns
  if (/\baccel\b/.test(normalized) || /acceleration/.test(normalized) || /nb\s*accel/.test(normalized)) {
    return "accelerations";
  }

  // Decelerations patterns
  if (/\bdecel\b/.test(normalized) || /deceleration/.test(normalized) || /nb\s*decel/.test(normalized)) {
    return "decelerations";
  }

  // Duration patterns
  if (/duration/.test(normalized) || /duree/.test(normalized) || /session\s*time/.test(normalized) || /^time\b/.test(normalized)) {
    return "duration_minutes";
  }

  // Sprint count patterns
  if (
    /sprint\s*count/.test(normalized) ||
    /nb\s*sprint/.test(normalized) ||
    /number\s*of\s*sprint/.test(normalized) ||
    /^sprints?$/.test(normalized)
  ) {
    return "sprint_count";
  }

  return null;
}

export function guessColumnGroup(header: string, mappedTo: MetricKey | null): ColumnGroup {
  if (mappedTo === "player_name") return "identite";
  if (mappedTo === "max_speed_ms") return "vitesse";
  if (mappedTo === "accelerations") return "accelerations";
  if (mappedTo === "decelerations") return "decelerations";
  if (mappedTo && (mappedTo === "total_distance_m" || mappedTo === "high_speed_distance_m" || mappedTo === "sprint_distance_m")) {
    return "distance";
  }

  const h = normalizeHeader(header);
  if (/^(player|athlete|nom|joueur|name)\b/.test(h)) return "identite";
  if (h.includes("vmax") || h.includes("vitesse") || h.includes("speed") || h.includes("km h") || h.includes("kmh")) return "vitesse";
  if (h.includes("accel") || h.includes("acceleration")) return "accelerations";
  if (h.includes("decel") || h.includes("deceleration")) return "decelerations";
  if (h.includes("contact") || h.includes("impact") || h.includes("collision")) return "contacts";
  if (h.includes("dist") || h.includes("distance") || h.includes("metre") || h.includes("m min") || h.includes("meters")) return "distance";
  return "autre";
}
