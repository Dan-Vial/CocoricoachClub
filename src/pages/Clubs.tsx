import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Plus, LogOut, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AddClubDialog } from "@/components/clubs/AddClubDialog";
import { ClubCard } from "@/components/clubs/ClubCard";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InjuryReturnAlerts } from "@/components/injuries/InjuryReturnAlerts";
import { ExerciseLibrarySection } from "@/components/library/ExerciseLibrarySection";

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

  // Check if user is an athlete (has category_members with role 'athlete' and no other roles)
  const { data: athleteCategories, isLoading: athleteCheckLoading } = useQuery({
    queryKey: ["athlete-role-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("category_members")
        .select("category_id, role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });


  // Fetch clubs owned by user OR where user is a club member
  const { data: clubs, isLoading } = useQuery({
    queryKey: ["my-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get clubs owned by user
      const { data: ownedClubs, error: ownedError } = await supabase
        .from("clubs")
        .select("*")
        .eq("user_id", user.id);
      if (ownedError) throw ownedError;

      // Get clubs where user is a member
      const { data: memberClubs, error: memberError } = await supabase
        .from("club_members")
        .select("club_id, clubs(*)")
        .eq("user_id", user.id);
      if (memberError) throw memberError;

      // Merge and deduplicate
      const allClubs = [...(ownedClubs || [])];
      const ownedIds = new Set(allClubs.map(c => c.id));
      for (const mc of memberClubs || []) {
        if (mc.clubs && !ownedIds.has((mc.clubs as any).id)) {
          allClubs.push(mc.clubs as any);
        }
      }
      
      return allClubs.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user?.id,
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

      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
  });

  // Check if user is approved to create clubs
  const { data: isApproved } = useQuery({
    queryKey: ["is-approved", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc("is_approved_user", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error checking approved status:", error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
  });

  // Redirect pure athletes to athlete-space
  useEffect(() => {
    if (athleteCheckLoading || !athleteCategories || isLoading) return;
    const hasOnlyAthleteRole = athleteCategories.length > 0 && athleteCategories.every(cm => cm.role === "athlete");
    const hasNoClubs = !clubs || clubs.length === 0;
    if (hasOnlyAthleteRole && hasNoClubs && !isSuperAdmin) {
      navigate("/athlete-space", { replace: true });
    }
  }, [athleteCategories, athleteCheckLoading, clubs, isLoading, isSuperAdmin, navigate]);

  const deleteClub = useMutation({
    mutationFn: async (clubId: string) => {
      // Use .select() to get the deleted row - if empty, RLS blocked it
      const { data, error } = await supabase
        .from("clubs")
        .delete()
        .eq("id", clubId)
        .select("id");
      
      if (error) {
        console.error("Delete club error:", error);
        throw error;
      }
      
      // If no rows were deleted, RLS blocked the operation
      if (!data || data.length === 0) {
        throw new Error("permission_denied");
      }
      
      return clubId;
    },
    onMutate: async (clubId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["clubs"] });
      
      // Snapshot previous value
      const previousClubs = queryClient.getQueryData(["clubs"]);
      
      // Optimistically remove the club from the list
      queryClient.setQueryData(["clubs"], (old: any[] | undefined) => 
        old ? old.filter((club) => club.id !== clubId) : []
      );
      
      return { previousClubs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      toast.success("Club supprimé avec succès");
    },
    onError: (error: any, _clubId, context) => {
      // Rollback on error
      if (context?.previousClubs) {
        queryClient.setQueryData(["clubs"], context.previousClubs);
      }
      console.error("Delete club mutation error:", error);
      if (error.code === "23503") {
        toast.error("Impossible de supprimer ce club car il contient des catégories. Supprimez d'abord les catégories.");
      } else if (error.message === "permission_denied" || error.message?.includes("policy")) {
        toast.error("Vous n'avez pas la permission de supprimer ce club.");
      } else {
        toast.error("Erreur lors de la suppression du club");
      }
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
                CocoriCoach Club
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Gestion des clubs et suivi des performances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {isSuperAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/athlete-space")}
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                    title="Espace Athlète"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                     onClick={() => navigate("/super-admin")}
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                     title="Super Admin"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                </>
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
          <div className="space-y-2">
            {clubs?.map((club) => (
              <ClubCard 
                key={club.id} 
                club={club} 
                onDelete={(clubId) => deleteClub.mutate(clubId)} 
              />
            ))}
          </div>
        )}

      </div>

      <AddClubDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}
