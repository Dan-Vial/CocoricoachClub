import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

interface FisPreCompetitionFormProps {
  matchId: string;
  categoryId: string;
  currentData?: {
    fis_participants_count?: number | null;
    fis_top5_points?: any[] | null;
    fis_event_factor?: number | null;
    fis_pre_competition_validated?: boolean | null;
  };
}

export function FisPreCompetitionForm({
  matchId,
  categoryId,
  currentData,
}: FisPreCompetitionFormProps) {
  const queryClient = useQueryClient();
  const [participantsCount, setParticipantsCount] = useState(
    currentData?.fis_participants_count?.toString() || ""
  );
  const [eventFactor, setEventFactor] = useState(
    currentData?.fis_event_factor?.toString() || ""
  );
  const [top5Points, setTop5Points] = useState<string[]>(
    currentData?.fis_top5_points?.map((p: any) => p.points?.toString() || "") || ["", "", "", "", ""]
  );
  const [top5Names, setTop5Names] = useState<string[]>(
    currentData?.fis_top5_points?.map((p: any) => p.name || "") || ["", "", "", "", ""]
  );

  const isValidated = currentData?.fis_pre_competition_validated === true;

  const saveMutation = useMutation({
    mutationFn: async (validate: boolean) => {
      const top5 = top5Points
        .map((pts, i) => ({
          rank: i + 1,
          name: top5Names[i] || "",
          points: pts ? parseFloat(pts) : null,
        }))
        .filter((t) => t.name || t.points);

      const { error } = await supabase
        .from("matches")
        .update({
          fis_participants_count: participantsCount ? parseInt(participantsCount) : null,
          fis_event_factor: eventFactor ? parseFloat(eventFactor) : null,
          fis_top5_points: top5.length > 0 ? top5 : null,
          fis_pre_competition_validated: validate,
        } as any)
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: (_, validate) => {
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success(validate ? "Pré-compétition validée ✅" : "Données sauvegardées");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          Données pré-compétition FIS
        </h4>
        {isValidated && (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] h-5">
            <Check className="h-3 w-3 mr-0.5" /> Validé
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px]">
            <Users className="h-3 w-3 inline mr-1" />
            Nb participants
          </Label>
          <Input
            type="number"
            value={participantsCount}
            onChange={(e) => setParticipantsCount(e.target.value)}
            placeholder="Ex: 45"
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">
            <Zap className="h-3 w-3 inline mr-1" />
            Event Factor (EF)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={eventFactor}
            onChange={(e) => setEventFactor(e.target.value)}
            placeholder="Ex: 800"
            className="h-7 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold">Top 5 athlètes (points FIS)</Label>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <span className="text-[10px] text-muted-foreground w-4 text-right font-mono">{i + 1}.</span>
            <Input
              value={top5Names[i]}
              onChange={(e) => {
                const newNames = [...top5Names];
                newNames[i] = e.target.value;
                setTop5Names(newNames);
              }}
              placeholder="Nom"
              className="h-6 text-[11px] flex-1"
            />
            <Input
              type="number"
              step="0.01"
              value={top5Points[i]}
              onChange={(e) => {
                const newPts = [...top5Points];
                newPts[i] = e.target.value;
                setTop5Points(newPts);
              }}
              placeholder="Pts"
              className="h-6 text-[11px] w-20"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => saveMutation.mutate(false)}
          disabled={saveMutation.isPending}
        >
          Sauvegarder
        </Button>
        <Button
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={() => saveMutation.mutate(true)}
          disabled={saveMutation.isPending}
        >
          <Check className="h-3 w-3" />
          Valider pré-compétition
        </Button>
      </div>
    </div>
  );
}
