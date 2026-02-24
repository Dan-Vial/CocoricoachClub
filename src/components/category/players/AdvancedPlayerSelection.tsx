import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertTriangle, Search, Filter } from "lucide-react";
import { 
  getPositionGroupsForSport, 
  playerBelongsToGroup, 
  sportHasPositionGroups,
  PositionGroup 
} from "@/lib/constants/sportPositionGroups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  id: string;
  name: string;
  position?: string;
}

interface AdvancedPlayerSelectionProps {
  categoryId: string;
  sportType?: string;
  selectedPlayers: string[];
  onSelectionChange: (playerIds: string[]) => void;
  selectionMode: "all" | "specific";
  onSelectionModeChange: (mode: "all" | "specific") => void;
  players?: Player[];
  maxHeight?: string;
  showInjuredFilter?: boolean;
}

export function AdvancedPlayerSelection({
  categoryId,
  sportType,
  selectedPlayers,
  onSelectionChange,
  selectionMode,
  onSelectionModeChange,
  players: externalPlayers,
  maxHeight = "200px",
  showInjuredFilter = true,
}: AdvancedPlayerSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");

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
    enabled: showInjuredFilter,
  });

  const players = externalPlayers || fetchedPlayers || [];
  const injuredPlayerIds = new Set(injuries?.map((i) => i.player_id) || []);
  const positionGroups = getPositionGroupsForSport(sportType);
  const hasPositionGroups = positionGroups.length > 0;

  // Group players by position group
  const playersByGroup = useMemo(() => {
    if (!hasPositionGroups) return {};
    
    const grouped: Record<string, Player[]> = {};
    positionGroups.forEach(group => {
      grouped[group.id] = players.filter(p => playerBelongsToGroup(p.position, group));
    });
    grouped["unassigned"] = players.filter(p => 
      !positionGroups.some(group => playerBelongsToGroup(p.position, group))
    );
    return grouped;
  }, [players, positionGroups, hasPositionGroups]);

  const healthyPlayers = useMemo(
    () => players.filter((p) => !injuredPlayerIds.has(p.id)),
    [players, injuredPlayerIds]
  );

  const injuredPlayers = useMemo(
    () => players.filter((p) => injuredPlayerIds.has(p.id)),
    [players, injuredPlayerIds]
  );

  // Filter players based on search and position filter
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply position group filter
    if (positionFilter !== "all" && hasPositionGroups) {
      const group = positionGroups.find(g => g.id === positionFilter);
      if (group) {
        filtered = filtered.filter(p => playerBelongsToGroup(p.position, group));
      }
    }
    
    return filtered;
  }, [players, searchQuery, positionFilter, positionGroups, hasPositionGroups]);

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

  const selectByGroup = (group: PositionGroup) => {
    const groupPlayers = playersByGroup[group.id] || [];
    const groupPlayerIds = groupPlayers.map(p => p.id);
    
    // Add group players to existing selection (don't replace)
    const newSelection = [...new Set([...selectedPlayers, ...groupPlayerIds])];
    onSelectionChange(newSelection);
    onSelectionModeChange("specific");
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  // Get unique positions for simple filter dropdown (for sports without predefined groups)
  const uniquePositions = useMemo(() => {
    const positions = new Set<string>();
    players.forEach(p => {
      if (p.position) positions.add(p.position);
    });
    return Array.from(positions).sort();
  }, [players]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          Athlètes concernés
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
          {/* Quick selection buttons */}
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
            
            {showInjuredFilter && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllHealthy}
                  className="text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
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
                    className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Blessés ({injuredPlayers.length})
                  </Button>
                )}
              </>
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

          {/* Position group quick selection (for rugby, football, etc.) */}
          {hasPositionGroups && (
            <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Par poste:
              </span>
              {positionGroups.map(group => {
                const count = playersByGroup[group.id]?.length || 0;
                return (
                  <Button
                    key={group.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectByGroup(group)}
                    className="text-xs"
                  >
                    {group.label} ({count})
                  </Button>
                );
              })}
            </div>
          )}

          {/* Search and filter row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un athlète..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            
            {/* Position filter dropdown */}
            {(hasPositionGroups || uniquePositions.length > 0) && (
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Tous postes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous postes</SelectItem>
                  {hasPositionGroups ? (
                    positionGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.label}
                      </SelectItem>
                    ))
                  ) : (
                    uniquePositions.map(pos => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Player list */}
          <ScrollArea className="border rounded-md" style={{ maxHeight }}>
            <div className="p-2 grid grid-cols-2 gap-1">
              {filteredPlayers.map((player) => {
                const isInjured = injuredPlayerIds.has(player.id);
                const isSelected = selectedPlayers.includes(player.id);
                
                // Find which group this player belongs to
                const playerGroup = hasPositionGroups 
                  ? positionGroups.find(g => playerBelongsToGroup(player.position, g))
                  : null;

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
                      <div className="flex items-center gap-1 flex-wrap">
                        {player.position && (
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        )}
                        {playerGroup && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {playerGroup.label}
                          </Badge>
                        )}
                      </div>
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
              {selectedPlayers.length} athlète{selectedPlayers.length > 1 ? "s" : ""} sélectionné{selectedPlayers.length > 1 ? "s" : ""}
            </p>
          )}
        </>
      )}

      {selectionMode === "all" && (
        <p className="text-sm text-muted-foreground">
          Sera appliqué aux {players.length} athlètes de la catégorie
        </p>
      )}
    </div>
  );
}
