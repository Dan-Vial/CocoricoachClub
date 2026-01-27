import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Check, AlertCircle, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Player {
  id: string;
  name: string;
  position: string | null;
}

interface GpsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  players: Player[];
  onSuccess: () => void;
}

interface ParsedRow {
  playerName: string;
  matchedPlayer: Player | null;
  data: Record<string, string | number>;
}

interface ColumnMapping {
  player_name: string;
  session_date: string;
  total_distance_m: string;
  high_speed_distance_m: string;
  sprint_distance_m: string;
  max_speed_ms: string;
  player_load: string;
  accelerations: string;
  decelerations: string;
  duration_minutes: string;
  sprint_count: string;
}

const KNOWN_COLUMN_MAPPINGS: Record<string, keyof ColumnMapping> = {
  // Player name variations
  'player': 'player_name',
  'player name': 'player_name',
  'athlete': 'player_name',
  'athlete name': 'player_name',
  'name': 'player_name',
  'nom': 'player_name',
  'joueur': 'player_name',
  
  // Date variations
  'date': 'session_date',
  'session date': 'session_date',
  'session_date': 'session_date',
  
  // Distance variations
  'total distance': 'total_distance_m',
  'total distance (m)': 'total_distance_m',
  'distance (m)': 'total_distance_m',
  'distance': 'total_distance_m',
  'distance totale': 'total_distance_m',
  
  // High speed distance
  'high speed distance': 'high_speed_distance_m',
  'high speed distance (m)': 'high_speed_distance_m',
  'hsr': 'high_speed_distance_m',
  'hsr (m)': 'high_speed_distance_m',
  'high speed running': 'high_speed_distance_m',
  'distance haute intensité': 'high_speed_distance_m',
  
  // Sprint distance
  'sprint distance': 'sprint_distance_m',
  'sprint distance (m)': 'sprint_distance_m',
  'sprinting': 'sprint_distance_m',
  'distance sprint': 'sprint_distance_m',
  
  // Max speed
  'max speed': 'max_speed_ms',
  'max speed (m/s)': 'max_speed_ms',
  'maximum speed': 'max_speed_ms',
  'top speed': 'max_speed_ms',
  'vitesse max': 'max_speed_ms',
  'peak speed': 'max_speed_ms',
  
  // Player load
  'player load': 'player_load',
  'playerload': 'player_load',
  'load': 'player_load',
  'body load': 'player_load',
  'charge joueur': 'player_load',
  
  // Accelerations
  'accelerations': 'accelerations',
  'accel': 'accelerations',
  'acc': 'accelerations',
  'accélérations': 'accelerations',
  
  // Decelerations
  'decelerations': 'decelerations',
  'decel': 'decelerations',
  'dec': 'decelerations',
  'décélérations': 'decelerations',
  
  // Duration
  'duration': 'duration_minutes',
  'duration (min)': 'duration_minutes',
  'time': 'duration_minutes',
  'session duration': 'duration_minutes',
  'durée': 'duration_minutes',
  
  // Sprint count
  'sprint count': 'sprint_count',
  'sprints': 'sprint_count',
  'number of sprints': 'sprint_count',
  'nb sprints': 'sprint_count',
};

export function GpsImportDialog({ open, onOpenChange, categoryId, players, onSuccess }: GpsImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionName, setSessionName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [source, setSource] = useState<'catapult' | 'statsports' | 'manual'>('manual');
  const [isImporting, setIsImporting] = useState(false);

  // Fetch existing training sessions for linking
  const { data: trainingSessions } = useQuery({
    queryKey: ["training-sessions-for-gps", categoryId, sessionDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, session_start_time")
        .eq("category_id", categoryId)
        .eq("session_date", sessionDate)
        .order("session_start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sessionDate,
  });

  const resetState = useCallback(() => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
    setSessionName('');
    setSelectedSessionId('');
    setSource('manual');
    setIsImporting(false);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      const rows = lines.map(line => {
        // Handle quoted CSV values
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
      setHeaders(rows[0]);
      setCsvData(rows.slice(1));

      // Auto-detect column mappings
      const autoMapping: Partial<ColumnMapping> = {};
      headerRow.forEach((header, index) => {
        const mappedField = KNOWN_COLUMN_MAPPINGS[header];
        if (mappedField) {
          autoMapping[mappedField] = rows[0][index];
        }
      });
      setColumnMapping(autoMapping);
      
      // Detect source based on headers
      const headerStr = headerRow.join(' ');
      if (headerStr.includes('playerload') || headerStr.includes('catapult')) {
        setSource('catapult');
      } else if (headerStr.includes('statsports') || headerStr.includes('apex')) {
        setSource('statsports');
      }

      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  const matchPlayerByName = useCallback((name: string): Player | null => {
    if (!name) return null;
    const searchName = name.toLowerCase().trim();
    
    // Try exact match first
    let match = players.find(p => p.name.toLowerCase() === searchName);
    
    if (match) return match;
    
    // Try partial match
    match = players.find(p =>
      p.name.toLowerCase().includes(searchName) ||
      searchName.includes(p.name.toLowerCase())
    );
    
    return match || null;
  }, [players]);

  const handleProceedToPreview = useCallback(() => {
    if (!columnMapping.player_name) {
      toast.error("Veuillez mapper la colonne du nom du joueur");
      return;
    }

    const playerNameIndex = headers.indexOf(columnMapping.player_name);
    
    const rows: ParsedRow[] = csvData.map(row => {
      const playerName = row[playerNameIndex] || '';
      const matchedPlayer = matchPlayerByName(playerName);
      
      const data: Record<string, string | number> = {};
      Object.entries(columnMapping).forEach(([field, header]) => {
        if (header) {
          const index = headers.indexOf(header);
          if (index !== -1) {
            const value = row[index];
            // Parse numbers
            const numValue = parseFloat(value?.replace(',', '.') || '');
            data[field] = isNaN(numValue) ? value : numValue;
          }
        }
      });
      
      return { playerName, matchedPlayer, data };
    }).filter(row => row.playerName);

    setParsedRows(rows);
    setStep('preview');
  }, [columnMapping, headers, csvData, matchPlayerByName]);

  const parseNumber = (value: string | number | undefined): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(row => row.matchedPlayer);
    
    if (validRows.length === 0) {
      toast.error("Aucun joueur n'a pu être associé");
      return;
    }

    setIsImporting(true);
    setStep('importing');

    try {
      const records = validRows.map(row => ({
        category_id: categoryId,
        player_id: row.matchedPlayer!.id,
        session_date: sessionDate,
        session_name: sessionName || null,
        training_session_id: selectedSessionId || null,
        source,
        total_distance_m: parseNumber(row.data.total_distance_m),
        high_speed_distance_m: parseNumber(row.data.high_speed_distance_m),
        sprint_distance_m: parseNumber(row.data.sprint_distance_m),
        max_speed_ms: parseNumber(row.data.max_speed_ms),
        player_load: parseNumber(row.data.player_load),
        accelerations: parseNumber(row.data.accelerations),
        decelerations: parseNumber(row.data.decelerations),
        duration_minutes: parseNumber(row.data.duration_minutes),
        sprint_count: parseNumber(row.data.sprint_count),
        raw_data: row.data,
      }));

      const { error } = await supabase
        .from('gps_sessions')
        .insert(records);

      if (error) throw error;

      toast.success(`${validRows.length} sessions GPS importées avec succès`);
      resetState();
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import");
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const matchedCount = parsedRows.filter(r => r.matchedPlayer).length;
  const unmatchedCount = parsedRows.filter(r => !r.matchedPlayer).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import de données GPS
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Sélectionnez un fichier CSV exporté de Catapult ou STATSports"}
            {step === 'mapping' && "Vérifiez le mapping des colonnes"}
            {step === 'preview' && "Vérifiez les données avant import"}
            {step === 'importing' && "Import en cours..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label htmlFor="csv-file" className="cursor-pointer">
                  <span className="text-lg font-medium block mb-2">
                    Glissez votre fichier CSV ici
                  </span>
                  <span className="text-sm text-muted-foreground block mb-4">
                    ou cliquez pour sélectionner
                  </span>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" asChild>
                    <span>Sélectionner un fichier</span>
                  </Button>
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Catapult</h4>
                    <p className="text-sm text-muted-foreground">
                      Export CSV depuis Catapult Cloud ou Vector
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">STATSports</h4>
                    <p className="text-sm text-muted-foreground">
                      Export CSV depuis Apex ou Viper
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de la session</Label>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nom de la session (optionnel)</Label>
                  <Input
                    placeholder="Ex: Entraînement du mardi"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Source des données</Label>
                <Select value={source} onValueChange={(v: 'catapult' | 'statsports' | 'manual') => setSource(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catapult">Catapult</SelectItem>
                    <SelectItem value="statsports">STATSports</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Link to existing training session */}
              {trainingSessions && trainingSessions.length > 0 && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <Label className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4" />
                    Lier à une séance existante (optionnel)
                  </Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une séance..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune liaison</SelectItem>
                      {trainingSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.training_type}
                          {session.session_start_time && ` - ${session.session_start_time.slice(0, 5)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les données GPS seront liées à cette séance
                  </p>
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Colonne Nom du joueur *</Label>
                      <Select
                        value={columnMapping.player_name || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, player_name: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Distance totale (m)</Label>
                      <Select
                        value={columnMapping.total_distance_m || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, total_distance_m: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Distance haute intensité (m)</Label>
                      <Select
                        value={columnMapping.high_speed_distance_m || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, high_speed_distance_m: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Distance sprint (m)</Label>
                      <Select
                        value={columnMapping.sprint_distance_m || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, sprint_distance_m: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vitesse max (m/s)</Label>
                      <Select
                        value={columnMapping.max_speed_ms || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, max_speed_ms: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Player Load</Label>
                      <Select
                        value={columnMapping.player_load || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, player_load: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Accélérations</Label>
                      <Select
                        value={columnMapping.accelerations || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, accelerations: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Décélérations</Label>
                      <Select
                        value={columnMapping.decelerations || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, decelerations: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Durée (min)</Label>
                      <Select
                        value={columnMapping.duration_minutes || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, duration_minutes: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nombre de sprints</Label>
                      <Select
                        value={columnMapping.sprint_count || ''}
                        onValueChange={(v) => setColumnMapping(m => ({ ...m, sprint_count: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Non mappé</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Retour
                </Button>
                <Button onClick={handleProceedToPreview}>
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {matchedCount} joueurs associés
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {unmatchedCount} non trouvés
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[350px] border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Statut</th>
                      <th className="text-left p-2">Nom CSV</th>
                      <th className="text-left p-2">Joueur associé</th>
                      <th className="text-right p-2">Distance</th>
                      <th className="text-right p-2">Player Load</th>
                      <th className="text-right p-2">Vitesse Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={!row.matchedPlayer ? 'bg-destructive/10' : ''}>
                        <td className="p-2">
                          {row.matchedPlayer ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="p-2">{row.playerName}</td>
                        <td className="p-2">
                          {row.matchedPlayer?.name || '-'}
                        </td>
                        <td className="p-2 text-right">
                          {row.data.total_distance_m ? `${row.data.total_distance_m} m` : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {row.data.player_load || '-'}
                        </td>
                        <td className="p-2 text-right">
                          {row.data.max_speed_ms ? `${row.data.max_speed_ms} m/s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Retour
                </Button>
                <Button onClick={handleImport} disabled={matchedCount === 0}>
                  Importer {matchedCount} sessions
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Import en cours...</p>
              <p className="text-sm text-muted-foreground">Veuillez patienter</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
