/**
 * Kicking field zone logic: computes distances & zone-based stats.
 * Field SVG is 600×400, play area 20–580 x 10–390.
 * Real field: ~100m long, ~70m wide.
 */

export interface KickAttempt {
  id: string;
  x: number; // 0-100 (% of SVG width)
  y: number; // 0-100 (% of SVG height)
  kickType: string;
  success: boolean;
}

/** Distance bands (from posts) */
const DISTANCE_BANDS = [
  { key: "0-22", label: "0–22m", min: 0, max: 22 },
  { key: "22-30", label: "22–30m", min: 22, max: 30 },
  { key: "30-40", label: "30–40m", min: 30, max: 40 },
  { key: "40-50", label: "40–50m", min: 40, max: 50 },
  { key: "50+", label: "50m+", min: 50, max: 100 },
] as const;

/** Lateral bands (from centre) */
const LATERAL_BANDS = [
  { key: "left", label: "Gauche", min: -35, max: -10 },
  { key: "center-left", label: "Centre-G", min: -10, max: 0 },
  { key: "center-right", label: "Centre-D", min: 0, max: 10 },
  { key: "right", label: "Droite", min: 10, max: 35 },
] as const;

// Field constants (SVG coordinates)
const FIELD_LEFT = 20;
const FIELD_RIGHT = 580;
const FIELD_TOP = 10;
const FIELD_BOTTOM = 390;
const FIELD_W = FIELD_RIGHT - FIELD_LEFT; // 560
const FIELD_H = FIELD_BOTTOM - FIELD_TOP; // 380

// Real dimensions in meters
const FIELD_LENGTH_M = 100; // in-play length
const FIELD_WIDTH_M = 70;

/**
 * Convert a kick's (x%, y%) to real-world distances.
 * @returns { distFromPosts: meters, distFromTouchLeft: meters, lateralOffset: meters (negative = left, positive = right) }
 */
export function getKickDistances(
  xPct: number,
  yPct: number,
  goalsOnRight: boolean
): { distFromPosts: number; lateralOffset: number; touchLeft: number; touchRight: number } {
  // Convert % to SVG coords
  const svgX = (xPct / 100) * 600;
  const svgY = (yPct / 100) * 400;

  // Try-line SVG x
  const tryLineX = goalsOnRight ? 540 : 60;

  // Distance from posts (horizontal) in SVG units relative to field width
  const rawDist = Math.abs(svgX - tryLineX);
  const distFromPosts = Math.round((rawDist / FIELD_W) * FIELD_LENGTH_M);

  // Lateral position: centre of field is SVG y=200
  const centreY = (FIELD_TOP + FIELD_BOTTOM) / 2; // 200
  const lateralSvg = svgY - centreY; // positive = towards bottom
  const lateralOffset = Math.round(((lateralSvg) / FIELD_H) * FIELD_WIDTH_M);

  // Distance from each touchline
  const touchLeft = Math.round(((svgY - FIELD_TOP) / FIELD_H) * FIELD_WIDTH_M);
  const touchRight = FIELD_WIDTH_M - touchLeft;

  return { distFromPosts, lateralOffset, touchLeft, touchRight };
}

/** Human-readable position label */
export function getPositionLabel(xPct: number, yPct: number, goalsOnRight: boolean): string {
  const d = getKickDistances(xPct, yPct, goalsOnRight);
  const side = d.lateralOffset < -5 ? "gauche" : d.lateralOffset > 5 ? "droite" : "centre";
  const lateralAbs = Math.abs(d.lateralOffset);
  const lateralStr = lateralAbs <= 5 ? "au centre" : `à ${lateralAbs}m côté ${side}`;
  return `${d.distFromPosts}m des poteaux, ${lateralStr}`;
}

/** Zone key = "dist_lateral" */
function getZoneKey(xPct: number, yPct: number, goalsOnRight: boolean): string {
  const d = getKickDistances(xPct, yPct, goalsOnRight);
  const distBand = DISTANCE_BANDS.find(b => d.distFromPosts >= b.min && d.distFromPosts < b.max) || DISTANCE_BANDS[DISTANCE_BANDS.length - 1];
  const latBand = LATERAL_BANDS.find(b => d.lateralOffset >= b.min && d.lateralOffset < b.max) || (d.lateralOffset < -10 ? LATERAL_BANDS[0] : LATERAL_BANDS[LATERAL_BANDS.length - 1]);
  return `${distBand.key}_${latBand.key}`;
}

export interface ZoneStat {
  zoneKey: string;
  distLabel: string;
  latLabel: string;
  total: number;
  success: number;
  rate: number;
  /** SVG rect bounds (x, y, w, h) for overlay */
  svgRect: { x: number; y: number; w: number; h: number };
}

/**
 * Compute zone-based stats from kicks.
 */
export function computeZoneStats(kicks: KickAttempt[], goalsOnRight: boolean, filterType?: string): ZoneStat[] {
  const filtered = filterType ? kicks.filter(k => k.kickType === filterType) : kicks;
  
  // Build zone map
  const zoneMap = new Map<string, { total: number; success: number }>();
  filtered.forEach(k => {
    const key = getZoneKey(k.x, k.y, goalsOnRight);
    const cur = zoneMap.get(key) || { total: 0, success: 0 };
    cur.total++;
    if (k.success) cur.success++;
    zoneMap.set(key, cur);
  });

  const stats: ZoneStat[] = [];
  DISTANCE_BANDS.forEach(db => {
    LATERAL_BANDS.forEach(lb => {
      const key = `${db.key}_${lb.key}`;
      const data = zoneMap.get(key);
      if (!data || data.total === 0) return;

      // Compute SVG rect for zone overlay
      const svgRect = computeZoneSvgRect(db, lb, goalsOnRight);

      stats.push({
        zoneKey: key,
        distLabel: db.label,
        latLabel: lb.label,
        total: data.total,
        success: data.success,
        rate: Math.round((data.success / data.total) * 100),
        svgRect,
      });
    });
  });

  return stats;
}

function computeZoneSvgRect(
  db: (typeof DISTANCE_BANDS)[number],
  lb: (typeof LATERAL_BANDS)[number],
  goalsOnRight: boolean
): { x: number; y: number; w: number; h: number } {
  // Convert distance meters to SVG x positions
  const tryLineX = goalsOnRight ? 540 : 60;
  const mToSvg = FIELD_W / FIELD_LENGTH_M;

  let x1: number, x2: number;
  if (goalsOnRight) {
    x1 = tryLineX - db.max * mToSvg;
    x2 = tryLineX - db.min * mToSvg;
  } else {
    x1 = tryLineX + db.min * mToSvg;
    x2 = tryLineX + db.max * mToSvg;
  }

  // Convert lateral meters to SVG y positions
  // lateralOffset in meters: negative = top half, positive = bottom half
  const centreY = 200;
  const mToSvgY = FIELD_H / FIELD_WIDTH_M;
  const y1 = centreY + lb.min * mToSvgY;
  const y2 = centreY + lb.max * mToSvgY;

  return {
    x: Math.max(FIELD_LEFT, Math.min(x1, x2)),
    y: Math.max(FIELD_TOP, Math.min(y1, y2)),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}
