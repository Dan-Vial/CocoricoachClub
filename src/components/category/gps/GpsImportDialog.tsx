import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Check, AlertCircle, Loader2, Link2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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
  matchedPlayerId: string | null;
  include: boolean;
  rawData: Record<string, string | number>;
}

interface ColumnConfig {
  index: number;
  header: string;
  visible: boolean;
  mappedTo: string | null; // 'player_name' | 'total_distance_m' | etc.
  exampleValue: string;
}

type MetricKey = 'player_name' | 'total_distance_m' | 'high_speed_distance_m' | 'sprint_distance_m' | 'max_speed_ms' | 'player_load' | 'accelerations' | 'decelerations' | 'duration_minutes' | 'sprint_count';

const METRIC_LABELS: Record<MetricKey, string> = {
  player_name: 'Nom du joueur',
  total_distance_m: 'Distance totale (m)',
  high_speed_distance_m: 'Distance haute intensité (m)',
  sprint_distance_m: 'Distance sprint (m)',
  max_speed_ms: 'Vitesse max',
  player_load: 'Player Load',
  accelerations: 'Accélérations',
  decelerations: 'Décélérations',
  duration_minutes: 'Durée (min)',
  sprint_count: 'Nombre de sprints',
};

// Helper to normalize headers for matching (remove accents, lowercase, trim)
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' '); // Normalize spaces
};

// Function to find the best metric match for a header
const findMetricMapping = (header: string): MetricKey | null => {
  const normalized = normalizeHeader(header);
  
  // Player name patterns
  if (/^(player|athlete|nom|joueur|name)/.test(normalized) || 
      /player\s*name/.test(normalized) ||
      /athlete\s*name/.test(normalized)) {
    return 'player_name';
  }
  
  // Max speed / Vmax patterns - CHECK FIRST before distance
  if (/v\s*max/.test(normalized) || 
      /vitesse\s*max/.test(normalized) ||
      /max\s*speed/.test(normalized) ||
      /top\s*speed/.test(normalized) ||
      /peak\s*speed/.test(normalized) ||
      /maximum\s*speed/.test(normalized)) {
    return 'max_speed_ms';
  }
  
  // Sprint distance patterns (>24, >27 km/h)
  if (/sprint\s*dist/.test(normalized) ||
      /dist.*sprint/.test(normalized) ||
      /dist.*>.*2[4-7]/.test(normalized) ||
      /sprinting/.test(normalized)) {
    return 'sprint_distance_m';
  }
  
  // High speed distance patterns (>18, >20, >21 km/h, HSR)
  if (/hsr/.test(normalized) ||
      /high\s*speed/.test(normalized) ||
      /haute\s*intensite/.test(normalized) ||
      /dist.*>.*1[8-9]/.test(normalized) ||
      /dist.*>.*2[0-1]/.test(normalized)) {
    return 'high_speed_distance_m';
  }
  
  // Total distance patterns (must not match high speed or sprint)
  if ((/distance\s*totale/.test(normalized) ||
       /total\s*distance/.test(normalized) ||
       /dist\s*totale/.test(normalized) ||
       (normalized === 'distance') ||
       (normalized === 'distance (m)') ||
       /^dist\s*\(m\)$/.test(normalized)) &&
      !normalized.includes('>') &&
      !normalized.includes('sprint') &&
      !normalized.includes('hsr') &&
      !normalized.includes('high')) {
    return 'total_distance_m';
  }
  
  // Player load patterns
  if (/player\s*load/.test(normalized) ||
      /playerload/.test(normalized) ||
      /body\s*load/.test(normalized) ||
      /charge\s*joueur/.test(normalized) ||
      /^(tot\s*)?pl$/.test(normalized) ||
      /^load$/.test(normalized)) {
    return 'player_load';
  }
  
  // Accelerations patterns
  if (/accel/.test(normalized) ||
      /acc[eé]l[eé]ration/.test(normalized) ||
      /nb\s*accel/.test(normalized) ||
      /nombre\s*d'?accel/.test(normalized)) {
    return 'accelerations';
  }
  
  // Decelerations patterns
  if (/decel/.test(normalized) ||
      /d[eé]c[eé]l[eé]ration/.test(normalized) ||
      /nb\s*decel/.test(normalized) ||
      /nombre\s*d[eé]?c[eé]l/.test(normalized)) {
    return 'decelerations';
  }
  
  // Duration patterns
  if (/duration/.test(normalized) ||
      /duree/.test(normalized) ||
      /session\s*time/.test(normalized) ||
      /^time/.test(normalized)) {
    return 'duration_minutes';
  }
  
  // Sprint count patterns
  if (/sprint\s*count/.test(normalized) ||
      /nb\s*sprint/.test(normalized) ||
      /number\s*of\s*sprint/.test(normalized) ||
      /^sprints?$/.test(normalized)) {
    return 'sprint_count';
  }
  
  return null;
};

export function GpsImportDialog({ open, onOpenChange, categoryId, players, onSuccess }: GpsImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'columns' | 'preview' | 'importing'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionName, setSessionName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [source, setSource] = useState<'catapult' | 'statsports' | 'manual'>('manual');
  const [isImporting, setIsImporting] = useState(false);

  const validPlayers = useMemo(() => players.filter(p => p.id && p.id.trim() !== ""), [players]);

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
    setColumns([]);
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

      const headerRow = rows[0];
      const dataRows = rows.slice(1);
      setCsvData(dataRows);

      // Build column configurations with auto-mapping using the smart matcher
      const columnConfigs: ColumnConfig[] = headerRow.map((header, index) => {
        const mappedTo = findMetricMapping(header);
        const exampleValue = dataRows[0]?.[index]?.trim() || '';
        
        return {
          index,
          header: header || `Colonne ${index + 1}`,
          visible: true, // All columns visible by default
          mappedTo,
          exampleValue,
        };
      });
      
      setColumns(columnConfigs);
      
      // Detect source based on headers
      const headerStr = headerRow.join(' ').toLowerCase();
      if (headerStr.includes('playerload') || headerStr.includes('catapult')) {
        setSource('catapult');
      } else if (headerStr.includes('statsports') || headerStr.includes('apex')) {
        setSource('statsports');
      }

      setStep('columns');
    };
    reader.readAsText(file);
  }, []);

  const matchPlayerByName = useCallback((name: string): Player | null => {
    if (!name) return null;
    const searchName = name.toLowerCase().trim();
    
    let match = validPlayers.find(p => p.name.toLowerCase() === searchName);
    if (match) return match;
    
    match = validPlayers.find(p =>
      p.name.toLowerCase().includes(searchName) ||
      searchName.includes(p.name.toLowerCase())
    );
    
    return match || null;
  }, [validPlayers]);

  const toggleColumnVisibility = (index: number) => {
    setColumns(prev => prev.map(col => 
      col.index === index ? { ...col, visible: !col.visible } : col
    ));
  };

  const setColumnMapping = (index: number, mappedTo: MetricKey | null) => {
    setColumns(prev => {
      // First, clear any existing mapping to this metric
      const cleared = prev.map(col => 
        col.mappedTo === mappedTo ? { ...col, mappedTo: null } : col
      );
      // Then set the new mapping
      return cleared.map(col => 
        col.index === index ? { ...col, mappedTo } : col
      );
    });
  };

  const playerNameColumnIndex = columns.find(c => c.mappedTo === 'player_name')?.index ?? -1;

  const handleProceedToPreview = useCallback(() => {
    if (playerNameColumnIndex === -1) {
      toast.error("Veuillez sélectionner la colonne contenant le nom du joueur");
      return;
    }
    
    const rows: ParsedRow[] = csvData.map(row => {
      const playerName = row[playerNameColumnIndex] || '';
      const matchedPlayer = matchPlayerByName(playerName);
      
      // Build raw_data from ALL columns (visible or not)
      const rawData: Record<string, string | number> = {};
      columns.forEach(col => {
        const value = row[col.index] || '';
        const numValue = parseFloat(value.replace(',', '.'));
        rawData[col.header] = isNaN(numValue) ? value : numValue;
      });
      
      return { 
        playerName, 
        matchedPlayerId: matchedPlayer?.id ?? null, 
        include: true, 
        rawData 
      };
    }).filter(row => row.playerName);

    setParsedRows(rows);
    setStep('preview');
  }, [playerNameColumnIndex, csvData, columns, matchPlayerByName]);

  const parseNumber = (value: string | number | undefined): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const getColumnValue = useCallback((rawData: Record<string, string | number>, metricKey: MetricKey): string | number | null => {
    const col = columns.find(c => c.mappedTo === metricKey);
    if (!col) return null;
    return rawData[col.header] ?? null;
  }, [columns]);

  const handleImport = async () => {
    const validRows = parsedRows.filter(row => row.include && row.matchedPlayerId);
    
    if (validRows.length === 0) {
      toast.error("Aucun joueur n'a pu être associé");
      return;
    }

    setIsImporting(true);
    setStep('importing');

    try {
      const records = validRows.map(row => ({
        category_id: categoryId,
        player_id: row.matchedPlayerId!,
        session_date: sessionDate,
        session_name: sessionName || null,
        training_session_id: selectedSessionId || null,
        source,
        total_distance_m: parseNumber(getColumnValue(row.rawData, 'total_distance_m')),
        high_speed_distance_m: parseNumber(getColumnValue(row.rawData, 'high_speed_distance_m')),
        sprint_distance_m: parseNumber(getColumnValue(row.rawData, 'sprint_distance_m')),
        max_speed_ms: parseNumber(getColumnValue(row.rawData, 'max_speed_ms')),
        player_load: parseNumber(getColumnValue(row.rawData, 'player_load')),
        accelerations: parseNumber(getColumnValue(row.rawData, 'accelerations')),
        decelerations: parseNumber(getColumnValue(row.rawData, 'decelerations')),
        duration_minutes: parseNumber(getColumnValue(row.rawData, 'duration_minutes')),
        sprint_count: parseNumber(getColumnValue(row.rawData, 'sprint_count')),
        raw_data: row.rawData, // Always save ALL columns
      }));

      const { error } = await supabase
        .from('gps_sessions')
        .insert(records);

      if (error) throw error;

      // Update AWCR tracking with GPS Player Load
      const playersWithGpsLoad = validRows
        .filter(row => parseNumber(getColumnValue(row.rawData, 'player_load')) !== null)
        .map(row => ({
          playerId: row.matchedPlayerId!,
          playerLoad: parseNumber(getColumnValue(row.rawData, 'player_load'))
        }));

      if (playersWithGpsLoad.length > 0) {
        for (const { playerId, playerLoad } of playersWithGpsLoad) {
          await supabase
            .from('awcr_tracking')
            .update({ gps_player_load: playerLoad })
            .eq('category_id', categoryId)
            .eq('player_id', playerId)
            .eq('session_date', sessionDate);
        }
      }

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

  const visibleColumns = columns.filter(c => c.visible);
  const mappedMetricsCount = columns.filter(c => c.mappedTo).length;
  const effectiveMatchedCount = parsedRows.filter(r => r.include && r.matchedPlayerId).length;
  const effectiveUnmatchedCount = parsedRows.filter(r => r.include && !r.matchedPlayerId).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import de données GPS
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Sélectionnez un fichier CSV exporté de Catapult ou STATSports"}
            {step === 'columns' && "Cochez les colonnes à afficher et mappez les métriques GPS"}
            {step === 'preview' && "Vérifiez les données et associez les joueurs avant import"}
            {step === 'importing' && "Import en cours..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label htmlFor="csv-file" className="cursor-pointer">
                  <span className="text-lg font-medium block mb-2">
                    Importer un fichier CSV
                  </span>
                  <span className="text-sm text-muted-foreground block mb-4">
                    Cliquez pour sélectionner votre fichier
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

          {/* STEP 2: Column Selection & Mapping */}
          {step === 'columns' && (
            <div className="flex flex-col gap-4">
              {/* Session settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date de la session *</Label>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nom de la session</Label>
                  <Input
                    placeholder="Ex: Entraînement du mardi"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
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
              </div>

              {/* Link to training session */}
              {trainingSessions && trainingSessions.length > 0 && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <Label className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4" />
                    Lier à une séance existante (optionnel)
                  </Label>
                  <Select 
                    value={selectedSessionId || "__none__"} 
                    onValueChange={(v) => setSelectedSessionId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder="Sélectionner une séance..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune liaison</SelectItem>
                      {trainingSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.training_type}
                          {session.session_start_time && ` - ${session.session_start_time.slice(0, 5)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium">Colonnes:</span>
                <Badge variant="outline">{columns.length} total</Badge>
                <Badge variant="default">{visibleColumns.length} visibles</Badge>
                <Badge variant="secondary">{mappedMetricsCount} mappées</Badge>
                {playerNameColumnIndex === -1 && (
                  <Badge variant="destructive">Joueur non mappé !</Badge>
                )}
              </div>

              {/* Column list with checkboxes */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[60px]">Afficher</TableHead>
                      <TableHead>En-tête CSV</TableHead>
                      <TableHead className="w-[180px]">Exemple</TableHead>
                      <TableHead className="w-[220px]">Mapper vers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((col) => (
                      <TableRow key={col.index} className={!col.visible ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={col.visible}
                            onCheckedChange={() => toggleColumnVisibility(col.index)}
                            aria-label={`Afficher ${col.header}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {col.visible ? (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            {col.header}
                            {col.mappedTo && (
                              <Badge variant="default" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                {METRIC_LABELS[col.mappedTo]}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[180px]">
                          {col.exampleValue || '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={col.mappedTo || '__none__'}
                            onValueChange={(v) => setColumnMapping(col.index, v === '__none__' ? null : v as MetricKey)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Non mappé" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Non mappé</SelectItem>
                              {(Object.keys(METRIC_LABELS) as MetricKey[]).map(key => (
                                <SelectItem key={key} value={key}>
                                  {METRIC_LABELS[key]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Retour
                </Button>
                <Button onClick={handleProceedToPreview} disabled={playerNameColumnIndex === -1}>
                  Continuer vers l'aperçu
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Player Association */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 flex-wrap">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {effectiveMatchedCount} joueurs associés
                </Badge>
                {effectiveUnmatchedCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {effectiveUnmatchedCount} non trouvés
                  </Badge>
                )}
                <Badge variant="outline">
                  {visibleColumns.length} colonnes affichées
                </Badge>
              </div>

              <ScrollArea className="h-[450px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[60px] sticky left-0 bg-background">Import</TableHead>
                      <TableHead className="w-[50px]">Statut</TableHead>
                      <TableHead className="w-[200px]">Joueur associé</TableHead>
                      {visibleColumns.map(col => (
                        <TableHead key={col.index} className="min-w-[100px]">
                          <div className="flex flex-col">
                            <span>{col.header}</span>
                            {col.mappedTo && (
                              <span className="text-xs text-primary font-normal">
                                → {METRIC_LABELS[col.mappedTo]}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={row.include && !row.matchedPlayerId ? 'bg-destructive/10' : ''}>
                        <TableCell className="sticky left-0 bg-background">
                          <Checkbox
                            checked={row.include}
                            onCheckedChange={(checked) => {
                              setParsedRows(prev => prev.map((r, idx) => 
                                idx === i ? { ...r, include: checked === true } : r
                              ));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {row.matchedPlayerId ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.matchedPlayerId || "__none__"}
                            onValueChange={(v) => {
                              setParsedRows(prev => prev.map((r, idx) =>
                                idx === i ? { ...r, matchedPlayerId: v === "__none__" ? null : v } : r
                              ));
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Associer..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px] z-[200]">
                              <SelectItem value="__none__">Non associé</SelectItem>
                              {validPlayers.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {visibleColumns.map(col => (
                          <TableCell key={col.index} className="text-sm">
                            {row.rawData[col.header] ?? '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('columns')}>
                  Retour
                </Button>
                <Button onClick={handleImport} disabled={effectiveMatchedCount === 0}>
                  Importer {effectiveMatchedCount} sessions
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Importing */}
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
