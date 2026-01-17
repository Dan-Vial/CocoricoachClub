import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, RotateCcw } from "lucide-react";
import { getPositionsForSport, getSportFieldConfig, type Position } from "@/lib/constants/sportPositions";

interface Player {
  id: string;
  name: string;
  position: string | null;
}

interface SportFieldLineupProps {
  players: Player[];
  sportType: string;
  initialLineup?: Record<string, string>;
  onLineupChange?: (lineup: Record<string, string>) => void;
  readOnly?: boolean;
}

function RugbyFieldMarkings() {
  return (
    <div className="absolute inset-0">
      {/* Try lines */}
      <div className="absolute top-[5%] left-0 right-0 h-[1px] bg-white/50" />
      <div className="absolute bottom-[5%] left-0 right-0 h-[1px] bg-white/50" />
      {/* 22m lines */}
      <div className="absolute top-[25%] left-0 right-0 h-[1px] bg-white/30" />
      <div className="absolute bottom-[25%] left-0 right-0 h-[1px] bg-white/30" />
      {/* Halfway */}
      <div className="absolute top-[50%] left-0 right-0 h-[2px] bg-white/60" />
      {/* 10m lines */}
      <div className="absolute top-[40%] left-0 right-0 h-[1px] bg-white/20" />
      <div className="absolute bottom-[40%] left-0 right-0 h-[1px] bg-white/20" />
      {/* Touch lines */}
      <div className="absolute top-0 bottom-0 left-[2%] w-[1px] bg-white/40" />
      <div className="absolute top-0 bottom-0 right-[2%] w-[1px] bg-white/40" />
    </div>
  );
}

function FootballFieldMarkings() {
  return (
    <div className="absolute inset-0">
      {/* Field border */}
      <div className="absolute inset-[3%] border-2 border-white/60 rounded-sm" />
      {/* Halfway line */}
      <div className="absolute top-[50%] left-[3%] right-[3%] h-[2px] bg-white/60" />
      {/* Center circle */}
      <div className="absolute top-[50%] left-[50%] w-[15%] h-[12%] -translate-x-1/2 -translate-y-1/2 border-2 border-white/50 rounded-full" />
      {/* Center spot */}
      <div className="absolute top-[50%] left-[50%] w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white/60 rounded-full" />
      {/* Top penalty area */}
      <div className="absolute top-[3%] left-[20%] right-[20%] h-[18%] border-2 border-white/50 border-t-0" />
      {/* Top goal area */}
      <div className="absolute top-[3%] left-[32%] right-[32%] h-[8%] border-2 border-white/40 border-t-0" />
      {/* Bottom penalty area */}
      <div className="absolute bottom-[3%] left-[20%] right-[20%] h-[18%] border-2 border-white/50 border-b-0" />
      {/* Bottom goal area */}
      <div className="absolute bottom-[3%] left-[32%] right-[32%] h-[8%] border-2 border-white/40 border-b-0" />
    </div>
  );
}

function HandballFieldMarkings() {
  return (
    <div className="absolute inset-0">
      {/* Field border */}
      <div className="absolute inset-[3%] border-2 border-white/60" />
      {/* Halfway line */}
      <div className="absolute top-[50%] left-[3%] right-[3%] h-[2px] bg-white/60" />
      {/* Center circle */}
      <div className="absolute top-[50%] left-[50%] w-[8%] h-[6%] -translate-x-1/2 -translate-y-1/2 border-2 border-white/50 rounded-full" />
      {/* Top goal area (6m arc) */}
      <div className="absolute top-[3%] left-[25%] right-[25%] h-[20%] border-2 border-white/50 border-t-0 rounded-b-full" />
      {/* Top 9m line (dashed) */}
      <div className="absolute top-[28%] left-[18%] right-[18%] h-[1px] border-b-2 border-dashed border-white/40" />
      {/* Bottom goal area (6m arc) */}
      <div className="absolute bottom-[3%] left-[25%] right-[25%] h-[20%] border-2 border-white/50 border-b-0 rounded-t-full" />
      {/* Bottom 9m line (dashed) */}
      <div className="absolute bottom-[28%] left-[18%] right-[18%] h-[1px] border-t-2 border-dashed border-white/40" />
      {/* Goals */}
      <div className="absolute top-[3%] left-[40%] right-[40%] h-[3%] bg-white/30" />
      <div className="absolute bottom-[3%] left-[40%] right-[40%] h-[3%] bg-white/30" />
    </div>
  );
}

function VolleyballFieldMarkings() {
  return (
    <div className="absolute inset-0">
      {/* Court border */}
      <div className="absolute inset-[5%] border-2 border-white/70" />
      {/* Net line (center) */}
      <div className="absolute top-[50%] left-[5%] right-[5%] h-[3px] bg-white/80" />
      {/* Attack lines (3m from net) */}
      <div className="absolute top-[35%] left-[5%] right-[5%] h-[2px] bg-white/50" />
      <div className="absolute bottom-[35%] left-[5%] right-[5%] h-[2px] bg-white/50" />
      {/* Service zones indicators */}
      <div className="absolute bottom-[5%] right-[5%] w-[15%] h-[1px] bg-white/40" />
      <div className="absolute top-[5%] left-[5%] w-[15%] h-[1px] bg-white/40" />
    </div>
  );
}

function BasketballFieldMarkings() {
  return (
    <div className="absolute inset-0">
      {/* Court border */}
      <div className="absolute inset-[3%] border-2 border-white/60" />
      {/* Halfway line */}
      <div className="absolute top-[50%] left-[3%] right-[3%] h-[2px] bg-white/60" />
      {/* Center circle */}
      <div className="absolute top-[50%] left-[50%] w-[12%] h-[8%] -translate-x-1/2 -translate-y-1/2 border-2 border-white/50 rounded-full" />
      {/* Top 3-point arc */}
      <div className="absolute top-[3%] left-[15%] right-[15%] h-[30%] border-2 border-white/50 border-t-0 rounded-b-full" />
      {/* Top key/paint */}
      <div className="absolute top-[3%] left-[30%] right-[30%] h-[20%] border-2 border-white/50 border-t-0" />
      {/* Top free throw circle */}
      <div className="absolute top-[18%] left-[50%] w-[12%] h-[8%] -translate-x-1/2 border-2 border-dashed border-white/40 rounded-full" />
      {/* Top basket */}
      <div className="absolute top-[5%] left-[50%] w-[3%] h-[1.5%] -translate-x-1/2 bg-white/60" />
      {/* Bottom 3-point arc */}
      <div className="absolute bottom-[3%] left-[15%] right-[15%] h-[30%] border-2 border-white/50 border-b-0 rounded-t-full" />
      {/* Bottom key/paint */}
      <div className="absolute bottom-[3%] left-[30%] right-[30%] h-[20%] border-2 border-white/50 border-b-0" />
      {/* Bottom free throw circle */}
      <div className="absolute bottom-[18%] left-[50%] w-[12%] h-[8%] -translate-x-1/2 border-2 border-dashed border-white/40 rounded-full" />
      {/* Bottom basket */}
      <div className="absolute bottom-[5%] left-[50%] w-[3%] h-[1.5%] -translate-x-1/2 bg-white/60" />
    </div>
  );
}

export function SportFieldLineup({ 
  players, 
  sportType = "XV", 
  initialLineup = {},
  onLineupChange,
  readOnly = false 
}: SportFieldLineupProps) {
  const [lineup, setLineup] = useState<Record<string, string>>(initialLineup);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const positions = getPositionsForSport(sportType);
  const fieldConfig = getSportFieldConfig(sportType);

  const availablePlayers = useMemo(() => {
    const assignedPlayerIds = Object.values(lineup);
    return players.filter(p => !assignedPlayerIds.includes(p.id));
  }, [players, lineup]);

  const handlePositionClick = (positionId: string) => {
    if (readOnly) return;
    setSelectedPosition(selectedPosition === positionId ? null : positionId);
  };

  const handlePlayerSelect = (playerId: string) => {
    if (!selectedPosition || readOnly) return;
    
    const newLineup = { ...lineup, [selectedPosition]: playerId };
    setLineup(newLineup);
    onLineupChange?.(newLineup);
    setSelectedPosition(null);
  };

  const handleRemovePlayer = (positionId: string) => {
    if (readOnly) return;
    const newLineup = { ...lineup };
    delete newLineup[positionId];
    setLineup(newLineup);
    onLineupChange?.(newLineup);
  };

  const resetLineup = () => {
    setLineup({});
    onLineupChange?.({});
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "";
  };

  const filledPositions = Object.keys(lineup).length;
  const totalPositions = positions.length;

  // Judo doesn't have a field
  if (fieldConfig.type === "judo") {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Combattants sélectionnés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            Le judo ne nécessite pas de composition tactique. Utilisez la vue liste.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderFieldMarkings = () => {
    switch (fieldConfig.type) {
      case "football":
        return <FootballFieldMarkings />;
      case "handball":
        return <HandballFieldMarkings />;
      case "volleyball":
        return <VolleyballFieldMarkings />;
      case "basketball":
        return <BasketballFieldMarkings />;
      default:
        return <RugbyFieldMarkings />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Composition {fieldConfig.label}
            <Badge variant="secondary">
              {filledPositions}/{totalPositions}
            </Badge>
          </CardTitle>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetLineup}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sport Field */}
        <div 
          className={`relative w-full bg-gradient-to-b ${fieldConfig.bgColor} rounded-lg overflow-hidden`}
          style={{ aspectRatio: fieldConfig.aspectRatio, maxHeight: "500px" }}
        >
          {/* Field markings */}
          {renderFieldMarkings()}

          {/* Player positions */}
          {positions.map((pos) => {
            const playerId = lineup[pos.id];
            const isSelected = selectedPosition === pos.id;
            
            return (
              <div
                key={pos.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <button
                  onClick={() => handlePositionClick(pos.id)}
                  onDoubleClick={() => playerId && handleRemovePlayer(pos.id)}
                  className={`
                    relative flex flex-col items-center justify-center
                    min-w-[3rem] min-h-[3rem] rounded-full transition-all
                    ${playerId 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "bg-white/20 border-2 border-dashed border-white/50 text-white"
                    }
                    ${isSelected ? "ring-4 ring-yellow-400 scale-110" : ""}
                    ${!readOnly ? "hover:scale-105 cursor-pointer" : ""}
                  `}
                  disabled={readOnly}
                  title={playerId ? `${getPlayerName(playerId)} - Double-clic pour retirer` : pos.name}
                >
                  <span className="text-xs font-bold">{pos.id}</span>
                  {playerId && (
                    <span className="absolute -bottom-5 text-[10px] font-medium text-white bg-black/60 px-1 rounded whitespace-nowrap max-w-[60px] truncate">
                      {getPlayerName(playerId).split(" ")[0]}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Player selection */}
        {!readOnly && selectedPosition && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">
              Position {selectedPosition}: {positions.find(p => p.id === selectedPosition)?.name}
            </p>
            <Select onValueChange={handlePlayerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un joueur..." />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} {player.position && `(${player.position})`}
                  </SelectItem>
                ))}
                {availablePlayers.length === 0 && (
                  <SelectItem value="none" disabled>
                    Tous les joueurs sont assignés
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bench / Available players */}
        {!readOnly && availablePlayers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Joueurs disponibles ({availablePlayers.length})</p>
            <div className="flex flex-wrap gap-2">
              {availablePlayers.slice(0, 10).map((player) => (
                <Badge key={player.id} variant="outline" className="text-xs">
                  {player.name}
                </Badge>
              ))}
              {availablePlayers.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{availablePlayers.length - 10} autres
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
