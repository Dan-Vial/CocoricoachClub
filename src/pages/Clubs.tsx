import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AddClubDialog } from "@/components/clubs/AddClubDialog";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Clubs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: clubs, isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteClub = useMutation({
    mutationFn: async (clubId: string) => {
      const { error } = await supabase.from("clubs").delete().eq("id", clubId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      toast.success("Club supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du club");
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                Préparation Physique Rugby
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Gestion des clubs et suivi des performances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Mes Clubs</h2>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un club
          </Button>
        </div>

        {clubs && clubs.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Aucun club créé pour le moment</p>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer votre premier club
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs?.map((club) => (
              <Card
                key={club.id}
                className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                onClick={() => navigate(`/clubs/${club.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      {club.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Êtes-vous sûr de vouloir supprimer ${club.name} ?`)) {
                          deleteClub.mutate(club.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Créé le {new Date(club.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddClubDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}
