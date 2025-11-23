import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Activity, TrendingUp } from "lucide-react";
import { AddInjuryDialog } from "./AddInjuryDialog";
import { toast } from "sonner";
import { INJURY_STATUS, INJURY_STATUS_LABELS } from "@/lib/constants/injury";

interface InjuriesTabProps {
  categoryId: string;
}

export function InjuriesTab({ categoryId }: InjuriesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: injuries, isLoading } = useQuery({
    queryKey: ["injuries", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("injury_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["injuries", categoryId] });
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

  // Statistics
  const activeInjuries = injuries?.filter((i) => i.status === INJURY_STATUS.ACTIVE).length || 0;
  const inRehabInjuries =
    injuries?.filter((i) => i.status === INJURY_STATUS.REHABILITATION).length || 0;
  const recoveredInjuries = injuries?.filter((i) => i.status === INJURY_STATUS.HEALED).length || 0;

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blessures Actives</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{activeInjuries}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Réathlétisation</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inRehabInjuries}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guérisons</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{recoveredInjuries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Injuries Table */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique des Blessures</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Suivi médical et réathlétisation
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une blessure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {injuries && injuries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Gravité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Retour estimé</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {injuries.map((injury) => (
                    <TableRow key={injury.id}>
                      <TableCell className="font-medium">
                        {injury.players?.name}
                      </TableCell>
                      <TableCell>{injury.injury_type}</TableCell>
                      <TableCell>
                        {new Date(injury.injury_date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(injury.severity)}>
                          {injury.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(injury.status)}>
                          {getStatusLabel(injury.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {injury.estimated_return_date
                          ? new Date(injury.estimated_return_date).toLocaleDateString(
                              "fr-FR"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={injury.status}
                          onValueChange={(value) => {
                            console.log("Select change:", { id: injury.id, value });
                            updateInjuryStatus.mutate({ id: injury.id, status: value });
                          }}
                          disabled={updateInjuryStatus.isPending}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={INJURY_STATUS.ACTIVE}>{INJURY_STATUS_LABELS[INJURY_STATUS.ACTIVE]}</SelectItem>
                            <SelectItem value={INJURY_STATUS.REHABILITATION}>{INJURY_STATUS_LABELS[INJURY_STATUS.REHABILITATION]}</SelectItem>
                            <SelectItem value={INJURY_STATUS.HEALED}>{INJURY_STATUS_LABELS[INJURY_STATUS.HEALED]}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucune blessure enregistrée</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter la première blessure
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddInjuryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
