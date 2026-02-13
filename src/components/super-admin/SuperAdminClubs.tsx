import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Building2, Pause, Play, ChevronDown, ChevronRight, FolderOpen, Gift, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SuperAdminClubs() {
  const queryClient = useQueryClient();
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [linkingClub, setLinkingClub] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Fetch clubs
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["super-admin-all-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(`*, clients(id, name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles separately since there's no direct FK from clubs to profiles
      const ownerIds = [...new Set((data || []).map((c: any) => c.user_id))];
      let profilesMap = new Map<string, any>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);
        (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
      }

      return (data || []).map((club: any) => ({
        ...club,
        profiles: profilesMap.get(club.user_id) || null,
      }));
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["super-admin-all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch clients for linking
  const { data: clients = [] } = useQuery({
    queryKey: ["super-admin-clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch approved_users to know free/paid status per owner
  const { data: approvedUsers = [] } = useQuery({
    queryKey: ["super-admin-approved-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approved_users")
        .select("user_id, is_free_user");
      if (error) throw error;
      return data;
    },
  });

  // Toggle club active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("clubs")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-clubs"] });
    },
  });

  // Link club to client
  const linkToClient = useMutation({
    mutationFn: async ({ clubId, clientId }: { clubId: string; clientId: string | null }) => {
      const { error } = await supabase
        .from("clubs")
        .update({ client_id: clientId })
        .eq("id", clubId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Club lié au client");
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-clubs"] });
      setLinkingClub(null);
      setSelectedClientId("");
    },
  });

  // Toggle free/paid status for a club owner
  const toggleFreeStatus = useMutation({
    mutationFn: async ({ userId, isFree }: { userId: string; isFree: boolean }) => {
      const { error } = await supabase
        .from("approved_users")
        .update({ is_free_user: isFree })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["super-admin-approved-users"] });
    },
  });

  const toggleExpand = (clubId: string) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubId)) {
      newExpanded.delete(clubId);
    } else {
      newExpanded.add(clubId);
    }
    setExpandedClubs(newExpanded);
  };

  const getOwnerFreeStatus = (userId: string): boolean | null => {
    const au = approvedUsers.find((a: any) => a.user_id === userId);
    return au ? (au.is_free_user ?? true) : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Gestion des clubs
        </CardTitle>
        <CardDescription>
          Visualisez et gérez tous les clubs de la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : clubs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun club</p>
        ) : (
          <div className="space-y-2">
            {clubs.map((club: any) => {
              const clubCategories = categories.filter((c: any) => c.club_id === club.id);
              const isExpanded = expandedClubs.has(club.id);
              const hasClient = !!club.clients?.name;
              const ownerIsFree = getOwnerFreeStatus(club.user_id);

              return (
                <div key={club.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <button
                      onClick={() => toggleExpand(club.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{club.name}</span>
                        <span className="text-muted-foreground text-sm">
                          ({club.sport || "rugby"})
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Owner info */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{club.profiles?.full_name || club.profiles?.email || "Inconnu"}</span>
                      </div>
                      
                      {/* Client badge or Free/Paid toggle */}
                      {hasClient ? (
                        <Badge variant="outline">{club.clients.name}</Badge>
                      ) : (
                        <>
                          {ownerIsFree === true ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-purple-600 hover:text-green-600"
                              onClick={() => toggleFreeStatus.mutate({ userId: club.user_id, isFree: false })}
                              title="Cliquer pour passer en Payant"
                            >
                              <Gift className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Gratuit</span>
                            </Button>
                          ) : ownerIsFree === false ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-green-600 hover:text-purple-600"
                              onClick={() => toggleFreeStatus.mutate({ userId: club.user_id, isFree: true })}
                              title="Cliquer pour passer en Gratuit"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Payant</span>
                            </Button>
                          ) : (
                            <Badge className="bg-purple-600">
                              <Gift className="h-3 w-3 mr-1" />
                              Gratuit
                            </Badge>
                          )}
                        </>
                      )}

                      {!hasClient && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLinkingClub(club.id)}
                        >
                          Lier à un client
                        </Button>
                      )}
                      <Badge variant="secondary">
                        {clubCategories.length} catégorie(s)
                      </Badge>
                      {club.is_active ? (
                        <Badge className="bg-green-600">Actif</Badge>
                      ) : (
                        <Badge variant="destructive">Inactif</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive.mutate({ id: club.id, isActive: !club.is_active })}
                      >
                        {club.is_active ? (
                          <Pause className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Play className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4">
                      <div className="mb-3 text-sm text-muted-foreground">
                        <p>Propriétaire: {club.profiles?.full_name || club.profiles?.email || "Inconnu"}</p>
                        <p>Email: {club.profiles?.email || "-"}</p>
                        <p>Créé le: {format(new Date(club.created_at), "dd MMM yyyy", { locale: fr })}</p>
                        <p>Statut propriétaire: {ownerIsFree === true ? "🎁 Gratuit" : ownerIsFree === false ? "💰 Payant" : "Non défini"}</p>
                      </div>
                      
                      {clubCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Aucune catégorie
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {clubCategories.map((cat: any) => (
                            <Badge key={cat.id} variant="outline" className="text-xs">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              {cat.name}
                              <span className="ml-1 text-muted-foreground">
                                ({cat.rugby_type} - {cat.gender})
                              </span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Link to client dialog */}
        <Dialog open={!!linkingClub} onOpenChange={(open) => !open && setLinkingClub(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lier le club à un client</DialogTitle>
              <DialogDescription>
                Sélectionnez le client propriétaire de ce club
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkingClub(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => linkingClub && linkToClient.mutate({ clubId: linkingClub, clientId: selectedClientId || null })}
                disabled={!selectedClientId}
              >
                Lier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
