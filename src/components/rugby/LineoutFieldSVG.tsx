import { useMemo } from "react";

export interface LineoutZone {
  distanceKey: string;
  heightKey: string;
  label: string;
}

export interface LineoutZoneStat {
  distanceKey: string;
  heightKey: string;
  attempts: number;
  successes: number;
}

interface LineoutFieldSVGProps {
  onZoneClick?: (zone: LineoutZone) => void;
  zoneStats?: LineoutZoneStat[];
  disabled?: boolean;
  className?: string;
}

// Distance zones (horizontal - from thrower)
export const LINEOUT_DISTANCES = [
  { key: "devant", label: "Devant", description: "2-4m", rangeM: "2-4m" },
  { key: "milieu", label: "Milieu", description: "6-8m", rangeM: "6-8m" },
  { key: "fond", label: "Fond", description: "12-15m", rangeM: "12-15m" },
] as const;

// Height zones (vertical)
export const LINEOUT_HEIGHTS = [
  { key: "haute", label: "Haute", description: "Sauteur bras tendus" },
  { key: "moyenne", label: "Moyenne", description: "Hauteur épaules" },
  { key: "basse", label: "Basse", description: "Hauteur taille" },
] as const;

const SVG_W = 500;
const SVG_H = 320;
const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 35;
const MARGIN_BOTTOM = 50;
const GRID_W = SVG_W - MARGIN_LEFT - MARGIN_RIGHT;
const GRID_H = SVG_H - MARGIN_TOP - MARGIN_BOTTOM;

export function LineoutFieldSVG({
  onZoneClick,
  zoneStats = [],
  disabled = false,
  className = "",
}: LineoutFieldSVGProps) {
  const statMap = useMemo(() => {
    const m = new Map<string, LineoutZoneStat>();
    zoneStats.forEach(s => m.set(`${s.distanceKey}_${s.heightKey}`, s));
    return m;
  }, [zoneStats]);

  const cols = LINEOUT_DISTANCES.length;
  const rows = LINEOUT_HEIGHTS.length;
  const cellW = GRID_W / cols;
  const cellH = GRID_H / rows;

  return (
    <div className={`relative w-full ${className}`}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full border-2 border-primary/20 rounded-lg bg-emerald-700/90 dark:bg-emerald-900/80">
        {/* Title */}
        <text x={SVG_W / 2} y={22} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" opacity={0.9}>
          Cartographie Touche (Lanceur)
        </text>

        {/* Touch line (left border) */}
        <line x1={MARGIN_LEFT} y1={MARGIN_TOP} x2={MARGIN_LEFT} y2={MARGIN_TOP + GRID_H} stroke="white" strokeWidth="3" opacity={0.8} />
        <text x={MARGIN_LEFT - 5} y={MARGIN_TOP + GRID_H / 2} textAnchor="middle" fill="white" fontSize="9" opacity={0.6} transform={`rotate(-90, ${MARGIN_LEFT - 5}, ${MARGIN_TOP + GRID_H / 2})`}>
          Ligne de touche
        </text>

        {/* Thrower icon area */}
        <text x={MARGIN_LEFT - 30} y={MARGIN_TOP + GRID_H + 20} textAnchor="middle" fill="white" fontSize="20" opacity={0.7}>
          🏉
        </text>
        <text x={MARGIN_LEFT - 30} y={MARGIN_TOP + GRID_H + 35} textAnchor="middle" fill="white" fontSize="8" opacity={0.5}>
          Lanceur
        </text>

        {/* Height labels on left */}
        {LINEOUT_HEIGHTS.map((h, ri) => {
          const cy = MARGIN_TOP + ri * cellH + cellH / 2;
          return (
            <g key={h.key}>
              <text x={MARGIN_LEFT - 40} y={cy - 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity={0.8}>
                {h.label}
              </text>
              <text x={MARGIN_LEFT - 40} y={cy + 8} textAnchor="middle" fill="white" fontSize="7" opacity={0.5}>
                {h.description}
              </text>
            </g>
          );
        })}

        {/* Distance labels at bottom */}
        {LINEOUT_DISTANCES.map((d, ci) => {
          const cx = MARGIN_LEFT + ci * cellW + cellW / 2;
          return (
            <g key={d.key}>
              <text x={cx} y={MARGIN_TOP + GRID_H + 18} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" opacity={0.8}>
                {d.label}
              </text>
              <text x={cx} y={MARGIN_TOP + GRID_H + 30} textAnchor="middle" fill="white" fontSize="8" opacity={0.5}>
                ({d.rangeM})
              </text>
            </g>
          );
        })}

        {/* Distance arrow */}
        <line x1={MARGIN_LEFT + 10} y1={MARGIN_TOP + GRID_H + 42} x2={MARGIN_LEFT + GRID_W - 10} y2={MARGIN_TOP + GRID_H + 42} stroke="white" strokeWidth="1" opacity={0.3} markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="white" opacity="0.4" />
          </marker>
        </defs>
        <text x={MARGIN_LEFT + GRID_W / 2} y={MARGIN_TOP + GRID_H + 48} textAnchor="middle" fill="white" fontSize="7" opacity={0.4}>
          Distance du lanceur →
        </text>

        {/* Grid cells */}
        {LINEOUT_DISTANCES.map((d, ci) => (
          LINEOUT_HEIGHTS.map((h, ri) => {
            const x = MARGIN_LEFT + ci * cellW;
            const y = MARGIN_TOP + ri * cellH;
            const key = `${d.key}_${h.key}`;
            const stat = statMap.get(key);
            const hasData = stat && stat.attempts > 0;
            const rate = hasData ? Math.round((stat.successes / stat.attempts) * 100) : -1;
            const fillColor = !hasData ? "rgba(255,255,255,0.08)" :
              rate >= 75 ? "rgba(34,197,94,0.5)" :
              rate >= 50 ? "rgba(245,158,11,0.5)" :
              "rgba(239,68,68,0.5)";
            const strokeColor = !hasData ? "rgba(255,255,255,0.2)" :
              rate >= 75 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";

            return (
              <g key={key}
                className={!disabled && onZoneClick ? "cursor-pointer" : ""}
                onClick={() => {
                  if (!disabled && onZoneClick) {
                    onZoneClick({ distanceKey: d.key, heightKey: h.key, label: `${d.label} - ${h.label}` });
                  }
                }}
              >
                <rect
                  x={x + 2} y={y + 2}
                  width={cellW - 4} height={cellH - 4}
                  rx={6} ry={6}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={hasData ? 2 : 1}
                />
                {/* Hover effect */}
                {!disabled && onZoneClick && (
                  <rect
                    x={x + 2} y={y + 2}
                    width={cellW - 4} height={cellH - 4}
                    rx={6} ry={6}
                    fill="transparent"
                    className="hover:fill-white/10 transition-colors"
                  />
                )}
                {hasData ? (
                  <>
                    <text x={x + cellW / 2} y={y + cellH / 2 - 5} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                      {rate}%
                    </text>
                    <text x={x + cellW / 2} y={y + cellH / 2 + 12} textAnchor="middle" fill="white" fontSize="10" opacity={0.8}>
                      {stat.successes}/{stat.attempts}
                    </text>
                  </>
                ) : (
                  <text x={x + cellW / 2} y={y + cellH / 2 + 4} textAnchor="middle" fill="white" fontSize="10" opacity={0.3}>
                    —
                  </text>
                )}
              </g>
            );
          })
        ))}

        {/* Jumper silhouettes (decorative) */}
        {LINEOUT_DISTANCES.map((d, ci) => {
          const cx = MARGIN_LEFT + ci * cellW + cellW / 2;
          return (
            <text key={`jumper-${d.key}`} x={cx} y={MARGIN_TOP - 5} textAnchor="middle" fill="white" fontSize="14" opacity={0.3}>
              🧍
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Convert old flat lineout entries (zone_y=20/50/80) + new format to LineoutZoneStat[] */
export function aggregateLineoutStats(entries: Array<{ zone_x?: number | null; zone_y?: number | null; exercise_label?: string | null; attempts?: number; successes?: number; lineout_distance?: string | null; lineout_height?: string | null }>): LineoutZoneStat[] {
  const map = new Map<string, { attempts: number; successes: number }>();

  entries.forEach(e => {
    if (!e.exercise_label?.includes("Touche")) return;
    
    let distKey: string | null = null;
    let heightKey: string | null = null;

    // New format with explicit fields
    if (e.lineout_distance && e.lineout_height) {
      distKey = e.lineout_distance;
      heightKey = e.lineout_height;
    }
    // Legacy format: zone_y maps to distance, default to "moyenne" height
    else if (e.zone_y != null) {
      if (e.zone_y === 20) distKey = "devant";
      else if (e.zone_y === 50) distKey = "milieu";
      else if (e.zone_y === 80) distKey = "fond";
      heightKey = "moyenne";
    }

    if (!distKey || !heightKey) return;

    const key = `${distKey}_${heightKey}`;
    const prev = map.get(key) || { attempts: 0, successes: 0 };
    prev.attempts += e.attempts || 0;
    prev.successes += e.successes || 0;
    map.set(key, prev);
  });

  return Array.from(map.entries()).map(([key, stat]) => {
    const [distanceKey, heightKey] = key.split("_");
    return { distanceKey, heightKey, ...stat };
  });
}
