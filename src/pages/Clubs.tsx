import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, LogOut, Shield, User, Search } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AddClubDialog } from "@/components/clubs/AddClubDialog";
import { ClubCard } from "@/components/clubs/ClubCard";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SuperAdminShieldButton } from "@/components/notifications/SuperAdminShieldButton";
import { InjuryReturnAlerts } from "@/components/injuries/InjuryReturnAlerts";

export default function Clubs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [clientClubSearch, setClientClubSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  const { data: clubs, isLoading } = useQuery({
    queryKey: ["my-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Fetch clubs the user OWNS
      const { data: ownedClubs, error: ownedError } = await supabase
        .from("clubs")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null);
      if (ownedError) throw ownedError;

      // Fetch clubs the user is a MEMBER of (but doesn't own)
      const { data: memberClubs, error: memberError } = await supabase
        .from("club_members")
        .select("club_id, clubs(*)")
        .eq("user_id", user.id);
      if (memberError) throw memberError;

      const ownedIds = new Set((ownedClubs || []).map(c => c.id));
      const joinedClubs: any[] = [];
      for (const mc of memberClubs || []) {
        if (mc.clubs && !ownedIds.has((mc.clubs as any).id)) {
          joinedClubs.push(mc.clubs as any);
        }
      }

      return {
        owned: (ownedClubs || []).sort((a, b) => a.name.localeCompare(b.name)),
        joined: joinedClubs.sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    enabled: !!user?.id,
  });

  const { data: isSuperAdmin, isLoading: superAdminLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (error) return false;
      return data === true;
    },
    enabled: !!user?.id,
  });

  const { data: isApproved, isLoading: approvedLoading } = useQuery({
    queryKey: ["is-approved", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("is_approved_user", { _user_id: user.id });
      if (error) return false;
      return data === true;
    },
    enabled: !!user?.id,
  });

  // Super admin: fetch ALL clubs with client info
  const { data: allClubs } = useQuery({
    queryKey: ["all-clubs-with-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, clients(id, name, email)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!isSuperAdmin,
  });

  const myClubs = useMemo(() => {
    if (!clubs) return [];
    const c = clubs as { owned: any[]; joined: any[] };
    if (isSuperAdmin) return c.owned;
    return [...c.owned, ...c.joined];
  }, [clubs, isSuperAdmin]);

  const myOwnedIds = useMemo(() => {
    if (!clubs) return new Set<string>();
    return new Set((clubs as { owned: any[]; joined: any[] }).owned.map((c: any) => c.id));
  }, [clubs]);

  const clientClubs = useMemo(() => {
    if (!isSuperAdmin || !allClubs) return [];
    return allClubs.filter(c => !myOwnedIds.has(c.id));
  }, [isSuperAdmin, allClubs, myOwnedIds]);

  const filteredClientClubs = useMemo(() => {
    if (!clientClubSearch.trim()) return clientClubs;
    const q = clientClubSearch.toLowerCase();
    return clientClubs.filter(c => {
      const clientData = c.clients as any;
      return (
        c.name.toLowerCase().includes(q) ||
        (clientData?.name && clientData.name.toLowerCase().includes(q)) ||
        (clientData?.email && clientData.email.toLowerCase().includes(q))
      );
    });
  }, [clientClubs, clientClubSearch]);

  useEffect(() => {
    if (athleteCheckLoading || !athleteCategories || isLoading || superAdminLoading) return;
    const hasOnlyAthleteRole = athleteCategories.length > 0 && athleteCategories.every(cm => cm.role === "athlete");
    const hasNoClubs = myClubs.length === 0;
    if (hasOnlyAthleteRole && hasNoClubs && !isSuperAdmin) {
      navigate("/athlete-space", { replace: true });
    }
  }, [athleteCategories, athleteCheckLoading, myClubs, isLoading, isSuperAdmin, superAdminLoading, navigate]);

  const deleteClub = useMutation({
    mutationFn: async (clubId: string) => {
      const { data, error } = await supabase.from("clubs").delete().eq("id", clubId).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("permission_denied");
      return clubId;
    },
    onMutate: async (clubId: string) => {
      await queryClient.cancelQueries({ queryKey: ["my-clubs"] });
      const previousClubs = queryClient.getQueryData(["my-clubs", user?.id]);
      queryClient.setQueryData(["my-clubs", user?.id], (old: any) => {
        if (!old) return old;
        return {
          owned: old.owned?.filter((club: any) => club.id !== clubId) || [],
          joined: old.joined?.filter((club: any) => club.id !== clubId) || [],
        };
      });
      return { previousClubs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["all-clubs-with-clients"] });
      toast.success("Club supprimé avec succès");
    },
    onError: (error: any, _clubId, context) => {
      if (context?.previousClubs) {
        queryClient.setQueryData(["my-clubs", user?.id], context.previousClubs);
      }
      if (error.code === "23503") {
        toast.error("Impossible de supprimer ce club car il contient des catégories.");
      } else if (error.message === "permission_denied") {
        toast.error("Vous n'avez pas la permission de supprimer ce club.");
      } else {
        toast.error("Erreur lors de la suppression du club");
      }
    },
  });

  if (authLoading || isLoading || athleteCheckLoading || superAdminLoading || approvedLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const hasOnlyAthleteRole = athleteCategories && athleteCategories.length > 0 && athleteCategories.every(cm => cm.role === "athlete");
  const hasNoClubs = myClubs.length === 0;
  if (hasOnlyAthleteRole && hasNoClubs && isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirection vers votre espace athlète...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                CocoriCoach Club
              </h1>
              <p className="text-lg text-white/90">
                Gestion des clubs et suivi des performances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {isSuperAdmin && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/athlete-space")} className="text-white hover:bg-white/10" title="Espace Athlète">
                    <User className="h-5 w-5" />
                  </Button>
                  <SuperAdminShieldButton variant="hero" />
                </>
              )}
              <Button variant="ghost" size="icon" onClick={signOut} className="text-white hover:bg-white/10">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <InjuryReturnAlerts />

        {!isApproved && !isSuperAdmin && (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 mb-8">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Compte en attente de validation</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Votre compte doit être validé par un administrateur avant de pouvoir créer des clubs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mes Clubs */}
        <div className="flex justify-between items-center mb-8 mt-8">
          <h2 className="text-2xl font-bold text-foreground">Mes Clubs</h2>
          {(isApproved || isSuperAdmin) && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un club
            </Button>
          )}
        </div>

        {myClubs.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {isApproved || isSuperAdmin ? "Aucun club créé pour le moment" : "Vous pourrez créer des clubs une fois votre compte validé"}
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
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} onDelete={(clubId) => deleteClub.mutate(clubId)} />
            ))}
          </div>
        )}

        {/* Clubs clients - Super admin only */}
        {isSuperAdmin && clientClubs.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-foreground">Clubs clients</h2>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, client, email..."
                  value={clientClubSearch}
                  onChange={(e) => setClientClubSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredClientClubs.length === 0 ? (
              <Card className="bg-gradient-card shadow-md">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Aucun club trouvé pour cette recherche</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredClientClubs.map((club) => {
                  const clientData = club.clients as any;
                  return (
                    <div key={club.id} className="relative">
                      <ClubCard club={club} onDelete={(clubId) => deleteClub.mutate(clubId)} />
                      {clientData?.name && (
                        <span className="absolute top-1/2 -translate-y-1/2 right-24 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline-block">
                          {clientData.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AddClubDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}