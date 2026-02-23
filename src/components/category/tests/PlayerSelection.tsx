import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertTriangle, Search } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position?: string;
}

interface PlayerSelectionProps {
  categoryId: string;
  selectedPlayers: string[];
  onSelectionChange: (playerIds: string[]) => void;
  selectionMode: "all" | "specific";
  onSelectionModeChange: (mode: "all" | "specific") => void;
  players?: Player[];
  maxHeight?: string;
}

export function PlayerSelection({
  categoryId,
  selectedPlayers,
  onSelectionChange,
  selectionMode,
  onSelectionModeChange,
  players: externalPlayers,
  maxHeight = "200px",
}: PlayerSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch players if not provided externally
  const { data: fetchedPlayers } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !externalPlayers,
  });

  // Fetch injuries to identify injured players
  const { data: injuries } = useQuery({
    queryKey: ["active-injuries", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("player_id")
        .eq("category_id", categoryId)
        .in("status", ["active", "recovering"]);
      if (error) throw error;
      return data;
    },
  });

  const players = externalPlayers || fetchedPlayers || [];
  const injuredPlayerIds = new Set(injuries?.map((i) => i.player_id) || []);

  const healthyPlayers = useMemo(
    () => players.filter((p) => !injuredPlayerIds.has(p.id)),
    [players, injuredPlayerIds]
  );

  const injuredPlayers = useMemo(
    () => players.filter((p) => injuredPlayerIds.has(p.id)),
    [players, injuredPlayerIds]
  );

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    return players.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      onSelectionChange(selectedPlayers.filter((id) => id !== playerId));
    } else {
      onSelectionChange([...selectedPlayers, playerId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(players.map((p) => p.id));
    onSelectionModeChange("specific");
  };

  const selectAllHealthy = () => {
    onSelectionChange(healthyPlayers.map((p) => p.id));
    onSelectionModeChange("specific");
  };

  const selectAllInjured = () => {
    onSelectionChange(injuredPlayers.map((p) => p.id));
    onSelectionModeChange("specific");
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          Joueurs concernés
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={selectionMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onSelectionModeChange("all");
              onSelectionChange([]);
            }}
          >
            Tous
          </Button>
          <Button
            type="button"
            variant={selectionMode === "specific" ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectionModeChange("specific")}
          >
            Spécifiques
          </Button>
        </div>
      </div>

      {selectionMode === "specific" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Tous ({players.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllHealthy}
              className="text-xs border-green-300 text-green-700 hover:bg-green-50"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Aptes ({healthyPlayers.length})
            </Button>
            {injuredPlayers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllInjured}
                className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Blessés ({injuredPlayers.length})
              </Button>
            )}
            {selectedPlayers.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs text-muted-foreground"
              >
                Effacer
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          <ScrollArea className="border rounded-md" style={{ maxHeight }}>
            <div className="p-2 grid grid-cols-2 gap-1">
              {filteredPlayers.map((player) => {
                const isInjured = injuredPlayerIds.has(player.id);
                const isSelected = selectedPlayers.includes(player.id);

                return (
                  <div
                    key={player.id}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors select-none ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => togglePlayer(player.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePlayer(player.id);
                      }
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <div className="flex-1 min-w-0 pointer-events-none">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      {player.position && (
                        <p className="text-xs text-muted-foreground">{player.position}</p>
                      )}
                    </div>
                    {isInjured && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs shrink-0 pointer-events-none">
                        Blessé
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedPlayers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedPlayers.length} joueur{selectedPlayers.length > 1 ? "s" : ""} sélectionné{selectedPlayers.length > 1 ? "s" : ""}
            </p>
          )}
        </>
      )}

      {selectionMode === "all" && (
        <p className="text-sm text-muted-foreground">
          Le test sera créé pour tous les {players.length} joueurs de la catégorie
        </p>
      )}
    </div>
  );
}
