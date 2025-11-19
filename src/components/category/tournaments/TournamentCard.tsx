import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trash2, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddMatchDialog } from "./AddMatchDialog";
import { MatchList } from "./MatchList";

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string | null;
    notes: string | null;
  };
  categoryId: string;
}

export function TournamentCard({ tournament, categoryId }: TournamentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: matches } = useQuery({
    queryKey: ["tournament-matches", tournament.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("match_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteTournament = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournament.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", categoryId] });
      toast.success("Tournoi supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const startDate = new Date(tournament.start_date);
  const endDate = new Date(tournament.end_date);
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const isPast = new Date() > endDate;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle>{tournament.name}</CardTitle>
                {isActive && <Badge>En cours</Badge>}
                {isPast && <Badge variant="secondary">Terminé</Badge>}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(startDate, "dd MMM", { locale: fr })} -{" "}
                  {format(endDate, "dd MMM yyyy", { locale: fr })}
                </div>
                {tournament.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {tournament.location}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tournament.notes && (
            <p className="text-sm text-muted-foreground">{tournament.notes}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{matches?.length || 0} match{matches && matches.length > 1 ? "s" : ""}</span>
            </div>
            <Button onClick={() => setIsAddMatchOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un match
            </Button>
          </div>

          {matches && matches.length > 0 && (
            <MatchList 
              matches={matches} 
              tournamentId={tournament.id}
              categoryId={categoryId}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tournoi ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les matchs et données associés seront
              également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTournament.mutate()}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddMatchDialog
        open={isAddMatchOpen}
        onOpenChange={setIsAddMatchOpen}
        tournamentId={tournament.id}
        nextMatchOrder={(matches?.length || 0) + 1}
      />
    </>
  );
}
