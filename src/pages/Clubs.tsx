import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AddClubDialog } from "@/components/clubs/AddClubDialog";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { InjuryReturnAlerts } from "@/components/injuries/InjuryReturnAlerts";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";

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

  // Fetch categories where user is a direct member (not via club)
  const { data: directCategories } = useQuery({
    queryKey: ["direct-category-access"],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: memberCategories, error } = await supabase
        .from("category_members")
        .select(`
          category_id,
          role,
          categories (
            id,
            name,
            club_id,
            cover_image_url,
            rugby_type,
            clubs (id, name)
          )
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return memberCategories || [];
    },
    enabled: !!user,
  });

  // Check if user is super admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("super_admin_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Check if user is approved to create clubs
  const { data: isApproved } = useQuery({
    queryKey: ["is-approved", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("approved_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) return false;
      // Super admins are always approved
      return !!data || isSuperAdmin;
    },
    enabled: !!user?.id,
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
              <GlobalPlayerSearch />
              <NotificationBell />
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  title="Administration"
                >
                  <Shield className="h-5 w-5" />
                </Button>
              )}
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
        <DashboardWidgets />
        <InjuryReturnAlerts />
        
        {/* Pending approval message */}
        {!isApproved && !isSuperAdmin && (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 mb-8">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                    Compte en attente de validation
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Votre compte doit être validé par un administrateur avant de pouvoir créer des clubs.
                    Vous serez notifié une fois votre accès approuvé.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-8 mt-8">
          <h2 className="text-2xl font-bold text-foreground">Mes Clubs</h2>
          {(isApproved || isSuperAdmin) && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un club
            </Button>
          )}
        </div>

        {clubs && clubs.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {isApproved || isSuperAdmin 
                  ? "Aucun club créé pour le moment" 
                  : "Vous pourrez créer des clubs une fois votre compte validé"}
              </p>
              {(isApproved || isSuperAdmin) && (
                <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer votre premier club
                </Button>
              )}
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

        {/* Show categories where user has direct access */}
        {directCategories && directCategories.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-8 mt-12">
              <h2 className="text-2xl font-bold text-foreground">Catégories partagées avec moi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {directCategories.map((item: any) => (
                <Card
                  key={item.category_id}
                  className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                  onClick={() => navigate(`/clubs/${item.categories.club_id}/categories/${item.category_id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {item.categories.name}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Club: {item.categories.clubs?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rugby {item.categories.rugby_type === "7" ? "à 7" : item.categories.rugby_type === "academie" ? "Académie" : "à XV"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <AddClubDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}
