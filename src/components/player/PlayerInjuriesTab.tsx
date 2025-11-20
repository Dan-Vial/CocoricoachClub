import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle } from "lucide-react";
import { AddInjuryDialog } from "@/components/injuries/AddInjuryDialog";
import { toast } from "sonner";

interface PlayerInjuriesTabProps {
  playerId: string;
  categoryId: string;
}

export function PlayerInjuriesTab({ playerId, categoryId }: PlayerInjuriesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const updateInjuryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "guérie") {
        updateData.actual_return_date = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase
        .from("injuries")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["injuries", playerId] });
      toast.success("Statut mis à jour");
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
      case "active":
        return "bg-destructive/20 text-destructive";
      case "en_réathlétisation":
        return "bg-primary/20 text-primary";
      case "guérie":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "en_réathlétisation":
        return "En Réathlétisation";
      case "guérie":
        return "Guérie";
      default:
        return status;
    }
  };

  const activeInjury = injuries?.find((i) => i.status === "active");

  return (
    <div className="space-y-6">
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
                  {new Date(activeInjury.estimated_return_date).toLocaleDateString(
                    "fr-FR"
                  )}
                </p>
              </div>
            )}
            {activeInjury.protocol_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Protocole</p>
                <p className="text-sm whitespace-pre-wrap">{activeInjury.protocol_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique Médical</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Toutes les blessures du joueur
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
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
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {injury.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInjuryStatus.mutate({ id: injury.id, status: "active" })
                        }
                        className="h-8 text-xs"
                      >
                        Activer
                      </Button>
                    )}
                    {injury.status !== "en_réathlétisation" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInjuryStatus.mutate({ id: injury.id, status: "en_réathlétisation" })
                        }
                        className="h-8 text-xs"
                      >
                        Réathlétisation
                      </Button>
                    )}
                    {injury.status !== "guérie" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInjuryStatus.mutate({ id: injury.id, status: "guérie" })
                        }
                        className="h-8 text-xs"
                      >
                        Marquer guérie
                      </Button>
                    )}
                  </div>
                  {injury.description && (
                    <p className="text-sm text-muted-foreground">{injury.description}</p>
                  )}
                  {injury.estimated_return_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Retour estimé: </span>
                      <span className="font-medium">
                        {new Date(injury.estimated_return_date).toLocaleDateString(
                          "fr-FR"
                        )}
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
    </div>
  );
}
