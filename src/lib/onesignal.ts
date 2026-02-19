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

/**
 * Initialize OneSignal SDK (already loaded via index.html)
 * Automatically requests push notification permission for all users.
 */
export async function initOneSignal(): Promise<void> {
  if (isInitialized) return;
  if (typeof window === "undefined" || !window.OneSignal) return;
  isInitialized = true;
  console.log("[OneSignal] SDK ready");

  // Automatically prompt for push notification permission if not yet decided
  try {
    window.OneSignal.push(function () {
      window.OneSignal.showNativePrompt();
    });
  } catch (err) {
    console.error("[OneSignal] Auto-prompt error:", err);
  }
}

/**
 * Login user to OneSignal: set external_id and tags
 */
export async function oneSignalLogin(
  userId: string,
  email: string,
  userTags: Record<string, string>
): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    const OneSignal = window.OneSignal;
    OneSignal.push(function () {
      // Set external user id
      OneSignal.setExternalUserId(userId);
      console.log("[OneSignal] External user ID set:", userId);

      // Send all tags
      const tags: Record<string, string> = {
        user_id: userId,
        email: email,
        ...userTags,
      };
      OneSignal.sendTags(tags);
      console.log("[OneSignal] Tags sent:", tags);
    });
  } catch (err) {
    console.error("[OneSignal] Login error:", err);
  }
}

/**
 * Logout user from OneSignal
 */
export async function oneSignalLogout(): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    const OneSignal = window.OneSignal;
    OneSignal.push(function () {
      OneSignal.removeExternalUserId();
      OneSignal.deleteTags([
        "user_id", "email", "club_ids", "category_ids",
        "role", "user_type", "is_super_admin",
      ]);
      console.log("[OneSignal] User logged out, tags cleared");
    });
  } catch (err) {
    console.error("[OneSignal] Logout error:", err);
  }
}

/**
 * Update OneSignal tags
 */
export async function updateOneSignalTags(
  tags: Record<string, string>
): Promise<void> {
  if (typeof window === "undefined" || !window.OneSignal) return;

  try {
    window.OneSignal.push(function () {
      window.OneSignal!.sendTags(tags);
      console.log("[OneSignal] Tags updated:", tags);
    });
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
    // Get club memberships
    const { data: clubMemberships } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", userId);

    // Get owned clubs with names
    const { data: ownedClubs } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("user_id", userId);

    // Get category memberships with category names
    const { data: categoryMemberships } = await supabase
      .from("category_members")
      .select("category_id, role, categories(name)")
      .eq("user_id", userId);

    // Build club_ids tag (comma-separated)
    const allClubIds = new Set<string>();
    const clubNames = new Set<string>();
    clubMemberships?.forEach((m) => allClubIds.add(m.club_id));
    ownedClubs?.forEach((c) => {
      allClubIds.add(c.id);
      clubNames.add(c.name);
    });

    if (allClubIds.size > 0) {
      tags.club_ids = Array.from(allClubIds).join(",");
    }
    if (clubNames.size > 0) {
      tags.club_names = Array.from(clubNames).join(",");
    }

    // Build category_ids and category_names tags
    if (categoryMemberships && categoryMemberships.length > 0) {
      tags.category_ids = categoryMemberships.map((m) => m.category_id).join(",");
      const catNames = categoryMemberships
        .map((m: any) => m.categories?.name)
        .filter(Boolean);
      if (catNames.length > 0) {
        tags.category_names = catNames.join(",");
        // Also set "team" tag for the first category (for simple filtering)
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

    // Determine user_type (player vs staff)
    tags.user_type = roles.has("athlete") && roles.size === 1 ? "player" : "staff";

    // Check super admin
    const { data: isSuperAdmin } = await supabase
      .rpc("is_super_admin", { _user_id: userId });
    if (isSuperAdmin) {
      tags.is_super_admin = "true";
      tags.role = "super_admin";
    }
  } catch (err) {
    console.error("[OneSignal] Error building user tags:", err);
  }

  return tags;
}
