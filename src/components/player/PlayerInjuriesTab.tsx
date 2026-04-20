import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertCircle, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { AddInjuryDialog } from "@/components/injuries/AddInjuryDialog";
import { AssignProtocolDialog } from "@/components/injuries/AssignProtocolDialog";
import { PlayerRehabTracker } from "@/components/injuries/PlayerRehabTracker";
import { toast } from "sonner";
import { INJURY_STATUS, INJURY_STATUS_LABELS } from "@/lib/constants/injury";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface PlayerInjuriesTabProps {
  playerId: string;
  categoryId: string;
  playerName?: string;
  readOnly?: boolean;
}

export function PlayerInjuriesTab({ playerId, categoryId, playerName = "Joueur", readOnly = false }: PlayerInjuriesTabProps) {
  const { isViewer: contextViewer } = useViewerModeContext();
  const isViewer = contextViewer || readOnly;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState<any>(null);
  const [expandedInjuries, setExpandedInjuries] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: injuries } = useQuery({
    queryKey: ["injuries", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*")
        .eq("player_id", playerId)
        .order("injury_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Check which injuries have protocols assigned
  const { data: rehabProtocols } = useQuery({
    queryKey: ["player-rehab-protocols", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select("injury_id, status, current_phase")
        .eq("player_id", playerId);
      if (error) throw error;
      return data;
    },
  });

  const getRehabProtocol = (injuryId: string) => {
    return rehabProtocols?.find(p => p.injury_id === injuryId);
  };

  const updateInjuryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === INJURY_STATUS.HEALED) {
        updateData.actual_return_date = new Date().toISOString().split("T")[0];
      }
      
      const { data, error } = await supabase
        .from("injuries")
        .update(updateData)
        .eq("id", id)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["injuries", playerId] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      console.error("Erreur mutation complète:", error);
      const errorMessage = error?.message || "Erreur inconnue";
      toast.error(`Erreur: ${errorMessage}`);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "légère":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "modérée":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
      case "grave":
        return "bg-destructive/20 text-destructive";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case INJURY_STATUS.ACTIVE:
        return "bg-destructive/20 text-destructive";
      case INJURY_STATUS.REHABILITATION:
        return "bg-primary/20 text-primary";
      case INJURY_STATUS.HEALED:
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    return INJURY_STATUS_LABELS[status as keyof typeof INJURY_STATUS_LABELS] || status;
  };

  const toggleInjuryExpanded = (injuryId: string) => {
    setExpandedInjuries(prev => 
      prev.includes(injuryId) 
        ? prev.filter(id => id !== injuryId)
        : [...prev, injuryId]
    );
  };

  const handleAssignProtocol = (injury: any) => {
    setSelectedInjury(injury);
    setProtocolDialogOpen(true);
  };

  const activeInjury = injuries?.find((i) => i.status === INJURY_STATUS.ACTIVE);
  const rehabInjuries = injuries?.filter((i) => i.status === INJURY_STATUS.REHABILITATION) || [];

  return (
    <div className="space-y-6">
      {/* Active Injury Alert */}
      {activeInjury && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Blessure en Cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Type de blessure</p>
              <p className="text-lg font-semibold">{activeInjury.injury_type}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(activeInjury.injury_date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gravité</p>
                <Badge className={getSeverityColor(activeInjury.severity)}>
                  {activeInjury.severity}
                </Badge>
              </div>
            </div>
            {activeInjury.estimated_return_date && (
              <div>
                <p className="text-sm text-muted-foreground">Retour estimé</p>
                <p className="font-medium">
                  {new Date(activeInjury.estimated_return_date).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
            
            {/* Protocol Assignment */}
            {!getRehabProtocol(activeInjury.id) && !isViewer ? (
              <Button 
                onClick={() => handleAssignProtocol(activeInjury)}
                className="w-full"
                variant="outline"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Assigner un protocole de réhabilitation
              </Button>
            ) : (
              <div className="pt-2">
                <PlayerRehabTracker
                  playerId={playerId}
                  injuryId={activeInjury.id}
                  categoryId={categoryId}
                  playerName={playerName}
                  injuryType={activeInjury.injury_type}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rehabilitation in Progress */}
      {rehabInjuries.map((injury) => (
        <Collapsible
          key={injury.id}
          open={expandedInjuries.includes(injury.id)}
          onOpenChange={() => toggleInjuryExpanded(injury.id)}
        >
          <Card className="bg-primary/5 border-primary/30">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{injury.injury_type}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        En réhabilitation depuis le {new Date(injury.injury_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRehabProtocol(injury.id) && (
                      <Badge variant="secondary">
                        Phase {getRehabProtocol(injury.id)?.current_phase}
                      </Badge>
                    )}
                    {expandedInjuries.includes(injury.id) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {!getRehabProtocol(injury.id) && !isViewer ? (
                  <Button 
                    onClick={() => handleAssignProtocol(injury)}
                    variant="outline"
                    className="w-full"
                  >
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Assigner un protocole de réhabilitation
                  </Button>
                ) : (
                  <PlayerRehabTracker
                    playerId={playerId}
                    injuryId={injury.id}
                    categoryId={categoryId}
                    playerName={playerName}
                    injuryType={injury.injury_type}
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Injury History */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique Médical</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Toutes les blessures du joueur
              </p>
            </div>
            {!isViewer && (
              <Button onClick={() => { console.log("[Blessures] Ajouter clicked"); setIsDialogOpen(true); }} size="sm" className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {injuries && injuries.length > 0 ? (
            <div className="space-y-4">
              {injuries.map((injury) => (
                <div
                  key={injury.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold">{injury.injury_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(injury.injury_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex gap-2 items-start flex-wrap">
                      <Badge className={getSeverityColor(injury.severity)}>
                        {injury.severity}
                      </Badge>
                      <Badge className={getStatusColor(injury.status)}>
                        {getStatusLabel(injury.status)}
                      </Badge>
                      {getRehabProtocol(injury.id) && (
                        <Badge variant="outline" className="gap-1">
                          <Dumbbell className="h-3 w-3" />
                          Protocole
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!isViewer && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={injury.status}
                        onValueChange={(value) => {
                          updateInjuryStatus.mutate({ id: injury.id, status: value });
                        }}
                        disabled={updateInjuryStatus.isPending}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={INJURY_STATUS.ACTIVE}>{INJURY_STATUS_LABELS[INJURY_STATUS.ACTIVE]}</SelectItem>
                          <SelectItem value={INJURY_STATUS.REHABILITATION}>{INJURY_STATUS_LABELS[INJURY_STATUS.REHABILITATION]}</SelectItem>
                          <SelectItem value={INJURY_STATUS.HEALED}>{INJURY_STATUS_LABELS[INJURY_STATUS.HEALED]}</SelectItem>
                        </SelectContent>
                      </Select>
                      {!getRehabProtocol(injury.id) && injury.status !== INJURY_STATUS.HEALED && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleAssignProtocol(injury)}
                        >
                          <Dumbbell className="h-4 w-4 mr-1" />
                          Protocole
                        </Button>
                      )}
                    </div>
                  )}
                  {injury.description && (
                    <p className="text-sm text-muted-foreground">{injury.description}</p>
                  )}
                  {injury.estimated_return_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Retour estimé: </span>
                      <span className="font-medium">
                        {new Date(injury.estimated_return_date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                  {injury.actual_return_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Retour effectif: </span>
                      <span className="font-medium">
                        {new Date(injury.actual_return_date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucune blessure enregistrée
            </p>
          )}
        </CardContent>
      </Card>

      <AddInjuryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
        playerId={playerId}
      />

      {selectedInjury && (
        <AssignProtocolDialog
          open={protocolDialogOpen}
          onOpenChange={setProtocolDialogOpen}
          playerId={playerId}
          injuryId={selectedInjury.id}
          categoryId={categoryId}
          injuryType={selectedInjury.injury_type}
        />
      )}
    </div>
  );
}
