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

interface FisAthleteRow {
  fisCode: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  birthYear: number | null;
  nation: string;
  gender: string;
  hpPts: number | null;
  hpRk: number | null;
  ssPts: number | null;
  ssRk: number | null;
  baPts: number | null;
  baRk: number | null;
  rePts: number | null;
  reRk: number | null;
}

interface MatchedAthlete {
  fisRow: FisAthleteRow;
  playerId: string | null;
  playerName: string | null;
  matchType: "exact" | "name" | "none";
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

function parseExcelFile(data: ArrayBuffer): FisAthleteRow[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Find header row (contains "FIS code")
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i];
    if (row && row.some((c) => String(c).toLowerCase().includes("fis code"))) {
      headerIdx = i;
      break;
    }
  }

  const rows: FisAthleteRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[0]) continue;
    rows.push({
      fisCode: String(r[0]).trim(),
      lastName: String(r[1] || "").trim(),
      firstName: String(r[2] || "").trim(),
      birthDate: r[3] ? String(r[3]) : null,
      birthYear: parseNumber(r[4]),
      nation: String(r[5] || "").trim(),
      gender: String(r[6] || "").trim(),
      hpPts: parseNumber(r[7]),
      hpRk: parseNumber(r[8]),
      ssPts: parseNumber(r[9]),
      ssRk: parseNumber(r[10]),
      baPts: parseNumber(r[11]),
      baRk: parseNumber(r[12]),
      rePts: parseNumber(r[13]),
      reRk: parseNumber(r[14]),
    });
  }
  return rows;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function FisImportDialog({ open, onOpenChange, categoryId }: FisImportDialogProps) {
  const [step, setStep] = useState<"upload" | "match" | "importing" | "done">("upload");
  const [fisData, setFisData] = useState<FisAthleteRow[]>([]);
  const [matched, setMatched] = useState<MatchedAthlete[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const queryClient = useQueryClient();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const data = await file.arrayBuffer();
      const rows = parseExcelFile(data);
      setFisData(rows);

      // Fetch players in this category
      const { data: players } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId);

      // Match
      const matchResults: MatchedAthlete[] = rows.map((fisRow) => {

        // 2. Match by name
        const byName = players?.find((p) => {
          const pLast = normalize(p.name || "");
          const pFirst = normalize(p.first_name || "");
          const fLast = normalize(fisRow.lastName);
          const fFirst = normalize(fisRow.firstName);
          return pLast === fLast && pFirst === fFirst;
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

        return {
          fisRow,
          playerId: null,
          playerName: null,
          matchType: "none" as const,
          selected: false,
        };
      });

      setMatched(matchResults);
      setStep("match");
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

      // Determine best discipline points
      const disciplines = [
        { key: "HP", pts: fisRow.hpPts, rk: fisRow.hpRk },
        { key: "SS", pts: fisRow.ssPts, rk: fisRow.ssRk },
        { key: "BA", pts: fisRow.baPts, rk: fisRow.baRk },
        { key: "RE", pts: fisRow.rePts, rk: fisRow.reRk },
      ];

      const bestDiscipline = disciplines
        .filter((d) => d.pts != null)
        .sort((a, b) => (b.pts || 0) - (a.pts || 0))[0];

      // Update player with FIS data
      const updateData: Record<string, unknown> = {
        fis_code: fisRow.fisCode,
        fis_points: bestDiscipline?.pts || null,
        fis_ranking: bestDiscipline?.rk || null,
      };

      await supabase.from("players").update(updateData).eq("id", m.playerId!);

      // Store all discipline points in fis_results as a snapshot
      for (const d of disciplines) {
        if (d.pts != null) {
          // We'll store this as metadata - using fis_results table
          // First check if a "ranking_import" competition exists for today
          const today = new Date().toISOString().split("T")[0];
          let compId: string;

          const { data: existingComp } = await supabase
            .from("fis_competitions")
            .select("id")
            .eq("category_id", categoryId)
            .eq("competition_date", today)
            .eq("name", `Import classement FIS - ${d.key}`)
            .maybeSingle();

          if (existingComp) {
            compId = existingComp.id;
          } else {
            const { data: newComp } = await supabase
              .from("fis_competitions")
              .insert({
                category_id: categoryId,
                name: `Import classement FIS - ${d.key}`,
                competition_date: today,
                discipline: d.key === "HP" ? "halfpipe" : d.key === "SS" ? "slopestyle" : d.key === "BA" ? "big_air" : "other",
                level: "fis",
                total_participants: null,
              })
              .select("id")
              .single();
            if (!newComp) continue;
            compId = newComp.id;
          }

          // Upsert result
          const { error } = await supabase.from("fis_results").upsert(
            {
              competition_id: compId,
              player_id: m.playerId!,
              category_id: categoryId,
              ranking: d.rk || null,
              fis_points: d.pts,
            },
            { onConflict: "competition_id,player_id" },
          );
          if (!error) count++;
        }
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
    setFisData([]);
    setMatched([]);
    setImportCount(0);
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
            Importez un fichier Excel de classement FIS pour mettre à jour les points et classements de vos athlètes.
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
            <p className="text-xs text-muted-foreground">
              Format attendu : fichier Excel du classement FIS (World Snowboard Points List)
            </p>
          </div>
        )}

        {step === "match" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary">{fisData.length} athlètes dans le fichier</Badge>
              <Badge variant="default" className="bg-emerald-600">
                <UserCheck className="h-3 w-3 mr-1" />
                {matchedCount} correspondances
              </Badge>
              <Badge variant="outline">
                <UserX className="h-3 w-3 mr-1" />
                {fisData.length - matchedCount} non trouvés
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <div className="divide-y">
                {matched
                  .filter((m) => m.matchType !== "none")
                  .map((m, idx) => {
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
                        <div className="text-right text-xs">
                          {m.fisRow.hpPts != null && <span className="mr-2">HP: {m.fisRow.hpPts}</span>}
                          {m.fisRow.ssPts != null && <span className="mr-2">SS: {m.fisRow.ssPts}</span>}
                          {m.fisRow.baPts != null && <span className="mr-2">BA: {m.fisRow.baPts}</span>}
                          {m.fisRow.rePts != null && <span>RE: {m.fisRow.rePts}</span>}
                        </div>
                        <Badge variant={m.matchType === "exact" ? "default" : "secondary"} className="text-[10px]">
                          {m.matchType === "exact" ? "Code FIS" : "Nom"}
                        </Badge>
                      </div>
                    );
                  })}
                {matched.filter((m) => m.matchType !== "none").length === 0 && (
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
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
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
