import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  /** Specific player IDs to notify. undefined = all category members. */
  participantPlayerIds?: string[];
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
 * Tags each participant in OneSignal with "participates_training_<session_id>" = "true".
 * Runs silently — failures never block the UI.
 */
async function tagSessionParticipants(
  sessionId: string,
  playerIds: string[],
  action: "add" | "remove" = "add"
): Promise<void> {
  if (!sessionId || playerIds.length === 0) return;

  try {
    console.log(
      `[SessionNotification] Tagging ${playerIds.length} participant(s) for session ${sessionId} (action=${action})`
    );

    const { data, error } = await supabase.functions.invoke("tag-session-participants", {
      body: { session_id: sessionId, player_ids: playerIds, action },
    });

    if (error) {
      console.error("[SessionNotification] tag-session-participants error:", error);
      return;
    }

    console.log(
      `[SessionNotification] Tagging result — tagged: ${data?.tagged}, skipped: ${data?.skipped}, errors: ${data?.errors?.length ?? 0}`,
      data?.errors?.length ? data.errors : ""
    );
  } catch (err) {
    console.error("[SessionNotification] Failed to tag participants:", err);
  }
}

/**
 * Hook centralisé pour déclencher les notifications push OneSignal
 * lors des actions sur les séances d'entraînement.
 *
 * Flow (joueurs spécifiques) :
 *   1. Tag each player: participates_training_<session_id> = "true"
 *   2. Send push via filter: tag "participates_training_<session_id>" = "true"
 *
 * Flow (toute la catégorie) :
 *   1. Send push via category_ids filter
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

      // Format date
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

      const url = `${window.location.origin}/`;

      const hasSpecificPlayers =
        participantPlayerIds && participantPlayerIds.length > 0;

      // ── Step 1: Tag participants (only when specific players selected) ───────
      if (hasSpecificPlayers && sessionId && action !== "cancelled") {
        await tagSessionParticipants(sessionId, participantPlayerIds!);
      }

      // When cancelling, remove the participation tag so future notifications
      // don't accidentally reach them via old tags
      if (hasSpecificPlayers && sessionId && action === "cancelled") {
        tagSessionParticipants(sessionId, participantPlayerIds!, "remove").catch(() => {});
      }

      // ── Step 2: Build push payload ───────────────────────────────────────────
      const requestBody: Record<string, unknown> = {
        title,
        message,
        url,
        channels: ["push"],
        event_type: "session",
        session_id: sessionId,
        event_details: {
          date: dateLabel,
          ...(sessionStartTime ? { time: sessionStartTime.substring(0, 5) } : {}),
          ...(location ? { location } : {}),
        },
      };

      if (hasSpecificPlayers && sessionId) {
        // P0 — per-session participant tag filter (most precise)
        requestBody.training_session_id = sessionId;
        console.log(
          `[SessionNotification] ${action} — using participates_training_${sessionId} filter`
        );
      } else {
        // P2 — broadcast to entire category
        requestBody.category_ids = [categoryId];
        console.log(
          `[SessionNotification] ${action} — broadcasting to category ${categoryId}`
        );
      }

      console.log(`[SessionNotification] Sending push for "${action}":`, requestBody);

      // ── Step 3: Send notification ────────────────────────────────────────────
      try {
        const { data, error } = await supabase.functions.invoke(
          "send-targeted-notification",
          { body: requestBody }
        );

        if (error) {
          console.error("[SessionNotification] Edge function error:", error);
          return;
        }

        console.log("[SessionNotification] API response:", data);

        if (data?.errors?.length > 0) {
          console.warn("[SessionNotification] Partial errors:", data.errors);
        }

        const pushSent = data?.pushSent ?? 0;
        const mode = data?.mode ?? "unknown";

        if (pushSent === 0) {
          console.warn(
            `[SessionNotification] 0 push sent (mode=${mode}). ` +
            `Vérifier : tags OneSignal synchronisés, joueurs abonnés aux notifications.`
          );
        } else {
          console.log(
            `[SessionNotification] ✅ Push envoyé à ${pushSent} appareil(s) (mode=${mode}).`
          );
        }
      } catch (err) {
        // Never surface notification errors to the user
        console.error("[SessionNotification] Failed to send notification:", err);
      }
    },
    []
  );

  return { notify };
}
