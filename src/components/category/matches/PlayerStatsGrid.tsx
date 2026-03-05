import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type StatField } from "@/lib/constants/sportStats";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlayerStats {
  playerId: string;
  playerName: string;
  position: string;
  isGoalkeeper: boolean;
  [key: string]: string | number | boolean;
}

interface PlayerStatsGridProps {
  players: PlayerStats[];
  stats: StatField[];
  onUpdateStat: (playerId: string, statKey: string, value: number) => void;
  supportsGoalkeeper: boolean;
}

export function PlayerStatsGrid({ players, stats, onUpdateStat, supportsGoalkeeper }: PlayerStatsGridProps) {
  const isMobile = useIsMobile();

  // Sort players by position number (starters first 1-15/23, then subs)
  const sortedPlayers = [...players].sort((a, b) => {
    const posA = a.position || "";
    const posB = b.position || "";
    const numA = posA.startsWith("SUB") ? 100 + parseInt(posA.replace("SUB", "")) : parseInt(posA) || 99;
    const numB = posB.startsWith("SUB") ? 100 + parseInt(posB.replace("SUB", "")) : parseInt(posB) || 99;
    return numA - numB;
  });

  if (stats.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        Aucune statistique activée pour cette catégorie.
      </p>
    );
  }

  // Mobile: card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {sortedPlayers.map(player => (
          <div key={player.playerId} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {player.position?.startsWith("SUB") ? `R${player.position.replace("SUB", "")}` : `#${player.position || "?"}`}
              </Badge>
              <span className="font-medium text-sm truncate">{player.playerName}</span>
              {player.isGoalkeeper && supportsGoalkeeper && (
                <Badge variant="secondary" className="text-[10px]">GK</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stats.map(stat => {
                const rawValue = player[stat.key] as number;
                if (stat.computedFrom) {
                  return (
                    <div key={stat.key} className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground truncate">{stat.shortLabel}</span>
                      <span className="text-sm font-semibold text-primary">{rawValue || 0}%</span>
                    </div>
                  );
                }
                return (
                  <div key={stat.key} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground truncate flex-1">{stat.shortLabel}</span>
                    <Input
                      type="number"
                      value={rawValue === 0 ? "" : String(rawValue)}
                      onChange={(e) => onUpdateStat(player.playerId, stat.key, parseFloat(e.target.value) || 0)}
                      min={stat.min ?? 0}
                      max={stat.max}
                      className="h-7 w-16 text-sm text-center"
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop: table layout
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-2 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[140px]">
              Joueur
            </th>
            {stats.map(stat => (
              <th 
                key={stat.key} 
                className="px-1 py-2 font-medium text-muted-foreground text-center whitespace-nowrap"
                title={stat.label}
              >
                <span className="text-xs">{stat.shortLabel}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player, idx) => {
            const isSub = player.position?.startsWith("SUB");
            return (
              <tr 
                key={player.playerId} 
                className={`border-b transition-colors hover:bg-muted/30 ${
                  isSub ? "bg-orange-50/50 dark:bg-orange-950/10" : ""
                } ${idx === 0 || (isSub && !sortedPlayers[idx - 1]?.position?.startsWith("SUB")) ? "" : ""}`}
              >
                <td className="px-2 py-1.5 sticky left-0 bg-background z-10 border-r">
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant={isSub ? "outline" : "default"} 
                      className={`text-[10px] font-mono px-1.5 py-0 h-5 shrink-0 ${isSub ? "border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400" : ""}`}
                    >
                      {isSub ? `R${player.position?.replace("SUB", "")}` : player.position || "?"}
                    </Badge>
                    <span className="truncate max-w-[110px] text-xs font-medium">{player.playerName}</span>
                    {player.isGoalkeeper && supportsGoalkeeper && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">GK</Badge>
                    )}
                  </div>
                </td>
                {stats.map(stat => {
                  const rawValue = player[stat.key] as number;
                  if (stat.computedFrom) {
                    return (
                      <td key={stat.key} className="px-1 py-1 text-center">
                        <span className="text-xs font-semibold text-primary">{rawValue || 0}%</span>
                      </td>
                    );
                  }
                  return (
                    <td key={stat.key} className="px-0.5 py-0.5 text-center">
                      <Input
                        type="number"
                        value={rawValue === 0 ? "" : String(rawValue)}
                        onChange={(e) => onUpdateStat(player.playerId, stat.key, parseFloat(e.target.value) || 0)}
                        min={stat.min ?? 0}
                        max={stat.max}
                        className="h-7 w-14 text-xs text-center mx-auto"
                        placeholder="0"
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
