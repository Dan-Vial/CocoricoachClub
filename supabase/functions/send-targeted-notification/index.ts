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
  url?: string; // Deep link URL
  category_ids?: string[]; // Target specific categories/teams
  roles?: string[]; // Target specific roles: "player", "staff", "admin", "coach", etc.
  club_id?: string; // Target specific club
  target_user_ids?: string[]; // Direct list of user IDs (highest priority)
  channels: ("push" | "email" | "sms")[];
  event_type?: "session" | "match" | "event" | "custom";
  session_id?: string; // for analytics/logging
  event_details?: {
    date?: string;
    time?: string;
    location?: string;
  };
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
    const { title, message, url, category_ids, roles, club_id, target_user_ids, channels, event_type, session_id, event_details } = body;

    if (!title || !message) {
      throw new Error("title and message are required");
    }

    if (!channels || channels.length === 0) {
      throw new Error("At least one channel is required");
    }

    console.log(`[send-targeted-notification] Action: event_type=${event_type}, session_id=${session_id}`);
    console.log(`[send-targeted-notification] Channels: ${channels.join(", ")}`);

    // Build list of target user IDs based on filters (priority order)
    let targetUserIds: string[] = [];

    // 1. Direct user IDs (highest priority — e.g. session participants)
    if (target_user_ids && target_user_ids.length > 0) {
      targetUserIds = [...target_user_ids];
      console.log(`[send-targeted-notification] Using direct target_user_ids: ${targetUserIds.length} users`);
    }
    // 2. Category-based targeting
    else if (category_ids && category_ids.length > 0) {
      const { data: catMembers } = await supabase
        .from("category_members")
        .select("user_id, role")
        .in("category_id", category_ids);

      if (catMembers) {
        let filtered = catMembers;
        if (roles && roles.length > 0) {
          const roleMap: Record<string, string[]> = {
            player: ["athlete"],
            staff: ["admin", "coach", "physio", "doctor", "viewer", "prepa_physique", "administratif"],
          };
          const expandedRoles = roles.flatMap((r) => roleMap[r] || [r]);
          filtered = filtered.filter((m) => expandedRoles.includes(m.role));
        }
        targetUserIds = filtered.map((m) => m.user_id);
        console.log(`[send-targeted-notification] Category targeting: ${targetUserIds.length} users from ${category_ids.length} category(ies)`);
      }
    }
    // 3. Club-based targeting
    else if (club_id) {
      const { data: clubMembers } = await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", club_id);

      const { data: club } = await supabase
        .from("clubs")
        .select("user_id")
        .eq("id", club_id)
        .single();

      const allMembers = [...(clubMembers || [])];
      if (club) allMembers.push({ user_id: club.user_id, role: "admin" });

      if (roles && roles.length > 0) {
        const roleMap: Record<string, string[]> = {
          player: ["athlete"],
          staff: ["admin", "coach", "physio", "doctor", "viewer", "prepa_physique", "administratif"],
        };
        const expandedRoles = roles.flatMap((r) => roleMap[r] || [r]);
        targetUserIds = allMembers.filter((m) => expandedRoles.includes(m.role)).map((m) => m.user_id);
      } else {
        targetUserIds = allMembers.map((m) => m.user_id);
      }
      console.log(`[send-targeted-notification] Club targeting: ${targetUserIds.length} users from club ${club_id}`);
    }

    // Deduplicate
    targetUserIds = [...new Set(targetUserIds)];

    if (targetUserIds.length === 0) {
      console.warn("[send-targeted-notification] No matching users found — notification not sent.");
      return new Response(
        JSON.stringify({ success: true, sent: 0, targetedUsers: 0, message: "No matching users found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-targeted-notification] Final target: ${targetUserIds.length} unique user(s):`, targetUserIds);

    const results = { pushSent: 0, emailsSent: 0, smsSent: 0, errors: [] as string[] };

    // Build push content with event details
    let pushMessage = message;
    if (event_details?.date) pushMessage += `\n📅 ${event_details.date}`;
    if (event_details?.time) pushMessage += ` à ${event_details.time}`;
    if (event_details?.location) pushMessage += `\n📍 ${event_details.location}`;

    // Send PUSH notifications (batch by external_id)
    if (channels.includes("push")) {
      try {
        const pushBody: Record<string, unknown> = {
          app_id: ONESIGNAL_APP_ID,
          include_aliases: {
            external_id: targetUserIds,
          },
          target_channel: "push",
          headings: { en: title, fr: title },
          contents: { en: pushMessage, fr: pushMessage },
          name: `Targeted push: ${title}`,
        };

        if (url) {
          pushBody.url = url;
          pushBody.web_url = url;
        }

        // Add custom data for analytics
        pushBody.data = {
          event_type: event_type || "custom",
          session_id: session_id || null,
          sent_at: new Date().toISOString(),
        };

        console.log("[send-targeted-notification] Sending push to OneSignal:", JSON.stringify(pushBody));

        const pushResponse = await fetch("https://api.onesignal.com/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify(pushBody),
        });

        const pushResult = await pushResponse.json();
        console.log("[send-targeted-notification] OneSignal push response:", pushResult);

        if (pushResponse.ok) {
          // OneSignal returns recipients count
          results.pushSent = pushResult.recipients ?? targetUserIds.length;
          console.log(`[send-targeted-notification] ✅ Push sent to ${results.pushSent} device(s). Notification ID: ${pushResult.id}`);
        } else {
          console.error("[send-targeted-notification] ❌ Push error from OneSignal:", JSON.stringify(pushResult));
          results.errors.push(`Push: ${JSON.stringify(pushResult)}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[send-targeted-notification] Push exception:", msg);
        results.errors.push(`Push error: ${msg}`);
      }
    }

    // Send EMAIL notifications
    if (channels.includes("email")) {
      // Get emails for target users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", targetUserIds);

      const emails = profiles?.filter((p) => p.email).map((p) => p.email!) || [];

      if (emails.length > 0) {
        try {
          const emailHtml = buildEmailHtml(title, message, event_details);

          const emailResponse = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_email_tokens: emails,
              email_subject: title,
              email_body: emailHtml,
              email_from_name: "CocoriCoach",
            }),
          });

          if (emailResponse.ok) {
            results.emailsSent = emails.length;
          } else {
            const errData = await emailResponse.json();
            results.errors.push(`Email: ${JSON.stringify(errData)}`);
          }
        } catch (e: unknown) {
          results.errors.push(`Email error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Send SMS notifications
    if (channels.includes("sms")) {
      // Get phone numbers from players linked to target users
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
            const smsResponse = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
              },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_phone_numbers: [phone],
                sms_from: "CocoriCoach",
                contents: { en: smsContent },
              }),
            });

            if (smsResponse.ok) results.smsSent++;
            else {
              const errData = await smsResponse.json();
              results.errors.push(`SMS ${phone}: ${JSON.stringify(errData)}`);
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
        targetedUsers: targetUserIds.length,
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

function buildEmailHtml(
  title: string,
  message: string,
  eventDetails?: { date?: string; time?: string; location?: string }
): string {
  const eventInfo = eventDetails
    ? `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      ${eventDetails.date ? `<p style="margin: 4px 0;"><strong>📅 Date:</strong> ${eventDetails.date}</p>` : ""}
      ${eventDetails.time ? `<p style="margin: 4px 0;"><strong>🕐 Heure:</strong> ${eventDetails.time}</p>` : ""}
      ${eventDetails.location ? `<p style="margin: 4px 0;"><strong>📍 Lieu:</strong> ${eventDetails.location}</p>` : ""}
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏉 CocoriCoach</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin: 16px 0;">${title}</h2>
          <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          ${eventInfo}
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} CocoriCoach</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
