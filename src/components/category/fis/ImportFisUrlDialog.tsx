import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Globe, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { calculateFisPoints, determineScale } from "@/lib/fis/fisPointsEngine";

interface ImportFisUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  playerId: string;
  playerName: string;
}

interface ScrapedResult {
  date: string;
  place: string;
  country: string;
  category: string;
  discipline: string;
  position: string | null;
  fis_points: number | null;
  cup_points: number | null;
}

// Map FIS discipline names to our internal values
function mapDiscipline(disc: string): string {
  const lower = disc.toLowerCase().trim();
  if (lower.includes("big air") || lower === "ba") return "big_air";
  if (lower.includes("slopestyle") || lower === "ss") return "slopestyle";
  if (lower.includes("halfpipe") || lower === "hp") return "halfpipe";
  if (lower.includes("snowboard cross") || lower === "sbx") return "snowboardcross";
  if (lower.includes("parallel")) return "parallel_gs";
  return lower.replace(/\s+/g, "_");
}

// Map FIS category to our level
function mapLevel(cat: string): string {
  const lower = cat.toLowerCase().trim();
  if (lower.includes("wc") || lower.includes("world cup") || lower.includes("owg") || lower.includes("wsc")) return "world_cup";
  if (lower.includes("ec") || lower.includes("ecp") || lower.includes("continental")) return "continental_cup";
  if (lower.includes("nat") || lower.includes("nc")) return "national";
  return "fis";
}

// Parse date from various FIS formats
function parseDate(dateStr: string): string | null {
  // Try "DD Mon YYYY" format
  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (match) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const m = months[match[2].toLowerCase()];
    if (m) return `${match[3]}-${m}-${match[1].padStart(2, "0")}`;
  }
  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Try DD/MM/YYYY
  const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  return null;
}

export function ImportFisUrlDialog({ open, onOpenChange, categoryId, playerId, playerName }: ImportFisUrlDialogProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<ScrapedResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("Colle le lien FIS de l'athlète");
      return;
    }

    setScraping(true);
    setResults([]);
    setSelected(new Set());
    setImportDone(false);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-fis-history", {
        body: { url },
      });

      if (error) throw error;

      if (!data?.success || !data?.results?.length) {
        toast.error("Aucun résultat trouvé. Vérifie que le lien est correct et que la page contient des résultats.");
        setScraping(false);
        return;
      }

      setResults(data.results);
      // Select all by default
      setSelected(new Set(data.results.map((_: ScrapedResult, i: number) => i)));
      toast.success(`${data.results.length} résultat(s) trouvé(s)`);
    } catch (err) {
      console.error("Scrape error:", err);
      toast.error("Erreur lors du scraping. Réessaye ou utilise la saisie manuelle.");
    } finally {
      setScraping(false);
    }
  };

  const toggleResult = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const handleImport = async () => {
    const toImport = results.filter((_, i) => selected.has(i));
    if (toImport.length === 0) {
      toast.error("Sélectionne au moins un résultat");
      return;
    }

    setImporting(true);

    try {
      let imported = 0;
      for (const result of toImport) {
        const date = parseDate(result.date);
        if (!date) continue;

        const discipline = mapDiscipline(result.discipline);
        const level = mapLevel(result.category);
        const ranking = result.position ? parseInt(result.position) : null;
        if (!ranking || ranking <= 0) continue;

        const scale = determineScale(level);
        const calculatedPts = calculateFisPoints({ ranking, scale });

        // Create competition
        const compInsert = {
          category_id: categoryId,
          name: `${result.category} ${result.place}`.trim(),
          competition_date: date,
          discipline,
          level,
          location: result.place || null,
          race_penalty: scale,
          f_value: 500,
        };

        const { data: comp, error: compError } = await (supabase.from("fis_competitions") as any)
          .insert(compInsert)
          .select("id")
          .single();
        if (compError) {
          console.error("Comp insert error:", compError);
          continue;
        }

        // Create result
        const resultInsert = {
          competition_id: comp.id,
          player_id: playerId,
          category_id: categoryId,
          ranking,
          fis_points: result.fis_points ?? calculatedPts,
          base_points: calculatedPts,
          calculated_points: result.fis_points ?? calculatedPts,
        };

        const { error: resError } = await (supabase.from("fis_results") as any).insert(resultInsert);
        if (resError) {
          console.error("Result insert error:", resError);
          continue;
        }

        imported++;
      }

      // Update player FIS points
      const { data: allResults } = await supabase
        .from("fis_results")
        .select("fis_points, calculated_points, expires_at")
        .eq("player_id", playerId)
        .eq("category_id", categoryId);

      if (allResults) {
        const now = new Date();
        const valid = allResults.filter((r) => !r.expires_at || new Date(r.expires_at) > now);
        const best = valid
          .map((r) => (r as Record<string, unknown>).calculated_points as number ?? r.fis_points)
          .sort((a, b) => b - a)
          .slice(0, 2);
        const avg = best.length > 0 ? best.reduce((s, v) => s + v, 0) / best.length : 0;

        await supabase
          .from("players")
          .update({ fis_points: Math.round(avg * 100) / 100 })
          .eq("id", playerId);
      }

      setImportDone(true);
      toast.success(`${imported} résultat(s) importé(s) avec succès`);
      queryClient.invalidateQueries({ queryKey: ["fis-results"] });
      queryClient.invalidateQueries({ queryKey: ["fis-competitions"] });
      queryClient.invalidateQueries({ queryKey: ["players-fis-ranking"] });
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setUrl("");
    setResults([]);
    setSelected(new Set());
    setImportDone(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Importer depuis FIS — {playerName}
          </DialogTitle>
          <DialogDescription>
            Colle le lien de la page "Résultats" de l'athlète sur fis-ski.com
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>Lien FIS de l'athlète</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.fis-ski.com/DB/general/athlete-biography.html?..."
                disabled={scraping}
                className="flex-1"
              />
              <Button onClick={handleScrape} disabled={scraping || !url.trim()}>
                {scraping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Récupérer
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ex: https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=SB&competitorid=9490238&type=result
            </p>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {results.length} résultat(s) trouvé(s) — {selected.size} sélectionné(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(new Set(results.map((_, i) => i)))}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(new Set())}
                  >
                    Tout désélectionner
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-md max-h-[350px]">
                <div className="divide-y">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleResult(i)}
                    >
                      <Checkbox checked={selected.has(i)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono">{r.date}</span>
                          <span className="text-xs font-medium truncate">{r.place}</span>
                          {r.category && (
                            <Badge variant="outline" className="text-[9px] py-0">{r.category}</Badge>
                          )}
                          {r.discipline && (
                            <Badge variant="secondary" className="text-[9px] py-0">{r.discipline}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {r.position && (
                          <span className="text-xs font-bold">{r.position}e</span>
                        )}
                        {r.fis_points != null && (
                          <span className="text-[10px] text-muted-foreground ml-2">{r.fis_points} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {!importDone ? (
                <Button onClick={handleImport} disabled={importing || selected.size === 0} className="w-full">
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Importer {selected.size} résultat(s)
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Import terminé !
                </div>
              )}
            </>
          )}

          {scraping && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Scraping de la page FIS en cours... (quelques secondes)</span>
            </div>
          )}

          {!scraping && results.length === 0 && url && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Si le scraping échoue, utilise la saisie manuelle groupée</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
