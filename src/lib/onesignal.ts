/**
 * OneSignal integration for CocoriCoach PWA
 * Uses the classic OneSignal Web SDK (v1)
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    OneSignal?: any;
  }
}

let isInitialized = false;

/** Safe check: does this browser support the Notification API? */
const hasNotificationAPI = () =>
  typeof window !== "undefined" && "Notification" in window;

/**
 * Initialize OneSignal SDK (already loaded via index.html)
 * Does NOT auto-prompt — permission is requested explicitly via UI components.
 */
export async function initOneSignal(): Promise<void> {
  if (isInitialized) return;
  if (typeof window === "undefined" || !window.OneSignal) return;
  isInitialized = true;
  console.log("[OneSignal] SDK ready");
}

/**
 * Trigger the OneSignal native push permission prompt.
 * Returns true if granted, false otherwise.
 * Has a 10s timeout to avoid infinite loading.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // If browser doesn't support notifications at all (e.g. iOS Safari < 16.4)
  if (!hasNotificationAPI()) {
    console.warn("[OneSignal] Notifications not supported in this browser");
    return false;
  }

  // If already granted, return immediately
  if (window.Notification.permission === "granted") return true;
  // If already denied, can't re-prompt
  if (window.Notification.permission === "denied") return false;

  return new Promise((resolve) => {
    // Safety timeout: resolve after 10s to avoid infinite loading
    const timeout = setTimeout(() => {
      console.warn("[OneSignal] Permission request timed out");
      resolve(hasNotificationAPI() && window.Notification.permission === "granted");
    }, 10000);

    const doRequest = async () => {
      try {
        if (window.OneSignal) {
          await window.OneSignal.showNativePrompt();
        } else {
          // Fallback: use native browser API
          const result = await window.Notification.requestPermission();
          clearTimeout(timeout);
          resolve(result === "granted");
          return;
        }
        clearTimeout(timeout);
        resolve(hasNotificationAPI() && window.Notification.permission === "granted");
      } catch (err) {
        console.error("[OneSignal] Permission request error:", err);
        clearTimeout(timeout);
        // Try native fallback
        try {
          if (hasNotificationAPI()) {
            const result = await window.Notification.requestPermission();
            resolve(result === "granted");
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        }
      }
    };

    if (window.OneSignal) {
      window.OneSignal.push(doRequest);
    } else {
      doRequest();
    }
  });
}

/**
 * Check current OneSignal push permission status.
 */
export function getOneSignalPermission(): NotificationPermission {
  if (!hasNotificationAPI()) return "default";
  return window.Notification.permission;
}

/**
 * Login user to OneSignal: set external_id and tags
 * Supports both SDK v16+ (OneSignal.login) and legacy v1 (setExternalUserId).
 */
export async function oneSignalLogin(
  userId: string,
  email: string,
  userTags: Record<string, string>
): Promise<void> {
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

      // Add tags via User API (v16+)
      if (OneSignal.User?.addTags) {
        OneSignal.User.addTags(tags);
        console.log("[OneSignal] User.addTags() sent:", tags);
      } else if (OneSignal.User?.addTag) {
        for (const [key, value] of Object.entries(tags)) {
          OneSignal.User.addTag(key, value);
        }
        console.log("[OneSignal] User.addTag() sent:", tags);
      }
    } else {
      // ── Legacy SDK v1 API (fallback) ─────────────────────────────────────────
      OneSignal.push(function () {
        OneSignal.setExternalUserId(userId);
        console.log("[OneSignal] setExternalUserId() — external_id set:", userId);
        OneSignal.sendTags(tags);
        console.log("[OneSignal] sendTags() sent:", tags);
      });
    }
  } catch (err) {
    console.error("[OneSignal] Login error:", err);
    // Last-resort fallback: try legacy push queue
    try {
      window.OneSignal!.push(function () {
        window.OneSignal!.setExternalUserId(userId);
        window.OneSignal!.sendTags(tags);
      });
    } catch {
      // Silently ignore
    }
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
 * Update OneSignal tags (supports both SDK v16+ and legacy v1)
 */
export async function updateOneSignalTags(
  tags: Record<string, string>
): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    const OneSignal = window.OneSignal;
    if (OneSignal.User?.addTags) {
      OneSignal.User.addTags(tags);
      console.log("[OneSignal] User.addTags() updated:", tags);
    } else if (OneSignal.User?.addTag) {
      for (const [key, value] of Object.entries(tags)) {
        OneSignal.User.addTag(key, value);
      }
      console.log("[OneSignal] User.addTag() updated:", tags);
    } else {
      // Legacy fallback
      OneSignal.push(function () {
        OneSignal.sendTags(tags);
        console.log("[OneSignal] sendTags() updated (legacy):", tags);
      });
    }
  } catch (err) {
    console.error("[OneSignal] Tag update error:", err);
  }
}

/**
 * Remove specific OneSignal tags
 */
export async function removeOneSignalTags(tagKeys: string[]): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    window.OneSignal.push(function () {
      window.OneSignal!.deleteTags(tagKeys);
      console.log("[OneSignal] Tags removed:", tagKeys);
    });
  } catch (err) {
    console.error("[OneSignal] Tag removal error:", err);
  }
}

/**
 * Fetch user's club and category memberships and build tags
 */
export async function buildUserTags(userId: string): Promise<Record<string, string>> {
  const tags: Record<string, string> = {};

  try {
    // Run all DB queries in parallel
    const [
      { data: clubMemberships },
      { data: ownedClubs },
      { data: categoryMemberships },
      { data: isSuperAdmin },
    ] = await Promise.all([
      supabase.from("club_members").select("club_id, role").eq("user_id", userId),
      supabase.from("clubs").select("id, name").eq("user_id", userId),
      supabase.from("category_members").select("category_id, role, categories(name)").eq("user_id", userId),
      supabase.rpc("is_super_admin", { _user_id: userId }),
    ]);

    // Build club_ids tag (comma-separated)
    const allClubIds = new Set<string>();
    const clubNames = new Set<string>();
    clubMemberships?.forEach((m) => allClubIds.add(m.club_id));
    ownedClubs?.forEach((c) => {
      allClubIds.add(c.id);
      clubNames.add(c.name);
    });

    if (allClubIds.size > 0) tags.club_ids = Array.from(allClubIds).join(",");
    if (clubNames.size > 0) tags.club_names = Array.from(clubNames).join(",");

    // Build category_ids and category_names tags
    if (categoryMemberships && categoryMemberships.length > 0) {
      tags.category_ids = categoryMemberships.map((m) => m.category_id).join(",");
      const catNames = categoryMemberships
        .map((m: any) => m.categories?.name)
        .filter(Boolean);
      if (catNames.length > 0) {
        tags.category_names = catNames.join(",");
        tags.team = catNames[0];
      }
    }

    // Determine primary role (highest privilege)
    const roles = new Set<string>();
    clubMemberships?.forEach((m) => roles.add(m.role));
    categoryMemberships?.forEach((m) => roles.add(m.role));
    if (ownedClubs && ownedClubs.length > 0) roles.add("admin");

    const roleHierarchy = ["admin", "coach", "physio", "doctor", "viewer", "athlete"];
    for (const r of roleHierarchy) {
      if (roles.has(r)) {
        tags.role = r;
        break;
      }
    }

    tags.user_type = roles.has("athlete") && roles.size === 1 ? "player" : "staff";
    tags.wellness_notifications = "true";
    tags.rpe_notifications = "true";

    if (isSuperAdmin) {
      tags.is_super_admin = "true";
      tags.role = "super_admin";
    }
  } catch (err) {
    console.error("[OneSignal] Error building user tags:", err);
  }

  return tags;
}
