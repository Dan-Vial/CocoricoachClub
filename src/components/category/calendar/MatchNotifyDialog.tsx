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
import { toast } from "sonner";
import { Mail, Phone, Send, Loader2, Users, Trophy, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface MatchNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    match_date: string;
    match_time: string | null;
    opponent: string;
    location: string | null;
  };
  categoryId: string;
  sportType?: string;
}

export function MatchNotifyDialog({
  open,
  onOpenChange,
  match,
  categoryId,
  sportType,
}: MatchNotifyDialogProps) {
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  const isIndividual = isIndividualSport(sportType || "");

  // Fetch players in match lineup or convocation
  const { data: matchPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["match-players-notify", match.id],
    queryFn: async () => {
      // First try to get from match_lineups
      const { data: lineup, error: lineupError } = await supabase
        .from("match_lineups")
        .select("player_id")
        .eq("match_id", match.id);
      
      if (lineupError) throw lineupError;
      
      let playerIds: string[] = [];
      
      if (lineup && lineup.length > 0) {
        playerIds = lineup.map(l => l.player_id);
      } else {
        // Try to get from convocation_recipients
        const { data: convocations } = await supabase
          .from("convocations")
          .select("id")
          .eq("match_id", match.id)
          .single();
        
        if (convocations) {
          const { data: recipients } = await supabase
            .from("convocation_recipients")
            .select("player_id")
            .eq("convocation_id", convocations.id);
          
          if (recipients && recipients.length > 0) {
            playerIds = recipients.map(r => r.player_id);
          }
        }
      }
      
      if (playerIds.length === 0) {
        // Fallback: get all players from category
        const { data: allPlayers, error: playersError } = await supabase
          .from("players")
          .select("id, name, email, phone")
          .eq("category_id", categoryId);
        
        if (playersError) throw playersError;
        return { players: allPlayers || [], fromMatch: false };
      }
      
      // Get player details
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, email, phone")
        .in("id", playerIds);
      
      if (playersError) throw playersError;
      return { players: players || [], fromMatch: true };
    },
    enabled: open,
  });

  const athletes = matchPlayers?.players || [];
  const athletesWithEmail = athletes.filter((a) => a.email).length;
  const athletesWithPhone = athletes.filter((a) => a.phone).length;

  const defaultMessage = isIndividual 
    ? "Vous êtes convoqué(e) pour la compétition. Merci de confirmer votre présence."
    : `Vous êtes convoqué(e) pour le match contre ${match.opponent}. Merci de confirmer votre présence.`;

  const finalMessage = message || defaultMessage;

  const sendNotification = useMutation({
    mutationFn: async () => {
      const channels: ("email" | "sms" | "push")[] = [];
      if (sendEmail) channels.push("email");
      if (sendSms) channels.push("sms");
      if (sendPush) channels.push("push");

      if (channels.length === 0) {
        throw new Error("Veuillez sélectionner au moins un canal de notification");
      }

      const results: { emailsSent: number; smsSent: number; pushSent: number } = { emailsSent: 0, smsSent: 0, pushSent: 0 };
      const subject = isIndividual ? "Convocation compétition" : `Convocation match vs ${match.opponent}`;
      const eventDetails = {
        date: format(new Date(match.match_date), "EEEE d MMMM yyyy", { locale: fr }),
        time: match.match_time ? match.match_time.substring(0, 5) : undefined,
        location: match.location || undefined,
      };

      // Send push via targeted notification (by category)
      if (sendPush) {
        const { data: pushData, error: pushError } = await supabase.functions.invoke("send-targeted-notification", {
          body: {
            title: subject,
            message: finalMessage,
            category_ids: [categoryId],
            roles: ["player"],
            channels: ["push"],
            event_type: "match",
            event_details: eventDetails,
          },
        });
        if (!pushError && pushData) results.pushSent = pushData.pushSent || 0;
      }

      // Send email/SMS via individual notification
      if (sendEmail || sendSms) {
        const athletesToNotify = athletes.filter((a) => {
          if (sendEmail && a.email) return true;
          if (sendSms && a.phone) return true;
          return false;
        });

        if (athletesToNotify.length > 0) {
          const individualChannels: ("email" | "sms")[] = [];
          if (sendEmail) individualChannels.push("email");
          if (sendSms) individualChannels.push("sms");

          const { data, error } = await supabase.functions.invoke("notify-athletes", {
            body: {
              athletes: athletesToNotify.map((a) => ({
                name: a.name,
                email: a.email,
                phone: a.phone,
              })),
              subject,
              message: finalMessage,
              channels: individualChannels,
              eventType: "match",
              eventDetails,
            },
          });

          if (!error && data) {
            results.emailsSent = data.emailsSent || 0;
            results.smsSent = data.smsSent || 0;
          }
        }
      }

      return results;
    },
    onSuccess: (data) => {
      const parts = [];
      if (data.emailsSent > 0) parts.push(`${data.emailsSent} email(s)`);
      if (data.smsSent > 0) parts.push(`${data.smsSent} SMS`);
      if (data.pushSent > 0) parts.push(`${data.pushSent} push`);
      
      toast.success(`Convocations envoyées : ${parts.join(", ") || "aucune"}`);
      onOpenChange(false);
      setMessage("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi des convocations");
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
            <Trophy className="h-5 w-5" />
            Notification de convocation
          </DialogTitle>
          <DialogDescription>
            {isIndividual ? "Compétition" : `Match vs ${match.opponent}`} - {format(new Date(match.match_date), "d MMMM yyyy", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Athletes summary */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{athletes.length}</strong> athlète(s) 
              {matchPlayers?.fromMatch ? " (convoqués)" : " (tous)"} • 
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
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultMessage}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour utiliser le message par défaut
            </p>
          </div>

          {/* Event details preview */}
          <div className="p-3 bg-accent/20 rounded-lg text-sm space-y-1">
            <p className="font-medium text-muted-foreground">Détails inclus automatiquement :</p>
            <p>📅 {format(new Date(match.match_date), "EEEE d MMMM yyyy", { locale: fr })}</p>
            {match.match_time && <p>🕐 {match.match_time.substring(0, 5)}</p>}
            {match.location && <p>📍 {match.location}</p>}
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
                  Envoyer convocation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
