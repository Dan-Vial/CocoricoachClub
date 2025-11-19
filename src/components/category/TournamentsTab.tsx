import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { AddTournamentDialog } from "./tournaments/AddTournamentDialog";
import { TournamentCard } from "./tournaments/TournamentCard";

interface TournamentsTabProps {
  categoryId: string;
}

export function TournamentsTab({ categoryId }: TournamentsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["tournaments", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Tournois</h2>
          <p className="text-muted-foreground">
            Gérez vos tournois de Rugby à 7 avec suivi de la charge et rotation d'effectif
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Tournoi
        </Button>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Aucun tournoi enregistré pour cette catégorie
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer votre premier tournoi
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              categoryId={categoryId}
            />
          ))}
        </div>
      )}

      <AddTournamentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
