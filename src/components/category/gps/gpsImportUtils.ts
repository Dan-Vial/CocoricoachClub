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

/**
 * Parse a value that is expected to be an integer (counts like accelerations, sprints...).
 * If the CSV provides a decimal (ex: rate like 3.12), we round it to avoid DB insert errors.
 */
export function parseIntegerLoose(value: string | number | undefined | null): number | null {
  const n = parseNumberLoose(value);
  if (n === null) return null;
  return Math.round(n);
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

  // Do NOT auto-map per-minute / rate columns to integer count metrics.
  // Example: "acc/min" or "sprints/min" often produce decimals like 3.12.
  const looksLikeRate =
    /\bmin\b/.test(normalized) &&
    (/(\baccel\b|\bacc\b)/.test(normalized) ||
      normalized.includes("acceleration") ||
      /\bdecel\b/.test(normalized) ||
      normalized.includes("deceleration") ||
      /\bsprint\b/.test(normalized));

  if (looksLikeRate) return null;

  // Avoid auto-mapping percentage columns (ex: "% Vmax", "%dist > 18 km/h")
  // (They still remain visible and will be categorized via groups.)
  if (normalized.includes("%") || normalized.includes("percent") || normalized.includes("pourcentage")) {
    return null;
  }

  // Player name patterns - very flexible for different file formats
  const playerNamePatterns = [
    /^(player|athlete|nom|joueur|name)/,
    /player\s*name/,
    /athlete\s*name/,
    /^prenom/,
    /^first\s*name/,
    /^last\s*name/,
    /^full\s*name/,
    /nom\s*complet/,
    /^athl[eè]te$/,
  ];
  if (playerNamePatterns.some((p) => p.test(normalized))) {
    return "player_name";
  }

  // Max speed / Vmax patterns - CHECK FIRST before distance
  const vmaxPatterns = [
    /\bvmax\b/,
    /v\s*max/,
    /vitesse\s*max/,
    /max\s*speed/,
    /top\s*speed/,
    /peak\s*speed/,
    /maximum\s*speed/,
    /max\s*vel/,
    /peak\s*vel/,
    /vitesse\s*de\s*pointe/,
    /pointe\s*de\s*vitesse/,
  ];
  if (vmaxPatterns.some((p) => p.test(normalized))) {
    return "max_speed_ms";
  }

  // Sprint distance patterns (>24, >27 km/h, etc.)
  const sprintDistPatterns = [
    /sprint\s*dist/,
    /dist\s*>\s*2[4-7]/,
    /distance\s*>\s*2[4-7]/,
    /dist.*sprint/,
    /sprinting/,
    /zone\s*6/,
    /very\s*high\s*speed/,
    /tres\s*haute\s*intensite/,
    /z6/,
  ];
  if (sprintDistPatterns.some((p) => p.test(normalized))) {
    return "sprint_distance_m";
  }

  // High speed distance patterns (>18, >20, >21 km/h, HSR)
  const hsrPatterns = [
    /\bhsr\b/,
    /high\s*speed/,
    /haute\s*intensite/,
    /dist\s*>\s*1[8-9]/,
    /distance\s*>\s*1[8-9]/,
    /dist\s*>\s*2[0-1]/,
    /distance\s*>\s*2[0-1]/,
    /zone\s*5/,
    /z5/,
    /running\s*>\s*\d+/,
  ];
  if (hsrPatterns.some((p) => p.test(normalized))) {
    return "high_speed_distance_m";
  }

  // Total distance patterns (must not match high speed or sprint)
  const totalDistPatterns = [
    /distance\s*totale/,
    /total\s*distance/,
    /dist\s*totale/,
    /^distance$/,
    /^distance\s*m$/,
    /^dist\s*m$/,
    /^tot\s*dist/,
    /total\s*dist/,
    /metres\s*covered/,
    /meters\s*covered/,
    /distance\s*covered/,
    /distance\s*parcourue/,
  ];
  if (
    totalDistPatterns.some((p) => p.test(normalized)) &&
    !normalized.includes(">") &&
    !normalized.includes("sprint") &&
    !normalized.includes("hsr") &&
    !normalized.includes("high")
  ) {
    return "total_distance_m";
  }

  // Player load patterns
  const playerLoadPatterns = [
    /player\s*load/,
    /playerload/,
    /body\s*load/,
    /charge\s*joueur/,
    /^tot\s*pl$/,
    /^pl$/,
    /^load$/,
    /metabolic\s*load/,
    /training\s*load/,
    /mechanical\s*load/,
  ];
  if (playerLoadPatterns.some((p) => p.test(normalized))) {
    return "player_load";
  }

  // Accelerations patterns
  const accelPatterns = [
    /\baccel\b/,
    /acceleration/,
    /nb\s*accel/,
    /accel\s*count/,
    /^acc$/,
    /^accelerations?$/,
    /high\s*accel/,
    /total\s*accel/,
    /nombre\s*d?\s*acceleration/,
  ];
  if (accelPatterns.some((p) => p.test(normalized)) && !looksLikeRate) {
    return "accelerations";
  }

  // Decelerations patterns
  const decelPatterns = [
    /\bdecel\b/,
    /deceleration/,
    /nb\s*decel/,
    /decel\s*count/,
    /^dec$/,
    /^decelerations?$/,
    /high\s*decel/,
    /total\s*decel/,
    /nombre\s*d?\s*deceleration/,
  ];
  if (decelPatterns.some((p) => p.test(normalized)) && !looksLikeRate) {
    return "decelerations";
  }

  // Duration patterns
  const durationPatterns = [
    /duration/,
    /duree/,
    /session\s*time/,
    /^time\b/,
    /temps\s*de\s*jeu/,
    /playing\s*time/,
    /match\s*time/,
    /training\s*time/,
    /total\s*time/,
  ];
  if (durationPatterns.some((p) => p.test(normalized))) {
    return "duration_minutes";
  }

  // Sprint count patterns
  const sprintCountPatterns = [
    /sprint\s*count/,
    /nb\s*sprint/,
    /number\s*of\s*sprint/,
    /^sprints?$/,
    /total\s*sprint/,
    /nombre\s*de\s*sprint/,
    /sprint\s*efforts/,
  ];
  if (sprintCountPatterns.some((p) => p.test(normalized)) && !looksLikeRate) {
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
