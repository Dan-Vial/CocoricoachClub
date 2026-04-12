import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface KickAttempt {
  x: number;
  y: number;
  kickType: string;
  success: boolean;
}

interface CumulativeKickingMapProps {
  kicks: KickAttempt[];
  playerName: string;
}

const KICK_STYLES: Record<string, { label: string; shape: "circle" | "square" | "diamond"; color: string }> = {
  conversion: { label: "Transformation", shape: "circle", color: "#3b82f6" },
  penalty: { label: "Pénalité", shape: "square", color: "#f97316" },
  drop: { label: "Drop", shape: "diamond", color: "#8b5cf6" },
};

export function CumulativeKickingMap({ kicks, playerName }: CumulativeKickingMapProps) {
  if (!kicks || kicks.length === 0) return null;

  const SVG_W = 600;
  const SVG_H = 400;
  const FIELD_LEFT = 20;
  const FIELD_RIGHT = 580;
  const FIELD_TOP = 10;
  const FIELD_BOTTOM = 390;

  // Zone stats
  const zoneStats = useMemo(() => {
    const zones: Record<string, { success: number; total: number }> = {};
    kicks.forEach(k => {
      // Simple zone: divide field into 3x3 grid
      const col = k.x < 33 ? "gauche" : k.x < 66 ? "centre" : "droite";
      const row = k.y < 33 ? "proche" : k.y < 66 ? "moyen" : "loin";
      const key = `${row}-${col}`;
      if (!zones[key]) zones[key] = { success: 0, total: 0 };
      zones[key].total++;
      if (k.success) zones[key].success++;
    });
    return zones;
  }, [kicks]);

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
            <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_RIGHT - FIELD_LEFT} height={FIELD_BOTTOM - FIELD_TOP}
              fill="#2d8a4e" rx="4" />
            
            {/* Field lines */}
            {[0, 10, 22, 30, 40, 50].map(m => {
              const x = FIELD_LEFT + (m / 100) * (FIELD_RIGHT - FIELD_LEFT);
              const xR = FIELD_RIGHT - (m / 100) * (FIELD_RIGHT - FIELD_LEFT);
              return (
                <g key={m}>
                  <line x1={x} y1={FIELD_TOP} x2={x} y2={FIELD_BOTTOM}
                    stroke="white" strokeWidth={m === 0 || m === 50 ? 2 : 1}
                    strokeDasharray={m === 10 || m === 30 || m === 40 ? "4,4" : "none"}
                    opacity={0.5} />
                  {m > 0 && m < 50 && (
                    <line x1={xR} y1={FIELD_TOP} x2={xR} y2={FIELD_BOTTOM}
                      stroke="white" strokeWidth={1}
                      strokeDasharray={m === 10 || m === 30 || m === 40 ? "4,4" : "none"}
                      opacity={0.5} />
                  )}
                  {m > 0 && m < 50 && (
                    <>
                      <text x={x + 2} y={FIELD_TOP + 14} fill="white" fontSize="9" opacity={0.6}>{m}m</text>
                      <text x={xR + 2} y={FIELD_TOP + 14} fill="white" fontSize="9" opacity={0.6}>{m}m</text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Goal posts (right side) */}
            <line x1={FIELD_RIGHT} y1={SVG_H / 2 - 15} x2={FIELD_RIGHT} y2={SVG_H / 2 + 15}
              stroke="white" strokeWidth="3" />

            {/* Kick markers */}
            {kicks.map((kick, i) => {
              const cx = FIELD_LEFT + (kick.x / 100) * (FIELD_RIGHT - FIELD_LEFT);
              const cy = FIELD_TOP + (kick.y / 100) * (FIELD_BOTTOM - FIELD_TOP);
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
              // diamond
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
          <div className="mt-3 grid grid-cols-3 gap-1 text-xs text-center">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
