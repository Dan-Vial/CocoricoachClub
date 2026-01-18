import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AddPlayerDialog } from "./AddPlayerDialog";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useViewerPlayers } from "@/hooks/use-viewer-data";

interface PlayersTabProps {
  categoryId: string;
}

export function PlayersTab({ categoryId }: PlayersTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();

  const { data: players, isLoading } = useViewerPlayers(categoryId);

  const deletePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("players").delete().eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Athlète supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de l'athlète");
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Liste des athlètes</CardTitle>
          {!isViewer && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un athlète
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {players && players.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucun athlète dans cette catégorie</p>
            {!isViewer && (
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter le premier athlète
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Date d'ajout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.map((player) => {
                const initials = player.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TableRow 
                    key={player.id} 
                    className="animate-fade-in cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/players/${player.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar_url || undefined} alt={player.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{player.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(player.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isViewer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Êtes-vous sûr de vouloir supprimer l'athlète ${player.name} ?`)) {
                                deletePlayer.mutate(player.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/players/${player.id}`)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AddPlayerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}
