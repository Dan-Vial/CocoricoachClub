import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Trash2, CheckCircle, XCircle } from "lucide-react";
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
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: string;
  notification_subtype: string | null;
  injury_id: string | null;
  metadata: any;
}

export function NotificationBell({ variant = "hero" }: { variant?: "hero" | "default" }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Toutes les notifications ont été marquées comme lues");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification supprimée");
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_injury": return "🚑";
      case "status_change": return "📋";
      case "injury_return":
      case "return_ready": return "✅";
      case "birthday": return "🎂";
      case "medical_reminder": return "💊";
      case "protocol_reminder": return "📝";
      case "test_reminder": return "🏃";
      case "category_link_request": return "🔗";
      default: return "ℹ️";
    }
  };

  const respondToLink = useMutation({
    mutationFn: async ({ playerCategoryId, response, notificationId }: { playerCategoryId: string; response: string; notificationId: string }) => {
      const { data, error } = await supabase.rpc("respond_to_category_link", {
        _player_category_id: playerCategoryId,
        _response: response,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || "Erreur");
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(response === "accepted" ? "Structure acceptée !" : "Demande refusée");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur");
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${
            variant === "hero"
              ? "text-primary-foreground hover:bg-primary-foreground/10"
              : "text-foreground hover:bg-accent"
          }`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              className="text-xs gap-1"
            >
              <Check className="h-3 w-3" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {(!notifications || notifications.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-accent/20" : ""
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead.mutate(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">
                          {notification.title}
                        </h4>
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => markAsRead.mutate(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteNotification.mutate(notification.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.notification_type === "category_link_request" && notification.notification_subtype === "pending" && notification.metadata?.player_category_id && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1 h-7 text-xs"
                            onClick={() => respondToLink.mutate({
                              playerCategoryId: notification.metadata.player_category_id,
                              response: "accepted",
                              notificationId: notification.id,
                            })}
                            disabled={respondToLink.isPending}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            onClick={() => respondToLink.mutate({
                              playerCategoryId: notification.metadata.player_category_id,
                              response: "declined",
                              notificationId: notification.id,
                            })}
                            disabled={respondToLink.isPending}
                          >
                            <XCircle className="h-3 w-3" />
                            Refuser
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
