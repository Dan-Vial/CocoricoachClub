import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TargetedNotificationRequest {
  title: string;
  message: string;
  url?: string;
  category_ids?: string[];
  roles?: string[];
  club_id?: string;
  target_user_ids?: string[];
  channels: ("push" | "email" | "sms")[];
  event_type?: "session" | "match" | "event" | "custom";
  session_id?: string;
  /** If set, sends ONLY to players tagged with participates_training_<training_session_id>.
   *  This is the most precise targeting — one tag per player per session. */
  training_session_id?: string;
  event_details?: { date?: string; time?: string; location?: string };
}

// Role map: friendly aliases → actual OneSignal tag role values
const ROLE_MAP: Record<string, string[]> = {
  player: ["athlete"],
  staff: ["admin", "coach", "physio", "doctor", "viewer", "prepa_physique", "administratif"],
};

function expandRoles(roles: string[]): string[] {
  return roles.flatMap((r) => ROLE_MAP[r] || [r]);
}

/**
 * Build OneSignal filter array from club_id / category_ids / roles tags.
 * Filter format: https://documentation.onesignal.com/reference/create-notification#send-to-users-based-on-filters
 *
 * Tag structure stored per user:
 *   - club_ids      : comma-separated string of club UUIDs
 *   - category_ids  : comma-separated string of category UUIDs
 *   - role          : single string (athlete | admin | coach | …)
 */
function buildTagFilters(
  club_id: string | undefined,
  category_ids: string[] | undefined,
  expandedRoles: string[]
): Record<string, unknown>[] {
  const locationFilters: Record<string, unknown>[] = [];

  if (club_id) {
    locationFilters.push({ field: "tag", key: "club_ids", relation: "=", value: club_id });
  }

  if (category_ids && category_ids.length > 0) {
    category_ids.forEach((cid, idx) => {
      if (idx > 0 || locationFilters.length > 0) {
        locationFilters.push({ operator: "OR" });
      }
      locationFilters.push({ field: "tag", key: "category_ids", relation: "=", value: cid });
    });
  }

  if (expandedRoles.length === 0 || locationFilters.length === 0) {
    return locationFilters;
  }

  // AND role filter(s) to location filters
  const roleFilters: Record<string, unknown>[] = [];
  expandedRoles.forEach((r, idx) => {
    if (idx > 0) roleFilters.push({ operator: "OR" });
    roleFilters.push({ field: "tag", key: "role", relation: "=", value: r });
  });

  return [...locationFilters, { operator: "AND" }, ...roleFilters];
}

function buildEmailHtml(
  title: string,
  message: string,
  eventDetails?: { date?: string; time?: string; location?: string }
): string {
  const eventInfo = eventDetails
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      ${eventDetails.date ? `<p style="margin:4px 0;"><strong>📅 Date:</strong> ${eventDetails.date}</p>` : ""}
      ${eventDetails.time ? `<p style="margin:4px 0;"><strong>🕐 Heure:</strong> ${eventDetails.time}</p>` : ""}
      ${eventDetails.location ? `<p style="margin:4px 0;"><strong>📍 Lieu:</strong> ${eventDetails.location}</p>` : ""}
    </div>`
    : "";

  return `<!DOCTYPE html><html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
      <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">🏉 CocoriCoach</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1f2937;margin:16px 0;">${title}</h2>
        <p style="color:#4b5563;line-height:1.6;white-space:pre-wrap;">${message}</p>
        ${eventInfo}
      </div>
      <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} CocoriCoach</p>
      </div>
    </div>
  </body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: TargetedNotificationRequest = await req.json();
    const {
      title, message, url,
      category_ids, roles, club_id, target_user_ids,
      channels, event_type, session_id, training_session_id, event_details,
    } = body;

    if (!title || !message) throw new Error("title and message are required");
    if (!channels || channels.length === 0) throw new Error("At least one channel is required");

    const expandedRoles = roles ? expandRoles(roles) : [];

    // ── Targeting strategy (priority order) ──────────────────────────────────
    //  P0 – training_session_id  → filter on tag "participates_training_<id>"
    //       Most precise: only players explicitly tagged for this session.
    //  P1 – target_user_ids      → include_aliases / external_id
    //  P2 – category_ids / club  → OneSignal tag filters (broadcast)

    let targetUserIds: string[] = [];
    let useTagFilters = false;
    let participatesFilter: string | null = null; // tag key for P0

    if (training_session_id) {
      // P0 — per-session participant tag filter
      participatesFilter = `participates_training_${training_session_id}`;
      useTagFilters = true;
      console.log(
        `[send-targeted-notification] Mode: participates_training filter — ` +
        `tag="${participatesFilter}"`
      );
    } else if (target_user_ids && target_user_ids.length > 0) {
      // P1 — explicit user IDs
      targetUserIds = [...new Set(target_user_ids)];
      console.log(`[send-targeted-notification] Mode: external_id — ${targetUserIds.length} user(s)`);
    } else if (category_ids?.length || club_id) {
      // P2 — category / club broadcast via tags
      useTagFilters = true;
      console.log(
        `[send-targeted-notification] Mode: tag filters — ` +
        `club_id=${club_id}, category_ids=${JSON.stringify(category_ids)}, roles=${JSON.stringify(expandedRoles)}`
      );
    } else {
      console.warn("[send-targeted-notification] No target specified — aborting.");
      return new Response(
        JSON.stringify({ success: true, sent: 0, targetedUsers: 0, message: "No target specified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { pushSent: 0, emailsSent: 0, smsSent: 0, errors: [] as string[] };

    // Build push message with event details appended
    let pushMessage = message;
    if (event_details?.date) pushMessage += `\n📅 ${event_details.date}`;
    if (event_details?.time) pushMessage += ` à ${event_details.time}`;
    if (event_details?.location) pushMessage += `\n📍 ${event_details.location}`;

    // ── PUSH ─────────────────────────────────────────────────────────────────
    if (channels.includes("push")) {
      try {
        const pushBody: Record<string, unknown> = {
          app_id: ONESIGNAL_APP_ID,
          target_channel: "push",
          headings: { en: title, fr: title },
          contents: { en: pushMessage, fr: pushMessage },
          name: `Targeted push: ${title}`,
          // Custom data payload — available in notification click handler
          data: {
            event_type: event_type || "custom",
            session_id: session_id || null,
            training_id: session_id || null,
            sent_at: new Date().toISOString(),
          },
        };

        if (url) {
          pushBody.url = url;
          pushBody.web_url = url;
        }

        if (useTagFilters) {
          let filters: Record<string, unknown>[];

          if (participatesFilter) {
            // P0 — per-session participant tag: most precise targeting
            // Filter: tag "participates_training_<session_id>" exists (= "true")
            filters = [
              { field: "tag", key: participatesFilter, relation: "=", value: "true" },
            ];
            console.log(
              `[send-targeted-notification] Push P0 filter (participates_training): ${participatesFilter}`
            );
          } else {
            // P2 — club/category broadcast
            filters = buildTagFilters(club_id, category_ids, expandedRoles);
            console.log("[send-targeted-notification] Push P2 filters:", JSON.stringify(filters));
          }

          if (filters.length === 0) {
            console.warn("[send-targeted-notification] No filters built — push skipped.");
          } else {
            pushBody.filters = filters;

            const res = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Key ${ONESIGNAL_REST_API_KEY}` },
              body: JSON.stringify(pushBody),
            });
            const json = await res.json();
            console.log("[send-targeted-notification] OneSignal response (tag-filter):", json);
            if (res.ok) {
              results.pushSent = json.recipients ?? 0;
              console.log(`[send-targeted-notification] ✅ Push sent to ${results.pushSent} device(s). ID: ${json.id}`);
            } else {
              console.error("[send-targeted-notification] ❌ Push error:", JSON.stringify(json));
              results.errors.push(`Push: ${JSON.stringify(json)}`);
            }
          }
        } else {
          // P1 — Exact external_id targeting
          pushBody.include_aliases = { external_id: targetUserIds };
          console.log("[send-targeted-notification] Push with external_ids:", targetUserIds);

          const res = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Key ${ONESIGNAL_REST_API_KEY}` },
            body: JSON.stringify(pushBody),
          });
          const json = await res.json();
          console.log("[send-targeted-notification] OneSignal response (external_id):", json);
          if (res.ok) {
            results.pushSent = json.recipients ?? targetUserIds.length;
            console.log(`[send-targeted-notification] ✅ Push sent to ${results.pushSent} device(s). ID: ${json.id}`);
          } else {
            console.error("[send-targeted-notification] ❌ Push error:", JSON.stringify(json));
            results.errors.push(`Push: ${JSON.stringify(json)}`);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[send-targeted-notification] Push exception:", msg);
        results.errors.push(`Push error: ${msg}`);
      }
    }

    // ── EMAIL (only when we have explicit user IDs — tag filters can't resolve emails) ──
    if (channels.includes("email") && targetUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", targetUserIds);

      const emails = profiles?.filter((p) => p.email).map((p) => p.email!) || [];

      if (emails.length > 0) {
        try {
          const emailHtml = buildEmailHtml(title, message, event_details);
          const res = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Key ${ONESIGNAL_REST_API_KEY}` },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_email_tokens: emails,
              email_subject: title,
              email_body: emailHtml,
              email_from_name: "CocoriCoach",
            }),
          });
          if (res.ok) {
            results.emailsSent = emails.length;
          } else {
            const err = await res.json();
            results.errors.push(`Email: ${JSON.stringify(err)}`);
          }
        } catch (e: unknown) {
          results.errors.push(`Email error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // ── SMS (only when we have explicit user IDs) ─────────────────────────────
    if (channels.includes("sms") && targetUserIds.length > 0) {
      const { data: players } = await supabase
        .from("players")
        .select("user_id, phone")
        .in("user_id", targetUserIds)
        .not("phone", "is", null);

      if (players && players.length > 0) {
        for (const player of players) {
          if (!player.phone) continue;
          let phone = player.phone.replace(/\s/g, "");
          if (!phone.startsWith("+")) {
            phone = phone.startsWith("0") ? "+33" + phone.substring(1) : "+" + phone;
          }

          let smsContent = `${title}\n${message}`;
          if (event_details?.date) smsContent += `\n📅 ${event_details.date}`;
          if (event_details?.location) smsContent += `\n📍 ${event_details.location}`;
          if (smsContent.length > 300) smsContent = smsContent.substring(0, 297) + "...";

          try {
            const res = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Key ${ONESIGNAL_REST_API_KEY}` },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_phone_numbers: [phone],
                sms_from: "CocoriCoach",
                contents: { en: smsContent },
              }),
            });
            if (res.ok) results.smsSent++;
            else {
              const err = await res.json();
              results.errors.push(`SMS ${phone}: ${JSON.stringify(err)}`);
            }
          } catch (e: unknown) {
            results.errors.push(`SMS ${phone}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    console.log("[send-targeted-notification] Results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        mode: useTagFilters ? "tag-filters" : "external_id",
        targetedUsers: useTagFilters ? "n/a (tag-filter)" : targetUserIds.length,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-targeted-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
