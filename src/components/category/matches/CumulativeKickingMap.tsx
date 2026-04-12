import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Info } from "lucide-react";

interface KickAttempt {
  x: number;
  y: number;
  kickType: string;
  success: boolean;
}

interface CumulativeKickingMapProps {
  kicks: KickAttempt[];
  playerName: string;
  /** Show even when no kicks, with a message */
  hasKickingStats?: boolean;
}

const KICK_STYLES: Record<string, { label: string; shape: "circle" | "square" | "diamond"; color: string }> = {
  conversion: { label: "Transformation", shape: "circle", color: "#3b82f6" },
  penalty: { label: "Pénalité", shape: "square", color: "#f97316" },
  drop: { label: "Drop", shape: "diamond", color: "#8b5cf6" },
};

const SVG_W = 600;
const SVG_H = 400;
const FIELD_LEFT = 20;
const FIELD_RIGHT = 580;
const FIELD_TOP = 10;
const FIELD_BOTTOM = 390;
const FIELD_W = FIELD_RIGHT - FIELD_LEFT;
const FIELD_H = FIELD_BOTTOM - FIELD_TOP;
const FIELD_LENGTH_M = 100;
const FIELD_WIDTH_M = 70;

function mToSvgX(meters: number, goalsOnRight: boolean): number {
  const tryLineX = goalsOnRight ? 540 : 60;
  const mToSvg = FIELD_W / FIELD_LENGTH_M;
  return goalsOnRight ? tryLineX - meters * mToSvg : tryLineX + meters * mToSvg;
}

function mToSvgY(meters: number): number {
  return FIELD_TOP + (meters / FIELD_WIDTH_M) * FIELD_H;
}

const DISTANCE_LINES = [
  { m: 0, label: "En-but", solid: true, thick: true },
  { m: 10, label: "10m", solid: false, thick: false },
  { m: 22, label: "22m", solid: true, thick: false },
  { m: 30, label: "30m", solid: false, thick: false },
  { m: 40, label: "40m", solid: false, thick: false },
  { m: 50, label: "½", solid: true, thick: true },
];

const WIDTH_MARKS = [5, 15];

export function CumulativeKickingMap({ kicks, playerName, hasKickingStats }: CumulativeKickingMapProps) {
  const goalsOnRight = true;

  // Zone stats based on distance/lateral zones
  const zoneStats = useMemo(() => {
    const zones: Record<string, { success: number; total: number }> = {};
    kicks.forEach(k => {
      const svgX = (k.x / 100) * SVG_W;
      const svgY = (k.y / 100) * SVG_H;
      const tryLineX = 540;
      const rawDist = Math.abs(svgX - tryLineX);
      const distM = Math.round((rawDist / FIELD_W) * FIELD_LENGTH_M);
      const row = distM < 22 ? "proche" : distM < 40 ? "moyen" : "loin";
      
      const centreY = (FIELD_TOP + FIELD_BOTTOM) / 2;
      const lateralM = ((svgY - centreY) / FIELD_H) * FIELD_WIDTH_M;
      const col = lateralM < -10 ? "gauche" : lateralM > 10 ? "droite" : "centre";
      
      const key = `${row}-${col}`;
      if (!zones[key]) zones[key] = { success: 0, total: 0 };
      zones[key].total++;
      if (k.success) zones[key].success++;
    });
    return zones;
  }, [kicks]);

  if (!kicks || kicks.length === 0) {
    if (!hasKickingStats) return null;
    return (
      <Card className="mt-4 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Cartographie des tirs — {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <Info className="h-4 w-4 shrink-0" />
            <p>Les positions de tir ne sont pas encore disponibles. Utilisez le bouton 🎯 lors de la saisie des stats de match pour enregistrer les positions sur le terrain.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Cartographie des tirs — {playerName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ aspectRatio: "3/2" }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
            {/* Field background */}
            <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H}
              fill="#2d8a4e" rx="4" />
            
            {/* Field outline */}
            <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H}
              fill="none" stroke="white" strokeWidth="2" opacity={0.6} />

            {/* Distance lines */}
            {DISTANCE_LINES.map(line => {
              const x = mToSvgX(line.m, goalsOnRight);
              return (
                <g key={line.m}>
                  <line x1={x} y1={FIELD_TOP} x2={x} y2={FIELD_BOTTOM}
                    stroke="white"
                    strokeWidth={line.thick ? 2 : line.solid ? 1.5 : 1}
                    strokeDasharray={line.solid ? undefined : "5 5"}
                    opacity={line.thick ? 0.6 : line.solid ? 0.5 : 0.35} />
                  <text x={x} y={SVG_H} textAnchor="middle" fill="white" fontSize={line.thick ? 9 : 8} opacity={0.5}>
                    {line.label}
                  </text>
                </g>
              );
            })}

            {/* Width marks (5m and 15m from each touchline) */}
            {WIDTH_MARKS.map(wm => {
              const yTop = mToSvgY(wm);
              const yBot = mToSvgY(FIELD_WIDTH_M - wm);
              return (
                <g key={`wm-${wm}`}>
                  <line x1={FIELD_LEFT} y1={yTop} x2={FIELD_RIGHT} y2={yTop}
                    stroke="white" strokeWidth="0.5" strokeDasharray="3 8" opacity={0.25} />
                  <line x1={FIELD_LEFT} y1={yBot} x2={FIELD_RIGHT} y2={yBot}
                    stroke="white" strokeWidth="0.5" strokeDasharray="3 8" opacity={0.25} />
                  <text x={FIELD_LEFT - 2} y={yTop + 3} textAnchor="end" fill="white" fontSize="7" opacity={0.3}>{wm}m</text>
                  <text x={FIELD_LEFT - 2} y={yBot + 3} textAnchor="end" fill="white" fontSize="7" opacity={0.3}>{wm}m</text>
                </g>
              );
            })}

            {/* Posts (right side) */}
            <line x1={FIELD_RIGHT} y1={SVG_H / 2 - 15} x2={FIELD_RIGHT} y2={SVG_H / 2 + 15}
              stroke="white" strokeWidth="4" opacity={0.9} />
            <rect x={565} y={170} width={15} height={60} fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
            <polygon points="570,200 555,190 555,210" fill="white" opacity={0.3} />

            {/* Kick markers with distinct shapes */}
            {kicks.map((kick, i) => {
              const cx = FIELD_LEFT + (kick.x / 100) * FIELD_W;
              const cy = FIELD_TOP + (kick.y / 100) * FIELD_H;
              const style = KICK_STYLES[kick.kickType] || KICK_STYLES.penalty;
              const fill = kick.success ? "#22c55e" : "#ef4444";
              const stroke = style.color;
              const r = 7;

              if (style.shape === "circle") {
                return <circle key={i} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} />;
              }
              if (style.shape === "square") {
                return <rect key={i} x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} rx={2} />;
              }
              return (
                <polygon key={i}
                  points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                  fill={fill} stroke={stroke} strokeWidth={2} opacity={0.85} />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs">
          {Object.entries(KICK_STYLES).map(([key, style]) => {
            const count = kicks.filter(k => k.kickType === key).length;
            if (count === 0) return null;
            const success = kicks.filter(k => k.kickType === key && k.success).length;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: style.color }} />
                <span>{style.label}: {success}/{count}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Réussi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Raté</span>
          </div>
        </div>

        {/* Zone breakdown */}
        {Object.keys(zoneStats).length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1 text-center font-medium">Statistiques par zone</p>
            <div className="grid grid-cols-3 gap-1 text-xs text-center">
              <div className="text-muted-foreground text-[10px]">Gauche</div>
              <div className="text-muted-foreground text-[10px]">Centre</div>
              <div className="text-muted-foreground text-[10px]">Droite</div>
              {["proche", "moyen", "loin"].map(row => (
                ["gauche", "centre", "droite"].map(col => {
                  const key = `${row}-${col}`;
                  const zone = zoneStats[key];
                  if (!zone) return <div key={key} className="p-1.5 bg-muted/30 rounded text-muted-foreground">—</div>;
                  const rate = Math.round((zone.success / zone.total) * 100);
                  const bg = rate >= 70 ? "bg-emerald-100 dark:bg-emerald-950/40" : rate >= 40 ? "bg-amber-100 dark:bg-amber-950/40" : "bg-red-100 dark:bg-red-950/40";
                  return (
                    <div key={key} className={`p-1.5 rounded ${bg}`}>
                      <span className="font-semibold">{rate}%</span>
                      <span className="text-muted-foreground ml-1">({zone.success}/{zone.total})</span>
                    </div>
                  );
                })
              ))}
              <div className="text-muted-foreground text-[10px]">0-22m</div>
              <div className="text-muted-foreground text-[10px]">22-40m</div>
              <div className="text-muted-foreground text-[10px]">40m+</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
