import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { MembersSection } from "./MembersSection";
import { InvitationsSection } from "./InvitationsSection";
import { InviteMemberDialog } from "./InviteMemberDialog";

interface CollaborationTabProps {
  clubId: string;
}

export function CollaborationTab({ clubId }: CollaborationTabProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-club-role", clubId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Check if user is owner
      if (club?.user_id === user.user.id) {
        return "owner";
      }

      // Check if user is member
      const { data, error } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role || null;
    },
    enabled: !!club,
  });

  if (clubLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const canManageMembers = userRole === "owner" || userRole === "admin";

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestion des Collaborateurs</CardTitle>
            {canManageMembers && (
              <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Inviter un Membre
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Partagez votre club avec d'autres utilisateurs pour collaborer sur la gestion des joueurs et des données.
          </p>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Rôles disponibles</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Viewer:</strong> Peut uniquement consulter les données (lecture seule)</li>
                <li><strong>Coach:</strong> Peut ajouter et modifier les données des joueurs</li>
                <li><strong>Admin:</strong> Peut gérer les membres et toutes les données du club</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <MembersSection clubId={clubId} canManage={canManageMembers} />
      <InvitationsSection clubId={clubId} canManage={canManageMembers} />

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        clubId={clubId}
      />
    </div>
  );
}
