// Shared helper to filter users according to their notification preferences.
// Returns separate sets of user_ids for email vs push channels for a given event type.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type NotificationCategory =
  | "sessions"
  | "matches"
  | "convocations"
  | "wellness_reminder"
  | "rpe_reminder"
  | "injuries"
  | "messages"
  | "tests";

interface PrefRow {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  push_sessions: boolean;
  push_matches: boolean;
  push_wellness_reminder: boolean;
  push_rpe_reminder: boolean;
  push_injuries: boolean;
  push_messages: boolean;
  push_convocations: boolean;
  email_sessions: boolean;
  email_matches: boolean;
  email_wellness_reminder: boolean;
  email_rpe_reminder: boolean;
  email_convocations: boolean;
}

const PUSH_KEYS: Record<NotificationCategory, keyof PrefRow | null> = {
  sessions: "push_sessions",
  matches: "push_matches",
  convocations: "push_convocations",
  wellness_reminder: "push_wellness_reminder",
  rpe_reminder: "push_rpe_reminder",
  injuries: "push_injuries",
  messages: "push_messages",
  tests: "push_rpe_reminder", // re-use RPE-style toggle for test reminders
};

const EMAIL_KEYS: Record<NotificationCategory, keyof PrefRow | null> = {
  sessions: "email_sessions",
  matches: "email_matches",
  convocations: "email_convocations",
  wellness_reminder: "email_wellness_reminder",
  rpe_reminder: "email_rpe_reminder",
  injuries: null, // no email by default for injuries (not in UI)
  messages: null, // no email for messages
  tests: "email_rpe_reminder",
};

/**
 * Given a Supabase service client, a list of candidate user_ids and a category,
 * returns the subset that opted-in for push and the subset that opted-in for email.
 * Users without a row default to "opt-in" (DEFAULT_PREFERENCES on the UI side).
 */
export async function filterByPreferences(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  category: NotificationCategory
): Promise<{ pushUserIds: string[]; emailUserIds: string[] }> {
  if (!userIds.length) return { pushUserIds: [], emailUserIds: [] };

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .in("user_id", userIds);

  if (error) {
    console.error("[notification-preferences] fetch error", error);
    // Fail-open: keep all (legacy behaviour)
    return { pushUserIds: [...userIds], emailUserIds: [...userIds] };
  }

  const prefByUser = new Map<string, PrefRow>();
  for (const row of (data ?? []) as unknown as PrefRow[]) {
    prefByUser.set(row.user_id, row);
  }

  const pushKey = PUSH_KEYS[category];
  const emailKey = EMAIL_KEYS[category];

  const pushUserIds: string[] = [];
  const emailUserIds: string[] = [];

  for (const uid of userIds) {
    const p = prefByUser.get(uid);
    // Default opt-in if no row
    const pushOk =
      !p ||
      (p.push_enabled && (pushKey ? Boolean(p[pushKey]) : true));
    const emailOk =
      !p ||
      (p.email_enabled && (emailKey ? Boolean(p[emailKey]) : true));

    if (pushOk) pushUserIds.push(uid);
    if (emailOk && emailKey) emailUserIds.push(uid);
  }

  return { pushUserIds, emailUserIds };
}
