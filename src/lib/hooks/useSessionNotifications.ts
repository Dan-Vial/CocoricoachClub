import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type SessionNotificationAction = "created" | "updated" | "cancelled";

interface SessionNotificationPayload {
  action: SessionNotificationAction;
  sessionId?: string;
  categoryId: string;
  sessionDate: string;
  sessionStartTime?: string | null;
  sessionType?: string;
  location?: string | null;
  participantPlayerIds?: string[]; // specific players to notify (undefined = all category members)
}

const ACTION_LABELS: Record<SessionNotificationAction, string> = {
  created: "Nouvelle séance",
  updated: "Séance modifiée",
  cancelled: "Séance annulée",
};

const ACTION_EMOJI: Record<SessionNotificationAction, string> = {
  created: "🏋️",
  updated: "✏️",
  cancelled: "❌",
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  physique: "Physique",
  technique: "Technique",
  tactique: "Tactique",
  match: "Match",
  gym: "Musculation",
  recup: "Récupération",
  video: "Analyse vidéo",
  autre: "Entraînement",
};

function getTypeLabel(type?: string): string {
  if (!type) return "Entraînement";
  return TRAINING_TYPE_LABELS[type] || type;
}

/**
 * Hook centralisé pour déclencher les notifications push OneSignal
 * lors des actions sur les séances d'entraînement.
 */
export function useSessionNotifications() {
  const notify = useCallback(
    async (payload: SessionNotificationPayload): Promise<void> => {
      const {
        action,
        sessionId,
        categoryId,
        sessionDate,
        sessionStartTime,
        sessionType,
        location,
        participantPlayerIds,
      } = payload;

      const emoji = ACTION_EMOJI[action];
      const label = ACTION_LABELS[action];
      const typeLabel = getTypeLabel(sessionType);

      // Format date nicely
      let dateLabel = sessionDate;
      try {
        dateLabel = format(new Date(sessionDate), "EEEE d MMMM", { locale: fr });
      } catch {
        // keep raw date
      }

      const title = `${emoji} ${label}`;
      let message = `${typeLabel} — ${dateLabel}`;
      if (sessionStartTime) message += ` à ${sessionStartTime.substring(0, 5)}`;
      if (action === "cancelled") message += "\nCette séance a été annulée.";

      // Build the URL to redirect after clicking the notification
      const url = `${window.location.origin}/`;

      // Resolve user IDs to notify
      // If specific participant player IDs are provided, resolve their user_ids
      let targetUserIds: string[] | undefined;

      if (participantPlayerIds && participantPlayerIds.length > 0) {
        try {
          const { data: players } = await supabase
            .from("players")
            .select("user_id")
            .in("id", participantPlayerIds)
            .not("user_id", "is", null);

          targetUserIds = players?.map((p) => p.user_id!).filter(Boolean) || [];
          console.log(
            `[SessionNotification] ${action} — ${targetUserIds.length} participant(s) avec compte:`,
            targetUserIds
          );
        } catch (err) {
          console.error("[SessionNotification] Error resolving participant user IDs:", err);
        }
      }

      // Fallback: target all category members
      if (!targetUserIds || targetUserIds.length === 0) {
        if (participantPlayerIds && participantPlayerIds.length > 0) {
          // Had participants but none linked to a user account — skip
          console.warn(
            "[SessionNotification] Aucun participant n'a de compte utilisateur actif (user_id). Notification non envoyée."
          );
          return;
        }
        // No specific players: target all category members via categoryId
        targetUserIds = undefined; // will use category_ids in the edge function
      }

      const requestBody: Record<string, unknown> = {
        title,
        message,
        url,
        channels: ["push"],
        event_type: "session",
        event_details: {
          date: dateLabel,
          ...(sessionStartTime ? { time: sessionStartTime.substring(0, 5) } : {}),
          ...(location ? { location } : {}),
        },
      };

      // Either target by user IDs or by category
      if (targetUserIds && targetUserIds.length > 0) {
        requestBody.target_user_ids = targetUserIds;
      } else {
        requestBody.category_ids = [categoryId];
      }

      // Add session ID as tag for analytics
      if (sessionId) {
        requestBody.session_id = sessionId;
      }

      console.log(`[SessionNotification] Sending push for "${action}":`, requestBody);

      try {
        const { data, error } = await supabase.functions.invoke(
          "send-targeted-notification",
          { body: requestBody }
        );

        if (error) {
          console.error("[SessionNotification] Edge function error:", error);
          throw error;
        }

        console.log("[SessionNotification] API response:", data);

        if (data?.errors?.length > 0) {
          console.warn("[SessionNotification] Partial errors:", data.errors);
        }

        const pushSent = data?.pushSent ?? 0;
        const targeted = data?.targetedUsers ?? 0;

        if (pushSent === 0 && targeted === 0) {
          console.warn(
            "[SessionNotification] Aucun utilisateur ciblé — vérifie les abonnements OneSignal."
          );
        } else {
          console.log(
            `[SessionNotification] ✅ Push envoyé à ${pushSent}/${targeted} utilisateur(s).`
          );
        }
      } catch (err) {
        // Never surface notification errors to the user — the session action succeeded
        console.error("[SessionNotification] Failed to send notification:", err);
      }
    },
    []
  );

  return { notify };
}
