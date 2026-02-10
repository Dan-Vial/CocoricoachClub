import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { Mail, Phone, Send, Loader2, Users, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Athlete {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface NotifyAthletesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: Athlete[];
  eventType: "session" | "match" | "event" | "custom";
  defaultSubject?: string;
  eventDetails?: {
    date?: string;
    time?: string;
    location?: string;
  };
}

export function NotifyAthletesDialog({
  open,
  onOpenChange,
  athletes,
  eventType,
  defaultSubject = "",
  eventDetails,
}: NotifyAthletesDialogProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  // Count athletes with email/phone
  const athletesWithEmail = athletes.filter((a) => a.email).length;
  const athletesWithPhone = athletes.filter((a) => a.phone).length;

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
          subject,
          message,
          channels,
          eventType,
          eventDetails,
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
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi des notifications");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Veuillez remplir le sujet et le message");
      return;
    }
    sendNotification.mutate();
  };

  // Update subject when dialog opens
  useState(() => {
    if (open && defaultSubject) {
      setSubject(defaultSubject);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Notifier les athlètes
          </DialogTitle>
          <DialogDescription>
            Envoyez une notification aux {athletes.length} athlète(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Athletes summary */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{athletes.length}</strong> athlète(s) • 
              <span className="text-muted-foreground"> {athletesWithEmail} avec email, {athletesWithPhone} avec téléphone</span>
            </span>
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
            {!sendEmail && !sendSms && !sendPush && (
              <p className="text-sm text-destructive">
                Sélectionnez au moins un canal
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet *</Label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Rappel entraînement demain"
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message aux athlètes..."
              rows={4}
              required
            />
          </div>

          {/* Event details preview */}
          {eventDetails && (eventDetails.date || eventDetails.time || eventDetails.location) && (
            <div className="p-3 bg-accent/20 rounded-lg text-sm space-y-1">
              <p className="font-medium text-muted-foreground">Détails inclus automatiquement :</p>
              {eventDetails.date && <p>📅 {eventDetails.date}</p>}
              {eventDetails.time && <p>🕐 {eventDetails.time}</p>}
              {eventDetails.location && <p>📍 {eventDetails.location}</p>}
            </div>
          )}

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
              disabled={sendNotification.isPending || (!sendEmail && !sendSms && !sendPush)}
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
