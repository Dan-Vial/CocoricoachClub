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
import { Mail, Phone, Send, Loader2, Users, CalendarPlus, Clock, XCircle, Bell } from "lucide-react";
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
  const [sendSms, setSendSms] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  // Fetch players associated with this session (from awcr_tracking)
  const { data: sessionPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["session-players-notify", session.id],
    queryFn: async () => {
      // Get player IDs from awcr_tracking for this session
      const { data: tracking, error: trackingError } = await supabase
        .from("awcr_tracking")
        .select("player_id")
        .eq("training_session_id", session.id);
      
      if (trackingError) throw trackingError;
      
      if (!tracking || tracking.length === 0) {
        // If no players in tracking, get all players from category as fallback
        const { data: allPlayers, error: playersError } = await supabase
          .from("players")
          .select("id, name, email, phone")
          .eq("category_id", categoryId);
        
        if (playersError) throw playersError;
        return { players: allPlayers || [], fromSession: false };
      }
      
      const playerIds = tracking.map(t => t.player_id);
      
      // Get player details
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone")
        .in("id", playerIds);
      
      if (playersError) throw playersError;
      return { players: players || [], fromSession: true };
    },
    enabled: open,
  });

  const athletes = sessionPlayers?.players || [];
  const athletesWithEmail = athletes.filter((a) => a.email).length;
  const athletesWithPhone = athletes.filter((a) => a.phone).length;

  const selectedType = NOTIFICATION_TYPES.find(t => t.value === notificationType);
  const finalMessage = message || selectedType?.defaultMessage || "";

  const sendNotification = useMutation({
    mutationFn: async () => {
      const channels: ("email" | "sms" | "push")[] = [];
      if (sendEmail) channels.push("email");
      if (sendSms) channels.push("sms");
      if (sendPush) channels.push("push");

      if (channels.length === 0) {
        throw new Error("Veuillez sélectionner au moins un canal de notification");
      }

      const athletesToNotify = athletes.filter((a) => {
        if (sendEmail && a.email) return true;
        if (sendSms && a.phone) return true;
        return false;
      });

      if (athletesToNotify.length === 0) {
        throw new Error("Aucun athlète n'a les coordonnées requises pour la notification");
      }

      const { data, error } = await supabase.functions.invoke("notify-athletes", {
        body: {
          athletes: athletesToNotify.map((a) => ({
            name: a.name,
            email: a.email,
            phone: a.phone,
          })),
          subject: selectedType?.label || "Notification",
          message: finalMessage,
          channels,
          eventType: "session",
          eventDetails: {
            date: format(new Date(session.session_date), "EEEE d MMMM yyyy", { locale: fr }),
            time: session.session_start_time ? session.session_start_time.substring(0, 5) : undefined,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const parts = [];
      if (data.emailsSent > 0) parts.push(`${data.emailsSent} email(s)`);
      if (data.smsSent > 0) parts.push(`${data.smsSent} SMS`);
      if (data.pushSent > 0) parts.push(`${data.pushSent} push`);
      
      toast.success(`Notifications envoyées : ${parts.join(", ")}`);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Notifier les athlètes
          </DialogTitle>
          <DialogDescription>
            Séance: {getTrainingTypeLabel(session.training_type)} - {format(new Date(session.session_date), "d MMMM yyyy", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Athletes summary */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{athletes.length}</strong> athlète(s) 
              {sessionPlayers?.fromSession ? " (inscrits à la séance)" : " (tous)"} • 
              <span className="text-muted-foreground"> {athletesWithEmail} avec email, {athletesWithPhone} avec téléphone</span>
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
                  id="sendSms"
                  checked={sendSms}
                  onCheckedChange={(checked) => setSendSms(checked as boolean)}
                  disabled={athletesWithPhone === 0}
                />
                <label
                  htmlFor="sendSms"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                  SMS
                  <Badge variant="secondary" className="text-xs">
                    {athletesWithPhone}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={sendNotification.isPending || (!sendEmail && !sendSms && !sendPush) || loadingPlayers}
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
