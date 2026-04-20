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
import { Shield, Users, Building2, ArrowLeft, UserPlus, Trash2, Crown, CheckCircle2, XCircle, Clock, FileText, Gift, Copy, Link, Mail, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";

interface AmbassadorInvitation {
  id: string;
  email: string;
  name: string | null;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  clubs_owned: number;
  is_super_admin: boolean;
  is_approved?: boolean;
  is_free_user?: boolean;
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
  const [newAdminName, setNewAdminName] = useState("");
  const [createdInvitationLink, setCreatedInvitationLink] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Check if current user is super admin
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
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

  // Fetch all users with approval status
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // First get all users
      const { data: usersData, error } = await supabase
        .from("admin_all_users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Get approved users with free user status
      const { data: approvedData } = await supabase
        .from("approved_users")
        .select("user_id, is_free_user");

      // Get users who are already members (staff or athletes) - they don't need manual approval
      const { data: clubMembers } = await supabase
        .from("club_members")
        .select("user_id");
      const { data: categoryMembers } = await supabase
        .from("category_members")
        .select("user_id");

      const approvedMap = new Map(approvedData?.map(a => [a.user_id, a.is_free_user]) || []);
      const memberIds = new Set([
        ...(clubMembers?.map(m => m.user_id) || []),
        ...(categoryMembers?.map(m => m.user_id) || []),
      ]);

      return (usersData as AdminUser[]).map(u => ({
        ...u,
        is_approved: approvedMap.has(u.id) || u.is_super_admin || memberIds.has(u.id),
        is_free_user: approvedMap.get(u.id) === true
      }));
    },
    enabled: isSuperAdmin === true,
  });

  // Fetch all clubs with categories
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

  // Fetch categories for all clubs (for expanded view)
  const { data: allCategories = [] } = useQuery({
    queryKey: ["admin-all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, club_id, rugby_type, gender")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin === true,
  });

  // Fetch ambassador invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ["ambassador-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AmbassadorInvitation[];
    },
    enabled: isSuperAdmin === true,
  });

  // Create ambassador invitation mutation
  const createInvitation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      const { data, error } = await supabase
        .from("ambassador_invitations")
        .insert({ 
          email, 
          name: name || null,
          invited_by: user?.id 
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Une invitation existe déjà pour cet email");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/ambassador-invitation?token=${data.token}`;
      setCreatedInvitationLink(link);
      toast.success("Invitation créée ! Copiez le lien ci-dessous.");
      queryClient.invalidateQueries({ queryKey: ["ambassador-invitations"] });
      setNewAdminEmail("");
      setNewAdminName("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete invitation mutation
  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("ambassador_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation supprimée");
      queryClient.invalidateQueries({ queryKey: ["ambassador-invitations"] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Copy link to clipboard
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

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
      toast.success("Ambassadeur retiré avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve user mutation
  const approveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("approved_users")
        .insert({ user_id: userId, approved_by: user?.id });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Utilisateur approuvé avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'approbation");
    },
  });

  // Revoke approval mutation
  const revokeApproval = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("approved_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Accès révoqué avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Erreur lors de la révocation");
    },
  });

  // Toggle free user status mutation
  const toggleFreeUser = useMutation({
    mutationFn: async ({ userId, isFreeUser }: { userId: string; isFreeUser: boolean }) => {
      // First check if user is already approved
      const { data: existing } = await supabase
        .from("approved_users")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing approval
        const { error } = await supabase
          .from("approved_users")
          .update({ is_free_user: isFreeUser })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new approval with free status
        const { error } = await supabase
          .from("approved_users")
          .insert({ 
            user_id: userId, 
            approved_by: user?.id,
            is_free_user: isFreeUser 
          });

        if (error) throw error;
      }

      // If free user, also add as super admin (ambassador)
      if (isFreeUser) {
        const { data: adminExists } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (!adminExists) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "admin" });
        }
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isFreeUser 
        ? "Utilisateur marqué comme gratuit et ambassadeur" 
        : "Statut gratuit retiré"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Erreur lors de la modification");
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
      navigate("/");
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
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
                {users.filter(u => u.is_super_admin).length} ambassadeur(s)
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
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => !u.is_approved && !u.is_super_admin).length}
              </div>
              <p className="text-xs text-muted-foreground">
                utilisateurs à valider
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
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Validations
              {users.filter(u => !u.is_approved && !u.is_super_admin).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {users.filter(u => !u.is_approved && !u.is_super_admin).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Ambassadeurs
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Journal d'audit
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
                        <TableHead className="text-right">Actions</TableHead>
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
                            <div className="flex flex-wrap gap-1">
                              {u.is_super_admin && (
                                <Badge variant="default" className="bg-primary">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Ambassadeur
                                </Badge>
                              )}
                              {u.is_free_user && (
                                <Badge variant="default" className="bg-purple-600">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Badge>
                              )}
                              {!u.is_super_admin && !u.is_free_user && u.is_approved && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approuvé
                                </Badge>
                              )}
                              {!u.is_approved && !u.is_super_admin && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  <Clock className="h-3 w-3 mr-1" />
                                  En attente
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {!u.is_super_admin && (
                              <Button
                                variant={u.is_free_user ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => toggleFreeUser.mutate({ 
                                  userId: u.id, 
                                  isFreeUser: !u.is_free_user 
                                })}
                                disabled={toggleFreeUser.isPending}
                              >
                                <Gift className="h-4 w-4 mr-1" />
                                {u.is_free_user ? "Retirer gratuit" : "Gratuit + Ambassadeur"}
                              </Button>
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

          {/* Clubs Tab - Grouped by User */}
          <TabsContent value="clubs">
            <Card>
              <CardHeader>
                <CardTitle>Clubs par utilisateur</CardTitle>
                <CardDescription>
                  Cliquez sur un utilisateur pour voir ses clubs et catégories (lecture seule)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClubs || loadingUsers ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : (
                  <div className="space-y-2">
                    {users
                      .filter(u => u.clubs_owned > 0)
                      .map((u) => {
                        const userClubs = clubs.filter(c => c.user_id === u.id);
                        const isExpanded = expandedUsers.has(u.id);
                        
                        return (
                          <div key={u.id} className="border rounded-lg overflow-hidden">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedUsers);
                                if (isExpanded) {
                                  newExpanded.delete(u.id);
                                } else {
                                  newExpanded.add(u.id);
                                }
                                setExpandedUsers(newExpanded);
                              }}
                              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                  <span className="font-medium">{u.full_name || "Non renseigné"}</span>
                                  <span className="text-muted-foreground ml-2 text-sm">({u.email})</span>
                                </div>
                              </div>
                              <Badge variant="secondary">{u.clubs_owned} club(s)</Badge>
                            </button>
                            
                            {isExpanded && (
                              <div className="border-t bg-muted/20 p-4 space-y-4">
                                {userClubs.map((club) => {
                                  const clubCategories = allCategories.filter(c => c.club_id === club.id);
                                  
                                  return (
                                    <div key={club.id} className="bg-background rounded-lg border p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        <span className="font-semibold">{club.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          (créé le {format(new Date(club.created_at), "dd MMM yyyy", { locale: fr })})
                                        </span>
                                      </div>
                                      
                                      {clubCategories.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic ml-7">
                                          Aucune catégorie
                                        </p>
                                      ) : (
                                        <div className="ml-7 space-y-1">
                                          <p className="text-sm text-muted-foreground mb-2">
                                            {clubCategories.length} catégorie(s) :
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {clubCategories.map((cat) => (
                                              <Badge key={cat.id} variant="outline" className="text-xs">
                                                <FolderOpen className="h-3 w-3 mr-1" />
                                                {cat.name}
                                                <span className="ml-1 text-muted-foreground">
                                                  ({cat.rugby_type})
                                                </span>
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    
                    {users.filter(u => u.clubs_owned > 0).length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        Aucun utilisateur n'a créé de club
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Validation des utilisateurs</CardTitle>
                <CardDescription>
                  Approuvez les nouveaux utilisateurs pour leur permettre de créer des clubs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Pending approvals */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    En attente de validation
                  </h3>
                  {users.filter(u => !u.is_approved && !u.is_super_admin).length === 0 ? (
                    <p className="text-muted-foreground">Aucun utilisateur en attente</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Inscrit le</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users
                          .filter(u => !u.is_approved && !u.is_super_admin)
                          .map((u) => (
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
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => approveUser.mutate(u.id)}
                                  disabled={approveUser.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approuver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Already approved */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Utilisateurs approuvés
                  </h3>
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
                        .filter(u => u.is_approved && !u.is_super_admin)
                        .map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {u.full_name || "Non renseigné"}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.clubs_owned}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeApproval.mutate(u.id)}
                                disabled={revokeApproval.isPending}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Super Admins Tab */}
          <TabsContent value="admins">
            <div className="space-y-6">
              {/* Create invitation card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Inviter un nouvel ambassadeur
                  </CardTitle>
                  <CardDescription>
                    Créez un lien d'invitation à envoyer à la personne
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <Input
                      placeholder="Nom de l'ambassadeur"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="max-w-xs"
                    />
                    <Input
                      placeholder="Email de l'ambassadeur"
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="max-w-md"
                    />
                    <Button
                      onClick={() => createInvitation.mutate({ email: newAdminEmail, name: newAdminName })}
                      disabled={!newAdminEmail || createInvitation.isPending}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Créer le lien
                    </Button>
                  </div>

                  {createdInvitationLink && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✅ Lien d'invitation créé ! Copiez-le et envoyez-le à l'ambassadeur :
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={createdInvitationLink}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(createdInvitationLink)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copier
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending invitations */}
              <Card>
                <CardHeader>
                  <CardTitle>Invitations en attente</CardTitle>
                  <CardDescription>
                    Liens d'invitation envoyés mais pas encore utilisés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvitations ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : invitations.filter(i => i.status === "pending").length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucune invitation en attente</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Créée le</TableHead>
                          <TableHead>Lien</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations
                          .filter(i => i.status === "pending")
                          .map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">
                                {inv.name || "-"}
                              </TableCell>
                              <TableCell>{inv.email}</TableCell>
                              <TableCell>
                                {format(new Date(inv.created_at), "dd MMM yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(`${window.location.origin}/ambassador-invitation?token=${inv.token}`)}
                                >
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copier
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteInvitation.mutate(inv.id)}
                                  disabled={deleteInvitation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Current ambassadors */}
              <Card>
                <CardHeader>
                  <CardTitle>Ambassadeurs actifs</CardTitle>
                  <CardDescription>
                    Utilisateurs ayant les droits ambassadeur
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
            </div>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <AuditLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
