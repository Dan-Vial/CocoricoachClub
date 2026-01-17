import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { AddConcussionProtocolDialog } from "./AddConcussionProtocolDialog";
import { ConcussionProtocolCard } from "./ConcussionProtocolCard";
import { getConcussionProtocolForSport, hasConcussionProtocol } from "@/lib/constants/concussionProtocols";

interface ConcussionProtocolTabProps {
  categoryId: string;
  sportType?: string;
}

export function ConcussionProtocolTab({ categoryId, sportType = "XV" }: ConcussionProtocolTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const protocol = getConcussionProtocolForSport(sportType);
  const hasProtocol = hasConcussionProtocol(sportType);

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["concussion_protocols", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concussion_protocols")
        .select(`*, players(name)`)
        .eq("category_id", categoryId)
        .order("incident_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p>Chargement...</p>;

  const activeProtocols = protocols?.filter((p: any) => p.status === "active") || [];
  const recoveryProtocols = protocols?.filter((p: any) => p.status === "recovery") || [];
  const clearedProtocols = protocols?.filter((p: any) => p.status === "cleared") || [];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-destructive/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Protocole Commotion Cérébrale</CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} disabled={!hasProtocol}>
            <Plus className="h-4 w-4 mr-1" /> Signaler
          </Button>
        </CardHeader>
        <CardContent>
          {!hasProtocol ? (
            <div className="bg-muted/50 p-4 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Pas de protocole officiel</h4>
                  <p className="text-sm text-muted-foreground">
                    {protocol.notes}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-2">Protocole de retour au jeu ({protocol.federation})</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                {protocol.phases.map((phase) => (
                  <li key={phase.phase}>{phase.name} - {phase.description}</li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                {protocol.notes}
              </p>
            </div>
          )}

          {activeProtocols.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Actifs</Badge>
                <span className="text-sm text-muted-foreground">({activeProtocols.length})</span>
              </div>
              {activeProtocols.map((protocol: any) => (
                <ConcussionProtocolCard key={protocol.id} protocol={protocol} categoryId={categoryId} />
              ))}
            </div>
          )}

          {recoveryProtocols.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                  <Clock className="h-3 w-3 mr-1" />
                  En récupération
                </Badge>
                <span className="text-sm text-muted-foreground">({recoveryProtocols.length})</span>
              </div>
              {recoveryProtocols.map((protocol: any) => (
                <ConcussionProtocolCard key={protocol.id} protocol={protocol} categoryId={categoryId} />
              ))}
            </div>
          )}

          {clearedProtocols.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Retour validé
                </Badge>
                <span className="text-sm text-muted-foreground">({clearedProtocols.length})</span>
              </div>
              {clearedProtocols.map((protocol: any) => (
                <ConcussionProtocolCard key={protocol.id} protocol={protocol} categoryId={categoryId} />
              ))}
            </div>
          )}

          {protocols?.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucun protocole commotion enregistré
            </p>
          )}
        </CardContent>
      </Card>

      <AddConcussionProtocolDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
        players={players || []}
      />
    </div>
  );
}
