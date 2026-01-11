import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { InviteCategoryMemberDialog } from "./InviteCategoryMemberDialog";

interface CategoryCollaborationTabProps {
  categoryId: string;
}

export function CategoryCollaborationTab({ categoryId }: CategoryCollaborationTabProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, clubs(*)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["category-members", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_members")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        data.map(async (member: any) => {
          const { data: profileData } = await supabase
            .rpc("get_safe_profile", { profile_id: member.user_id });
          return {
            ...member,
            profile: profileData?.[0] || null,
          };
        })
      );
      
      return membersWithProfiles;
    },
  });

  const { data: categoryInvitations, isLoading: categoryInvitationsLoading } = useQuery({
    queryKey: ["category-invitations", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_invitations")
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch club-level invitations that would give access to this category
  const { data: clubInvitations, isLoading: clubInvitationsLoading } = useQuery({
    queryKey: ["club-invitations-for-category", categoryId],
    queryFn: async () => {
      if (!category) return [];
      const { data, error } = await supabase
        .from("club_invitations")
        .select("*")
        .eq("club_id", (category as any).club_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  const invitationsLoading = categoryInvitationsLoading || clubInvitationsLoading;

  const { data: canManage } = useQuery({
    queryKey: ["can-manage-category", categoryId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !category) return false;
      
      // Check if user is club owner
      if ((category as any).clubs?.user_id === user.user.id) return true;
      
      // Check if user is club admin
      const { data: memberRole } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", (category as any).club_id)
        .eq("user_id", user.user.id)
        .maybeSingle();
      
      return memberRole?.role === "admin";
    },
    enabled: !!category,
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("category_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-members", categoryId] });
      toast.success("Membre retiré");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("category_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-invitations", categoryId] });
      toast.success("Invitation annulée");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: "admin" | "coach" | "viewer" }) => {
      const { error } = await supabase
        .from("category_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-members", categoryId] });
      toast.success("Rôle modifié avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la modification du rôle");
    },
  });

  const copyInvitationLink = async (invitation: any) => {
    try {
      // Viewer: generate a public (no-auth) read-only link
      if (invitation.role === "viewer") {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Non authentifié");

        const { data, error } = await supabase
          .from("public_access_tokens")
          .insert({
            club_id: null,
            category_id: categoryId,
            created_by: userId,
            label: invitation.email ? `Invitation viewer: ${invitation.email}` : null,
            access_type: "viewer",
          })
          .select("token")
          .single();

        if (error) throw error;

        const link = `${window.location.origin}/public-view?token=${data.token}`;
        await navigator.clipboard.writeText(link);
        setCopiedToken(invitation.token);
        toast.success("Lien viewer (sans compte) copié !");
        setTimeout(() => setCopiedToken(null), 2000);
        return;
      }

      // Other roles: classic invitation flow (requires login)
      const link = `${window.location.origin}/accept-invitation?token=${invitation.token}&type=category`;
      await navigator.clipboard.writeText(link);
      setCopiedToken(invitation.token);
      toast.success("Lien copié !");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (e) {
      toast.error("Erreur lors de la copie du lien");
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Admin", variant: "default" },
      coach: { label: "Coach", variant: "secondary" },
      viewer: { label: "Viewer", variant: "outline" },
    };
    const config = variants[role] || variants.viewer;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (categoryLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Collaboration - {category?.name}</CardTitle>
            {canManage && (
              <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Invitez des collaborateurs à accéder <strong>uniquement à cette catégorie</strong>. 
            Ils ne verront pas les autres catégories du club.
          </p>
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Membres de la catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : members && members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Depuis</TableHead>
                  {canManage && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.profile?.full_name || "Utilisateur"}</p>
                        <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={member.role}
                          onValueChange={(value: "admin" | "coach" | "viewer") => updateRoleMutation.mutate({ memberId: member.id, newRole: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <Badge variant="outline" className="text-xs">Viewer</Badge>
                            </SelectItem>
                            <SelectItem value="coach">
                              <Badge variant="secondary" className="text-xs">Coach</Badge>
                            </SelectItem>
                            <SelectItem value="admin">
                              <Badge variant="default" className="text-xs">Admin</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(member.role)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Aucun membre spécifique à cette catégorie
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Invitations Section */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Invitations catégorie en attente</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryInvitationsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : categoryInvitations && categoryInvitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryInvitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.expires_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInvitationLink(invitation)}
                        >
                          {copiedToken === invitation.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Aucune invitation catégorie en attente
            </p>
          )}
        </CardContent>
      </Card>

      {/* Club Invitations Section */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Invitations club en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ces invitations au niveau du club donneront accès à <strong>toutes les catégories</strong> du club.
          </p>
          {clubInvitationsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : clubInvitations && clubInvitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubInvitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.expires_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Club
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Aucune invitation club en attente
            </p>
          )}
        </CardContent>
      </Card>

      <InviteCategoryMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        categoryId={categoryId}
      />
    </div>
  );
}
