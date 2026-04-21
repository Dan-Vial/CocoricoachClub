import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Trash2, Plus, Medal, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MedalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  categoryId: string;
  competitionName: string;
  competitionDate: string;
}

type MedalType = "gold" | "silver" | "bronze" | "ranking" | "title";

const MEDAL_TYPE_OPTIONS: { value: MedalType; label: string; icon: string }[] = [
  { value: "gold", label: "Or", icon: "🥇" },
  { value: "silver", label: "Argent", icon: "🥈" },
  { value: "bronze", label: "Bronze", icon: "🥉" },
  { value: "ranking", label: "Classement (place)", icon: "🏅" },
  { value: "title", label: "Titre personnalisé", icon: "🏆" },
];

export function MedalsDialog({
  open,
  onOpenChange,
  matchId,
  categoryId,
  competitionName,
  competitionDate,
}: MedalsDialogProps) {
  const queryClient = useQueryClient();
  const [medalType, setMedalType] = useState<MedalType>("gold");
  const [rank, setRank] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isCollective, setIsCollective] = useState(false);

  const { data: players } = useQuery({
    queryKey: ["players-for-medals", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: medals } = useQuery({
    queryKey: ["match-medals", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_medals")
        .select("*, players(id, name, first_name)")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addMedal = useMutation({
    mutationFn: async () => {
      if (selectedPlayerIds.length === 0) {
        throw new Error("Sélectionne au moins un athlète");
      }
      if (medalType === "ranking" && !rank) {
        throw new Error("Indique la place obtenue");
      }
      if (medalType === "title" && !customTitle.trim()) {
        throw new Error("Indique le titre");
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const groupId = selectedPlayerIds.length > 1 ? crypto.randomUUID() : null;

      const rows = selectedPlayerIds.map((pid) => ({
        match_id: matchId,
        player_id: pid,
        category_id: categoryId,
        medal_type: medalType,
        rank: medalType === "ranking" ? parseInt(rank) : null,
        custom_title: customTitle.trim() || null,
        team_label: isCollective ? (teamLabel.trim() || null) : null,
        group_id: groupId,
        notes: notes.trim() || null,
        awarded_date: competitionDate.split("T")[0],
        created_by: userId,
      }));

      const { error } = await supabase.from("player_medals").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-medals", matchId] });
      queryClient.invalidateQueries({ queryKey: ["player-medals"] });
      toast.success("Médaille ajoutée au palmarès");
      setRank("");
      setCustomTitle("");
      setTeamLabel("");
      setNotes("");
      setSelectedPlayerIds([]);
      setIsCollective(false);
    },
    onError: (e: Error) => toast.error(e.message || "Erreur"),
  });

  const deleteMedal = useMutation({
    mutationFn: async (medal: { id: string; group_id: string | null }) => {
      const query = supabase.from("player_medals").delete();
      if (medal.group_id) {
        const { error } = await query.eq("group_id", medal.group_id);
        if (error) throw error;
      } else {
        const { error } = await query.eq("id", medal.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-medals", matchId] });
      queryClient.invalidateQueries({ queryKey: ["player-medals"] });
      toast.success("Médaille supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const togglePlayer = (pid: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const groupedMedals = (() => {
    if (!medals) return [];
    const groups = new Map<string, typeof medals>();
    const singles: typeof medals = [];
    for (const m of medals) {
      if (m.group_id) {
        if (!groups.has(m.group_id)) groups.set(m.group_id, []);
        groups.get(m.group_id)!.push(m);
      } else {
        singles.push(m);
      }
    }
    return [
      ...Array.from(groups.values()).map((arr) => ({ kind: "group" as const, items: arr })),
      ...singles.map((s) => ({ kind: "single" as const, items: [s] })),
    ];
  })();

  const getMedalIcon = (type: string) => {
    const opt = MEDAL_TYPE_OPTIONS.find((o) => o.value === type);
    return opt?.icon || "🏅";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Médailles & Palmarès
          </DialogTitle>
          <DialogDescription>
            {competitionName} — Récompenses pour cette compétition
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {groupedMedals.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Médailles attribuées ({groupedMedals.length})
                </h3>
                <div className="space-y-2">
                  {groupedMedals.map((g, idx) => {
                    const first = g.items[0];
                    return (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">{getMedalIcon(first.medal_type)}</span>
                            <span className="font-semibold">
                              {first.medal_type === "ranking"
                                ? `${first.rank}ᵉ place`
                                : first.medal_type === "title"
                                ? first.custom_title
                                : MEDAL_TYPE_OPTIONS.find((o) => o.value === first.medal_type)?.label}
                            </span>
                            {first.custom_title && first.medal_type !== "title" && (
                              <Badge variant="outline" className="text-xs">
                                {first.custom_title}
                              </Badge>
                            )}
                            {first.team_label && (
                              <Badge variant="secondary" className="text-xs">
                                {first.team_label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {g.items
                              .map((m: any) =>
                                [m.players?.first_name, m.players?.name].filter(Boolean).join(" ")
                              )
                              .join(", ")}
                          </p>
                          {first.notes && (
                            <p className="text-xs text-muted-foreground italic">{first.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0"
                          onClick={() =>
                            deleteMedal.mutate({ id: first.id, group_id: first.group_id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 p-4 rounded-lg border-2 border-dashed">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une médaille
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type de récompense</Label>
                  <Select value={medalType} onValueChange={(v) => setMedalType(v as MedalType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDAL_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {medalType === "ranking" && (
                  <div className="space-y-2">
                    <Label>Place obtenue</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ex: 4"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Titre personnalisé{" "}
                  {medalType === "title" ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground">(optionnel)</span>
                  )}
                </Label>
                <Input
                  placeholder="Ex: Champion de France, Vainqueur tournoi X..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="collective"
                  checked={isCollective}
                  onCheckedChange={(c) => setIsCollective(!!c)}
                />
                <Label htmlFor="collective" className="text-sm cursor-pointer">
                  Médaille collective (doublette / équipe)
                </Label>
              </div>

              {isCollective && (
                <div className="space-y-2">
                  <Label>Nom du groupe (optionnel)</Label>
                  <Input
                    placeholder="Ex: Doublette Dupont/Martin, Équipe A..."
                    value={teamLabel}
                    onChange={(e) => setTeamLabel(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Athlète{isCollective ? "s bénéficiaires" : " bénéficiaire"}
                  {isCollective && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (sélectionne plusieurs athlètes)
                    </span>
                  )}
                </Label>
                <ScrollArea className="h-40 rounded border p-2">
                  <div className="space-y-1">
                    {players?.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedPlayerIds.includes(p.id)}
                          onCheckedChange={() => {
                            if (isCollective) {
                              togglePlayer(p.id);
                            } else {
                              setSelectedPlayerIds([p.id]);
                            }
                          }}
                        />
                        <span className="text-sm">
                          {[p.first_name, p.name].filter(Boolean).join(" ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>Notes (optionnel)</Label>
                <Textarea
                  placeholder="Détails, performance, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => addMedal.mutate()}
                disabled={addMedal.isPending}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Ajouter au palmarès
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
