import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type SessionNotificationAction = "created" | "updated" | "cancelled";

interface SessionNotificationPayload {
  action: SessionNotificationAction;
  sessionId?: string;
  categoryId: string;
  clubId?: string;
  sessionDate: string;
  sessionStartTime?: string | null;
  sessionType?: string;
  location?: string | null;
  /**
   * Specific player IDs to notify.
   * If undefined/empty, the hook auto-fetches participants from training_attendance,
   * then falls back to all category players with a user account.
   */
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
 * Tags each participant in OneSignal BEFORE sending the push.
 * Tags written per player:
 *   participates_training_<session_id> = "true"  → precise per-session filter
 *   role                               = "athlete"
 *   club_id                            = <club_id>
 */
async function tagSessionParticipants(
  sessionId: string,
  playerIds: string[],
  clubId?: string,
  action: "add" | "remove" = "add"
): Promise<{ tagged: number; skipped: number; errors: string[] }> {
  if (!sessionId || playerIds.length === 0) {
    return { tagged: 0, skipped: 0, errors: [] };
  }

  console.log(
    `[SessionNotification] Step 1 — Tagging ${playerIds.length} player(s) for session ${sessionId} (action=${action})`
  );

  try {
    const { data, error } = await supabase.functions.invoke("tag-session-participants", {
      body: {
        session_id: sessionId,
        player_ids: playerIds,
        club_id: clubId,
        action,
      },
    });

    if (error) {
      console.error("[SessionNotification] tag-session-participants error:", error);
      return { tagged: 0, skipped: playerIds.length, errors: [error.message] };
    }

    const result = {
      tagged: data?.tagged ?? 0,
      skipped: data?.skipped ?? 0,
      errors: data?.errors ?? [],
    };

    console.log(
      `[SessionNotification] Tagging done — tagged: ${result.tagged} | skipped: ${result.skipped} | errors: ${result.errors.length}`
    );

    if (result.skipped > 0) {
      console.warn(
        `[SessionNotification] ${result.skipped} player(s) skipped (no user account / not subscribed to OneSignal yet)`
      );
    }

    if (result.errors.length > 0) {
      console.error("[SessionNotification] Tagging errors:", result.errors);
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SessionNotification] Failed to tag participants:", msg);
    return { tagged: 0, skipped: playerIds.length, errors: [msg] };
  }
}

/**
 * Auto-fetch participant player IDs for a session.
 *
 * Priority order:
 *   1. training_attendance records (non-absent) for this session → most precise
 *   2. All players of the category who have a user account → fallback
 *
 * Returns an empty array if nothing found.
 */
async function fetchSessionParticipants(
  sessionId: string,
  categoryId: string
): Promise<string[]> {
  try {
    // 1. Check training_attendance (explicit registrations)
    const { data: attendance } = await supabase
      .from("training_attendance")
      .select("player_id")
      .eq("training_session_id", sessionId)
      .neq("status", "absent");

    if (attendance && attendance.length > 0) {
      const ids = attendance.map((a) => a.player_id).filter(Boolean) as string[];
      console.log(
        `[SessionNotification] Auto-fetched ${ids.length} attendees from training_attendance`
      );
      return ids;
    }

    // 2. Fallback: all category players with an account
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("category_id", categoryId)
      .not("user_id", "is", null);

    if (players && players.length > 0) {
      const ids = players.map((p) => p.id);
      console.log(
        `[SessionNotification] Auto-fetched ${ids.length} category players with accounts (fallback)`
      );
      return ids;
    }
  } catch (err) {
    console.error("[SessionNotification] Failed to auto-fetch participants:", err);
  }

  return [];
}

/**
 * Hook centralisé pour déclencher les notifications push OneSignal
 * lors des actions sur les séances d'entraînement.
 *
 * Flux complet :
 *   Step 0 — Auto-fetch clubId & participants from DB if not provided
 *   Step 1 — Tag participants: participates_training_<session_id> = "true"
 *   Step 2 — Send push via P0 filter (tag) or P2 broadcast (category)
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
      } = payload;

      // Mutable: may be enriched from DB
      let { clubId, participantPlayerIds } = payload;

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

      // ── Step 0a: Auto-fetch clubId if missing ──────────────────────────────
      if (!clubId && categoryId) {
        try {
          const { data: cat } = await supabase
            .from("categories")
            .select("club_id")
            .eq("id", categoryId)
            .single();
          if (cat?.club_id) {
            clubId = cat.club_id;
            console.log(`[SessionNotification] Auto-fetched clubId: ${clubId}`);
          }
        } catch {
          // silent
        }
      }

      // ── Step 0b: Auto-fetch participants if not provided ───────────────────
      if ((!participantPlayerIds || participantPlayerIds.length === 0) && sessionId) {
        participantPlayerIds = await fetchSessionParticipants(sessionId, categoryId);
      }

      const hasSpecificPlayers = participantPlayerIds && participantPlayerIds.length > 0;

      console.log(`[SessionNotification] ─── Notification "${action}" ─────────────────────`);
      console.log(`[SessionNotification] Session ID: ${sessionId ?? "N/A"}`);
      console.log(`[SessionNotification] Category ID: ${categoryId}`);
      console.log(`[SessionNotification] Club ID: ${clubId ?? "N/A"}`);
      console.log(
        `[SessionNotification] Players: ${hasSpecificPlayers ? participantPlayerIds!.length : "none found → broadcast"}`
      );
      console.log(`[SessionNotification] Title: ${title}`);
      console.log(`[SessionNotification] Message: ${message}`);

      // ── Step 1: Tag participants ───────────────────────────────────────────
      let tagResult = { tagged: 0, skipped: 0, errors: [] as string[] };

      if (hasSpecificPlayers && sessionId) {
        if (action === "cancelled") {
          console.log("[SessionNotification] Step 1 — Removing participation tags (cancellation)");
          tagResult = await tagSessionParticipants(sessionId, participantPlayerIds!, clubId, "remove");
        } else {
          console.log("[SessionNotification] Step 1 — Adding participation tags");
          tagResult = await tagSessionParticipants(sessionId, participantPlayerIds!, clubId, "add");
        }
        console.log(
          `[SessionNotification] Step 1 done — ${tagResult.tagged} tagged, ${tagResult.skipped} skipped, ${tagResult.errors.length} error(s)`
        );
      } else {
        console.log("[SessionNotification] Step 1 — Skipped (no players found)");
      }

      // ── Step 2: Build push payload ────────────────────────────────────────
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

      let mode: string;

      if (hasSpecificPlayers && sessionId) {
        // P0 — per-session participant tag filter
        requestBody.training_session_id = sessionId;
        mode = `P0 (participates_training_${sessionId})`;
      } else {
        // P2 — broadcast to entire category
        requestBody.category_ids = [categoryId];
        if (clubId) requestBody.club_id = clubId;
        mode = `P2 (broadcast category ${categoryId})`;
      }

      console.log(`[SessionNotification] Step 2 — Mode: ${mode}`);

      // ── Step 3: Send notification ─────────────────────────────────────────
      console.log(`[SessionNotification] Step 3 — Sending push via ${mode}...`);

      try {
        const { data, error } = await supabase.functions.invoke(
          "send-targeted-notification",
          { body: requestBody }
        );

        if (error) {
          console.error("[SessionNotification] ❌ Edge function error:", error);
          return;
        }

        console.log("[SessionNotification] Step 3 — OneSignal API response:", data);

        if (data?.errors?.length > 0) {
          console.warn("[SessionNotification] ⚠️  Partial errors:", data.errors);
        }

        const pushSent = data?.pushSent ?? 0;
        const responseMode = data?.mode ?? "unknown";

        console.log(`[SessionNotification] ─── Summary ──────────────────────────────────────`);
        console.log(`[SessionNotification] Tagging — tagged: ${tagResult.tagged} | skipped: ${tagResult.skipped}`);
        console.log(`[SessionNotification] Push — mode: ${responseMode} | devices reached: ${pushSent}`);
        console.log(`[SessionNotification] Errors — tagging: ${tagResult.errors.length} | push: ${data?.errors?.length ?? 0}`);

        if (pushSent === 0) {
          console.warn(
            `[SessionNotification] ⚠️  0 push envoyés.\n` +
            `  • tagged=${tagResult.tagged} skipped=${tagResult.skipped}\n` +
            `  • Les joueurs doivent ouvrir l'app et accepter les notifications push.`
          );
        } else {
          console.log(`[SessionNotification] ✅ Push envoyé à ${pushSent} appareil(s)`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[SessionNotification] ❌ Failed to send notification:", msg);
      }
    },
    []
  );

  return { notify };
}
