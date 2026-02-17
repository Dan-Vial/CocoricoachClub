import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trash2, Info } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CategoryCollaborationTabProps {
  categoryId: string;
}

// Rôles disponibles alignés avec Super Admin / Admin Club
const AVAILABLE_ROLES = [
  { value: "admin", label: "Admin", description: "Accès complet à la gestion", variant: "default" as const },
  { value: "coach", label: "Coach", description: "Gestion des entraînements et matchs", variant: "secondary" as const },
  { value: "prepa_physique", label: "Préparateur Physique", description: "Suivi physique et charge", variant: "secondary" as const },
  { value: "doctor", label: "Médecin", description: "Accès médical complet", variant: "secondary" as const },
  { value: "physio", label: "Kinésithérapeute", description: "Blessures et récupération", variant: "secondary" as const },
  { value: "mental_coach", label: "Préparateur Mental", description: "Wellness et suivi psychologique", variant: "secondary" as const },
  { value: "administratif", label: "Administratif", description: "Documents et gestion administrative", variant: "secondary" as const },
  { value: "viewer", label: "Viewer", description: "Consultation uniquement", variant: "outline" as const },
];

export function CategoryCollaborationTab({ categoryId }: CategoryCollaborationTabProps) {
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

  // Fetch club members with access to this category
  const { data: clubMembers, isLoading: clubMembersLoading } = useQuery({
    queryKey: ["club-members-for-category", categoryId],
    queryFn: async () => {
      if (!category) return [];
      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", (category as any).club_id)
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
      
      // Filter members who have access to this category (full club access or assigned)
      return membersWithProfiles.filter((m: any) => {
        if (!m.assigned_categories || m.assigned_categories.length === 0) return true; // Full club access
        return m.assigned_categories.includes(categoryId);
      });
    },
    enabled: !!category,
  });

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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from("category_members")
        .update({ role: newRole as any })
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

  const getRoleConfig = (role: string) => {
    return AVAILABLE_ROLES.find(r => r.value === role) || { 
      value: role, 
      label: role, 
      description: "", 
      variant: "outline" as const 
    };
  };

  const getRoleBadge = (role: string) => {
    const config = getRoleConfig(role);
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (categoryLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Info Section */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Pour inviter de nouveaux membres, utilisez le menu <strong>Admin Club → Utilisateurs</strong>. 
          Les rôles affichés ici reflètent les permissions définies au niveau du club.
        </AlertDescription>
      </Alert>

      {/* Club Members with access Section */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Staff du Club (accès à cette catégorie)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ces membres ont accès via leur appartenance au club (Admin Club → Utilisateurs)
          </p>
          {clubMembersLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : clubMembers && clubMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle Club</TableHead>
                  <TableHead>Accès</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubMembers.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.profile?.full_name || "Utilisateur"}</p>
                        <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border">
                        {!member.assigned_categories || member.assigned_categories.length === 0 
                          ? "Toutes catégories" 
                          : "Catégorie assignée"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Aucun membre du club avec accès à cette catégorie
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category-specific Members Section */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Membres spécifiques à la catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ces membres ont un accès uniquement à cette catégorie (invités directement)
          </p>
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
                          onValueChange={(value: string) => updateRoleMutation.mutate({ memberId: member.id, newRole: value })}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{role.label}</span>
                                  <span className="text-xs text-muted-foreground">{role.description}</span>
                                </div>
                              </SelectItem>
                            ))}
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
    </div>
  );
}
