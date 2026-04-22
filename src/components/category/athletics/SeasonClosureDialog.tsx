import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Trophy, Target, ListChecks, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ATHLETISME_DISCIPLINES } from "@/lib/constants/sportTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  clubId: string;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface RecordRow {
  id: string;
  discipline: string;
  specialty: string | null;
  personal_best: number | null;
  season_best: number | null;
  unit: string;
  player_id: string;
}

export function SeasonClosureDialog({ open, onOpenChange, categoryId, clubId }: Props) {
  const queryClient = useQueryClient();
  const [closedSeasonId, setClosedSeasonId] = useState<string>("");
  const [newSeasonId, setNewSeasonId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons_for_closure", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, start_date, end_date, is_active")
        .eq("club_id", clubId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Season[];
    },
    enabled: open && !!clubId,
  });

  // Pré-sélection : la saison active = celle à clôturer
  useMemo(() => {
    if (!closedSeasonId && seasons.length > 0) {
      const active = seasons.find((s) => s.is_active);
      if (active) setClosedSeasonId(active.id);
    }
  }, [seasons, closedSeasonId]);

  const { data: minimas = [] } = useQuery({
    queryKey: ["closure_minimas_count", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_minimas" as any)
        .select("id, discipline, level, target_value")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open,
  });

  const { data: records = [] } = useQuery({
    queryKey: ["closure_records", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletics_records" as any)
        .select("id, discipline, specialty, personal_best, season_best, unit, player_id")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data || []) as unknown as RecordRow[];
    },
    enabled: open,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ["closure_objectives_count", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_objectives")
        .select("id, status")
        .eq("category_id", categoryId)
        .in("status", ["pending", "in_progress"]);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Synthèse récap
  const recap = useMemo(() => {
    const recordsWithSB = records.filter((r) => r.season_best != null).length;
    const recordsWithPB = records.filter((r) => r.personal_best != null).length;
    return {
      minimasCount: minimas.length,
      recordsWithSB,
      recordsWithPB,
      objectivesActive: objectives.length,
      disciplines: Array.from(new Set(records.map((r) => r.discipline))),
    };
  }, [minimas, records, objectives]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!closedSeasonId || !newSeasonId) {
        throw new Error("Sélectionne la saison à clôturer et la nouvelle saison");
      }
      if (closedSeasonId === newSeasonId) {
        throw new Error("Les saisons doivent être différentes");
      }
      const { data, error } = await supabase.rpc("close_athletics_season" as any, {
        _category_id: categoryId,
        _closed_season_id: closedSeasonId,
        _new_season_id: newSeasonId,
        _notes: notes || null,
        _recap: recap as any,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || "Erreur clôture");
      return result;
    },
    onSuccess: (result) => {
      toast.success(
        `Saison clôturée — ${result.minimas_copied} minimas dupliqués, ${result.records_reset} records reset, ${result.objectives_archived} objectifs archivés.`
      );
      queryClient.invalidateQueries({ queryKey: ["athletics_minimas", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["athletics_minimas_matrix", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["athletics_records_matrix", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["season_closures", categoryId] });
      onOpenChange(false);
      setConfirmed(false);
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const closedSeason = seasons.find((s) => s.id === closedSeasonId);
  const newSeason = seasons.find((s) => s.id === newSeasonId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Clôturer la saison d'athlétisme
          </DialogTitle>
          <DialogDescription>
            Verrouille les minimas et records de la saison passée, duplique les minimas vers la nouvelle
            saison, réinitialise les Season Best (les Personal Best sont conservés) et archive les
            objectifs en cours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Sélection des saisons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Saison à clôturer *</Label>
              <Select value={closedSeasonId} onValueChange={setClosedSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.is_active ? "(active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nouvelle saison *</Label>
              <Select value={newSeasonId} onValueChange={setNewSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {seasons
                    .filter((s) => s.id !== closedSeasonId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {seasons.length < 2 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Tu dois avoir au moins 2 saisons créées pour le club. Crée la nouvelle saison dans
                <strong> Réglages du club → Saisons</strong> avant de clôturer.
              </div>
            </div>
          )}

          {/* Récap */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Récapitulatif de la clôture
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col items-center text-center p-2 rounded-md bg-background">
                <Target className="h-4 w-4 text-primary mb-1" />
                <span className="text-2xl font-bold">{recap.minimasCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Minimas</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-md bg-background">
                <Trophy className="h-4 w-4 text-amber-500 mb-1" />
                <span className="text-2xl font-bold">{recap.recordsWithPB}</span>
                <span className="text-[10px] text-muted-foreground uppercase">PB enregistrés</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-md bg-background">
                <Trophy className="h-4 w-4 text-blue-500 mb-1" />
                <span className="text-2xl font-bold">{recap.recordsWithSB}</span>
                <span className="text-[10px] text-muted-foreground uppercase">SB de la saison</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-md bg-background">
                <ListChecks className="h-4 w-4 text-emerald-500 mb-1" />
                <span className="text-2xl font-bold">{recap.objectivesActive}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Objectifs ouverts</span>
              </div>
            </div>

            {recap.disciplines.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Disciplines impactées :
                </p>
                <div className="flex flex-wrap gap-1">
                  {recap.disciplines.map((d) => {
                    const label = ATHLETISME_DISCIPLINES.find((x) => x.value === d)?.label || d;
                    return (
                      <Badge key={d} variant="secondary" className="text-[10px]">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {closedSeason && newSeason && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <strong>{closedSeason.name}</strong> sera verrouillée. La saison{" "}
                <strong>{newSeason.name}</strong> sera initialisée avec les minimas dupliqués et les
                Personal Best conservés.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes de clôture (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bilan de la saison, faits marquants, qualifications obtenues..."
              rows={3}
            />
          </div>

          {/* Avertissement */}
          <label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs">
              Je confirme la clôture définitive de la saison. Les minimas et records de la saison
              passée passeront en lecture seule. L'historique restera consultable à tout moment via le
              sélecteur de saison.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => closeMutation.mutate()}
            disabled={
              !confirmed ||
              !closedSeasonId ||
              !newSeasonId ||
              closedSeasonId === newSeasonId ||
              closeMutation.isPending
            }
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            {closeMutation.isPending ? "Clôture en cours..." : "Clôturer la saison"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
