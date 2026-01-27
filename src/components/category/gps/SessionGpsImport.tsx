import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Check, AlertCircle, X, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  name: string;
  position: string | null;
}

interface GpsPlayerData {
  playerName: string;
  matchedPlayer: Player | null;
  total_distance_m: number | null;
  high_speed_distance_m: number | null;
  sprint_distance_m: number | null;
  max_speed_ms: number | null;
  player_load: number | null;
  accelerations: number | null;
  decelerations: number | null;
  duration_minutes: number | null;
  sprint_count: number | null;
  raw_data: Record<string, string | number>;
}

interface SessionGpsImportProps {
  players: Player[];
  onGpsDataChange: (data: GpsPlayerData[]) => void;
  gpsData: GpsPlayerData[];
}

const KNOWN_COLUMN_MAPPINGS: Record<string, string> = {
  'player': 'player_name',
  'player name': 'player_name',
  'athlete': 'player_name',
  'athlete name': 'player_name',
  'name': 'player_name',
  'nom': 'player_name',
  'joueur': 'player_name',
  'total distance': 'total_distance_m',
  'total distance (m)': 'total_distance_m',
  'distance (m)': 'total_distance_m',
  'distance': 'total_distance_m',
  'high speed distance': 'high_speed_distance_m',
  'high speed distance (m)': 'high_speed_distance_m',
  'hsr': 'high_speed_distance_m',
  'sprint distance': 'sprint_distance_m',
  'sprint distance (m)': 'sprint_distance_m',
  'max speed': 'max_speed_ms',
  'max speed (m/s)': 'max_speed_ms',
  'top speed': 'max_speed_ms',
  'player load': 'player_load',
  'playerload': 'player_load',
  'load': 'player_load',
  'accelerations': 'accelerations',
  'decelerations': 'decelerations',
  'duration': 'duration_minutes',
  'duration (min)': 'duration_minutes',
  'sprint count': 'sprint_count',
  'sprints': 'sprint_count',
};

export function SessionGpsImport({ players, onGpsDataChange, gpsData }: SessionGpsImportProps) {
  const [source, setSource] = useState<'catapult' | 'statsports' | 'manual'>('manual');
  const [fileName, setFileName] = useState<string>("");

  const matchPlayerByName = useCallback((name: string): Player | null => {
    if (!name) return null;
    const searchName = name.toLowerCase().trim();
    
    let match = players.find(p => p.name.toLowerCase() === searchName);
    if (match) return match;
    
    match = players.find(p =>
      p.name.toLowerCase().includes(searchName) ||
      searchName.includes(p.name.toLowerCase())
    );
    
    return match || null;
  }, [players]);

  const parseNumber = (value: string | undefined): number | null => {
    if (!value) return null;
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Parse CSV
      const rows = lines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === ',' || char === ';') && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length < 2) {
        toast.error("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
        return;
      }

      const headerRow = rows[0].map(h => h.toLowerCase().trim());
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Auto-detect column mappings
      const columnMapping: Record<string, number> = {};
      headerRow.forEach((header, index) => {
        const mappedField = KNOWN_COLUMN_MAPPINGS[header];
        if (mappedField) {
          columnMapping[mappedField] = index;
        }
      });

      // Detect source
      const headerStr = headerRow.join(' ');
      if (headerStr.includes('playerload') || headerStr.includes('catapult')) {
        setSource('catapult');
      } else if (headerStr.includes('statsports') || headerStr.includes('apex')) {
        setSource('statsports');
      }

      if (columnMapping.player_name === undefined) {
        toast.error("Colonne 'joueur' non trouvée dans le fichier");
        return;
      }

      // Parse data
      const parsedData: GpsPlayerData[] = dataRows
        .filter(row => row[columnMapping.player_name]?.trim())
        .map(row => {
          const playerName = row[columnMapping.player_name] || '';
          const matchedPlayer = matchPlayerByName(playerName);
          
          const rawData: Record<string, string | number> = {};
          headers.forEach((h, i) => {
            rawData[h] = row[i] || '';
          });

          return {
            playerName,
            matchedPlayer,
            total_distance_m: columnMapping.total_distance_m !== undefined 
              ? parseNumber(row[columnMapping.total_distance_m]) : null,
            high_speed_distance_m: columnMapping.high_speed_distance_m !== undefined 
              ? parseNumber(row[columnMapping.high_speed_distance_m]) : null,
            sprint_distance_m: columnMapping.sprint_distance_m !== undefined 
              ? parseNumber(row[columnMapping.sprint_distance_m]) : null,
            max_speed_ms: columnMapping.max_speed_ms !== undefined 
              ? parseNumber(row[columnMapping.max_speed_ms]) : null,
            player_load: columnMapping.player_load !== undefined 
              ? parseNumber(row[columnMapping.player_load]) : null,
            accelerations: columnMapping.accelerations !== undefined 
              ? parseNumber(row[columnMapping.accelerations]) : null,
            decelerations: columnMapping.decelerations !== undefined 
              ? parseNumber(row[columnMapping.decelerations]) : null,
            duration_minutes: columnMapping.duration_minutes !== undefined 
              ? parseNumber(row[columnMapping.duration_minutes]) : null,
            sprint_count: columnMapping.sprint_count !== undefined 
              ? parseNumber(row[columnMapping.sprint_count]) : null,
            raw_data: rawData,
          };
        });

      onGpsDataChange(parsedData);
      
      const matchedCount = parsedData.filter(d => d.matchedPlayer).length;
      toast.success(`${parsedData.length} lignes chargées, ${matchedCount} athlètes identifiés`);
    };
    
    reader.readAsText(file);
  }, [matchPlayerByName, onGpsDataChange]);

  const removeGpsData = () => {
    onGpsDataChange([]);
    setFileName("");
  };

  const matchedCount = gpsData.filter(d => d.matchedPlayer).length;
  const unmatchedCount = gpsData.filter(d => !d.matchedPlayer).length;

  if (gpsData.length > 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">Données GPS importées</span>
              <Badge variant="secondary">{source}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={removeGpsData}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-primary">
              <Check className="h-4 w-4" />
              <span>{matchedCount} athlètes identifiés</span>
            </div>
            {unmatchedCount > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{unmatchedCount} non identifiés</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Fichier: {fileName}
          </p>

          {unmatchedCount > 0 && (
            <ScrollArea className="h-20 mt-2">
              <div className="text-xs text-muted-foreground">
                Non identifiés: {gpsData.filter(d => !d.matchedPlayer).map(d => d.playerName).join(', ')}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="gps-file" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span>Importer des données GPS (CSV)</span>
                <Badge variant="outline" className="text-xs">Optionnel</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Catapult ou STATSports - Les données seront liées à cette séance
              </p>
            </Label>
          </div>
          <Input
            id="gps-file"
            type="file"
            accept=".csv"
            className="w-auto"
            onChange={handleFileUpload}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export type { GpsPlayerData };
