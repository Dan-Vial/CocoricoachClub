import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { Bell, Plus, Send, Mail, Smartphone, Trash2, Building2, Users, Globe, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SuperAdminNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    message: "",
    notification_type: "info",
    target_type: "all",
    is_email: false,
    is_push: true,
  });

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["global-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch clubs for targeting
  const { data: clubs = [] } = useQuery({
    queryKey: ["super-admin-clubs-for-notif"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch clients for targeting (a client may own multiple clubs/categories)
  const { data: clients = [] } = useQuery({
    queryKey: ["super-admin-clients-for-notif"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm({
      title: "",
      message: "",
      notification_type: "info",
      target_type: "all",
      is_email: false,
      is_push: true,
    });
    setSelectedClubIds([]);
    setSelectedClientIds([]);
  };

  // Send notification via edge function
  const sendNotification = useMutation({
    mutationFn: async () => {
      const targetIds =
        form.target_type === "club"
          ? selectedClubIds
          : form.target_type === "client"
            ? selectedClientIds
            : null;

      // Save record (audit trail)
      const { error: dbError } = await supabase.from("global_notifications").insert({
        title: form.title,
        message: form.message,
        notification_type: form.notification_type,
        target_type: form.target_type,
        target_ids: targetIds,
        is_email: form.is_email,
        is_push: form.is_push,
        created_by: user?.id,
        sent_at: new Date().toISOString(),
      });
      if (dbError) throw dbError;

      // Send via dedicated edge function
      if (form.is_push || form.is_email) {
        const { data, error: fnError } = await supabase.functions.invoke("send-global-notification", {
          body: {
            title: form.title,
            message: form.message,
            notification_type: form.notification_type,
            target_type: form.target_type,
            target_ids: targetIds ?? [],
            channels: {
              push: form.is_push,
              email: form.is_email,
            },
          },
        });
        if (fnError) {
          console.error("Send error:", fnError);
          toast.warning("Notification enregistrée mais l'envoi a échoué");
          return;
        }
        const summary = data as { push_sent?: number; email_sent?: number; total_users?: number };
        if (summary?.total_users === 0) {
          toast.warning("Aucun utilisateur cible trouvé");
        } else {
          toast.success(
            `Envoyé : ${summary?.push_sent ?? 0} push, ${summary?.email_sent ?? 0} emails (${summary?.total_users ?? 0} utilisateurs)`
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Notification error:", error);
      toast.error("Erreur lors de l'envoi");
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("global_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification supprimée");
      queryClient.invalidateQueries({ queryKey: ["global-notifications"] });
    },
  });

  const toggleClub = (clubId: string) => {
    setSelectedClubIds((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
    );
  };

  const selectAllClubs = () => {
    if (selectedClubIds.length === clubs.length) {
      setSelectedClubIds([]);
    } else {
      setSelectedClubIds(clubs.map((c: any) => c.id));
    }
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    if (selectedClientIds.length === clients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map((c: any) => c.id));
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "info":
        return <Badge variant="outline">Info</Badge>;
      case "warning":
        return <Badge className="bg-amber-500">Attention</Badge>;
      case "success":
        return <Badge className="bg-green-600">Succès</Badge>;
      case "alert":
        return <Badge variant="destructive">Alerte</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTargetLabel = (notif: any) => {
    switch (notif.target_type) {
      case "all":
        return "Tous les utilisateurs";
      case "staff":
        return "Staff uniquement";
      case "client": {
        const count = notif.target_ids?.length || 0;
        return `${count} client(s)`;
      }
      case "club": {
        const count = notif.target_ids?.length || 0;
        return `${count} club(s)`;
      }
      default:
        return notif.target_type;
    }
  };

  const canSend =
    form.title &&
    form.message &&
    (form.target_type === "club"
      ? selectedClubIds.length > 0
      : form.target_type === "client"
        ? selectedClientIds.length > 0
        : true);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications globales
            </CardTitle>
            <CardDescription>
              Envoyez des notifications ciblées aux utilisateurs
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Envoyer une notification</DialogTitle>
                <DialogDescription>
                  Choisissez les destinataires et le canal d'envoi
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Titre de la notification"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Contenu du message..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.notification_type}
                      onValueChange={(v) => setForm({ ...form, notification_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="success">Succès</SelectItem>
                        <SelectItem value="warning">Attention</SelectItem>
                        <SelectItem value="alert">Alerte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destinataires</Label>
                    <Select
                      value={form.target_type}
                      onValueChange={(v) => {
                        setForm({ ...form, target_type: v });
                        if (v !== "club") setSelectedClubIds([]);
                        if (v !== "client") setSelectedClientIds([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Tout le monde
                          </span>
                        </SelectItem>
                        <SelectItem value="staff">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Staff uniquement
                          </span>
                        </SelectItem>
                        <SelectItem value="client">
                          <span className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Par client(s)
                          </span>
                        </SelectItem>
                        <SelectItem value="club">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Par club(s)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Client selection */}
                {form.target_type === "client" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sélectionner les clients</Label>
                      <Button variant="ghost" size="sm" onClick={selectAllClients}>
                        {selectedClientIds.length === clients.length ? "Tout décocher" : "Tout cocher"}
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {clients.map((client: any) => (
                        <label
                          key={client.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedClientIds.includes(client.id)}
                            onCheckedChange={() => toggleClient(client.id)}
                          />
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{client.name}</span>
                            {client.email && (
                              <span className="text-xs text-muted-foreground">{client.email}</span>
                            )}
                          </div>
                        </label>
                      ))}
                      {clients.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Aucun client</p>
                      )}
                    </div>
                    {selectedClientIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClientIds.length} client(s) sélectionné(s) — toutes leurs catégories seront notifiées
                      </p>
                    )}
                  </div>
                )}

                {/* Club selection */}
                {form.target_type === "club" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sélectionner les clubs</Label>
                      <Button variant="ghost" size="sm" onClick={selectAllClubs}>
                        {selectedClubIds.length === clubs.length ? "Tout décocher" : "Tout cocher"}
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {clubs.map((club: any) => (
                        <label
                          key={club.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedClubIds.includes(club.id)}
                            onCheckedChange={() => toggleClub(club.id)}
                          />
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{club.name}</span>
                        </label>
                      ))}
                      {clubs.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Aucun club actif</p>
                      )}
                    </div>
                    {selectedClubIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClubIds.length} club(s) sélectionné(s)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_push}
                      onCheckedChange={(checked) => setForm({ ...form, is_push: checked })}
                    />
                    <Label className="flex items-center gap-1">
                      <Smartphone className="h-4 w-4" />
                      Push
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_email}
                      onCheckedChange={(checked) => setForm({ ...form, is_email: checked })}
                    />
                    <Label className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button
                  onClick={() => sendNotification.mutate()}
                  disabled={!canSend || sendNotification.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendNotification.isPending ? "Envoi..." : "Envoyer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune notification envoyée
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif: any) => (
              <div
                key={notif.id}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium">{notif.title}</h4>
                    {getTypeBadge(notif.notification_type)}
                    <Badge variant="outline">{getTargetLabel(notif)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {notif.sent_at && (
                      <span>
                        Envoyé le {format(new Date(notif.sent_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {notif.is_push && (
                        <Badge variant="outline" className="text-xs">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Push
                        </Badge>
                      )}
                      {notif.is_email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Supprimer cette notification ?")) {
                      deleteNotification.mutate(notif.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}