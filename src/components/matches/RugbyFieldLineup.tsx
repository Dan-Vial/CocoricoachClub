import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Download, RotateCcw } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string | null;
}

interface RugbyFieldLineupProps {
  players: Player[];
  rugbyType?: "xv" | "7s";
  initialLineup?: Record<string, string>;
  onLineupChange?: (lineup: Record<string, string>) => void;
  readOnly?: boolean;
}

const XV_POSITIONS = [
  { id: "1", name: "Pilier gauche", x: 20, y: 85 },
  { id: "2", name: "Talonneur", x: 50, y: 85 },
  { id: "3", name: "Pilier droit", x: 80, y: 85 },
  { id: "4", name: "2ème ligne", x: 35, y: 75 },
  { id: "5", name: "2ème ligne", x: 65, y: 75 },
  { id: "6", name: "Flanker", x: 15, y: 65 },
  { id: "7", name: "Flanker", x: 85, y: 65 },
  { id: "8", name: "N°8", x: 50, y: 65 },
  { id: "9", name: "Demi de mêlée", x: 35, y: 50 },
  { id: "10", name: "Demi d'ouverture", x: 50, y: 45 },
  { id: "11", name: "Ailier gauche", x: 5, y: 30 },
  { id: "12", name: "1er centre", x: 35, y: 35 },
  { id: "13", name: "2ème centre", x: 65, y: 35 },
  { id: "14", name: "Ailier droit", x: 95, y: 30 },
  { id: "15", name: "Arrière", x: 50, y: 15 },
];

const SEVENS_POSITIONS = [
  { id: "1", name: "Pilier gauche", x: 25, y: 80 },
  { id: "2", name: "Talonneur", x: 50, y: 80 },
  { id: "3", name: "Pilier droit", x: 75, y: 80 },
  { id: "4", name: "Demi de mêlée", x: 50, y: 55 },
  { id: "5", name: "Centre gauche", x: 25, y: 40 },
  { id: "6", name: "Centre droit", x: 75, y: 40 },
  { id: "7", name: "Arrière", x: 50, y: 20 },
];

export function RugbyFieldLineup({ 
  players, 
  rugbyType = "xv", 
  initialLineup = {},
  onLineupChange,
  readOnly = false 
}: RugbyFieldLineupProps) {
  const [lineup, setLineup] = useState<Record<string, string>>(initialLineup);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const positions = rugbyType === "xv" ? XV_POSITIONS : SEVENS_POSITIONS;

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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Composition {rugbyType === "xv" ? "XV" : "7s"}
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
        {/* Rugby Field */}
        <div 
          className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-600 to-green-700 rounded-lg overflow-hidden"
          style={{ maxHeight: "500px" }}
        >
          {/* Field markings */}
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
