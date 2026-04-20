import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Check, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";

/** One discipline detected in the file (e.g. HP, SS, BA, SL, GS, SP …) */
interface DisciplineData {
  code: string;      // short code from header, e.g. "HP", "SL"
  pts: number | null;
  rk: number | null;
}

interface FisAthleteRow {
  fisCode: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  birthYear: number | null;
  nation: string;
  gender: string;
  disciplines: DisciplineData[];
}

interface ParseResult {
  sport: string;           // detected from title row
  disciplineCodes: string[]; // e.g. ["HP","SS","BA","RE"]
  athletes: FisAthleteRow[];
}

interface MatchedAthlete {
  fisRow: FisAthleteRow;
  playerId: string | null;
  playerName: string | null;
  matchType: "name" | "none";
  selected: boolean;
}

interface FisImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === "" || val === "NaN") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Dynamically parse any FIS Points List Excel file.
 * Detects the header row, finds discipline columns (pairs of "XX Pts." / "XX Rk."),
 * and extracts athlete data accordingly.
 */
function parseExcelFile(data: ArrayBuffer): ParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Detect sport from title (first non-empty row)
  let sport = "Unknown";
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const firstCell = String(raw[i]?.[0] || "");
    if (firstCell.toLowerCase().includes("points list") || firstCell.toLowerCase().includes("classement")) {
      sport = firstCell;
      break;
    }
  }

  // Find header row (contains "FIS code" or "FIS Code")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i];
    if (row && row.some((c) => String(c).toLowerCase().replace(/\s+/g, "").includes("fiscode"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error("En-tête 'FIS code' introuvable dans le fichier");
  }

  const headers = raw[headerIdx].map((h) => String(h || "").trim());

  // Find fixed columns
  const findCol = (patterns: string[]) =>
    headers.findIndex((h) => patterns.some((p) => h.toLowerCase().replace(/\s+/g, "").includes(p)));

  const colFisCode = findCol(["fiscode"]);
  const colLastName = findCol(["lastname", "nom"]);
  const colFirstName = findCol(["firstname", "prénom", "prenom"]);
  const colBirthDate = findCol(["birthdate", "datenaissance"]);
  const colBirthYear = findCol(["birthyear", "annéenaissance", "anneenaissance"]);
  const colNation = findCol(["nation", "pays"]);
  const colGender = findCol(["gender", "sexe", "genre"]);

  // Detect discipline columns: any header ending with "Pts." or "Pts"
  const disciplineCols: { code: string; ptsIdx: number; rkIdx: number }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const ptsMatch = h.match(/^(\w+)\s*Pts\.?$/i);
    if (ptsMatch) {
      const code = ptsMatch[1].toUpperCase();
      // Expect the next column to be "XX Rk."
      const rkIdx = headers.findIndex(
        (rh, ri) => ri > i && rh.toLowerCase().replace(/\s+/g, "").includes(code.toLowerCase() + "rk"),
      );
      disciplineCols.push({ code, ptsIdx: i, rkIdx: rkIdx !== -1 ? rkIdx : -1 });
    }
  }

  const disciplineCodes = disciplineCols.map((d) => d.code);

  // Parse athlete rows
  const athletes: FisAthleteRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[colFisCode]) continue;

    const disciplines: DisciplineData[] = disciplineCols.map((d) => ({
      code: d.code,
      pts: parseNumber(r[d.ptsIdx]),
      rk: d.rkIdx !== -1 ? parseNumber(r[d.rkIdx]) : null,
    }));

    athletes.push({
      fisCode: String(r[colFisCode]).trim(),
      lastName: colLastName !== -1 ? String(r[colLastName] || "").trim() : "",
      firstName: colFirstName !== -1 ? String(r[colFirstName] || "").trim() : "",
      birthDate: colBirthDate !== -1 && r[colBirthDate] ? String(r[colBirthDate]) : null,
      birthYear: colBirthYear !== -1 ? parseNumber(r[colBirthYear]) : null,
      nation: colNation !== -1 ? String(r[colNation] || "").trim() : "",
      gender: colGender !== -1 ? String(r[colGender] || "").trim() : "",
      disciplines,
    });
  }

  return { sport, disciplineCodes, athletes };
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Map discipline code to a DB-friendly discipline name */
function disciplineCodeToName(code: string): string {
  const map: Record<string, string> = {
    HP: "halfpipe", SS: "slopestyle", BA: "big_air", RE: "rail",
    SL: "slalom", GS: "giant_slalom", SG: "super_g", DH: "downhill",
    AC: "acrobatic", MO: "moguls", AE: "aerials", SK: "skicross",
    SX: "snowboardcross", PSL: "parallel_slalom", PGS: "parallel_gs",
    SP: "sprint", IN: "individual", PU: "pursuit", MS: "mass_start",
  };
  return map[code] || code.toLowerCase();
}

export function FisImportDialog({ open, onOpenChange, categoryId }: FisImportDialogProps) {
  const [step, setStep] = useState<"upload" | "match" | "importing" | "done">("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [matched, setMatched] = useState<MatchedAthlete[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError(null);

      try {
        const data = await file.arrayBuffer();
        const result = parseExcelFile(data);
        setParseResult(result);

        const { data: players } = await supabase
          .from("players")
          .select("id, name, first_name, fis_code")
          .eq("category_id", categoryId);

        const matchResults: MatchedAthlete[] = result.athletes.map((fisRow) => {
          // Priority 1: match by FIS code
          const byFisCode = fisRow.fisCode
            ? players?.find((p) => p.fis_code && p.fis_code.trim() === fisRow.fisCode.trim())
            : null;
          if (byFisCode) {
            return {
              fisRow,
              playerId: byFisCode.id,
              playerName: `${byFisCode.first_name || ""} ${byFisCode.name}`.trim(),
              matchType: "name" as const,
              selected: true,
            };
          }
          // Priority 2: match by name
          const byName = players?.find((p) => {
            const pLast = normalize(p.name || "");
            const pFirst = normalize(p.first_name || "");
            return pLast === normalize(fisRow.lastName) && pFirst === normalize(fisRow.firstName);
          });
          if (byName) {
            return {
              fisRow,
              playerId: byName.id,
              playerName: `${byName.first_name || ""} ${byName.name}`.trim(),
              matchType: "name" as const,
              selected: true,
            };
          }
          return { fisRow, playerId: null, playerName: null, matchType: "none" as const, selected: false };
        });

        setMatched(matchResults);
        setStep("match");
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : "Erreur lors de la lecture du fichier");
      }
    },
    [categoryId],
  );

  const toggleSelection = (idx: number) => {
    setMatched((prev) => prev.map((m, i) => (i === idx ? { ...m, selected: !m.selected } : m)));
  };

  const handleImport = async () => {
    setImporting(true);
    setStep("importing");
    let count = 0;
    const toImport = matched.filter((m) => m.selected && m.playerId);

    for (const m of toImport) {
      const fisRow = m.fisRow;
      const withPts = fisRow.disciplines.filter((d) => d.pts != null);
      const best = withPts.sort((a, b) => (b.pts || 0) - (a.pts || 0))[0];

      // Update player
      const updateData: Record<string, unknown> = {
        fis_code: fisRow.fisCode,
        fis_points: best?.pts || null,
        fis_ranking: best?.rk || null,
      };
      await supabase.from("players").update(updateData).eq("id", m.playerId!);

      // Store discipline results
      const today = new Date().toISOString().split("T")[0];
      for (const d of withPts) {
        let compId: string;
        const { data: existingComp } = await supabase
          .from("fis_competitions")
          .select("id")
          .eq("category_id", categoryId)
          .eq("competition_date", today)
          .eq("name", `Import classement FIS - ${d.code}`)
          .maybeSingle();

        if (existingComp) {
          compId = existingComp.id;
        } else {
          const { data: newComp } = await supabase
            .from("fis_competitions")
            .insert({
              category_id: categoryId,
              name: `Import classement FIS - ${d.code}`,
              competition_date: today,
              discipline: disciplineCodeToName(d.code),
              level: "fis",
              total_participants: null,
            })
            .select("id")
            .single();
          if (!newComp) continue;
          compId = newComp.id;
        }

        const { error } = await supabase.from("fis_results").upsert(
          {
            competition_id: compId,
            player_id: m.playerId!,
            category_id: categoryId,
            ranking: d.rk || null,
            fis_points: d.pts!,
          },
          { onConflict: "competition_id,player_id" },
        );
        if (!error) count++;
      }
    }

    setImportCount(count);
    setImporting(false);
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["players"] });
    toast.success(`${toImport.length} athlète(s) mis à jour avec les données FIS`);
  };

  const handleClose = () => {
    setStep("upload");
    setParseResult(null);
    setMatched([]);
    setImportCount(0);
    setParseError(null);
    onOpenChange(false);
  };

  const matchedCount = matched.filter((m) => m.matchType !== "none").length;
  const selectedCount = matched.filter((m) => m.selected && m.playerId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import classement FIS
          </DialogTitle>
          <DialogDescription>
            Importez un fichier Excel de classement FIS (Snowboard, Ski, Biathlon…) pour mettre à jour les points et classements.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center w-full">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Glissez un fichier Excel FIS ou cliquez pour sélectionner
              </p>
              <label>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                <Button variant="outline" asChild>
                  <span>Choisir un fichier</span>
                </Button>
              </label>
            </div>
            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                {parseError}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Compatible : World Snowboard/Ski/Biathlon Points List et formats similaires
            </p>
          </div>
        )}

        {step === "match" && (
          <div className="space-y-4">
            {parseResult && (
              <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-sm">{parseResult.sport}</p>
                <p className="text-muted-foreground">
                  Disciplines détectées : <span className="font-mono">{parseResult.disciplineCodes.join(", ")}</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm flex-wrap">
              <Badge variant="secondary">{parseResult?.athletes.length || 0} athlètes dans le fichier</Badge>
              <Badge variant="default">
                <UserCheck className="h-3 w-3 mr-1" />
                {matchedCount} correspondances
              </Badge>
              <Badge variant="outline">
                <UserX className="h-3 w-3 mr-1" />
                {(parseResult?.athletes.length || 0) - matchedCount} non trouvés
              </Badge>
            </div>

            <ScrollArea className="h-[350px] border rounded-md">
              <div className="divide-y">
                {matched
                  .filter((m) => m.matchType !== "none")
                  .map((m) => {
                    const realIdx = matched.indexOf(m);
                    return (
                      <div key={realIdx} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                        <Checkbox checked={m.selected} onCheckedChange={() => toggleSelection(realIdx)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.fisRow.firstName} {m.fisRow.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            FIS: {m.fisRow.fisCode} • {m.fisRow.nation}
                          </p>
                        </div>
                        <div className="text-right text-xs space-x-2">
                          {m.fisRow.disciplines
                            .filter((d) => d.pts != null)
                            .map((d) => (
                              <span key={d.code}>
                                {d.code}: {d.pts}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                {matchedCount === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>Aucune correspondance trouvée entre le fichier FIS et vos athlètes.</p>
                    <p className="text-xs mt-1">
                      Vérifiez que les noms correspondent ou ajoutez le code FIS aux fiches athlètes.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{selectedCount} athlète(s) sélectionné(s)</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button onClick={handleImport} disabled={selectedCount === 0}>
                  Importer ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Import en cours...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">Import terminé !</p>
            <p className="text-sm text-muted-foreground">{importCount} résultat(s) FIS importé(s)</p>
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
