import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Plus, Activity, Users } from "lucide-react";
import { HrvEntryDialog } from "./HrvEntryDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HrvHistoryTabProps {
  categoryId: string;
}

export function HrvHistoryTab({ categoryId }: HrvHistoryTabProps) {
  const { isViewer } = useViewerModeContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["hrv_records", categoryId, selectedPlayerId],
    queryFn: async () => {
      let query = supabase
        .from("hrv_records")
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .order("record_date", { ascending: false })
        .limit(100);

      if (selectedPlayerId !== "all") {
        query = query.eq("player_id", selectedPlayerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const typeLabels: Record<string, string> = {
    morning: "Matin",
    session: "Séance",
    test: "Test",
    competition: "Compétition",
  };

  const typeColors: Record<string, string> = {
    morning: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    session: "bg-green-500/10 text-green-700 border-green-500/20",
    test: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    competition: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" />
          Suivi HRV & Zones cardiaques
        </h3>
        <div className="flex items-center gap-2">
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[180px]">
              <Users className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Tous les athlètes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les athlètes</SelectItem>
              {players?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {[p.first_name, p.name].filter(Boolean).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isViewer && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Saisir HRV
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : !records?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucune donnée HRV enregistrée</p>
            {!isViewer && (
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Première saisie
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {records.map((record: any) => (
            <Card key={record.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {record.players?.first_name} {record.players?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.record_date), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className={typeColors[record.record_type] || ""}>
                      {typeLabels[record.record_type] || record.record_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {record.hrv_ms != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">HRV</p>
                        <p className="font-semibold">{record.hrv_ms} ms</p>
                      </div>
                    )}
                    {record.resting_hr_bpm != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">FC repos</p>
                        <p className="font-semibold">{record.resting_hr_bpm} bpm</p>
                      </div>
                    )}
                    {record.avg_hr_bpm != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">FC moy</p>
                        <p className="font-semibold">{record.avg_hr_bpm} bpm</p>
                      </div>
                    )}
                    {record.max_hr_bpm != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">FC max</p>
                        <p className="font-semibold">{record.max_hr_bpm} bpm</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrvEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
