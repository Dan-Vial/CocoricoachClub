import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
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
import { Upload, AlertCircle, User, Satellite, Check, ArrowRight, Link2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  first_name?: string;
  position?: string;
}

interface CsvRow {
  playerName: string;
  rowIndex: number;
  rawData: Record<string, string>;
}

interface PlayerMapping {
  csvPlayerName: string;
  rowIndex: number;
  matchedPlayerId: string | null;
  rawData: Record<string, string>;
}

interface MatchGpsImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  matchDate: string;
  players: Player[];
}

const DATA_COLUMN_MAPPINGS: Record<string, string> = {
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
};

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => parseRow(line));
  
  return { headers, rows };
}

export function MatchGpsImport({
  open,
  onOpenChange,
  matchId,
  categoryId,
  matchDate,
  players,
}: MatchGpsImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [selectedPlayerColumn, setSelectedPlayerColumn] = useState<string>('');
  const [playerMappings, setPlayerMappings] = useState<PlayerMapping[]>([]);
  const [detectedSource, setDetectedSource] = useState<string>("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setSelectedPlayerColumn('');
    setPlayerMappings([]);
    setDetectedSource("manual");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const safeParseFloat = (value: string | undefined): number | null => {
    if (!value || value.trim() === '') return null;
    const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const safeParseInt = (value: string | undefined): number | null => {
    if (!value || value.trim() === '') return null;
    const cleaned = value.replace(/[^\d-]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
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
        const headerStr = headers.join(' ').toLowerCase();
        let source = "manual";
        if (headerStr.includes("catapult")) source = "catapult";
        else if (headerStr.includes("statsports")) source = "statsports";
        else if (headerStr.includes("polar")) source = "polar";
        else if (headerStr.includes("gpexe")) source = "gpexe";
        setDetectedSource(source);

        setCsvHeaders(headers);
        setCsvRows(rows);
        
        toast.success(`${rows.length} lignes chargées - Sélectionnez la colonne joueur`);
      } catch (error) {
        console.error("Erreur lors du parsing CSV:", error);
        toast.error("Erreur lors de la lecture du fichier CSV");
      }
    };
    
    reader.onerror = () => {
      toast.error("Erreur lors de la lecture du fichier");
    };
    
    reader.readAsText(file);
  };

  const handlePlayerColumnSelect = (columnName: string) => {
    setSelectedPlayerColumn(columnName);
    
    const columnIndex = csvHeaders.findIndex(h => h === columnName);
    if (columnIndex === -1) return;

    // Extract unique player names from the selected column
    const uniquePlayers = new Map<string, { rowIndex: number; rawData: Record<string, string> }>();
    
    csvRows.forEach((row, rowIndex) => {
      const playerName = row[columnIndex]?.trim();
      if (playerName && !uniquePlayers.has(playerName)) {
        const rawData: Record<string, string> = {};
        csvHeaders.forEach((header, idx) => {
          rawData[header] = row[idx] || '';
        });
        uniquePlayers.set(playerName, { rowIndex, rawData });
      }
    });

    // Create mappings with auto-match attempt
    const mappings: PlayerMapping[] = Array.from(uniquePlayers.entries()).map(([name, data]) => {
      // Try to auto-match using full name (first_name + name)
      const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const autoMatch = players.find(p => {
        const fullName = [p.first_name, p.name].filter(Boolean).join(" ");
        const pName = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const pLastName = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return pName === normalizedName || 
               pName.includes(normalizedName) || 
               normalizedName.includes(pName) ||
               pLastName === normalizedName ||
               normalizedName.includes(pLastName);
      });

      return {
        csvPlayerName: name,
        rowIndex: data.rowIndex,
        matchedPlayerId: autoMatch?.id || null,
        rawData: data.rawData,
      };
    });

    setPlayerMappings(mappings);
    setStep('mapping');
  };

  const updatePlayerMapping = (csvPlayerName: string, playerId: string | null) => {
    setPlayerMappings(prev => 
      prev.map(m => 
        m.csvPlayerName === csvPlayerName 
          ? { ...m, matchedPlayerId: playerId === "__none__" ? null : playerId }
          : m
      )
    );
  };

  const getDataValue = (rawData: Record<string, string>, fieldName: string): string | undefined => {
    for (const [header, value] of Object.entries(rawData)) {
      const normalizedHeader = header.toLowerCase().trim();
      if (DATA_COLUMN_MAPPINGS[normalizedHeader] === fieldName) {
        return value;
      }
    }
    return undefined;
  };

  const saveGpsData = useMutation({
    mutationFn: async () => {
      const matchedMappings = playerMappings.filter(m => m.matchedPlayerId);
      
      if (matchedMappings.length === 0) {
        throw new Error("Aucun athlète associé");
      }

      const gpsRecords = matchedMappings.map(m => ({
        player_id: m.matchedPlayerId!,
        category_id: categoryId,
        match_id: matchId,
        session_date: matchDate,
        source: detectedSource,
        total_distance_m: safeParseFloat(getDataValue(m.rawData, 'total_distance_m')),
        high_speed_distance_m: safeParseFloat(getDataValue(m.rawData, 'high_speed_distance_m')),
        sprint_distance_m: safeParseFloat(getDataValue(m.rawData, 'sprint_distance_m')),
        max_speed_ms: safeParseFloat(getDataValue(m.rawData, 'max_speed_ms')),
        player_load: safeParseFloat(getDataValue(m.rawData, 'player_load')),
        accelerations: safeParseInt(getDataValue(m.rawData, 'accelerations')),
        decelerations: safeParseInt(getDataValue(m.rawData, 'decelerations')),
        duration_minutes: safeParseFloat(getDataValue(m.rawData, 'duration_minutes')),
        sprint_count: safeParseInt(getDataValue(m.rawData, 'sprint_count')),
        raw_data: m.rawData,
      }));

      const { error } = await supabase.from("gps_sessions").insert(gpsRecords);
      if (error) throw error;
      
      return matchedMappings.length;
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

  const matchedCount = playerMappings.filter(m => m.matchedPlayerId).length;
  const unmatchedCount = playerMappings.filter(m => !m.matchedPlayerId).length;
  const validPlayers = players.filter(p => p.id && p.id.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            Importer données GPS - Match
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Chargez votre fichier CSV et sélectionnez la colonne contenant les noms des joueurs."}
            {step === 'mapping' && "Associez chaque joueur du fichier à un athlète de votre équipe."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Fichier CSV</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground">
                  Formats supportés: Catapult, Statsports, Polar, GPExe ou CSV générique
                </p>
              </div>

              {/* Column Selection */}
              {csvHeaders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{detectedSource}</Badge>
                    <Badge variant="secondary">{csvRows.length} lignes</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sélectionnez la colonne contenant les noms des joueurs</Label>
                    <Select 
                      value={selectedPlayerColumn} 
                      onValueChange={handlePlayerColumnSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir la colonne joueur..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={`${header}-${idx}`} value={header}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span className="font-medium">{header}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                (ex: {csvRows[0]?.[idx] || 'vide'})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {csvHeaders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Upload className="h-12 w-12 mb-4 opacity-50" />
                  <p>Sélectionnez un fichier CSV à importer</p>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="flex flex-col h-full min-h-0">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep('upload')}
                  className="ml-auto"
                >
                  ← Retour
                </Button>
              </div>

              {/* Player mappings */}
              <ScrollArea className="flex-1 pr-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                <div className="space-y-2">
                  {playerMappings.map((mapping) => {
                    const matchedPlayer = validPlayers.find(p => p.id === mapping.matchedPlayerId);
                    const distance = getDataValue(mapping.rawData, 'total_distance_m');
                    const maxSpeed = getDataValue(mapping.rawData, 'max_speed_ms');
                    
                    return (
                      <Card 
                        key={mapping.csvPlayerName} 
                        className={mapping.matchedPlayerId ? "border-primary/30 bg-primary/5" : "border-destructive/30"}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            {/* CSV Player Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{mapping.csvPlayerName}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                {distance && <span>{Math.round(parseFloat(distance.replace(',', '.')) || 0)}m</span>}
                                {maxSpeed && <span>{parseFloat(maxSpeed.replace(',', '.'))?.toFixed(1) || '-'} m/s</span>}
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center">
                              <ArrowRight className={`h-4 w-4 ${mapping.matchedPlayerId ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>

                            {/* Athlete Select */}
                            <Select
                              value={mapping.matchedPlayerId || "__none__"}
                              onValueChange={(value) => updatePlayerMapping(mapping.csvPlayerName, value)}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Associer un athlète" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[250px] z-[200]">
                                <SelectItem value="__none__">
                                  <span className="text-muted-foreground">Non associé</span>
                                </SelectItem>
                                {validPlayers.map((player) => (
                                  <SelectItem key={player.id} value={player.id}>
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3" />
                                      <span>{[player.first_name, player.name].filter(Boolean).join(" ")}</span>
                                      {player.position && (
                                        <Badge variant="outline" className="text-xs ml-1">
                                          {player.position}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Status indicator */}
                            {mapping.matchedPlayerId && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Annuler
          </Button>
          {step === 'mapping' && (
            <Button
              onClick={() => saveGpsData.mutate()}
              disabled={saveGpsData.isPending || matchedCount === 0}
            >
              {saveGpsData.isPending ? "Import..." : `Importer ${matchedCount} données`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
