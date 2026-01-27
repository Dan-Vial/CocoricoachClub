import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileCheck, AlertCircle, User, Satellite, Check } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position?: string;
}

interface GpsPlayerData {
  playerName: string;
  matchedPlayer: Player | null;
  total_distance_m?: number;
  high_speed_distance_m?: number;
  sprint_distance_m?: number;
  max_speed_ms?: number;
  player_load?: number;
  accelerations?: number;
  decelerations?: number;
  duration_minutes?: number;
  sprint_count?: number;
  raw_data?: Record<string, unknown>;
}

interface MatchGpsImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  matchDate: string;
  players: Player[];
}

const CSV_COLUMN_MAPPINGS: Record<string, string> = {
  // Common column names -> our field names
  'total distance': 'total_distance_m',
  'total_distance': 'total_distance_m',
  'distance (m)': 'total_distance_m',
  'distance': 'total_distance_m',
  'high speed distance': 'high_speed_distance_m',
  'high_speed_distance': 'high_speed_distance_m',
  'hsd': 'high_speed_distance_m',
  'sprint distance': 'sprint_distance_m',
  'sprint_distance': 'sprint_distance_m',
  'max speed': 'max_speed_ms',
  'max_speed': 'max_speed_ms',
  'top speed': 'max_speed_ms',
  'vmax': 'max_speed_ms',
  'player load': 'player_load',
  'player_load': 'player_load',
  'load': 'player_load',
  'accelerations': 'accelerations',
  'accel': 'accelerations',
  'decelerations': 'decelerations',
  'decel': 'decelerations',
  'duration': 'duration_minutes',
  'time': 'duration_minutes',
  'sprints': 'sprint_count',
  'sprint count': 'sprint_count',
  'sprint_count': 'sprint_count',
  'player': 'player_name',
  'player name': 'player_name',
  'player_name': 'player_name',
  'name': 'player_name',
  'athlete': 'player_name',
};

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => line.split(/[,;\t]/).map(cell => cell.trim()));
  
  return { headers, rows };
}

function matchPlayerName(csvName: string, players: Player[]): Player | null {
  const normalizedCsvName = csvName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Try exact match first
  let match = players.find(p => 
    p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedCsvName
  );
  if (match) return match;
  
  // Try partial match (last name)
  const csvParts = normalizedCsvName.split(/\s+/);
  for (const part of csvParts) {
    if (part.length < 2) continue;
    match = players.find(p => {
      const playerNormalized = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return playerNormalized.includes(part) || part.includes(playerNormalized.split(/\s+/).pop() || "");
    });
    if (match) return match;
  }
  
  return null;
}

export function MatchGpsImport({
  open,
  onOpenChange,
  matchId,
  categoryId,
  matchDate,
  players,
}: MatchGpsImportProps) {
  const [gpsData, setGpsData] = useState<GpsPlayerData[]>([]);
  const [detectedSource, setDetectedSource] = useState<string>("unknown");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const resetState = () => {
    setGpsData([]);
    setDetectedSource("unknown");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const safeParseFloat = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const safeParseInt = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const cleaned = value.replace(/[^\d-]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText || typeof csvText !== 'string') {
          toast.error("Impossible de lire le fichier");
          return;
        }

        const { headers, rows } = parseCSV(csvText);
        
        if (headers.length === 0 || rows.length === 0) {
          toast.error("Fichier CSV invalide ou vide");
          return;
        }

        // Detect source based on columns
        let source = "manual";
        if (headers.some(h => h.includes("catapult"))) source = "catapult";
        else if (headers.some(h => h.includes("statsports"))) source = "statsports";
        else if (headers.some(h => h.includes("polar"))) source = "polar";
        else if (headers.some(h => h.includes("gpexe"))) source = "gpexe";
        setDetectedSource(source);

        // Map columns
        const columnMap: Record<string, number> = {};
        headers.forEach((header, index) => {
          const mapped = CSV_COLUMN_MAPPINGS[header];
          if (mapped) columnMap[mapped] = index;
        });

        // Check if we have a player column
        if (columnMap.player_name === undefined) {
          toast.error("Colonne 'joueur' ou 'player' non trouvée dans le fichier CSV");
          return;
        }

        // Parse rows with error handling
        const parsedData: GpsPlayerData[] = [];
        
        for (const row of rows) {
          try {
            if (row.length === 0 || !row.some(cell => cell?.trim())) continue;
            
            const playerName = columnMap.player_name !== undefined && row[columnMap.player_name] 
              ? row[columnMap.player_name].trim() 
              : "";
            
            if (!playerName) continue;

            const rawData: Record<string, unknown> = {};
            headers.forEach((header, idx) => {
              if (row[idx] !== undefined) {
                rawData[header] = row[idx];
              }
            });
            
            parsedData.push({
              playerName,
              matchedPlayer: matchPlayerName(playerName, players),
              total_distance_m: safeParseFloat(row[columnMap.total_distance_m]),
              high_speed_distance_m: safeParseFloat(row[columnMap.high_speed_distance_m]),
              sprint_distance_m: safeParseFloat(row[columnMap.sprint_distance_m]),
              max_speed_ms: safeParseFloat(row[columnMap.max_speed_ms]),
              player_load: safeParseFloat(row[columnMap.player_load]),
              accelerations: safeParseInt(row[columnMap.accelerations]),
              decelerations: safeParseInt(row[columnMap.decelerations]),
              duration_minutes: safeParseFloat(row[columnMap.duration_minutes]),
              sprint_count: safeParseInt(row[columnMap.sprint_count]),
              raw_data: rawData,
            });
          } catch (rowError) {
            console.warn("Erreur parsing ligne CSV:", rowError);
            // Continue with other rows
          }
        }

        if (parsedData.length === 0) {
          toast.error("Aucune donnée valide trouvée dans le fichier");
          return;
        }

        setGpsData(parsedData);
        toast.success(`${parsedData.length} lignes importées`);
      } catch (error) {
        console.error("Erreur lors du parsing CSV:", error);
        toast.error("Erreur lors de la lecture du fichier CSV. Vérifiez le format.");
      }
    };
    
    reader.onerror = () => {
      toast.error("Erreur lors de la lecture du fichier");
    };
    
    reader.readAsText(file);
  };

  const updatePlayerMatch = (index: number, playerId: string) => {
    setGpsData(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        matchedPlayer: players.find(p => p.id === playerId) || null,
      };
      return updated;
    });
  };

  const saveGpsData = useMutation({
    mutationFn: async () => {
      const matchedData = gpsData.filter(d => d.matchedPlayer);
      
      if (matchedData.length === 0) {
        throw new Error("Aucun athlète associé");
      }

      const gpsRecords = matchedData.map(d => ({
        player_id: d.matchedPlayer!.id,
        category_id: categoryId,
        match_id: matchId,
        session_date: matchDate,
        source: detectedSource,
        total_distance_m: d.total_distance_m ?? null,
        high_speed_distance_m: d.high_speed_distance_m ?? null,
        sprint_distance_m: d.sprint_distance_m ?? null,
        max_speed_ms: d.max_speed_ms ?? null,
        player_load: d.player_load ?? null,
        accelerations: d.accelerations ?? null,
        decelerations: d.decelerations ?? null,
        duration_minutes: d.duration_minutes ?? null,
        sprint_count: d.sprint_count ?? null,
        raw_data: d.raw_data ? JSON.parse(JSON.stringify(d.raw_data)) : null,
      }));

      const { error } = await supabase.from("gps_sessions").insert(gpsRecords);
      if (error) throw error;
      
      return matchedData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["gps-sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["match-gps", matchId] });
      toast.success(`${count} données GPS importées pour ce match`);
      resetState();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving GPS data:", error);
      toast.error("Erreur lors de l'import");
    },
  });

  const matchedCount = gpsData.filter(d => d.matchedPlayer).length;
  const unmatchedCount = gpsData.filter(d => !d.matchedPlayer).length;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            Importer données GPS - Match
          </DialogTitle>
          <DialogDescription>
            Importez un fichier CSV contenant les données GPS des athlètes pour ce match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Fichier CSV</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-1"
              />
              {gpsData.length > 0 && (
                <Button variant="outline" size="icon" onClick={resetState}>
                  <AlertCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formats supportés: Catapult, Statsports, Polar, GPExe ou CSV générique
            </p>
          </div>

          {/* Preview */}
          {gpsData.length > 0 && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{detectedSource}</Badge>
                <Badge variant="secondary" className="text-primary">
                  <Check className="h-3 w-3 mr-1" />
                  {matchedCount} associés
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {unmatchedCount} non associés
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 max-h-[300px]">
                <div className="space-y-2">
                  {gpsData.map((data, index) => (
                    <Card key={index} className={data.matchedPlayer ? "border-primary/30" : "border-destructive/30"}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{data.playerName}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              {data.total_distance_m && <span>{Math.round(data.total_distance_m)}m</span>}
                              {data.max_speed_ms && <span>{data.max_speed_ms.toFixed(1)} m/s</span>}
                              {data.sprint_count && <span>{data.sprint_count} sprints</span>}
                            </div>
                          </div>
                          <Select
                            value={data.matchedPlayer?.id || ""}
                            onValueChange={(value) => updatePlayerMatch(index, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Associer un athlète" />
                            </SelectTrigger>
                            <SelectContent>
                              {players.map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    {player.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {gpsData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mb-4 opacity-50" />
              <p>Sélectionnez un fichier CSV à importer</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Annuler
          </Button>
          <Button
            onClick={() => saveGpsData.mutate()}
            disabled={saveGpsData.isPending || matchedCount === 0}
          >
            {saveGpsData.isPending ? "Import..." : `Importer ${matchedCount} données`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
