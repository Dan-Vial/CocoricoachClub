import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Mail, Send, Loader2, Users, CalendarPlus, Clock, XCircle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";

interface SessionNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    session_date: string;
    session_start_time: string | null;
    training_type: string;
  };
  categoryId: string;
}

const NOTIFICATION_TYPES = [
  { 
    value: "event_added", 
    label: "Événement ajouté au calendrier",
    icon: CalendarPlus,
    defaultMessage: "Une nouvelle séance a été programmée. Merci de confirmer votre présence."
  },
  { 
    value: "schedule_changed", 
    label: "Horaire décalé",
    icon: Clock,
    defaultMessage: "Attention, l'horaire de la séance a été modifié. Veuillez prendre note du nouvel horaire."
  },
  { 
    value: "training_cancelled", 
    label: "Entraînement annulé",
    icon: XCircle,
    defaultMessage: "La séance d'entraînement a été annulée. Nous vous tiendrons informés de la reprogrammation."
  },
  { 
    value: "appointment_cancelled", 
    label: "RDV annulé",
    icon: XCircle,
    defaultMessage: "Le rendez-vous a été annulé. Nous vous tiendrons informés de la reprogrammation."
  },
];

export function SessionNotifyDialog({
  open,
  onOpenChange,
  session,
  categoryId,
}: SessionNotifyDialogProps) {
  const [notificationType, setNotificationType] = useState("event_added");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);

  // Fetch players associated with this session (from training_attendance, fallback to category)
  const { data: sessionPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["session-players-notify", session.id],
    queryFn: async () => {
      console.log(`[SessionNotification] Step 1 — Fetching participants for session ${session.id}`);

      // Primary source: training_attendance (non-absent players)
      const { data: attendance, error: attendanceError } = await supabase
        .from("training_attendance")
        .select("player_id, status")
        .eq("training_session_id", session.id)
        .neq("status", "absent");

      if (attendanceError) {
        console.warn("[SessionNotification] training_attendance error:", attendanceError.message);
      }

      if (attendance && attendance.length > 0) {
        const playerIds = attendance.map(a => a.player_id).filter(Boolean);
        console.log(`[SessionNotification] Step 1 — Retrieved ${playerIds.length} participant(s) from training_attendance`);

        const { data: players, error: playersError } = await supabase
          .from("players")
          .select("id, name, email, phone, user_id")
          .in("id", playerIds);

        if (playersError) throw playersError;

        const withAccount = (players || []).filter(p => p.user_id);
        console.log(`[SessionNotification] Step 1 — ${withAccount.length}/${(players || []).length} player(s) have an app account (user_id)`);

        return { players: players || [], fromSession: true };
      }

      // Fallback: all category players
      console.log("[SessionNotification] Step 1 — No attendance records found, falling back to all category players");
      const { data: allPlayers, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone, user_id")
        .eq("category_id", categoryId);

      if (playersError) throw playersError;
      console.log(`[SessionNotification] Step 1 — Retrieved ${(allPlayers || []).length} player(s) from category (fallback)`);
      return { players: allPlayers || [], fromSession: false };
    },
    enabled: open,
  });

  const athletes = sessionPlayers?.players || [];
  const athletesWithEmail = athletes.filter((a: any) => a.email).length;
  const athletesWithPhone = athletes.filter((a: any) => a.phone).length;
  const athletesWithPush = athletes.filter((a: any) => a.user_id).length;

  const selectedType = NOTIFICATION_TYPES.find(t => t.value === notificationType);
  const finalMessage = message || selectedType?.defaultMessage || "";

  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!sendEmail && !sendPush) {
        throw new Error("Veuillez sélectionner au moins un canal de notification");
      }

      const results: { emailsSent: number; pushSent: number } = { emailsSent: 0, pushSent: 0 };
      const eventDetails = {
        date: format(new Date(session.session_date), "EEEE d MMMM yyyy", { locale: fr }),
        time: session.session_start_time ? session.session_start_time.substring(0, 5) : undefined,
      };

      // ── Step 2: Send push via include_external_user_ids (P1 — precise targeting) ──
      if (sendPush) {
        // Collect user_ids of players with an app account
        const targetUserIds = athletes
          .map((a: any) => a.user_id)
          .filter(Boolean) as string[];

        console.log(`[SessionNotification] Step 2 — ${targetUserIds.length} player(s) with app account (external_id targets)`);
        console.log(`[SessionNotification] Step 2 — Session: ${session.id} | Type: ${notificationType}`);

        const pushBody: Record<string, unknown> = {
          title: selectedType?.label || "Notification",
          message: finalMessage,
          channels: ["push"],
          event_type: "session",
          session_id: session.id,
          event_details: eventDetails,
        };

        if (targetUserIds.length > 0) {
          // P1 — precise: include_external_user_ids via target_user_ids
          pushBody.target_user_ids = targetUserIds;
          console.log(`[SessionNotification] Step 2 — Mode P1: include_external_user_ids → [${targetUserIds.join(", ")}]`);
        } else {
          // P2 fallback broadcast: category broadcast
          pushBody.category_ids = [categoryId];
          pushBody.roles = ["player"];
          console.warn("[SessionNotification] Step 2 — No user_id found → fallback P2 category broadcast");
        }

        const { data: pushData, error: pushError } = await supabase.functions.invoke("send-targeted-notification", {
          body: pushBody,
        });

        if (pushError) {
          console.error("[SessionNotification] Step 2 — ❌ Push error:", pushError.message);
        } else if (pushData) {
          results.pushSent = pushData.pushSent || 0;
          console.log(`[SessionNotification] Step 2 — ✅ Push sent to ${results.pushSent} device(s). Mode: ${pushData.mode}`);
          if (pushData.errors?.length > 0) {
            console.warn(`[SessionNotification] Step 3 — Errors: ${pushData.errors.length}`, pushData.errors);
          } else {
            console.log(`[SessionNotification] Step 3 — Errors: 0`);
          }
        }
      }

      // Send email via individual notification
      if (sendEmail) {
        const athletesToNotify = athletes.filter((a) => a.email);

        if (athletesToNotify.length > 0) {
          const { data, error } = await supabase.functions.invoke("notify-athletes", {
            body: {
              athletes: athletesToNotify.map((a) => ({
                name: a.name,
                email: a.email,
              })),
              subject: selectedType?.label || "Notification",
              message: finalMessage,
              channels: ["email"],
              eventType: "session",
              eventDetails,
            },
          });

          if (!error && data) {
            results.emailsSent = data.emailsSent || 0;
          }
        }
      }

      return results;
    },
    onSuccess: (data) => {
      const parts = [];
      if (data.emailsSent > 0) parts.push(`${data.emailsSent} email(s)`);
      if (data.pushSent > 0) parts.push(`${data.pushSent} push`);
      
      toast.success(`Notifications envoyées : ${parts.join(", ") || "aucune"}`);
      onOpenChange(false);
      setMessage("");
      setNotificationType("event_added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi des notifications");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendNotification.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Notifier les athlètes
          </DialogTitle>
          <DialogDescription>
            Séance: {getTrainingTypeLabel(session.training_type)} - {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Athletes summary */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{athletes.length}</strong> athlète(s)
              {sessionPlayers?.fromSession ? " (inscrits à la séance)" : " (tous)"} •{" "}
              <span className="text-muted-foreground">{athletesWithEmail} avec email</span>
              {" • "}
              <span className="text-muted-foreground">{athletesWithPush} avec push</span>
            </span>
          </div>

          {/* Notification type */}
          <div className="space-y-3">
            <Label>Type de notification</Label>
            <RadioGroup value={notificationType} onValueChange={setNotificationType} className="space-y-2">
              {NOTIFICATION_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      notificationType === type.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{type.label}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Notification channels */}
          <div className="space-y-3">
            <Label>Canaux de notification</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  disabled={athletesWithEmail === 0}
                />
                <label
                  htmlFor="sendEmail"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Mail className="h-4 w-4" />
                  Email
                  <Badge variant="secondary" className="text-xs">
                    {athletesWithEmail}
                  </Badge>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendPush"
                  checked={sendPush}
                  onCheckedChange={(checked) => setSendPush(checked as boolean)}
                />
                <label
                  htmlFor="sendPush"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  Push
                  <Badge variant="secondary" className="text-xs">
                    {athletesWithPush}
                  </Badge>
                </label>
              </div>
            </div>
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={selectedType?.defaultMessage}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour utiliser le message par défaut
            </p>
          </div>

          {/* Event details preview */}
          <div className="p-3 bg-accent/20 rounded-lg text-sm space-y-1">
            <p className="font-medium text-muted-foreground">Détails inclus automatiquement :</p>
            <p>📅 {format(new Date(session.session_date), "EEEE d MMMM yyyy", { locale: fr })}</p>
            {session.session_start_time && <p>🕐 {session.session_start_time.substring(0, 5)}</p>}
          </div>
          </div>{/* end scrollable area */}

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={sendNotification.isPending || (!sendEmail && !sendPush) || loadingPlayers}
            >
              {sendNotification.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
