import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MembersSectionProps {
  clubId: string;
  canManage: boolean;
}

export function MembersSection({ clubId, canManage }: MembersSectionProps) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("club_members")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch user emails separately
      if (data && data.length > 0) {
        const userIds = data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        return data.map((member: any) => ({
          ...member,
          profile: profiles?.find((p) => p.id === member.user_id),
        }));
      }

      return data;
    },
  });

  const { data: club } = useQuery({
    queryKey: ["club-owner", clubId],
    queryFn: async () => {
      const { data: clubData, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();
      if (error) throw error;

      // Fetch owner profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", clubData.user_id)
        .maybeSingle();

      return {
        ...clubData,
        profile: profileData,
      };
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from("club_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      toast.success("Membre retiré avec succès");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du membre");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await (supabase as any)
        .from("club_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
      toast.success("Rôle modifié avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la modification du rôle");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Admin", variant: "default" },
      coach: { label: "Coach", variant: "secondary" },
      viewer: { label: "Viewer", variant: "outline" },
    };
    const config = variants[role] || variants.viewer;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Membres du Club</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Membre depuis</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {club && (
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {club.profile?.full_name || "Propriétaire"}
                  </div>
                </TableCell>
                <TableCell>{club.profile?.email}</TableCell>
                <TableCell>
                  <Badge variant="default">Propriétaire</Badge>
                </TableCell>
                <TableCell>—</TableCell>
                {canManage && <TableCell>—</TableCell>}
              </TableRow>
            )}
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.profile?.full_name || "Utilisateur"}
                  </TableCell>
                  <TableCell>{member.profile?.email}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateRole.mutate({ memberId: member.id, newRole: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Viewer</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="coach">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Coach</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">Admin</Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember.mutate(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                  Aucun membre pour le moment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
