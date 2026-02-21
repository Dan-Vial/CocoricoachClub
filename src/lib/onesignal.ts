/**
 * OneSignal integration for CocoriCoach PWA
 * Uses the classic OneSignal Web SDK (v1)
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

let isInitialized = false;

/** Safe check: does this browser support the Notification API? */
const hasNotificationAPI = () =>
  typeof window !== "undefined" && "Notification" in window;

/**
 * Initialize OneSignal SDK v16 (chargé via index.html avec OneSignalDeferred).
 * Attend que le SDK soit prêt avant de résoudre.
 */
export async function initOneSignal(): Promise<void> {
  if (isInitialized && window.OneSignal) return;
  if (typeof window === "undefined") return;

  // Attendre que window.OneSignal soit peuplé par OneSignalDeferred
  await new Promise<void>((resolve) => {
    let attempts = 0;
    const maxAttempts = 25; // 5s max (200ms * 25)
    const check = () => {
      attempts++;
      if (window.OneSignal && typeof window.OneSignal.login === "function") {
        isInitialized = true;
        console.log("[OneSignal] SDK v16 ready");
        resolve();
      } else if (attempts >= maxAttempts) {
        console.warn("[OneSignal] SDK not available after timeout — continuing without SDK");
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

/**
 * Trigger the OneSignal native push permission prompt (SDK v16).
 * Returns true if granted, false otherwise.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!hasNotificationAPI()) {
    console.warn("[OneSignal] Notifications not supported in this browser");
    return false;
  }
  if (window.Notification.permission === "granted") return true;
  if (window.Notification.permission === "denied") return false;

  try {
    await initOneSignal();
    if (window.OneSignal?.Notifications?.requestPermission) {
      await window.OneSignal.Notifications.requestPermission();
    } else if (window.OneSignal?.showNativePrompt) {
      await window.OneSignal.showNativePrompt();
    } else {
      await window.Notification.requestPermission();
    }
  } catch (err) {
    console.error("[OneSignal] Permission request error:", err);
    try {
      await window.Notification.requestPermission();
    } catch { /* ignore */ }
  }

  return hasNotificationAPI() && (window.Notification.permission as string) === "granted";
}

/**
 * Check current OneSignal push permission status.
 */
export function getOneSignalPermission(): NotificationPermission {
  if (!hasNotificationAPI()) return "default";
  return window.Notification.permission;
}

/**
 * Login user to OneSignal: set external_id, email and tags.
 * Also calls the server-side edge function to ensure tags are synced
 * even if the SDK is unavailable or blocked.
 */
export async function oneSignalLogin(
  userId: string,
  email: string,
  userTags: Record<string, string>
): Promise<void> {
  // ── Always sync server-side first (most reliable — works on any domain) ──
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const res = await supabase.functions.invoke("sync-onesignal-tags", {
      body: { user_id: userId },
    });
    if (res.error) {
      console.warn("[OneSignal] Server sync error:", res.error);
    } else {
      console.log("[OneSignal] Server sync OK:", res.data);
    }
  } catch (err) {
    console.warn("[OneSignal] Server sync failed:", err);
  }

  // ── SDK-side: link external_id and set tags in the browser ───────────────
  // This only works on the production domain (cocoricoachclub.com)
  if (typeof window === "undefined" || !window.OneSignal) return;

  const tags: Record<string, string> = {
    user_id: userId,
    email: email,
    ...userTags,
  };

  try {
    const OneSignal = window.OneSignal;

    // ── SDK v16+ API (preferred) ─────────────────────────────────────────────
    if (typeof OneSignal.login === "function") {
      await OneSignal.login(userId);
      console.log("[OneSignal] login() — external_id set:", userId);

      // Add email channel
      if (email && OneSignal.User?.addEmail) {
        try { OneSignal.User.addEmail(email); } catch { /* ignore */ }
      }

      // Add tags via User API (v16+)
      if (OneSignal.User?.addTags) {
        OneSignal.User.addTags(tags);
        console.log("[OneSignal] User.addTags() sent:", tags);
      } else if (OneSignal.User?.addTag) {
        for (const [key, value] of Object.entries(tags)) {
          OneSignal.User.addTag(key, value);
        }
      }
    } else {
      // ── Legacy SDK v1 API (fallback) ──────────────────────────────────────
      OneSignal.push(function () {
        OneSignal.setExternalUserId(userId);
        OneSignal.sendTags(tags);
      });
    }
  } catch (err) {
    console.warn("[OneSignal] SDK login error (expected on non-production domains):", err);
  }
}

/**
 * Logout user from OneSignal
 */
export async function oneSignalLogout(): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    const OneSignal = window.OneSignal;
    // SDK v16+ logout
    if (typeof OneSignal.logout === "function") {
      await OneSignal.logout();
      console.log("[OneSignal] logout() — user disconnected");
    } else {
      // Legacy fallback
      OneSignal.push(function () {
        OneSignal.removeExternalUserId();
        OneSignal.deleteTags([
          "user_id", "email", "club_ids", "category_ids",
          "role", "user_type", "is_super_admin",
        ]);
        console.log("[OneSignal] User logged out (legacy), tags cleared");
      });
    }
  } catch (err) {
    console.error("[OneSignal] Logout error:", err);
  }
}

/**
 * Update OneSignal tags (SDK v16)
 */
export async function updateOneSignalTags(
  tags: Record<string, string>
): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;
  try {
    if (window.OneSignal.User?.addTags) {
      window.OneSignal.User.addTags(tags);
      console.log("[OneSignal] User.addTags() updated:", tags);
    }
  } catch (err) {
    console.error("[OneSignal] Tag update error:", err);
  }
}

/**
 * Remove specific OneSignal tags (SDK v16)
 */
export async function removeOneSignalTags(tagKeys: string[]): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;
  try {
    if (window.OneSignal.User?.removeTags) {
      window.OneSignal.User.removeTags(tagKeys);
      console.log("[OneSignal] Tags removed:", tagKeys);
    }
  } catch (err) {
    console.error("[OneSignal] Tag removal error:", err);
  }
}

/**
 * Fetch user's club and category memberships and build tags (4 max pour plan gratuit)
 */
export async function buildUserTags(userId: string): Promise<Record<string, string>> {
  const tags: Record<string, string> = {};

  try {
    const [
      { data: clubMemberships },
      { data: ownedClubs },
      { data: categoryMemberships },
      { data: isSuperAdmin },
    ] = await Promise.all([
      supabase.from("club_members").select("club_id, role").eq("user_id", userId),
      supabase.from("clubs").select("id").eq("user_id", userId),
      supabase.from("category_members").select("category_id, role").eq("user_id", userId),
      supabase.rpc("is_super_admin", { _user_id: userId }),
    ]);

    // club_ids
    const allClubIds = new Set<string>();
    clubMemberships?.forEach((m) => allClubIds.add(m.club_id));
    ownedClubs?.forEach((c) => allClubIds.add(c.id));
    tags.club_ids = Array.from(allClubIds).join(",");

    // category_ids
    tags.category_ids = categoryMemberships?.map((m) => m.category_id).join(",") ?? "";

    // role
    const roles = new Set<string>();
    clubMemberships?.forEach((m) => roles.add(m.role));
    categoryMemberships?.forEach((m) => roles.add(m.role));
    if (ownedClubs && ownedClubs.length > 0) roles.add("admin");

    const roleHierarchy = ["admin", "coach", "physio", "doctor", "viewer", "athlete"];
    for (const r of roleHierarchy) {
      if (roles.has(r)) { tags.role = r; break; }
    }

    if (isSuperAdmin) tags.role = "super_admin";

    // user_type
    tags.user_type = roles.has("athlete") && roles.size === 1 ? "player" : "staff";
  } catch (err) {
    console.error("[OneSignal] Error building user tags:", err);
  }

  return tags;
}
