import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateFisPoints } from "@/lib/fis/fisPointsEngine";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

interface AddFisResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: {
    id: string;
    name: string;
    category_id: string;
    race_penalty: number | null;
    total_participants: number | null;
  };
}

export function AddFisResultDialog({ open, onOpenChange, competition }: AddFisResultDialogProps) {
  const [playerId, setPlayerId] = useState("");
  const [ranking, setRanking] = useState("");
  const [score, setScore] = useState("");
  const [manualFisPoints, setManualFisPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: players } = useQuery({
    queryKey: ["players-for-fis", competition.category_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", competition.category_id)
        .order("name");
      return data || [];
    },
    enabled: open,
  });

  const scale = competition.race_penalty ?? 1000; // race_penalty now stores the scale
  const rankingNum = Number(ranking);
  const autoCalculatedPoints = ranking && !isNaN(rankingNum) && rankingNum > 0
    ? calculateFisPoints({ ranking: rankingNum, scale })
    : null;
  
  // Manual FIS points override takes priority
  const manualPts = manualFisPoints ? Number(manualFisPoints) : null;
  const finalPoints = manualPts != null && !isNaN(manualPts) ? manualPts : autoCalculatedPoints;

  const handleSave = async () => {
    if (!playerId || !ranking) {
      toast.error("Athlète et classement requis");
      return;
    }
    setSaving(true);

    const basePointsVal = autoCalculatedPoints !== null ? autoCalculatedPoints + racePenalty : 0;

    const upsertData = {
      competition_id: competition.id,
      player_id: playerId,
      category_id: competition.category_id,
      ranking: rankingNum,
      score: score ? Number(score) : null,
      fis_points: finalPoints ?? 0,
      base_points: basePointsVal,
      calculated_points: finalPoints,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("fis_results") as any).upsert(
      upsertData,
      { onConflict: "competition_id,player_id" },
    );

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      return;
    }

    // Update player's best FIS points
    const { data: allResults } = await supabase
      .from("fis_results")
      .select("fis_points, calculated_points, expires_at")
      .eq("player_id", playerId)
      .eq("category_id", competition.category_id);

    if (allResults) {
      const now = new Date();
      const valid = allResults.filter((r) => !r.expires_at || new Date(r.expires_at) > now);
      const best = valid
        .map((r) => (r as Record<string, unknown>).calculated_points as number ?? r.fis_points)
        .sort((a, b) => b - a);
      const totalPoints = best.slice(0, 5).reduce((s, p) => s + p, 0);

      await supabase
        .from("players")
        .update({ fis_points: totalPoints } as Record<string, unknown>)
        .eq("id", playerId);
    }

    toast.success("Résultat enregistré et points calculés");
    queryClient.invalidateQueries({ queryKey: ["fis-competitions"] });
    queryClient.invalidateQueries({ queryKey: ["fis-results"] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    onOpenChange(false);
    setPlayerId("");
    setRanking("");
    setScore("");
    setManualFisPoints("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Résultat athlète
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{competition.name}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Athlète *</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un athlète" /></SelectTrigger>
              <SelectContent>
                {players?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="result-ranking">Classement final *</Label>
              <Input id="result-ranking" type="number" min="1" value={ranking} onChange={(e) => setRanking(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="result-score">Score (optionnel)</Label>
              <Input id="result-score" type="number" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="result-fis-points">Points FIS officiels (depuis le site FIS)</Label>
            <Input
              id="result-fis-points"
              type="number"
              step="0.01"
              min="0"
              value={manualFisPoints}
              onChange={(e) => setManualFisPoints(e.target.value)}
              placeholder={autoCalculatedPoints != null ? `Auto: ${autoCalculatedPoints.toFixed(2)}` : "Ex: 12.50"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 Renseignez les points officiels du site FIS pour plus de précision. Si vide, les points sont calculés automatiquement.
            </p>
          </div>

          {finalPoints !== null && finalPoints > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {manualPts == null && autoCalculatedPoints != null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points de base (position {ranking})</span>
                    <span className="font-mono">{(autoCalculatedPoints + racePenalty).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Race Penalty</span>
                    <span className="font-mono text-destructive">-{racePenalty.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold">Points FIS gagnés</span>
                <Badge className="text-lg font-mono px-3">{finalPoints.toFixed(2)}</Badge>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !playerId || !ranking}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
