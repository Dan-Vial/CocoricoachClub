import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Upload, FileText, Check, AlertCircle, Loader2, Link2, Eye, EyeOff, Dumbbell, ClipboardList, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseCsvText } from "@/lib/csv";
import {
  COLUMN_GROUP_LABELS,
  METRIC_LABELS,
  findMetricMapping,
  guessColumnGroup,
  parseIntegerLoose,
  parseNumberLoose,
  toMetersPerSecond,
  type ColumnGroup,
  type MetricKey,
} from "./gpsImportUtils";
import { useBulkCreatePerformanceReferences, type CreateReferenceInput } from "@/hooks/use-performance-references";
import { GpsObjectivesForm } from "./GpsObjectivesForm";
import { GpsObjectivesDashboard } from "./GpsObjectivesDashboard";

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
  mappedTo: MetricKey | null;
  group: ColumnGroup;
  exampleValue: string;
}

type SessionType = 'training' | 'test';

const TEST_TYPES = [
  { value: "10m_sprint", label: "Sprint 10m", distance: 10 },
  { value: "20m_sprint", label: "Sprint 20m", distance: 20 },
  { value: "30m_sprint", label: "Sprint 30m", distance: 30 },
  { value: "40m_sprint", label: "Sprint 40m", distance: 40 },
  { value: "60m_sprint", label: "Sprint 60m", distance: 60 },
  { value: "100m_sprint", label: "Sprint 100m", distance: 100 },
  { value: "1600m_run", label: "Course 1600m", distance: 1600 },
];

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
  
  // New state for session type selection
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [setAsReference, setSetAsReference] = useState(true);

  const validPlayers = useMemo(() => players.filter(p => p.id && p.id.trim() !== ""), [players]);
  const queryClient = useQueryClient();
  const createReferences = useBulkCreatePerformanceReferences();

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
    enabled: !!sessionDate && sessionType === 'training',
  });

  // Fetch category sport type
  const { data: categoryData } = useQuery({
    queryKey: ["category-sport-type-gps", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = categoryData?.rugby_type || "XV";

  const selectedTest = TEST_TYPES.find(t => t.value === selectedTestType);


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
    setSessionType('training');
    setSelectedTestType('');
    setSetAsReference(true);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows } = parseCsvText(text);

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
        const group = guessColumnGroup(header, mappedTo);
        const exampleValue =
          dataRows.find(r => (r?.[index] ?? "").trim().length > 0)?.[index]?.trim() || "";
        
        return {
          index,
          header: header || `Colonne ${index + 1}`,
          visible: true, // All columns visible by default
          mappedTo,
          group,
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

  const setColumnGroup = (index: number, group: ColumnGroup) => {
    setColumns(prev => prev.map(col => (col.index === index ? { ...col, group } : col)));
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
        const numValue = parseNumberLoose(value);
        rawData[col.header] = numValue === null ? value : numValue;
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

    // For test mode, check that test type is selected
    if (sessionType === 'test' && !selectedTestType) {
      toast.error("Veuillez sélectionner un type de test");
      return;
    }

    setIsImporting(true);
    setStep('importing');

    try {
      // Prepare GPS records
      const gpsRecords = validRows.map(row => {
        const maxSpeedMs = (() => {
          const col = columns.find(c => c.mappedTo === 'max_speed_ms');
          if (!col) return null;
          return toMetersPerSecond(row.rawData[col.header], col.header);
        })();
        
        return {
          category_id: categoryId,
          player_id: row.matchedPlayerId!,
          session_date: sessionDate,
          session_name: sessionType === 'test' 
            ? `Test ${selectedTest?.label || selectedTestType}` 
            : (sessionName || null),
          training_session_id: sessionType === 'training' ? (selectedSessionId || null) : null,
          source,
          total_distance_m: parseNumberLoose(getColumnValue(row.rawData, 'total_distance_m')),
          high_speed_distance_m: parseNumberLoose(getColumnValue(row.rawData, 'high_speed_distance_m')),
          sprint_distance_m: parseNumberLoose(getColumnValue(row.rawData, 'sprint_distance_m')),
          max_speed_ms: maxSpeedMs,
          player_load: parseNumberLoose(getColumnValue(row.rawData, 'player_load')),
          accelerations: parseIntegerLoose(getColumnValue(row.rawData, 'accelerations')),
          decelerations: parseIntegerLoose(getColumnValue(row.rawData, 'decelerations')),
          duration_minutes: parseNumberLoose(getColumnValue(row.rawData, 'duration_minutes')),
          sprint_count: parseIntegerLoose(getColumnValue(row.rawData, 'sprint_count')),
          raw_data: row.rawData,
        };
      });

      // Insert GPS sessions
      const { data: insertedGps, error: gpsError } = await supabase
        .from('gps_sessions')
        .insert(gpsRecords)
        .select();

      if (gpsError) throw gpsError;

      // If test mode, also create test records
      if (sessionType === 'test' && selectedTestType && insertedGps) {
        const testInserts = insertedGps.map(gps => {
          const distance = selectedTest?.distance || 0;
          const maxSpeedMs = gps.max_speed_ms;
          const speedKmh = maxSpeedMs ? maxSpeedMs * 3.6 : null;
          
          // Calculate time from distance and max speed if available
          let timeSeconds = null;
          if (maxSpeedMs && distance && distance <= 100) {
            // For short sprints, estimate time from max speed (rough approximation)
            // avg speed ≈ 0.85 * max speed for short sprints
            const avgSpeedMs = maxSpeedMs * 0.85;
            timeSeconds = distance / avgSpeedMs;
          }
          
          return {
            player_id: gps.player_id,
            category_id: categoryId,
            test_date: sessionDate,
            test_type: selectedTestType,
            time_40m_seconds: timeSeconds,
            speed_ms: maxSpeedMs,
            speed_kmh: speedKmh,
          };
        });

        const { data: testResults, error: testError } = await supabase
          .from('speed_tests')
          .insert(testInserts)
          .select();

        if (testError) {
          console.error('Test insert error:', testError);
          // Continue even if test insert fails - GPS data is already saved
        } else if (testResults && setAsReference) {
          // Create performance references
          const references: CreateReferenceInput[] = testResults.map((test, idx) => {
            const gps = insertedGps[idx];
            const durationMin = gps.duration_minutes || 1;
            
            return {
              player_id: test.player_id,
              category_id: categoryId,
              test_date: sessionDate,
              source_type: "gps_session",
              source_id: gps.id,
              ref_vmax_ms: gps.max_speed_ms,
              ref_vmax_kmh: gps.max_speed_ms ? gps.max_speed_ms * 3.6 : null,
              ref_acceleration_max: gps.accelerations,
              ref_deceleration_max: gps.decelerations,
              ref_sprint_distance_m: gps.sprint_distance_m,
              ref_time_40m_seconds: test.time_40m_seconds,
              ref_player_load_per_min: gps.player_load && durationMin > 0 
                ? gps.player_load / durationMin 
                : null,
              ref_high_intensity_distance_per_min: gps.high_speed_distance_m && durationMin > 0
                ? gps.high_speed_distance_m / durationMin
                : null,
              notes: `Import GPS - ${selectedTest?.label} du ${sessionDate}`,
            };
          });

          await createReferences.mutateAsync(references);
        }

        // Invalidate test queries
        queryClient.invalidateQueries({ queryKey: ["speed_tests", categoryId] });
      }

      // Update AWCR tracking with GPS Player Load
      const playersWithGpsLoad = validRows
        .filter(row => parseNumberLoose(getColumnValue(row.rawData, 'player_load')) !== null)
        .map(row => ({
          playerId: row.matchedPlayerId!,
          playerLoad: parseNumberLoose(getColumnValue(row.rawData, 'player_load'))
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

      const successMsg = sessionType === 'test' 
        ? `${validRows.length} sessions GPS importées + tests ${selectedTest?.label} créés`
        : `${validRows.length} sessions GPS importées avec succès`;
      
      toast.success(successMsg);
      resetState();
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message)
            : null;
      toast.error(message ? `Erreur lors de l'import: ${message}` : "Erreur lors de l'import");
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
              {/* Session Type Selector */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium mb-3 block">Type de session</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={sessionType === 'training' ? 'default' : 'outline'}
                    className="h-auto py-3 justify-start gap-3"
                    onClick={() => {
                      setSessionType('training');
                      setSelectedTestType('');
                    }}
                  >
                    <Dumbbell className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Entraînement</div>
                      <div className="text-xs opacity-80">Séance normale</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={sessionType === 'test' ? 'default' : 'outline'}
                    className="h-auto py-3 justify-start gap-3"
                    onClick={() => {
                      setSessionType('test');
                      setSelectedSessionId('');
                    }}
                  >
                    <ClipboardList className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Test physique</div>
                      <div className="text-xs opacity-80">Enregistre les performances</div>
                    </div>
                  </Button>
                </div>
              </div>

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
                {sessionType === 'training' ? (
                  <div>
                    <Label>Nom de la session</Label>
                    <Input
                      placeholder="Ex: Entraînement du mardi"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Type de test *</Label>
                    <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un test..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

              {/* Link to training session - only for training mode */}
              {sessionType === 'training' && trainingSessions && trainingSessions.length > 0 && (
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

              {/* GPS Objectives Form - when linked to a session */}
              {sessionType === 'training' && selectedSessionId && (
                <GpsObjectivesForm
                  categoryId={categoryId}
                  trainingSessionId={selectedSessionId}
                  sportType={sportType}
                  trainingType={trainingSessions?.find(s => s.id === selectedSessionId)?.training_type}
                />
              )}

              {/* Performance reference checkbox - only for test mode */}
              {sessionType === 'test' && selectedTestType && (
                <div className="flex items-center space-x-2 p-3 border rounded-lg bg-primary/5">
                  <Checkbox
                    id="set-reference-gps"
                    checked={setAsReference}
                    onCheckedChange={(checked) => setSetAsReference(checked === true)}
                  />
                  <Label htmlFor="set-reference-gps" className="text-sm cursor-pointer">
                    <span className="font-medium">Définir comme référence de performance</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vmax, accélérations, charge GPS deviendront les références pour les % en match
                    </p>
                  </Label>
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
                {sessionType === 'test' && (
                  <Badge variant="secondary" className="bg-primary/20">
                    <ClipboardList className="h-3 w-3 mr-1" />
                    Mode Test
                  </Badge>
                )}
              </div>

              {/* Column list with checkboxes */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[60px]">Afficher</TableHead>
                      <TableHead>En-tête CSV</TableHead>
                      <TableHead className="w-[200px]">Catégorie</TableHead>
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
                        <TableCell>
                          <Select value={col.group} onValueChange={(v) => setColumnGroup(col.index, v as ColumnGroup)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(COLUMN_GROUP_LABELS) as ColumnGroup[]).map((g) => (
                                <SelectItem key={g} value={g}>
                                  {COLUMN_GROUP_LABELS[g]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                {sessionType === 'test' && selectedTest && (
                  <Badge variant="secondary" className="bg-primary/20 gap-1">
                    <ClipboardList className="h-3 w-3" />
                    Test: {selectedTest.label}
                  </Badge>
                )}
              </div>

              <div className="h-[450px] overflow-auto border rounded-lg">
                <div className="w-max min-w-full">
                  <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[60px] sticky left-0 bg-background">Import</TableHead>
                      <TableHead className="w-[50px]">Statut</TableHead>
                      <TableHead className="w-[200px]">Joueur associé</TableHead>
                      {visibleColumns.map(col => (
                        <TableHead key={col.index} className="min-w-[100px]">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {COLUMN_GROUP_LABELS[col.group]}
                            </span>
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
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('columns')}>
                  Retour
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={effectiveMatchedCount === 0 || (sessionType === 'test' && !selectedTestType) || createReferences.isPending}
                >
                  {createReferences.isPending ? "Import..." : sessionType === 'test' 
                    ? `Importer ${effectiveMatchedCount} GPS + Tests`
                    : `Importer ${effectiveMatchedCount} sessions`
                  }
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
