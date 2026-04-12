import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Info } from "lucide-react";
import { RugbyFieldSvg } from "./RugbyFieldSvg";

interface KickAttempt {
  x: number;
  y: number;
  kickType: string;
  success: boolean;
}

interface CumulativeKickingMapProps {
  kicks: KickAttempt[];
  playerName: string;
  hasKickingStats?: boolean;
}

const KICK_STYLES: Record<string, { label: string; shape: "circle" | "square" | "diamond"; color: string }> = {
  conversion: { label: "Transformation", shape: "circle", color: "#3b82f6" },
  penalty: { label: "Pénalité", shape: "square", color: "#f97316" },
  drop: { label: "Drop", shape: "diamond", color: "#8b5cf6" },
};

const SVG_W = 700;
const SVG_H = 400;
const FIELD_LEFT = 20;
const FIELD_RIGHT = 680;
const FIELD_TOP = 10;
const FIELD_BOTTOM = 390;
const FIELD_W = FIELD_RIGHT - FIELD_LEFT;
const FIELD_H = FIELD_BOTTOM - FIELD_TOP;
const FIELD_LENGTH_M = 100;
const FIELD_WIDTH_M = 70;

export function CumulativeKickingMap({ kicks, playerName, hasKickingStats }: CumulativeKickingMapProps) {
  const zoneStats = useMemo(() => {
    const zones: Record<string, { success: number; total: number }> = {};
    kicks.forEach(k => {
      // k.x and k.y are 0-100 percentages of the field area
      // Right try line is at 95% of the field, left try line at 5%
      // Distance between try lines (90% of field) = 100m
      const tryLinePct = 95;
      const distPct = Math.abs(tryLinePct - k.x);
      const distM = Math.round((distPct / 90) * FIELD_LENGTH_M);
      const row = distM < 22 ? "proche" : distM < 40 ? "moyen" : "loin";

      // Lateral: k.y 0=top, 100=bottom, center=50. Field is 70m wide.
      const lateralM = ((k.y - 50) / 100) * FIELD_WIDTH_M;
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
        <div className="relative w-full" style={{ aspectRatio: "7/4" }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
            <RugbyFieldSvg
              svgW={SVG_W} svgH={SVG_H}
              fieldLeft={FIELD_LEFT} fieldRight={FIELD_RIGHT}
              fieldTop={FIELD_TOP} fieldBottom={FIELD_BOTTOM}
            />

            {/* Kick markers */}
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
