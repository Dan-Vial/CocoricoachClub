import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, ArrowRight, Building2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminShieldButton({ variant = "default" }: { variant?: "hero" | "default" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const getLastSeenTimestamp = () => localStorage.getItem("notif_superadmin_last_seen") || "1970-01-01T00:00:00Z";
  const updateLastSeen = () => localStorage.setItem("notif_superadmin_last_seen", new Date().toISOString());

  // Fetch pending users
  const { data: pendingUsers } = useQuery({
    queryKey: ["pending-registrations"],
    queryFn: async () => {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .order("created_at", { ascending: false });

      const { data: approved } = await supabase.from("approved_users").select("user_id");
      const { data: superAdmins } = await supabase.from("super_admin_users").select("user_id");
      const { data: clubMembers } = await supabase.from("club_members").select("user_id");
      const { data: categoryMembers } = await supabase.from("category_members").select("user_id");

      const approvedIds = new Set(approved?.map(a => a.user_id) || []);
      const superAdminIds = new Set(superAdmins?.map(s => s.user_id) || []);
      const staffIds = new Set([
        ...(clubMembers?.map(m => m.user_id) || []),
        ...(categoryMembers?.map(m => m.user_id) || []),
      ]);

      return (allProfiles || []).filter(p =>
        !approvedIds.has(p.id) && !superAdminIds.has(p.id) && !staffIds.has(p.id)
      );
    },
    refetchInterval: 30000,
  });

  // Fetch accepted ambassador invitations
  const { data: acceptedInvitations } = useQuery({
    queryKey: ["accepted-ambassador-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_invitations")
        .select("*")
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const lastSeen = getLastSeenTimestamp();
  const pendingCount = pendingUsers?.filter(p => p.created_at && p.created_at > lastSeen).length || 0;
  const acceptedCount = acceptedInvitations?.filter(inv => inv.accepted_at && inv.accepted_at > lastSeen).length || 0;
  const totalBadge = pendingCount + acceptedCount;

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (newOpen) updateLastSeen();
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${
            variant === "hero"
              ? "text-primary-foreground hover:bg-primary-foreground/10"
              : "text-foreground hover:bg-accent"
          }`}
          title="Super Admin"
        >
          <Shield className="h-5 w-5" />
          {totalBadge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalBadge > 9 ? "9+" : totalBadge}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Super Admin
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => { setOpen(false); navigate("/super-admin"); }}
          >
            <Settings className="h-3 w-3" />
            Tableau de bord
          </Button>
        </div>
        <ScrollArea className="max-h-[400px]">
          {/* Pending registrations */}
          {(pendingUsers?.length || 0) > 0 && (
            <div className="border-b">
              <button
                onClick={() => { setOpen(false); navigate("/super-admin?tab=users"); }}
                className="w-full p-4 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">
                        {pendingUsers!.length} inscription{pendingUsers!.length > 1 ? "s" : ""} en attente
                      </h4>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 space-y-1">
                      {pendingUsers?.slice(0, 3).map(u => (
                        <p key={u.id} className="text-xs text-muted-foreground truncate">
                          {u.full_name || "Sans nom"} — {u.email || "Pas d'email"}
                        </p>
                      ))}
                      {pendingUsers!.length > 3 && (
                        <p className="text-xs font-medium text-primary">
                          +{pendingUsers!.length - 3} autre{pendingUsers!.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Accepted ambassador invitations */}
          {acceptedInvitations && acceptedInvitations.length > 0 && (
            <div className="border-b">
              {acceptedInvitations.map(inv => (
                <div
                  key={inv.id}
                  className={`p-4 hover:bg-accent/50 transition-colors ${
                    inv.accepted_at && inv.accepted_at > lastSeen ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">
                        🎉 Nouveau client connecté !
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{inv.name || inv.email}</span> a accepté l'invitation.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{inv.email}</p>
                      {inv.accepted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(inv.accepted_at), { addSuffix: true, locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(pendingUsers?.length || 0) === 0 && (acceptedInvitations?.length || 0) === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune notification admin</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
