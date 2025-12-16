import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Shield, Users, Building2, ArrowLeft, UserPlus, Trash2, Crown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  clubs_owned: number;
  is_super_admin: boolean;
}

interface AdminClub {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  owner_name: string | null;
  owner_email: string | null;
  category_count: number;
  member_count: number;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Check if current user is super admin
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("super_admin_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_all_users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AdminUser[];
    },
    enabled: isSuperAdmin === true,
  });

  // Fetch all clubs
  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_all_clubs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AdminClub[];
    },
    enabled: isSuperAdmin === true,
  });

  // Add super admin mutation
  const addSuperAdmin = useMutation({
    mutationFn: async (email: string) => {
      // First find the user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("Utilisateur non trouvé avec cet email");
      }

      // Check if already super admin
      const { data: existing } = await supabase
        .from("super_admin_users")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        throw new Error("Cet utilisateur est déjà super admin");
      }

      // Add as super admin
      const { error } = await supabase
        .from("super_admin_users")
        .insert({ user_id: profile.id, granted_by: user?.id });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Super admin ajouté avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setNewAdminEmail("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove super admin mutation
  const removeSuperAdmin = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === user?.id) {
        throw new Error("Vous ne pouvez pas vous retirer vous-même");
      }

      const { error } = await supabase
        .from("super_admin_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Super admin retiré avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Redirect if not authenticated or not super admin
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!checkingAdmin && isSuperAdmin === false && user) {
      toast.error("Accès non autorisé");
      navigate("/clubs");
    }
  }, [checkingAdmin, isSuperAdmin, user, navigate]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Vérification des permissions...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clubs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Administration</h1>
              <p className="text-muted-foreground">Gestion globale de la plateforme</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {users.filter(u => u.is_super_admin).length} super admin(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clubs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clubs.length}</div>
              <p className="text-xs text-muted-foreground">
                {clubs.reduce((acc, c) => acc + c.category_count, 0)} catégories au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membres</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clubs.reduce((acc, c) => acc + c.member_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                collaborateurs dans les clubs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clubs
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Super Admins
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Tous les utilisateurs</CardTitle>
                <CardDescription>
                  Liste de tous les utilisateurs inscrits sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead>Clubs</TableHead>
                        <TableHead>Rôle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.full_name || "Non renseigné"}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {u.created_at
                              ? format(new Date(u.created_at), "dd MMM yyyy", { locale: fr })
                              : "-"}
                          </TableCell>
                          <TableCell>{u.clubs_owned}</TableCell>
                          <TableCell>
                            {u.is_super_admin ? (
                              <Badge variant="default" className="bg-primary">
                                <Crown className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Utilisateur</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs">
            <Card>
              <CardHeader>
                <CardTitle>Tous les clubs</CardTitle>
                <CardDescription>
                  Liste de tous les clubs créés sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClubs ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom du club</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead>Catégories</TableHead>
                        <TableHead>Membres</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clubs.map((club) => (
                        <TableRow key={club.id}>
                          <TableCell className="font-medium">{club.name}</TableCell>
                          <TableCell>{club.owner_name || "Non renseigné"}</TableCell>
                          <TableCell>{club.owner_email}</TableCell>
                          <TableCell>
                            {format(new Date(club.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{club.category_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{club.member_count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Super Admins Tab */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Super Admins</CardTitle>
                <CardDescription>
                  Ajoutez ou retirez des droits super admin aux utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new admin form */}
                <div className="flex gap-4">
                  <Input
                    placeholder="Email de l'utilisateur"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="max-w-md"
                  />
                  <Button
                    onClick={() => addSuperAdmin.mutate(newAdminEmail)}
                    disabled={!newAdminEmail || addSuperAdmin.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter Super Admin
                  </Button>
                </div>

                {/* List of super admins */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Clubs créés</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((u) => u.is_super_admin)
                      .map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            {admin.full_name || "Non renseigné"}
                          </TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{admin.clubs_owned}</TableCell>
                          <TableCell className="text-right">
                            {admin.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSuperAdmin.mutate(admin.id)}
                                disabled={removeSuperAdmin.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
